"use client";

import { useEffect, useState } from "react";
import { hasSubgraphs, querySubgraphs } from "@/lib/subgraphs";

const POLL_INTERVAL_MS = 30_000;

// chainStats_collection, not chainStats — Graph's codegen treats the
// ChainStats entity name as already-plural and reserves the bare "chainStats"
// field for a single-by-id lookup instead of a collection query. Verified
// live against the deployed Studio schema.
const STATS_QUERY = `
  query LandingStats {
    chainStats_collection {
      id
      totalVolume
      paymentCount
    }
  }
`;

interface ChainStatsEntry {
  id: string;
  totalVolume: string;
  paymentCount: string;
}

interface LandingStats {
  volumeUsdc: string;
  paymentCount: string;
  chainCount: number;
}

const USDC_DECIMALS_FACTOR = BigInt(1_000_000);

function formatUsdc(totalMicros: bigint): string {
  const whole = totalMicros / USDC_DECIMALS_FACTOR;
  return `$${whole.toLocaleString("en-US")}`;
}

async function fetchStats(): Promise<LandingStats | null> {
  if (!hasSubgraphs()) return null;

  const perChainResponses = await querySubgraphs<{ chainStats_collection: ChainStatsEntry[] }>(STATS_QUERY);
  if (perChainResponses.length === 0) return null;

  let totalVolume = BigInt(0);
  let totalPayments = BigInt(0);
  let chainCount = 0;
  for (const response of perChainResponses) {
    for (const row of response.chainStats_collection) {
      totalVolume += BigInt(row.totalVolume);
      totalPayments += BigInt(row.paymentCount);
      chainCount += 1;
    }
  }

  return {
    volumeUsdc: formatUsdc(totalVolume),
    paymentCount: totalPayments.toLocaleString("en-US"),
    chainCount,
  };
}

function StatSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="h-8 w-20 animate-pulse rounded-md bg-white/10 md:h-10 md:w-28" />
      <div className="h-4 w-24 animate-pulse rounded-md bg-white/10" />
    </div>
  );
}

export default function LiveStatsBar() {
  const [stats, setStats] = useState<LandingStats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!hasSubgraphs()) return;

    let cancelled = false;

    async function poll() {
      try {
        const result = await fetchStats();
        if (cancelled) return;
        if (result) {
          setStats(result);
          setFailed(false);
        } else {
          setFailed(true);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    void poll();
    const interval = setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const items = [
    { value: stats?.volumeUsdc, label: "USDC settled" },
    { value: stats?.paymentCount, label: "Payments released" },
    { value: stats ? String(stats.chainCount) : undefined, label: "Chains live" },
  ];

  return (
    <section className="bg-ink">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-6 md:py-8">
        <div className="flex flex-col sm:flex-row items-center justify-around gap-8 sm:gap-4">
          {items.map((item, index) => (
            <div
              key={item.label}
              className={`flex flex-col items-center text-center sm:border-l sm:border-white/10 sm:pl-6 ${
                index === 0 ? "sm:border-l-0 sm:pl-0" : ""
              }`}
            >
              {item.value ? (
                <>
                  <span className="text-3xl md:text-4xl font-bold text-accent">
                    {item.value}
                  </span>
                  <span className="mt-1 text-base text-white/60">{item.label}</span>
                </>
              ) : (
                <StatSkeleton />
              )}
            </div>
          ))}
        </div>
        {!hasSubgraphs() && (
          <p className="mt-4 text-center text-sm text-white/40">
            live stats connect once the subgraph is deployed
          </p>
        )}
        {hasSubgraphs() && failed && !stats && (
          <p className="mt-4 text-center text-sm text-white/40">
            reconnecting to the subgraph&hellip;
          </p>
        )}
      </div>
    </section>
  );
}
