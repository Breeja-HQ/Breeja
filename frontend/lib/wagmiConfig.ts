import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { CHAINS } from "./chains";

const viemChains = CHAINS.map((c) => c.viemChain) as [
  (typeof CHAINS)[number]["viemChain"],
  ...(typeof CHAINS)[number]["viemChain"][],
];

// RainbowKit refuses to initialize with an empty projectId, including at
// build time when prerendering pages that pull in Providers. This fallback
// unblocks local builds/demos; a real deploy needs a WalletConnect Cloud
// project id in NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID or wallet connection
// will not work in production.
const FALLBACK_PROJECT_ID = "00000000000000000000000000000000";

export const wagmiConfig = getDefaultConfig({
  appName: "Breeja",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || FALLBACK_PROJECT_ID,
  chains: viemChains,
  ssr: true,
});
