import { arbitrumSepolia, arcTestnet, baseSepolia, optimismSepolia, sepolia } from "viem/chains";
import type { Chain } from "viem";

export type ChainSlug =
  | "base-sepolia"
  | "arbitrum-sepolia"
  | "optimism-sepolia"
  | "ethereum-sepolia"
  | "arc-testnet";

export interface ChainConfig {
  slug: ChainSlug;
  chainId: number;
  name: string;
  viemChain: Chain;
  isDestination: boolean;
  sourceVaultAddress: `0x${string}`;
  destPoolAddress: `0x${string}` | null;
  usdcAddress: `0x${string}`;
  explorerTxUrl: (hash: string) => string;
}

// Deployed addresses per docs/DEPLOYMENTS.md. Never guess an address here —
// update this file only after a real deploy is recorded in that doc.
export const CHAINS: readonly ChainConfig[] = [
  {
    slug: "ethereum-sepolia",
    chainId: 11155111,
    name: "Ethereum Sepolia",
    viemChain: sepolia,
    isDestination: false,
    sourceVaultAddress: "0xcD0dC65c8d64A5D135180bFCA530398f4F2b2424",
    destPoolAddress: null,
    usdcAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    explorerTxUrl: (hash) => `https://sepolia.etherscan.io/tx/${hash}`,
  },
  {
    slug: "base-sepolia",
    chainId: 84532,
    name: "Base Sepolia",
    viemChain: baseSepolia,
    isDestination: true,
    sourceVaultAddress: "0x552431953dd3F087557196A383c436ddAab665ab",
    destPoolAddress: "0x45944B08fea203a7469C82A690F68fabF85B8283",
    usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    explorerTxUrl: (hash) => `https://sepolia.basescan.org/tx/${hash}`,
  },
  {
    slug: "arbitrum-sepolia",
    chainId: 421614,
    name: "Arbitrum Sepolia",
    viemChain: arbitrumSepolia,
    isDestination: true,
    sourceVaultAddress: "0x5471bab4fC78A946cDC3142d852e54cBD83C181e",
    destPoolAddress: "0xaA45094129D06ab48AEf1e8251071067FC4FED5A",
    usdcAddress: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    explorerTxUrl: (hash) => `https://sepolia.arbiscan.io/tx/${hash}`,
  },
  {
    slug: "optimism-sepolia",
    chainId: 11155420,
    name: "Optimism Sepolia",
    viemChain: optimismSepolia,
    isDestination: true,
    sourceVaultAddress: "0x2d18B34880cc67DA1358f8963906492e0d01a567",
    destPoolAddress: "0xA5dd225Beb2Ec0009Fe143eb0B9309Ba07d23737",
    usdcAddress: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
    explorerTxUrl: (hash) => `https://sepolia-optimism.etherscan.io/tx/${hash}`,
  },
  {
    slug: "arc-testnet",
    chainId: 5_042_002,
    name: "Arc Testnet",
    viemChain: arcTestnet,
    isDestination: true,
    sourceVaultAddress: "0xfd2f67cD354545712f9d8230170015d7e30d133A",
    destPoolAddress: "0xA5dd225Beb2Ec0009Fe143eb0B9309Ba07d23737",
    usdcAddress: "0x3600000000000000000000000000000000000000",
    explorerTxUrl: (hash) => `https://testnet.arcscan.app/tx/${hash}`,
  },
];

export const SOURCE_CHAINS = CHAINS;
export const DESTINATION_CHAINS = CHAINS.filter((c) => c.isDestination);

export function getChainBySlug(slug: string): ChainConfig | null {
  return CHAINS.find((c) => c.slug === slug) ?? null;
}

export function getChainById(chainId: number): ChainConfig | null {
  return CHAINS.find((c) => c.chainId === chainId) ?? null;
}
