import Reveal from "./Reveal";

const steps = [
  {
    number: "01",
    label: "Sign",
    description:
      "The payer signs a free EIP-3009 permit off-chain, naming a recipient and amount. No transaction, no gas, no wallet popup surprises.",
  },
  {
    number: "02",
    label: "Relay",
    description:
      "The relayer submits the permit on the source chain and pays the gas. Payer and recipient never hold a gas token on either side.",
  },
  {
    number: "03",
    label: "Release",
    description:
      "A pre-funded pool on the destination chain releases to the named recipient within seconds, gas paid by the relayer.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-surface py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <Reveal>
          <div className="flex flex-col items-center text-center">
            <span className="inline-flex items-center rounded-full bg-badge-bg px-5 py-2 text-lg font-medium text-accent">
              How it Works
            </span>
            <h2 className="mt-4 text-5xl md:text-6xl font-bold tracking-tight text-ink">
              How Breeja moves your money
            </h2>
            <p className="mt-4 max-w-md text-xl text-body">
              One signature, zero gas tokens. Here is the full path from your
              wallet to theirs.
            </p>
          </div>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((step, i) => (
            <Reveal key={step.number} delay={i * 100}>
              <div className="flex flex-col items-center text-center md:items-start md:text-left">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-accent bg-badge-bg text-xl font-bold text-accent">
                  {step.number}
                </div>
                <h3 className="mt-5 text-2xl font-bold text-ink">
                  {step.label}
                </h3>
                <p className="mt-3 text-lg text-body leading-relaxed">{step.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
