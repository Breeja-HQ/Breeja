import Reveal from "./Reveal";

type Point = { x: number; y: number };

const SIZE = 520;
const CENTER: Point = { x: 260, y: 235 };
const RADIUS = 165;
const NODE_R = 38;
const SOURCE_R = 33;

// Five full-mesh chains evenly on a circle, one at top center.
const RING_ANGLES = [-90, -18, 54, 126, 198];

function polar(angleDeg: number, radius: number): Point {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: CENTER.x + radius * Math.cos(rad),
    y: CENTER.y + radius * Math.sin(rad),
  };
}

type LabelPlacement = {
  dx: number;
  dy: number;
  anchor: "start" | "middle" | "end";
};

type MeshChain = {
  key: string;
  name: string;
  pos: Point;
  label: LabelPlacement;
};

// Label offsets are per-position so nothing collides with a circle or a
// neighbouring label: top label sits above, side labels sit outside, bottom
// labels sit below and are nudged outward.
const RING_LABELS: LabelPlacement[] = [
  { dx: 0, dy: -NODE_R - 16, anchor: "middle" }, // top
  { dx: NODE_R + 12, dy: 6, anchor: "start" }, // upper right
  { dx: 10, dy: NODE_R + 28, anchor: "middle" }, // lower right
  { dx: -10, dy: NODE_R + 28, anchor: "middle" }, // lower left
  { dx: -NODE_R - 12, dy: 6, anchor: "end" }, // upper left
];

const MESH_CHAINS: MeshChain[] = [
  "Base Sepolia",
  "Arbitrum Sepolia",
  "Hedera Testnet",
  "Arc Testnet",
  "Optimism Sepolia",
].map((name, i) => ({
  key: name.toLowerCase().replace(/\s+/g, "-"),
  name,
  pos: polar(RING_ANGLES[i], RADIUS),
  label: RING_LABELS[i],
}));

const SOURCE_NODE = {
  key: "ethereum-sepolia",
  name: "Ethereum Sepolia",
  pos: { x: CENTER.x, y: CENTER.y + RADIUS + 155 },
};

const MESH_EDGES: Array<[MeshChain, MeshChain]> = [];
for (let i = 0; i < MESH_CHAINS.length; i += 1) {
  for (let j = i + 1; j < MESH_CHAINS.length; j += 1) {
    MESH_EDGES.push([MESH_CHAINS[i], MESH_CHAINS[j]]);
  }
}

// The source-only chain feeds the two nearest ring nodes plus the top node,
// enough to read as "sends into the mesh" without a thicket of dashes.
const SOURCE_TARGETS = [MESH_CHAINS[2], MESH_CHAINS[3]];

function ChainNode({
  pos,
  name,
  label,
  sourceOnly,
  index,
}: {
  pos: Point;
  name: string;
  label: LabelPlacement;
  sourceOnly?: boolean;
  index: number;
}) {
  const r = sourceOnly ? SOURCE_R : NODE_R;
  return (
    <g
      className="mesh-node"
      style={{ animationDelay: `${index * 110}ms`, transformOrigin: `${pos.x}px ${pos.y}px` }}
    >
      <circle
        cx={pos.x}
        cy={pos.y}
        r={r}
        className="fill-surface"
        stroke="var(--color-ink)"
        strokeWidth={2}
      />
      <circle cx={pos.x} cy={pos.y} r={6} className="fill-accent" />
      <text
        x={pos.x + label.dx}
        y={pos.y + label.dy}
        textAnchor={label.anchor}
        className="fill-ink font-sans text-[14px] font-semibold"
      >
        {name}
      </text>
      {sourceOnly && (
        <text
          x={pos.x + label.dx}
          y={pos.y + label.dy + 20}
          textAnchor={label.anchor}
          className="fill-body font-sans text-[12px]"
        >
          source only
        </text>
      )}
    </g>
  );
}

