import Image from "next/image";
import { ArrowUpFromLine, Fuel, Repeat } from "lucide-react";

import { CHAIN_LOGOS } from "../../lib/chainLogos";
import Reveal from "./Reveal";

/**
 * Logo-forward chains section. The five full-mesh chains sit on a ring with a
 * soft connecting web behind them; Ethereum Sepolia sits below as the
 * source-only feeder. Copy is deliberately minimal: the badges carry the two
 * exceptions (source only, not gasless) that a paragraph used to carry.
 */

const RING_SIZE = 460;
const RING_CENTER = RING_SIZE / 2;
const RING_RADIUS = 168;
// Five evenly spaced positions with one at top centre.
const RING_ANGLES = [-90, -18, 54, 126, 198];

type MeshChain = {
  key: string;
  name: string;
  short: string;
  logo: string;
  /** Percentage offsets used to position the logo tile inside the ring box. */
  left: number;
  top: number;
  note?: string;
};

function ringPoint(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    left: ((RING_CENTER + RING_RADIUS * Math.cos(rad)) / RING_SIZE) * 100,
    top: ((RING_CENTER + RING_RADIUS * Math.sin(rad)) / RING_SIZE) * 100,
  };
}

const RING_CHAINS: MeshChain[] = (
  [
    { ...CHAIN_LOGOS.base, logo: CHAIN_LOGOS.base.src },
    { ...CHAIN_LOGOS.arbitrum, logo: CHAIN_LOGOS.arbitrum.src },
    { ...CHAIN_LOGOS.hedera, logo: CHAIN_LOGOS.hedera.src, note: "not gasless" },
    { ...CHAIN_LOGOS.arc, logo: CHAIN_LOGOS.arc.src },
    { ...CHAIN_LOGOS.optimism, logo: CHAIN_LOGOS.optimism.src },
  ] as const
).map((chain, i) => ({ ...chain, ...ringPoint(RING_ANGLES[i]) }));

const SOURCE_CHAIN = {
  ...CHAIN_LOGOS.ethereum,
  logo: CHAIN_LOGOS.ethereum.src,
  note: "source only",
};

// Every pair of ring chains, drawn as the soft web behind the logos.
const MESH_EDGES: Array<[number, number]> = [];
for (let i = 0; i < RING_ANGLES.length; i += 1) {
  for (let j = i + 1; j < RING_ANGLES.length; j += 1) {
    MESH_EDGES.push([i, j]);
  }
}

function edgeCoords(i: number) {
  const rad = (RING_ANGLES[i] * Math.PI) / 180;
  return {
    x: RING_CENTER + RING_RADIUS * Math.cos(rad),
    y: RING_CENTER + RING_RADIUS * Math.sin(rad),
  };
}

