interface ChainInfo {
  chainId: number;
  slug: string;
  name: string;
  isSource: boolean;
  isDestination: boolean;
  poolLiquidity: string | null;
}

interface ChainsResponse {
  chains: ChainInfo[];
}

async function fetchChains(): Promise<ChainInfo[] | null> {
  const baseUrl = process.env.NEXT_PUBLIC_RELAYER_API_URL;
  if (!baseUrl) return null;

  try {
    const res = await fetch(`${baseUrl}/chains`, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    const data = (await res.json()) as ChainsResponse;
    return data.chains;
  } catch {
    return null;
  }
}

function ChainRow({ chain }: { chain: ChainInfo }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-3 last:border-b-0">
      <div className="flex flex-col">
        <span className="font-mono text-sm font-medium text-ink">{chain.name}</span>
        <span className="font-mono text-xs text-body">
          {chain.slug} · chain id {chain.chainId}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-badge-bg px-3 py-1 font-mono text-xs text-accent">
          {chain.isSource && chain.isDestination
            ? "source + dest"
            : chain.isSource
              ? "source only"
              : "dest only"}
        </span>
        <span className="font-mono text-sm text-ink w-28 text-right">
          {chain.poolLiquidity !== null ? `${chain.poolLiquidity} USDC` : "—"}
        </span>
      </div>
    </div>
  );
}

export async function LiveChainsPanel() {
  const chains = await fetchChains();

  if (chains === null) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <p className="text-base text-body">
          Live chain data is unavailable right now — the relayer at{" "}
          <code className="font-mono text-sm">NEXT_PUBLIC_RELAYER_API_URL</code> could not be
          reached. Static docs below are unaffected; call{" "}
          <code className="font-mono text-sm">breeja.chains()</code> at runtime for the current
          list.
        </p>
      </div>
    );
  }

  if (chains.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <p className="text-base text-body">No chains reported by the relayer yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <div className="flex flex-col">
        {chains.map((chain) => (
          <ChainRow key={chain.chainId} chain={chain} />
        ))}
      </div>
    </div>
  );
}

export function LiveChainsPanelSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <div className="flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between animate-pulse">
            <div className="flex flex-col gap-2">
              <div className="h-3.5 w-32 rounded-full bg-badge-bg" />
              <div className="h-3 w-40 rounded-full bg-badge-bg" />
            </div>
            <div className="h-6 w-24 rounded-full bg-badge-bg" />
          </div>
        ))}
      </div>
    </div>
  );
}
