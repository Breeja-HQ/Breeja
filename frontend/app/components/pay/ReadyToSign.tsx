"use client";

import { isAddress } from "viem";
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

export default function ReadyToSign({ sourceChain, destChain, amount, recipient, route, onSign }: Props) {
  const recipientAddress = isAddress(recipient) ? recipient : null;
  const recipientEnsName = useEnsName(recipientAddress);

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-border p-5 flex flex-col gap-3 text-sm">
        <div className="flex justify-between">
          <span className="text-body">Route</span>
          <span className="text-ink font-medium">
            {route.type === "cctp" ? "CCTP — trust-minimized" : "Fast — custodial"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-body">From → To</span>
          <span className="text-ink font-medium">
            {sourceChain.name} → {destChain.name}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-body">You send</span>
          <span className="text-ink font-medium">{amount} USDC</span>
        </div>
        <div className="flex justify-between">
          <span className="text-body">Fee</span>
          <span className="text-ink font-medium">{route.feeAmount} USDC</span>
        </div>
        <div className="flex justify-between border-t border-border pt-3">
          <span className="text-body">Recipient receives</span>
          <span className="text-ink font-semibold">{route.payoutAmount} USDC</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-body">Recipient</span>
          <span className="flex flex-col items-end">
            {recipientEnsName && <span className="text-ink font-medium text-sm">{recipientEnsName}</span>}
            <span className="text-ink font-mono text-xs">{recipient}</span>
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onSign}
        className="w-full bg-accent text-white rounded-full px-6 py-3.5 text-lg font-medium hover:opacity-90 transition-opacity"
      >
        Sign and pay
      </button>
      <p className="text-body text-xs text-center">
        Signing is free and off-chain. The relayer pays all gas and submits on your behalf.
      </p>
    </div>
  );
}