function ChainTile({
  logo,
  name,
  short,
  note,
  index,
  size = 76,
}: {
  logo: string;
  name: string;
  short: string;
  note?: string;
  index: number;
  size?: number;
}) {
  return (
    <div
      className="chain-tile group flex flex-col items-center"
      style={{ ["--chain-delay" as string]: `${index * 620}ms` }}
    >
      <span
        className="chain-mark relative flex items-center justify-center rounded-3xl border border-border bg-surface shadow-sm"
        style={{ width: size, height: size }}
      >
        <Image
          src={logo}
          alt={`${name} logo`}
          width={size - 26}
          height={size - 26}
          className="rounded-full"
        />
      </span>
      <span className="mt-3 text-base font-semibold text-ink">{short}</span>
      {note ? (
        <span className="mt-1 rounded-full bg-badge-bg px-2.5 py-0.5 text-xs font-medium text-accent">
          {note}
        </span>
      ) : null}
    </div>
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
            <p className="mt-4 max-w-xl text-xl text-body leading-relaxed">
              Five chains, every direction. Pay from any of them, land on any of
              them.
            </p>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="breeja-chains mt-14 flex flex-col items-center">
            {/* Narrow screens: a plain grid, where a 460px ring would crowd. */}
            <div className="grid w-full max-w-sm grid-cols-3 gap-x-4 gap-y-8 sm:hidden">
              {RING_CHAINS.map((chain, i) => (
                <ChainTile
                  key={chain.key}
                  logo={chain.logo}
                  name={chain.name}
                  short={chain.short}
                  note={chain.note}
                  index={i}
                  size={64}
                />
              ))}
            </div>

            {/* Ring: five full-mesh chains over a soft connecting web. */}
            <div
              className="relative hidden w-full max-w-115 sm:block"
              style={{ aspectRatio: "1 / 1" }}
            >
              <svg
                viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
                className="absolute inset-0 h-full w-full"
                aria-hidden="true"
              >
                <circle
                  cx={RING_CENTER}
                  cy={RING_CENTER}
                  r={RING_RADIUS}
                  fill="none"
                  stroke="var(--color-border)"
                  strokeWidth={1.5}
                />
                {MESH_EDGES.map(([a, b]) => {
                  const p = edgeCoords(a);
                  const q = edgeCoords(b);
                  return (
                    <line
                      key={`${a}-${b}`}
                      className="chain-edge"
                      x1={p.x}
                      y1={p.y}
                      x2={q.x}
                      y2={q.y}
                      stroke="var(--color-accent)"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                    />
                  );
                })}
              </svg>

              {RING_CHAINS.map((chain, i) => (
                <div
                  key={chain.key}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${chain.left}%`, top: `${chain.top}%` }}
                >
                  <ChainTile
                    logo={chain.logo}
                    name={chain.name}
                    short={chain.short}
                    note={chain.note}
                    index={i}
                  />
                </div>
              ))}
            </div>

            {/* Source-only chain, set apart below the ring. */}
            <div className="mt-10 flex flex-col items-center sm:mt-2">
              <span
                className="hidden h-10 w-px sm:block"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(to bottom, var(--color-border) 0 5px, transparent 5px 10px)",
                }}
                aria-hidden="true"
              />
              <div className="mt-3">
                <ChainTile
                  logo={SOURCE_CHAIN.logo}
                  name={SOURCE_CHAIN.name}
                  short={SOURCE_CHAIN.short}
                  note={SOURCE_CHAIN.note}
                  index={RING_CHAINS.length}
                  size={64}
                />
              </div>
            </div>

            {/* Compact legend: three short lines instead of three cards. */}
            <div className="mt-12 flex flex-col items-center gap-3 text-base text-body sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-8">
              <span className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-accent" aria-hidden="true" />
                Base, Arbitrum, Optimism, Arc, Hedera route both ways
              </span>
              <span className="flex items-center gap-2">
                <ArrowUpFromLine
                  className="h-4 w-4 text-accent"
                  aria-hidden="true"
                />
                Ethereum Sepolia sends only
              </span>
              <span className="flex items-center gap-2">
                <Fuel className="h-4 w-4 text-accent" aria-hidden="true" />
                Hedera is the one chain where you pay your own gas
              </span>
            </div>

            <style>{`
              .breeja-chains .chain-edge {
                stroke-opacity: 0.28;
                animation: breeja-chain-web 12s ease-in-out infinite;
              }
              .breeja-chains .chain-mark {
                animation: breeja-chain-float 9s ease-in-out infinite;
                animation-delay: var(--chain-delay, 0ms);
                transition: transform 320ms ease-out, box-shadow 320ms ease-out;
              }
              .breeja-chains .chain-tile:hover .chain-mark {
                transform: translateY(-3px) scale(1.04);
                box-shadow: 0 10px 24px -12px var(--color-accent);
              }
              @keyframes breeja-chain-web {
                0%, 100% { stroke-opacity: 0.16; }
                50% { stroke-opacity: 0.4; }
              }
              @keyframes breeja-chain-float {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-5px); }
              }
              @media (prefers-reduced-motion: reduce) {
                .breeja-chains .chain-edge,
                .breeja-chains .chain-mark {
                  animation: none;
                  stroke-opacity: 0.28;
                  transform: none;
                  transition: none;
                }
                .breeja-chains .chain-tile:hover .chain-mark {
                  transform: none;
                }
              }
            `}</style>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
