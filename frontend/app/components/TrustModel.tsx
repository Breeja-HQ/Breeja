import { CheckCircle2, ShieldCheck, Zap } from "lucide-react";

const MITIGATIONS = [
  "CCTP offered as an alternative route for the same payment.",
  "DestPool owner is a Safe multisig.",
  "Relayer signer is Ledger-backed; release authority is not a hot server key.",
];

export default function TrustModel() {
  return (
    <section id="trust" className="w-full bg-white py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex items-center rounded-full bg-badge-bg px-5 py-2 text-lg font-medium text-accent">
            Trust model
          </span>
          <h2 className="mt-4 text-5xl md:text-6xl font-bold tracking-tight text-ink">
            Custody, stated plainly
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-2 max-w-5xl mx-auto">
          <div className="rounded-xl border-2 border-accent bg-badge-bg p-7">
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-accent">
              <Zap className="h-4 w-4" />
              Fast pool, custodial
            </p>
            <p className="mt-3 text-xl text-ink leading-relaxed">
              The relayer controls DestPool liquidity and decides when to
              release. On this route you trust the relayer&apos;s key and
              solvency, not a trustless message protocol, the same tradeoff
              early Across and Hop made. It&apos;s why the route is fast.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-white p-7">
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-body">
              <ShieldCheck className="h-4 w-4" />
              CCTP, trust-minimized
            </p>
            <p className="mt-3 text-xl text-ink leading-relaxed">
              Circle&apos;s canonical burn-and-mint. Slower, gas-only cost, and
              no pool custody in the loop. Offered as the alternative for the
              same payment.
            </p>
          </div>
        </div>

        <div className="mt-10 max-w-3xl mx-auto rounded-xl border border-border bg-surface p-7">
          <p className="text-lg font-semibold text-ink">Mitigations in place</p>
          <ul className="mt-4 space-y-3">
            {MITIGATIONS.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-lg text-body leading-relaxed">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-lg text-body leading-relaxed border-t border-border pt-5">
            Not present yet, stated rather than implied:{" "}
            <span className="font-semibold text-ink">
              release is not decentralized.
            </span>{" "}
            A bonded watcher network attesting to source deposits before
            release is the next real trust reduction, and it&apos;s out of
            scope for this build.
          </p>
        </div>
      </div>
    </section>
  );
}
