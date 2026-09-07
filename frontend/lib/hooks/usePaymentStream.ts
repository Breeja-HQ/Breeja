"use client";

import { useEffect, useState } from "react";
import { toDecimalString, explorerTxUrl, type Payment, type PaymentState, type RouteType } from "@breeja/sdk";

const RELAYER_API_URL = process.env.NEXT_PUBLIC_RELAYER_API_URL ?? "http://localhost:3001";

interface RelayerSseFrame {
  id: string;
  fromChainId: number;
  toChainId: number;
  payer: `0x${string}`;
  recipient: `0x${string}`;
  amount: string;
  feeAmount: string;
  payoutAmount: string;
  route: RouteType;
  state: PaymentState;
  createdAt: number;
  updatedAt: number;
  sourceTxHash?: `0x${string}` | null;
  destTxHash?: `0x${string}` | null;
  explanation?: string | null;
  error?: string | null;
}

function toPayment(frame: RelayerSseFrame): Payment {
  return {
    id: frame.id,
    status: frame.state,
    fromChainId: frame.fromChainId,
    toChainId: frame.toChainId,
    payer: frame.payer,
    recipient: frame.recipient,
    amount: toDecimalString(frame.amount),
    feeAmount: toDecimalString(frame.feeAmount),
    payoutAmount: toDecimalString(frame.payoutAmount),
    route: frame.route,
    sourceTxHash: frame.sourceTxHash ?? null,
    destTxHash: frame.destTxHash ?? null,
    explanation: frame.explanation ?? null,
    error: frame.error ?? null,
    sourceExplorerUrl: explorerTxUrl(frame.fromChainId, frame.sourceTxHash ?? null),
    destExplorerUrl: explorerTxUrl(frame.toChainId, frame.destTxHash ?? null),
    createdAt: frame.createdAt,
    updatedAt: frame.updatedAt,
  };
}

/**
 * Live payment state over the relayer's SSE endpoint — no polling. Per
 * docs/REALTIME.md, EventSource reconnects on its own; no hand-rolled retry
 * logic belongs here.
 */
export function usePaymentStream(paymentId: string | null): Payment | null {
  const [payment, setPayment] = useState<Payment | null>(null);

  useEffect(() => {
    setPayment(null);
    if (!paymentId) return;

    const source = new EventSource(`${RELAYER_API_URL}/events/${paymentId}`);

    source.addEventListener("state", (event) => {
      setPayment(toPayment(JSON.parse((event as MessageEvent).data)));
    });

    source.addEventListener("error", (event) => {
      const data = (event as MessageEvent).data;
      if (data) setPayment(toPayment(JSON.parse(data)));
      source.close();
    });

    return () => source.close();
  }, [paymentId]);

  return payment;
}
