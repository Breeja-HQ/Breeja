import Link from "next/link";

interface Partner {
  name: string;
  description: string;
  href: string;
}

const PARTNERS: Partner[] = [
  {
    name: "Circle",
    description: "CCTP settlement route, a trust-minimized alternative to the fast pool",
    href: "/docs/routing",
  },
  {
    name: "ENS",
    description: "Resolve payment recipients by name, both in the widget and the SDK",
    href: "/docs/ens",
  },
  {
    name: "Breeja SDK + MCP",
    description: "npm install @breeja/sdk, plus an MCP server so any agent can call it directly",
    href: "/docs",
  },
];

function PartnerMark({ name }: { name: string }) {
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-badge-bg text-lg font-bold text-accent">
      {name.charAt(0)}
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
            What's actually wired in
          </h2>
          <p className="mt-4 max-w-xl text-xl text-body">
            Only listed here once it works end to end. No aspirational logos.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 max-w-3xl mx-auto">
          {PARTNERS.map((partner) => (
            <Link
              key={partner.name}
              href={partner.href}
              className="flex items-start gap-4 rounded-xl border border-border bg-white p-6 hover:border-accent transition-colors"
            >
              <PartnerMark name={partner.name} />
              <div>
                <p className="text-xl font-semibold text-ink">{partner.name}</p>
                <p className="mt-1 text-lg text-body leading-relaxed">{partner.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
