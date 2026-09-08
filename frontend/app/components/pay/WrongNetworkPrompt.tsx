"use client";

import { Loader2, Network } from "lucide-react";

interface Props {
  chainName: string;
  isSwitching: boolean;
  onSwitch: () => void;
}

export default function WrongNetworkPrompt({ chainName, isSwitching, onSwitch }: Props) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-badge-bg p-6">
      <p className="flex items-center gap-2.5 text-xl font-bold text-ink">
        <Network className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
        Your wallet is on a different network
      </p>
      <p className="text-base leading-relaxed text-body">
        This payment starts on {chainName}. The permit is signed against that chain&apos;s domain, so signing
        on the wrong network would produce a signature that fails on-chain. Signing stays disabled until you
        switch.
      </p>
      <button
        type="button"
        onClick={onSwitch}
        disabled={isSwitching}
        className="motion-lift inline-flex items-center gap-2 self-start rounded-full bg-ink px-6 py-3 text-lg font-semibold text-white outline-none hover:shadow-lg focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-50"
      >
        {isSwitching && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {isSwitching ? "Switching" : `Switch to ${chainName}`}
      </button>
    </div>
  );
}
