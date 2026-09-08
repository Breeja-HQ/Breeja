export const ETHEREUM_SEPOLIA_CHAIN_ID = 11155111;
export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;
export const OPTIMISM_SEPOLIA_CHAIN_ID = 11155420;
// Verified live on 2026-09-08 against docs.arc.io and `cast chain-id` against
// https://rpc.testnet.arc.io. SourceVault/DestPool deployed the same day —
// see docs/DEPLOYMENTS.md. Gated behind ENABLE_ARC so the existing 4-chain
// mesh's behavior is unaffected when Arc is off (the default).
export const ARC_TESTNET_CHAIN_ID = 5_042_002;
// CCTP V2 domain for Arc, per docs.arc.io/arc/references/contract-addresses.
export const ARC_TESTNET_CCTP_DOMAIN = 26;

const ENABLE_ARC = process.env.ENABLE_ARC === "true";

interface ChainRole {
  chainId: number;
  slug: string;
  name: string;
  isDestination: boolean;
  // CCTP V2 domain ID, verified on-chain via MessageTransmitterV2.localDomain() —
  // see docs/DEPLOYMENTS.md. Every chain in this mesh is CCTP-enabled.
  cctpDomain: number;
}

const CHAIN_ROLES: readonly ChainRole[] = [
  { chainId: ETHEREUM_SEPOLIA_CHAIN_ID, slug: "ethereum-sepolia", name: "Ethereum Sepolia", isDestination: false, cctpDomain: 0 },
  { chainId: BASE_SEPOLIA_CHAIN_ID, slug: "base-sepolia", name: "Base Sepolia", isDestination: true, cctpDomain: 6 },
  { chainId: ARBITRUM_SEPOLIA_CHAIN_ID, slug: "arbitrum-sepolia", name: "Arbitrum Sepolia", isDestination: true, cctpDomain: 3 },
  { chainId: OPTIMISM_SEPOLIA_CHAIN_ID, slug: "optimism-sepolia", name: "Optimism Sepolia", isDestination: true, cctpDomain: 2 },
  // Arc is additive and off by default. Set ENABLE_ARC=true (and the
  // ARC_TESTNET_* env vars) to include it — the existing four chains behave
  // identically either way. See docs/CHAINS.md "Arc" and docs/DEPLOYMENTS.md.
  ...(ENABLE_ARC
    ? [
        {
          chainId: ARC_TESTNET_CHAIN_ID,
          slug: "arc-testnet",
          name: "Arc Testnet",
          isDestination: true,
          cctpDomain: ARC_TESTNET_CCTP_DOMAIN,
        },
      ]
    : []),
];

const CHAIN_ROLE_BY_SLUG = new Map<string, ChainRole>(CHAIN_ROLES.map((role) => [role.slug, role]));

const CHAIN_ROLE_BY_ID = new Map<number, ChainRole>(CHAIN_ROLES.map((role) => [role.chainId, role]));

export function isSupportedSourceChain(chainId: number): boolean {
  return CHAIN_ROLE_BY_ID.has(chainId);
}

export function isSupportedDestinationChain(chainId: number): boolean {
  const role = CHAIN_ROLE_BY_ID.get(chainId);
  return role !== undefined && role.isDestination;
}

export function listSourceChainIds(): number[] {
  return CHAIN_ROLES.map((role) => role.chainId);
}

export function listDestinationChainIds(): number[] {
  return CHAIN_ROLES.filter((role) => role.isDestination).map((role) => role.chainId);
}

export function getChainName(chainId: number): string {
  return CHAIN_ROLE_BY_ID.get(chainId)?.name ?? `chain ${chainId}`;
}

export function getChainSlug(chainId: number): string | null {
  return CHAIN_ROLE_BY_ID.get(chainId)?.slug ?? null;
}

export function resolveChainId(ref: string | number): number | null {
  if (typeof ref === "number") return CHAIN_ROLE_BY_ID.has(ref) ? ref : null;
  return CHAIN_ROLE_BY_SLUG.get(ref)?.chainId ?? null;
}

export interface ChainInfo {
  chainId: number;
  slug: string;
  name: string;
  isSource: boolean;
  isDestination: boolean;
}

export function listChainInfo(): ChainInfo[] {
  return CHAIN_ROLES.map((role) => ({
    chainId: role.chainId,
    slug: role.slug,
    name: role.name,
    isSource: true,
    isDestination: role.isDestination,
  }));
}

export function isCctpEnabled(chainId: number): boolean {
  return CHAIN_ROLE_BY_ID.has(chainId);
}

/** Arc readiness, for status endpoints/logs. */
export function getArcStatus(): { flagEnabled: boolean; chainId: number; live: boolean } {
  return { flagEnabled: ENABLE_ARC, chainId: ARC_TESTNET_CHAIN_ID, live: ENABLE_ARC };
}

export function getCctpDomain(chainId: number): number {
  const role = CHAIN_ROLE_BY_ID.get(chainId);
  if (!role) throw new Error(`Unsupported chain: ${chainId}`);
  return role.cctpDomain;
}

export function listRoutePairs(): Array<{ fromChainId: number; toChainId: number }> {
  const pairs: Array<{ fromChainId: number; toChainId: number }> = [];
  for (const from of CHAIN_ROLES) {
    for (const to of CHAIN_ROLES) {
      if (from.chainId === to.chainId || !to.isDestination) continue;
      pairs.push({ fromChainId: from.chainId, toChainId: to.chainId });
    }
  }
  return pairs;
}
