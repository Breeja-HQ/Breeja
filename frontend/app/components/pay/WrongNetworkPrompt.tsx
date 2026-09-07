"use client";

interface Props {
  chainName: string;
  isSwitching: boolean;
  onSwitch: () => void;
}

export default function WrongNetworkPrompt({ chainName, isSwitching, onSwitch }: Props) {
  return (
    <div className="rounded-xl border border-border bg-badge-bg p-5 flex flex-col gap-3">
      <p className="text-ink font-medium">Your wallet is on a different network.</p>
      <p className="text-body text-sm">
        This payment starts on {chainName}. The permit is signed against that chain&apos;s domain — signing on the
        wrong network would produce a signature that fails on-chain, so signing is disabled until you switch.
      </p>
      <button
        type="button"
        onClick={onSwitch}
        disabled={isSwitching}
        className="self-start bg-ink text-white rounded-full px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {isSwitching ? "Switching…" : `Switch to ${chainName}`}
      </button>
    </div>
  );
}
