/**
 * Single source of truth for the chain logo marks in `public/chains/`.
 *
 * Five of the six files are the official marks extracted from the installed
 * @rainbow-me/rainbowkit package; hedera.svg is a hand-authored reproduction.
 * Every landing-page surface that shows a chain (ChainsMesh, Partners,
 * PhoneMockupStack, Footer) reads its path and alt text from here so the same
 * chain never picks up two different marks or two different labels.
 */

export type ChainLogoKey =
  | "base"
  | "arbitrum"
  | "optimism"
  | "ethereum"
  | "arc"
  | "hedera";

export interface ChainLogo {
  key: ChainLogoKey;
  /** Full network name, as used in copy and in lib/chains.ts. */
  name: string;
  /** Short label for tight spaces. */
  short: string;
  /** Path under public/, safe to hand straight to next/image. */
  src: string;
}

export const CHAIN_LOGOS: Record<ChainLogoKey, ChainLogo> = {
  base: {
    key: "base",
    name: "Base Sepolia",
    short: "Base",
    src: "/chains/base.svg",
  },
  arbitrum: {
    key: "arbitrum",
    name: "Arbitrum Sepolia",
    short: "Arbitrum",
    src: "/chains/arbitrum.svg",
  },
  optimism: {
    key: "optimism",
    name: "Optimism Sepolia",
    short: "Optimism",
    src: "/chains/optimism.svg",
  },
  ethereum: {
    key: "ethereum",
    name: "Ethereum Sepolia",
    short: "Ethereum",
    src: "/chains/ethereum.svg",
  },
  arc: {
    key: "arc",
    name: "Arc Testnet",
    short: "Arc",
    src: "/chains/arc.svg",
  },
  hedera: {
    key: "hedera",
    name: "Hedera Testnet",
    short: "Hedera",
    src: "/chains/hedera.svg",
  },
};

/** Ordered as the footer and other flat lists read them out. */
export const CHAIN_LOGO_ORDER: readonly ChainLogoKey[] = [
  "base",
  "arbitrum",
  "optimism",
  "arc",
  "hedera",
  "ethereum",
];

export const CHAIN_LOGO_LIST: readonly ChainLogo[] = CHAIN_LOGO_ORDER.map(
  (key) => CHAIN_LOGOS[key],
);

/** Consistent alt text, so a chain reads the same wherever it appears. */
export function chainLogoAlt(key: ChainLogoKey): string {
  return `${CHAIN_LOGOS[key].name} logo`;
}
