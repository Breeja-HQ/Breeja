"use client";

import type { ChainConfig } from "@/lib/chains";

interface Props {
  chains: readonly ChainConfig[];
  destinationOptions: readonly ChainConfig[];
  sourceSlug: string;
  destSlug: string;
  onSourceChange: (slug: ChainConfig["slug"]) => void;
  onDestChange: (slug: ChainConfig["slug"]) => void;
  amount: string;
  onAmountChange: (value: string) => void;
  recipientInput: string;
  onRecipientChange: (value: string) => void;
  isEnsName: boolean;
  isResolvingEns: boolean;
  resolvedRecipient: string | null;
  connectedAddress: string | undefined;
  onUseConnected: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
}

export default function AmountRecipientForm({
  chains,
  destinationOptions,
  sourceSlug,
  destSlug,
  onSourceChange,
  onDestChange,
  amount,
  onAmountChange,
  recipientInput,
  onRecipientChange,
  isEnsName,
  isResolvingEns,
  resolvedRecipient,
  connectedAddress,
  onUseConnected,
  onSubmit,
  canSubmit,
}: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-body mb-2">From</label>
          <select
            value={sourceSlug}
            onChange={(e) => onSourceChange(e.target.value as ChainConfig["slug"])}
            className="w-full rounded-xl border border-border px-4 py-3 text-ink font-medium bg-white"
          >
            {chains.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-body mb-2">To</label>
          <select
            value={destSlug}
            onChange={(e) => onDestChange(e.target.value as ChainConfig["slug"])}
            className="w-full rounded-xl border border-border px-4 py-3 text-ink font-medium bg-white"
          >
            {destinationOptions.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-body mb-2">Amount (USDC)</label>
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          className="w-full rounded-xl border border-border px-4 py-3 text-ink text-lg font-medium"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-body">Recipient</label>
          {connectedAddress && (
            <button
              type="button"
              onClick={onUseConnected}
              className="text-sm text-accent font-medium hover:opacity-80"
            >
              Use connected wallet
            </button>
          )}
        </div>
        <input
          type="text"
          placeholder="0x… or name.eth"
          value={recipientInput}
          onChange={(e) => onRecipientChange(e.target.value)}
          className="w-full rounded-xl border border-border px-4 py-3 text-ink font-mono text-sm"
        />
        {isEnsName && (
          <p className="mt-2 text-sm text-body">
            {isResolvingEns
              ? "Resolving ENS name…"
              : resolvedRecipient
                ? `Resolves to ${resolvedRecipient}`
                : "Could not resolve this ENS name"}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        className="w-full bg-accent text-white rounded-full px-6 py-3.5 text-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Get quote
      </button>
    </div>
  );
}
