import Link from "next/link";
import WalletConnectButton from "./WalletConnectButton";
import { PrivyConnectButton } from "./PrivyConnectButton";
import BreejaLogo from "./BreejaLogo";

export default function Nav() {
  return (
    <nav className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur border-b border-border">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <BreejaLogo className="w-11 h-11 shrink-0" />
          <span className="font-sans font-bold text-2xl tracking-tight text-ink">
            Breeja
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-lg font-medium text-ink">
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
        </div>

        <div className="flex items-center gap-4">
          <PrivyConnectButton />
          <WalletConnectButton />
          <Link
            href="/docs"
            className="hidden sm:inline text-lg font-medium text-ink hover:text-accent transition-colors"
          >
            Docs
          </Link>
          <Link
            href="/pay"
            className="bg-ink text-white rounded-full px-5 py-2.5 text-lg font-medium hover:opacity-90 transition-opacity"
          >
            Send a Payment
          </Link>
        </div>
      </div>
    </nav>
  );
}
