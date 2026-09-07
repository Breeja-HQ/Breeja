import { EventEmitter } from "node:events";
import type { PaymentStatus } from "../types/payment.js";

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

function topic(id: string): string {
  return `payment:${id}`;
}

export function publishPaymentUpdate(payment: PaymentStatus): void {
  emitter.emit(topic(payment.id), payment);
  emitter.emit("payment:*", payment);
}

export function subscribeToPayment(id: string, onUpdate: (payment: PaymentStatus) => void): () => void {
  emitter.on(topic(id), onUpdate);
  return () => emitter.off(topic(id), onUpdate);
}

export function subscribeToRecipient(
  recipient: `0x${string}`,
  onUpdate: (payment: PaymentStatus) => void,
): () => void {
  const normalized = recipient.toLowerCase();
  const listener = (payment: PaymentStatus): void => {
    if (payment.recipient.toLowerCase() === normalized) onUpdate(payment);
  };
  emitter.on("payment:*", listener);
  return () => emitter.off("payment:*", listener);
}
