"use client";

import { AlertTriangle, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { usePaymentStream } from "@/lib/hooks/usePaymentStream";
import { useEnsName } from "@/lib/hooks/useEnsName";

interface Props {
  paymentId: string;
}

const STEP_LABEL: Record<string, string> = {
  pending_deposit: "Waiting for deposit confirmation",
  deposit_confirmed: "Deposit confirmed, releasing on destination",
  released: "Released",
  failed: "Failed",
};

const STEP_DETAIL: Record<string, string> = {
  pending_deposit:
    "The relayer submitted your signed authorization to the source chain and is waiting for that deposit to confirm.",
  deposit_confirmed:
    "Your funds are locked on the source chain. The relayer is now releasing USDC to the recipient on the destination chain.",
  released: "The recipient has the USDC on the destination chain. Nothing further is needed.",
};

export default function PaymentTracker({ paymentId }: Props) {
  const payment = usePaymentStream(paymentId);
  const recipientEnsName = useEnsName(payment?.recipient);

  if (!payment) {
    return (
      <div className="breeja-enter flex flex-col items-center gap-4 py-12 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" aria-hidden="true" />
        <p className="text-xl font-semibold text-ink">Connecting to live status</p>
        <p className="max-w-sm text-base leading-relaxed text-body">
          Opening a live stream to the relayer so this page updates itself as your payment moves.
        </p>
      </div>
    );
  }

  if (payment.status === "failed") {
    return (
      <div className="breeja-enter flex flex-col gap-5">
        <div className="flex items-start gap-3.5 rounded-2xl border border-border bg-badge-bg p-6">
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-accent" aria-hidden="true" />
          <div>
            <p className="text-xl font-bold text-ink">This payment failed</p>
            <p className="mt-1.5 text-base leading-relaxed text-body">
              {payment.error ?? "The relayer could not complete this payment."}
            </p>
          </div>
        </div>
        {payment.sourceExplorerUrl && (
          <a
            href={payment.sourceExplorerUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-base font-semibold text-accent outline-none transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-accent"
          >
            View source transaction
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        )}
        <p className="text-base leading-relaxed text-body">
          Funds that already left your wallet were deposited on-chain. Check the source transaction above, and
          contact support with this payment id if the deposit is not reflected:{" "}
          <span className="break-all font-mono text-sm text-ink">{paymentId}</span>
        </p>
      </div>
    );
  }

  const isReleased = payment.status === "released";

  return (
    <div className="breeja-enter flex flex-col gap-5">
      <div className="flex items-start gap-3.5">
        {isReleased ? (
          <CheckCircle2 className="mt-0.5 h-7 w-7 shrink-0 text-accent" aria-hidden="true" />
        ) : (
          <Loader2 className="mt-0.5 h-7 w-7 shrink-0 animate-spin text-accent" aria-hidden="true" />
        )}
        <div>
          <p className="text-2xl font-bold text-ink">{STEP_LABEL[payment.status] ?? payment.status}</p>
          {STEP_DETAIL[payment.status] && (
            <p className="mt-1.5 text-base leading-relaxed text-body">{STEP_DETAIL[payment.status]}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3.5 rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-start justify-between gap-4">
          <span className="text-base text-body">Amount</span>
          <span className="text-base font-semibold text-ink">{payment.amount} USDC</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <span className="text-base text-body">Recipient receives</span>
          <span className="text-base font-semibold text-ink">{payment.payoutAmount} USDC</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <span className="text-base text-body">Recipient</span>
          <span className="flex flex-col items-end gap-0.5">
            {recipientEnsName && <span className="text-base font-semibold text-ink">{recipientEnsName}</span>}
            <span className="break-all font-mono text-sm text-body">{payment.recipient}</span>
          </span>
        </div>
        {payment.sourceExplorerUrl && (
          <div className="flex items-center justify-between gap-4 border-t border-border pt-3.5">
            <span className="text-base text-body">Source transaction</span>
            <a
              href={payment.sourceExplorerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-base font-semibold text-accent outline-none transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-accent"
            >
              View
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        )}
        {payment.destExplorerUrl && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-base text-body">Destination transaction</span>
            <a
              href={payment.destExplorerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-base font-semibold text-accent outline-none transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-accent"
            >
              View
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
