import type { Request, Response } from "express";
import { getPaymentById, listInFlightPaymentsByRecipient } from "../db/paymentsRepository.js";
import { subscribeToPayment, subscribeToRecipient } from "../services/paymentEvents.js";
import type { PaymentStatus } from "../types/payment.js";

const HEARTBEAT_INTERVAL_MS = 15_000;
const MAX_CONCURRENT_STREAMS_PER_IP = 10;

const streamCountByIp = new Map<string, number>();

function clientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

function acquireStreamSlot(ip: string): boolean {
  const current = streamCountByIp.get(ip) ?? 0;
  if (current >= MAX_CONCURRENT_STREAMS_PER_IP) return false;
  streamCountByIp.set(ip, current + 1);
  return true;
}

function releaseStreamSlot(ip: string): void {
  const current = streamCountByIp.get(ip) ?? 0;
  if (current <= 1) {
    streamCountByIp.delete(ip);
  } else {
    streamCountByIp.set(ip, current - 1);
  }
}

function writeSseHeaders(res: Response): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
}

function writeEvent(res: Response, event: "state" | "error", payment: PaymentStatus): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payment)}\n\n`);
}

function isTerminal(payment: PaymentStatus): boolean {
  return payment.state === "released" || payment.state === "failed";
}

function eventNameFor(payment: PaymentStatus): "state" | "error" {
  return payment.state === "failed" ? "error" : "state";
}

interface StreamSession {
  close: () => void;
  send: (payment: PaymentStatus) => void;
}

function openStream(req: Request, res: Response): StreamSession | null {
  const ip = clientIp(req);
  if (!acquireStreamSlot(ip)) {
    res.status(429).json({ error: "TooManyConcurrentStreams" });
    return null;
  }

  let closed = false;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const close = (): void => {
    if (closed) return;
    closed = true;
    if (heartbeat) clearInterval(heartbeat);
    releaseStreamSlot(ip);
    res.end();
  };

  req.on("close", close);
  writeSseHeaders(res);

  heartbeat = setInterval(() => {
    if (!closed) res.write(": heartbeat\n\n");
  }, HEARTBEAT_INTERVAL_MS);

  return {
    close,
    send: (payment) => {
      if (closed) return;
      writeEvent(res, eventNameFor(payment), payment);
    },
  };
}

/**
 * GET /events/:paymentId — a stream for one payment. Closes after the
 * payment reaches a terminal state, per REALTIME.md's SSE contract.
 */
export function streamPaymentById(req: Request, res: Response): void {
  const session = openStream(req, res);
  if (!session) return;

  const { paymentId } = req.params;

  const handleUpdate = (payment: PaymentStatus): void => {
    session.send(payment);
    if (isTerminal(payment)) session.close();
  };

  const unsubscribe = subscribeToPayment(paymentId, handleUpdate);
  req.on("close", unsubscribe);

  void getPaymentById(paymentId).then((current) => {
    if (current) handleUpdate(current);
  });
}

/**
 * GET /events?recipient=0x… — a stream for every payment to an address.
 * Unlike the single-payment stream, this has no natural terminal state —
 * a new payment can always arrive — so it stays open until the client
 * disconnects rather than closing after one payment finishes.
 */
export function streamPaymentsByRecipient(req: Request, res: Response): void {
  const recipient = req.query.recipient;
  if (typeof recipient !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
    res.status(400).json({ error: "recipient query param must be a valid address" });
    return;
  }
  const recipientAddress = recipient as `0x${string}`;

  const session = openStream(req, res);
  if (!session) return;

  const unsubscribe = subscribeToRecipient(recipientAddress, session.send);
  req.on("close", unsubscribe);

  void listInFlightPaymentsByRecipient(recipientAddress).then((payments) => {
    for (const payment of payments) session.send(payment);
  });
}
