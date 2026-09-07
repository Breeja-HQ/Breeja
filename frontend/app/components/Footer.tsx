import Link from "next/link";
import BreejaLogo from "./BreejaLogo";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.05 11.05 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.24 2.76.12 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.7 5.4-5.26 5.68.41.36.78 1.08.78 2.17 0 1.56-.01 2.82-.01 3.2 0 .31.21.67.8.56A10.53 10.53 0 0 0 23.5 12c0-6.27-5.23-11.5-11.5-11.5Z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.9 2H22l-7.6 8.7L23.3 22H16.6l-5.2-6.8L5.4 22H2.3l8.1-9.3L1.5 2h6.9l4.7 6.2Zm-1.2 18h1.7L6.4 3.9H4.6Z" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="w-full bg-white border-t border-border">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-12 md:py-16">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="flex flex-col gap-3">
            <Link href="/" className="flex items-center gap-2">
              <BreejaLogo className="w-9 h-9 shrink-0" />
              <span className="font-sans font-bold text-xl tracking-tight text-ink">
                Breeja
              </span>
            </Link>
            <p className="text-lg text-body max-w-xs">
              Gasless cross-chain settlement, for people and agents.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8">
            <div className="flex flex-wrap items-center gap-6 text-lg font-medium text-ink">
              <Link href="/" className="hover:text-accent transition-colors">
                Home
              </Link>
              <Link href="#how-it-works" className="hover:text-accent transition-colors">
                How it Works
              </Link>
              <Link href="#chains" className="hover:text-accent transition-colors">
                Chains
              </Link>
              <Link href="#faq" className="hover:text-accent transition-colors">
                FAQ
              </Link>
              <Link href="/docs" className="hover:text-accent transition-colors">
                Docs
              </Link>
            </div>

            <div className="flex items-center gap-4 text-body">
              <Link href="#" aria-label="GitHub" className="hover:text-accent transition-colors">
                <GithubIcon className="h-5 w-5" />
              </Link>
              <Link href="#" aria-label="X (Twitter)" className="hover:text-accent transition-colors">
                <XIcon className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-base text-body">
          <p>&copy; 2026 Breeja. Testnet demo.</p>
          <p>Ethereum, Base, Arbitrum &amp; Optimism Sepolia</p>
        </div>
      </div>
    </footer>
  );
}
