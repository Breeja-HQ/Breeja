import Link from "next/link";

export default function Hero() {
  return (
    <section className="w-full bg-white py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-6 flex flex-col items-center text-center">
        <span className="inline-flex items-center gap-2 bg-badge-bg text-accent rounded-full px-5 py-2 text-lg font-medium">
          <span className="w-2 h-2 rounded-full bg-accent" />
          Live on Testnet
        </span>

        <h1 className="mt-6 font-sans font-semibold tracking-tight text-ink text-6xl md:text-7xl lg:text-8xl max-w-5xl">
          Move stablecoins across chains, gaslessly, in seconds.
        </h1>

        <p className="mt-6 text-body text-2xl leading-relaxed max-w-170">
          Settlement infrastructure other agents can pay through. Send a
          payment yourself, no gas needed on either side.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/pay"
            className="bg-accent text-white rounded-full px-8 py-4 text-xl font-medium hover:opacity-90 transition-opacity"
          >
            Send a payment
          </Link>
          <Link
            href="/docs"
            className="bg-ink text-white rounded-full px-8 py-4 text-xl font-medium hover:opacity-90 transition-colors"
          >
            Read the docs
          </Link>
        </div>
      </div>
    </section>
  );
}
