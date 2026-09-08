"use client";

import { isAddress } from "viem";
import { ArrowRight, PenLine, ShieldCheck } from "lucide-react";
import type { QuoteRoute } from "@/lib/hooks/usePaymentWidget";
import type { ChainConfig } from "@/lib/chains";
import { useEnsName } from "@/lib/hooks/useEnsName";

interface Props {
  sourceChain: ChainConfig;
  destChain: ChainConfig;
  amount: string;
  recipient: string;
  route: QuoteRoute;
  onSign: () => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-base text-body">{label}</span>
      <span className="text-right text-base font-semibold text-ink">{children}</span>
    </div>
  );
}

export default function ReadyToSign({ sourceChain, destChain, amount, recipient, route, onSign }: Props) {
  const recipientAddress = isAddress(recipient) ? recipient : null;
  const recipientEnsName = useEnsName(recipientAddress);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6">
        <Row label="Route">
          {route.type === "cctp" ? "CCTP, trust-minimized" : "Fast, custodial"}
        </Row>
        <Row label="Path">
          <span className="inline-flex items-center gap-2">
            {sourceChain.name}
            <ArrowRight className="h-4 w-4 text-accent" aria-hidden="true" />
            {destChain.name}
          </span>
        </Row>
        <Row label="You send">{amount} USDC</Row>
        <Row label="Fee">{route.feeAmount} USDC</Row>
        <div className="border-t border-border pt-4">
          <div className="flex items-start justify-between gap-4">
            <span className="text-lg text-body">Recipient receives</span>
            <span className="text-xl font-bold text-ink">{route.payoutAmount} USDC</span>
          </div>
        </div>
        <Row label="Recipient">
          <span className="flex flex-col items-end gap-0.5">
            {recipientEnsName && <span className="text-base font-semibold text-ink">{recipientEnsName}</span>}
            <span className="break-all font-mono text-sm font-normal text-body">{recipient}</span>
          </span>
        </Row>
      </div>

      <button
        type="button"
        onClick={onSign}
        className="motion-lift flex w-full items-center justify-center gap-2.5 rounded-full bg-accent px-6 py-4 text-xl font-semibold text-white outline-none hover:shadow-lg focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        <PenLine className="h-5 w-5" aria-hidden="true" />
        Sign and pay
      </button>

      <p className="flex items-start justify-center gap-2 text-base leading-relaxed text-body">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
        <span>
          Signing is free and off-chain. It moves no funds by itself. The relayer pays all gas and submits
          on your behalf.
        </span>
      </p>
    </div>
  );
}
