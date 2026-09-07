const MESH_CHAINS = [
  { key: "base", name: "Base Sepolia" },
  { key: "arbitrum", name: "Arbitrum Sepolia" },
  { key: "optimism", name: "Optimism Sepolia" },
] as const;

// Node positions on a 400x400 viewBox. The three full source+destination
// chains sit as a triangle; Ethereum Sepolia sits outside it, source-only.
const POSITIONS: Record<string, { x: number; y: number }> = {
  base: { x: 200, y: 60 },
  arbitrum: { x: 340, y: 300 },
  optimism: { x: 60, y: 300 },
  ethereum: { x: 200, y: 370 },
};

const MESH_EDGES: Array<[string, string]> = [
  ["base", "arbitrum"],
  ["arbitrum", "optimism"],
  ["optimism", "base"],
];

const SOURCE_ONLY_EDGES: Array<[string, string]> = [
  ["ethereum", "base"],
  ["ethereum", "arbitrum"],
  ["ethereum", "optimism"],
];

function midpoint(a: { x: number; y: number }, b: { x: number; y: number }) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function ChainNode({
  x,
  y,
  name,
  sourceOnly,
}: {
  x: number;
  y: number;
  name: string;
  sourceOnly?: boolean;
}) {
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={sourceOnly ? 30 : 34}
        className="fill-surface"
        stroke="var(--color-ink)"
        strokeWidth={2}
      />
      <circle cx={x} cy={y} r={5} className="fill-accent" />
      <text
        x={x}
        y={y + (sourceOnly ? 48 : 54)}
        textAnchor="middle"
        className="fill-ink font-sans text-[13px] font-semibold"
      >
        {name}
      </text>
      {sourceOnly && (
        <text
          x={x}
          y={y + 64}
          textAnchor="middle"
          className="fill-body font-sans text-[11px]"
        >
          source-only
        </text>
      )}
    </g>
  );
}

export default function ChainsMesh() {
  return (
    <section id="chains" className="w-full bg-white py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex items-center rounded-full bg-badge-bg px-5 py-2 text-lg font-medium text-accent">
            Chains
          </span>
          <h2 className="mt-4 text-5xl md:text-6xl font-bold tracking-tight text-ink">
            A mesh, not a bridge
          </h2>
          <p className="mt-4 max-w-xl text-xl text-body">
            Base, Arbitrum, and Optimism Sepolia are each a source and a
            destination. A payment can move in either direction between any
            two of them. Ethereum Sepolia can send into the mesh but does not
            receive.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="mx-auto w-full max-w-md">
            <svg
              viewBox="0 0 400 430"
              className="w-full"
              role="img"
              aria-label="Diagram showing Base, Arbitrum, and Optimism Sepolia fully interconnected as both source and destination, with Ethereum Sepolia sending into all three as source-only."
            >
              {MESH_EDGES.map(([a, b]) => {
                const pa = POSITIONS[a];
                const pb = POSITIONS[b];
                return (
                  <line
                    key={`${a}-${b}`}
                    x1={pa.x}
                    y1={pa.y}
                    x2={pb.x}
                    y2={pb.y}
                    stroke="var(--color-accent)"
                    strokeWidth={3}
                    strokeLinecap="round"
                  />
                );
              })}

              {SOURCE_ONLY_EDGES.map(([a, b]) => {
                const pa = POSITIONS[a];
                const pb = POSITIONS[b];
                return (
                  <line
                    key={`${a}-${b}`}
                    x1={pa.x}
                    y1={pa.y}
                    x2={pb.x}
                    y2={pb.y}
                    stroke="var(--color-border)"
                    strokeWidth={3}
                    strokeDasharray="6 6"
                    strokeLinecap="round"
                  />
                );
              })}

              {MESH_CHAINS.map((chain) => (
                <ChainNode
                  key={chain.key}
                  x={POSITIONS[chain.key].x}
                  y={POSITIONS[chain.key].y}
                  name={chain.name}
                />
              ))}
              <ChainNode
                x={POSITIONS.ethereum.x}
                y={POSITIONS.ethereum.y}
                name="Ethereum Sepolia"
                sourceOnly
              />
            </svg>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-base text-body">
              <span className="flex items-center gap-2">
                <span className="h-1 w-6 rounded-full bg-accent" />
                source and destination
              </span>
              <span className="flex items-center gap-2">
                <span
                  className="h-0.5 w-6 border-t-2 border-dashed"
                  style={{ borderColor: "var(--color-border)" }}
                />
                source-only
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-border bg-white p-6">
              <p className="text-lg font-semibold text-ink">
                Base, Arbitrum, Optimism Sepolia
              </p>
              <p className="mt-2 text-lg text-body leading-relaxed">
                Full mesh. Every pair of these three chains routes in both
                directions: nine viable (from, to) pairs today.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-white p-6">
              <p className="text-lg font-semibold text-ink">
                Ethereum Sepolia
              </p>
              <p className="mt-2 text-lg text-body leading-relaxed">
                Source-only. Destination liquidity there costs more gas than
                the fee earns, so it sends into the mesh but never receives.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
