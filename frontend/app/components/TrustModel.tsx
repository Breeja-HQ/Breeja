import { CheckCircle2, CircleDashed, ShieldCheck, Zap } from "lucide-react";
import Reveal from "./Reveal";

// Only list what is actually true of the deployed contracts today. A Safe
// multisig owner and a Ledger-backed signer were both planned and are both
// still unimplemented: docs/DEPLOYMENTS.md records one EOA as deployer,
// relayer and owner on every chain. Claiming them here would be a false
// statement on the one page whose whole job is honest disclosure.
const MITIGATIONS = [
  "CCTP offered as an alternative route for the same payment, with no pool custody in the loop.",
  "Release is replay-protected on-chain: DestPool records every source reference it has paid, so the same deposit can never be released twice.",
  "Payment state is durable and forward-only. A terminal payment is never rewritten, and a reconciler recovers anything left in flight by a restart.",
];

const NOT_YET = [
  "The relayer key is a hot server key. A hardware-backed signer and a Safe multisig owner are both planned and neither is deployed.",
  "Release is not decentralized. A bonded watcher network attesting to source deposits before release is the next real trust reduction.",
];

export default function TrustModel() {
  return (
    <section id="trust" className="w-full bg-white py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <Reveal>
          <div className="flex flex-col items-center text-center">
            <span className="inline-flex items-center rounded-full bg-badge-bg px-5 py-2 text-lg font-medium text-accent">
              Trust model
            </span>
            <h2 className="mt-4 text-5xl md:text-6xl font-bold tracking-tight text-ink">
              Custody, stated plainly
            </h2>
          </div>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-2 max-w-5xl mx-auto">
          <Reveal>
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
          </Reveal>

          <Reveal delay={120}>
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
          </Reveal>
        </div>

        <Reveal>
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
          <div className="mt-6 border-t border-border pt-5">
            <p className="text-lg font-semibold text-ink">
              Not present yet, stated rather than implied
            </p>
            <ul className="mt-4 space-y-3">
              {NOT_YET.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-lg text-body leading-relaxed">
                  <CircleDashed className="mt-0.5 h-5 w-5 shrink-0 text-body" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        </Reveal>
      </div>
    </section>
  );
}
