import Link from "next/link";

interface Partner {
  name: string;
  mark: string;
  description: string;
  href: string;
}

// Listed only where the integration is live and verified end to end. Evidence
// per entry lives in docs/DEPLOYMENTS.md (round trips), subgraph/ (Studio
// deployments) and packages/. Privy is deliberately absent: the code compiles
// and is wired, but NEXT_PUBLIC_PRIVY_APP_ID is unset and no real login plus
// signature has ever been run, so per docs/PARTNERS.md it does not qualify.
const PARTNERS: Partner[] = [
  {
    name: "Circle CCTP",
    mark: "C",
    description:
      "Burn-and-mint offered as the trust-minimized route for the same payment, alongside the fast pool",
    href: "/docs/chains",
  },
  {
    name: "Circle Arc",
    mark: "A",
    description:
      "Arc Testnet runs the full mesh on native USDC, with a live verified round trip out to Base Sepolia",
    href: "/docs/live-chains",
  },
  {
    name: "The Graph",
    mark: "G",
    description:
      "Three subgraphs deployed to Subgraph Studio, merged at query time to power the payment history dashboard",
    href: "/docs/history",
  },
  {
    name: "ENS",
    mark: "E",
    description:
      "Resolve payment recipients by name, and reverse-resolve them for display, in both the widget and the SDK",
    href: "/docs/ens",
  },
  {
    name: "Hedera",
    mark: "H",
    description:
      "Deployed with a live verified round trip. Hedera's USDC has no EIP-3009, so the payer approves and pays their own gas there",
    href: "/docs/chains",
  },
  {
    name: "Breeja SDK and MCP",
    mark: "B",
    description:
      "npm install @breeja/sdk, plus an MCP server so any agent can call the rail directly",
    href: "/docs/mcp",
  },
];

function PartnerMark({ mark }: { mark: string }) {
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-badge-bg text-lg font-bold text-accent">
      {mark}
    </span>
  );
}

export default function Partners() {
  return (
    <section id="partners" className="w-full bg-white py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex items-center rounded-full bg-badge-bg px-5 py-2 text-lg font-medium text-accent">
            Integrations
          </span>
          <h2 className="mt-4 text-5xl md:text-6xl font-bold tracking-tight text-ink">
            What&apos;s actually wired in
          </h2>
          <p className="mt-4 max-w-2xl text-xl text-body">
            Only listed here once it works end to end, with a deploy or a round
            trip you can check. No aspirational logos.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {PARTNERS.map((partner) => (
            <Link
              key={partner.name}
              href={partner.href}
              className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-7 hover:border-accent transition-colors"
            >
              <PartnerMark mark={partner.mark} />
              <div>
                <p className="text-xl font-semibold text-ink">{partner.name}</p>
                <p className="mt-2 text-lg text-body leading-relaxed">
                  {partner.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
