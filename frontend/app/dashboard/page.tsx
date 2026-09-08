"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { formatUnits } from "viem";
import { explorerTxUrl } from "@breeja/sdk";
import { getChainById } from "@/lib/chains";
import { hasSubgraphs, querySubgraphs } from "@/lib/subgraphs";

const HISTORY_QUERY = `
  query DashboardHistory {
    payments(first: 50, orderBy: requestedAt, orderDirection: desc) {
      id
      payer
      recipient
      amount
      sourceChainId
      destChainId
      sourceTxHash
      requestedAt
      release {
        payout
        fee
        destTxHash
        releasedAt
      }
    }
  }
`;

interface ReleaseEntry {
  payout: string;
  fee: string;
  destTxHash: string;
  releasedAt: string;
}

interface PaymentEntry {
  id: string;
  payer: string;
  recipient: string;
  amount: string;
  sourceChainId: string;
  destChainId: string;
  sourceTxHash: string;
  requestedAt: string;
  release: ReleaseEntry | null;
}

type LoadState = "loading" | "ready" | "error" | "unconfigured";

function formatUsdc(smallestUnits: string): string {
  return formatUnits(BigInt(smallestUnits), 6);
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function chainName(chainId: string): string {
  return getChainById(Number(chainId))?.name ?? `Chain ${chainId}`;
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 rounded-xl border border-border bg-badge-bg/40 animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-border p-12 text-center">
      <p className="text-ink font-medium mb-2">No payments yet.</p>
      <p className="text-body text-sm">
        Once a payment settles on any chain, it will show up here, indexed straight from on-chain events.
      </p>
    </div>
  );
}

function UnconfiguredState() {
  return (
    <div className="rounded-2xl border border-border p-12 text-center">
      <p className="text-ink font-medium mb-2">Dashboard not connected.</p>
      <p className="text-body text-sm">
        Set <span className="font-mono">NEXT_PUBLIC_SUBGRAPH_URLS</span> to one or more deployed Breeja subgraphs to
        see payment history here.
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const [state, setState] = useState<LoadState>(hasSubgraphs() ? "loading" : "unconfigured");
  const [payments, setPayments] = useState<PaymentEntry[]>([]);

  useEffect(() => {
    if (!hasSubgraphs()) return;

    let cancelled = false;

    async function load() {
      try {
        const perChainResponses = await querySubgraphs<{ payments: PaymentEntry[] }>(HISTORY_QUERY);
        if (cancelled) return;
        if (perChainResponses.length === 0) {
          setState("error");
          return;
        }
        const merged = perChainResponses
          .flatMap((response) => response.payments)
          .sort((a, b) => Number(b.requestedAt) - Number(a.requestedAt));
        setPayments(merged);
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="w-full min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="font-sans font-bold text-3xl text-ink mb-2">Dashboard</h1>
        <p className="text-body mb-8">Payment history indexed from on-chain events across every chain.</p>

        {state === "unconfigured" && <UnconfiguredState />}
        {state === "loading" && <DashboardSkeleton />}
        {state === "error" && (
          <div className="rounded-2xl border border-border bg-badge-bg p-8 text-center">
            <p className="text-ink font-medium">Could not reach the subgraph.</p>
          </div>
        )}
        {state === "ready" && payments.length === 0 && <EmptyState />}

        {state === "ready" && payments.length > 0 && (
          <div className="flex flex-col gap-3">
            {payments.map((payment) => {
              const sourceUrl = explorerTxUrl(Number(payment.sourceChainId), payment.sourceTxHash);
              const destUrl = payment.release
                ? explorerTxUrl(Number(payment.destChainId), payment.release.destTxHash)
                : null;
              return (
                <div key={payment.id} className="rounded-xl border border-border p-5 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-medium text-ink">
                      {chainName(payment.sourceChainId)}
                      <ArrowRight className="h-4 w-4 shrink-0 text-body" aria-hidden="true" />
                      {chainName(payment.destChainId)}
                    </span>
                    <span
                      className={`text-xs font-medium rounded-full px-3 py-1 ${
                        payment.release ? "bg-badge-bg text-accent" : "bg-border text-body"
                      }`}
                    >
                      {payment.release ? "Released" : "In flight"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-body">Amount</span>
                    <span className="text-ink font-medium">{formatUsdc(payment.amount)} USDC</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-body">Recipient</span>
                    <span className="text-ink font-mono text-xs">{truncateAddress(payment.recipient)}</span>
                  </div>
                  <div className="flex gap-4 text-sm pt-1">
                    {sourceUrl && (
                      <a href={sourceUrl} target="_blank" rel="noreferrer" className="text-accent font-medium hover:underline">
                        Source tx
                      </a>
                    )}
                    {destUrl && (
                      <a href={destUrl} target="_blank" rel="noreferrer" className="text-accent font-medium hover:underline">
                        Destination tx
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
