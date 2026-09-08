"use client";

import { AlertTriangle, ArrowDown, Loader2 } from "lucide-react";
import ChainSelect from "./ChainSelect";
import { getChainBySlug, type ChainConfig } from "@/lib/chains";

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
  const source = getChainBySlug(sourceSlug);
  // Hedera's USDC has no EIP-3009, so paying from it is not gasless. Say so
  // up front rather than letting the payer find out at the signing step.
  const sourceNotGasless = Boolean(source && !source.supportsEip3009);

  return (
    <div className="flex flex-col gap-7">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <ChainSelect
          label="From"
          options={chains}
          value={sourceSlug}
          onChange={onSourceChange}
          showMeshHint
        />
        <div className="hidden sm:flex h-14 w-10 items-center justify-center" aria-hidden="true">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-badge-bg">
            <ArrowDown className="h-4 w-4 -rotate-90 text-accent" />
          </span>
        </div>
        <ChainSelect
          label="To"
          options={destinationOptions}
          value={destSlug}
          onChange={onDestChange}
        />
      </div>

      {sourceNotGasless && source && (
        <div className="flex items-start gap-3.5 rounded-xl border border-border bg-badge-bg p-5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <div>
            <p className="text-lg font-semibold text-ink">{source.name} is not gasless</p>
            <p className="mt-1 text-base text-body leading-relaxed">
              Its USDC does not implement EIP-3009, so there is no off-chain permit to sign. Paying from{" "}
              {source.name} needs an on-chain approve() that you submit and pay gas for yourself, and this
              widget does not send that transaction yet. Pick another source chain to pay gaslessly.
            </p>
          </div>
        </div>
      )}

      <div>
        <label htmlFor="pay-amount" className="block text-base font-semibold text-body mb-2.5">
          Amount
        </label>
        <div className="relative">
          <input
            id="pay-amount"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            className="motion-lift w-full rounded-xl border border-border bg-surface px-5 py-4 pr-20 text-2xl font-semibold text-ink outline-none placeholder:text-body/50 hover:border-accent focus:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          />
          <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-lg font-semibold text-body">
            USDC
          </span>
        </div>
      </div>

      <div>
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <label htmlFor="pay-recipient" className="block text-base font-semibold text-body">
            Recipient
          </label>
          {connectedAddress && (
            <button
              type="button"
              onClick={onUseConnected}
              className="rounded-full px-2 py-1 text-base font-semibold text-accent outline-none transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-accent"
            >
              Use connected wallet
            </button>
          )}
        </div>
        <input
          id="pay-recipient"
          type="text"
          placeholder="0x address or name.eth"
          value={recipientInput}
          onChange={(e) => onRecipientChange(e.target.value)}
          className="motion-lift w-full rounded-xl border border-border bg-surface px-5 py-4 font-mono text-base text-ink outline-none placeholder:font-sans placeholder:text-body/60 hover:border-accent focus:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        />
        {isEnsName && (
          <p className="mt-2.5 flex items-center gap-2 text-base text-body">
            {isResolvingEns ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-accent" />
                Resolving ENS name
              </>
            ) : resolvedRecipient ? (
              <>
                Resolves to <span className="break-all font-mono text-sm text-ink">{resolvedRecipient}</span>
              </>
            ) : (
              "Could not resolve this ENS name"
            )}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        className="motion-lift w-full rounded-full bg-accent px-6 py-4 text-xl font-semibold text-white outline-none hover:shadow-lg focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:transform-none disabled:hover:shadow-none"
      >
        Get quote
      </button>
    </div>
  );
}
