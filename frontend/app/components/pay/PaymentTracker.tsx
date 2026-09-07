"use client";

import { usePaymentStream } from "@/lib/hooks/usePaymentStream";
import { useEnsName } from "@/lib/hooks/useEnsName";

interface Props {
  paymentId: string;
}

const STEP_LABEL: Record<string, string> = {
  pending_deposit: "Waiting for deposit confirmation",
  deposit_confirmed: "Deposit confirmed — releasing on destination",
  released: "Released",
  failed: "Failed",
};

export default function PaymentTracker({ paymentId }: Props) {
  const payment = usePaymentStream(paymentId);
  const recipientEnsName = useEnsName(payment?.recipient);

  if (!payment) {
    return (
      <div className="flex flex-col items-center gap-3 py-10">
        <div className="w-6 h-6 rounded-full border-2 border-border border-t-accent animate-spin" />
        <p className="text-body text-sm">Connecting to live status…</p>
      </div>
    );
  }

  if (payment.status === "failed") {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-border bg-badge-bg p-5">
          <p className="text-ink font-medium mb-1">This payment failed.</p>
          <p className="text-body text-sm">
            {payment.error ?? "The relayer could not complete this payment."}
          </p>
        </div>
        {payment.sourceExplorerUrl && (
          <a
            href={payment.sourceExplorerUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-accent font-medium hover:underline"
          >
            View source transaction
          </a>
        )}
        <p className="text-body text-xs">
          Funds that already left your wallet were deposited on-chain — check the source transaction above. Contact
          support with this payment id if the deposit is not reflected: <span className="font-mono">{paymentId}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        {payment.status !== "released" && (
          <div className="w-5 h-5 rounded-full border-2 border-border border-t-accent animate-spin shrink-0" />
        )}
        <span className="font-medium text-ink">{STEP_LABEL[payment.status] ?? payment.status}</span>
      </div>

      <div className="rounded-xl border border-border p-4 flex flex-col gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-body">Amount</span>
          <span className="text-ink font-medium">{payment.amount} USDC</span>
        </div>
        <div className="flex justify-between">
          <span className="text-body">You receive</span>
          <span className="text-ink font-medium">{payment.payoutAmount} USDC</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-body">Recipient</span>
          <span className="flex flex-col items-end">
            {recipientEnsName && <span className="text-ink font-medium text-sm">{recipientEnsName}</span>}
            <span className="text-ink font-mono text-xs">{payment.recipient}</span>
          </span>
        </div>
        {payment.sourceExplorerUrl && (
          <div className="flex justify-between">
            <span className="text-body">Source tx</span>
            <a href={payment.sourceExplorerUrl} target="_blank" rel="noreferrer" className="text-accent font-medium hover:underline">
              View
            </a>
          </div>
        )}
        {payment.destExplorerUrl && (
          <div className="flex justify-between">
            <span className="text-body">Destination tx</span>
            <a href={payment.destExplorerUrl} target="_blank" rel="noreferrer" className="text-accent font-medium hover:underline">
              View
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
