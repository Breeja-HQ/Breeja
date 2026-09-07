"use client";

import { useEffect, useState } from "react";

const SUBGRAPH_URL = process.env.NEXT_PUBLIC_SUBGRAPH_URL;
const POLL_INTERVAL_MS = 30_000;

const STATS_QUERY = `
  query LandingStats {
    chainStats {
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

interface SubgraphStatsResponse {
  data?: {
    chainStats: ChainStatsEntry[];
  };
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
  if (!SUBGRAPH_URL) return null;

  const response = await fetch(SUBGRAPH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: STATS_QUERY }),
  });
  if (!response.ok) return null;

  const body = (await response.json()) as SubgraphStatsResponse;
  const rows = body.data?.chainStats;
  if (!rows) return null;

  let totalVolume = BigInt(0);
  let totalPayments = BigInt(0);
  for (const row of rows) {
    totalVolume += BigInt(row.totalVolume);
    totalPayments += BigInt(row.paymentCount);
  }

  return {
    volumeUsdc: formatUsdc(totalVolume),
    paymentCount: totalPayments.toLocaleString("en-US"),
    chainCount: rows.length,
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
    if (!SUBGRAPH_URL) return;

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
        {!SUBGRAPH_URL && (
          <p className="mt-4 text-center text-sm text-white/40">
            live stats connect once the subgraph is deployed
          </p>
        )}
        {SUBGRAPH_URL && failed && !stats && (
          <p className="mt-4 text-center text-sm text-white/40">
            reconnecting to the subgraph&hellip;
          </p>
        )}
      </div>
    </section>
  );
}