export default function ChainsMesh() {
  return (
    <section id="chains" className="w-full bg-white py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <Reveal>
          <div className="flex flex-col items-center text-center">
            <span className="inline-flex items-center rounded-full bg-badge-bg px-5 py-2 text-lg font-medium text-accent">
              Chains
            </span>
            <h2 className="mt-4 text-5xl md:text-6xl font-bold tracking-tight text-ink">
              A mesh, not a bridge
            </h2>
            <p className="mt-4 max-w-2xl text-xl text-body leading-relaxed">
              Base, Arbitrum, Optimism, Arc, and Hedera are each a source and a
              destination. A payment can move in either direction between any
              two of them. Ethereum Sepolia sends into the mesh but does not
              receive.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <Reveal>
            <div className="mx-auto w-full max-w-xl">
              <svg
                viewBox={`0 0 ${SIZE} ${SIZE}`}
                className="w-full breeja-mesh"
                role="img"
                aria-label="Diagram of the Breeja chain mesh: Base Sepolia, Arbitrum Sepolia, Optimism Sepolia, Arc Testnet and Hedera Testnet are fully interconnected as both source and destination, with Ethereum Sepolia sending into the mesh as a source-only chain."
              >
                <style>{`
                  .breeja-mesh .mesh-edge {
                    stroke-opacity: 0.85;
                    animation: breeja-mesh-pulse 7s ease-in-out infinite;
                  }
                  .breeja-mesh .mesh-dash {
                    animation: breeja-mesh-drift 9s linear infinite;
                  }
                  .breeja-mesh .mesh-node {
                    opacity: 0;
                    transform: scale(0.94);
                    animation: breeja-mesh-in 900ms ease-out forwards;
                  }
                  @keyframes breeja-mesh-pulse {
                    0%, 100% { stroke-opacity: 0.5; }
                    50% { stroke-opacity: 1; }
                  }
                  @keyframes breeja-mesh-drift {
                    from { stroke-dashoffset: 0; }
                    to { stroke-dashoffset: -28; }
                  }
                  @keyframes breeja-mesh-in {
                    from { opacity: 0; transform: scale(0.94); }
                    to { opacity: 1; transform: scale(1); }
                  }
                  @media (prefers-reduced-motion: reduce) {
                    .breeja-mesh .mesh-edge,
                    .breeja-mesh .mesh-dash,
                    .breeja-mesh .mesh-node {
                      animation: none;
                      opacity: 1;
                      transform: none;
                      stroke-opacity: 0.85;
                    }
                  }
                `}</style>

                {MESH_EDGES.map(([a, b], i) => (
                  <line
                    key={`${a.key}-${b.key}`}
                    className="mesh-edge"
                    x1={a.pos.x}
                    y1={a.pos.y}
                    x2={b.pos.x}
                    y2={b.pos.y}
                    stroke="var(--color-accent)"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    style={{ animationDelay: `${i * 420}ms` }}
                  />
                ))}

                {SOURCE_TARGETS.map((target) => (
                  <line
                    key={`source-${target.key}`}
                    className="mesh-dash"
                    x1={SOURCE_NODE.pos.x}
                    y1={SOURCE_NODE.pos.y}
                    x2={target.pos.x}
                    y2={target.pos.y}
                    stroke="var(--color-border)"
                    strokeWidth={3}
                    strokeDasharray="7 7"
                    strokeLinecap="round"
                  />
                ))}

                {MESH_CHAINS.map((chain, i) => (
                  <ChainNode
                    key={chain.key}
                    index={i}
                    pos={chain.pos}
                    name={chain.name}
                    label={chain.label}
                  />
                ))}

                <ChainNode
                  index={MESH_CHAINS.length}
                  pos={SOURCE_NODE.pos}
                  name={SOURCE_NODE.name}
                  label={{ dx: 0, dy: SOURCE_R + 24, anchor: "middle" }}
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
                  source only
                </span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-border bg-white p-6">
                <p className="text-lg font-semibold text-ink">
                  Base, Arbitrum, Optimism, Arc, Hedera
                </p>
                <p className="mt-2 text-lg text-body leading-relaxed">
                  Full mesh. Every pair of these five chains routes in both
                  directions, twenty viable from-to pairs today. On Base,
                  Arbitrum, Optimism, and Arc the payer signs an EIP-3009
                  permit and the relayer pays the gas.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-white p-6">
                <p className="text-lg font-semibold text-ink">
                  Hedera is not gasless
                </p>
                <p className="mt-2 text-lg text-body leading-relaxed">
                  USDC on Hedera does not implement EIP-3009, so there is no
                  permit to sign. The payer approves and pays their own gas on
                  that leg. Routing, speed, and the destination release work
                  exactly as they do everywhere else.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-white p-6">
                <p className="text-lg font-semibold text-ink">
                  Ethereum Sepolia
                </p>
                <p className="mt-2 text-lg text-body leading-relaxed">
                  Source only. Destination liquidity there costs more gas than
                  the fee earns, so it sends into the mesh but never receives.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
