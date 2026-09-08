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
// Verified live on 2026-09-08 via `cast chain-id` against
// https://testnet.hashio.io/api. Deployed the same day — see
// docs/DEPLOYMENTS.md. Gated behind ENABLE_HEDERA so the existing mesh's
// behavior is unaffected when Hedera is off (the default).
export const HEDERA_TESTNET_CHAIN_ID = 296;

const ENABLE_ARC = process.env.ENABLE_ARC === "true";
const ENABLE_HEDERA = process.env.ENABLE_HEDERA === "true";

interface ChainRole {
  chainId: number;
  slug: string;
  name: string;
  isDestination: boolean;
  // CCTP V2 domain ID, verified on-chain via MessageTransmitterV2.localDomain() —
  // see docs/DEPLOYMENTS.md. `null` means the chain has no CCTP route at all
  // (Hedera: confirmed no CCTP support, per docs/CHAINS.md) — fast pool only.
  cctpDomain: number | null;
  // Whether this chain's USDC implements EIP-3009 (transferWithAuthorization /
  // DOMAIN_SEPARATOR / authorizationState), verified on-chain per docs/CHAINS.md.
  // false means the gasless signed-permit deposit path (depositWithAuthorization)
  // is unusable — the only deposit path is approve() + deposit(), and the payer
  // pays their own gas for approve() (confirmed false for Hedera; see
  // docs/CHAINS.md "Hedera").
  supportsEip3009: boolean;
}

const CHAIN_ROLES: readonly ChainRole[] = [
  { chainId: ETHEREUM_SEPOLIA_CHAIN_ID, slug: "ethereum-sepolia", name: "Ethereum Sepolia", isDestination: false, cctpDomain: 0, supportsEip3009: true },
  { chainId: BASE_SEPOLIA_CHAIN_ID, slug: "base-sepolia", name: "Base Sepolia", isDestination: true, cctpDomain: 6, supportsEip3009: true },
  { chainId: ARBITRUM_SEPOLIA_CHAIN_ID, slug: "arbitrum-sepolia", name: "Arbitrum Sepolia", isDestination: true, cctpDomain: 3, supportsEip3009: true },
  { chainId: OPTIMISM_SEPOLIA_CHAIN_ID, slug: "optimism-sepolia", name: "Optimism Sepolia", isDestination: true, cctpDomain: 2, supportsEip3009: true },
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
          supportsEip3009: true,
        },
      ]
    : []),
  // Hedera is additive and off by default. Set ENABLE_HEDERA=true (and the
  // HEDERA_TESTNET_* env vars) to include it — the existing chains behave
  // identically either way. No CCTP domain: Hedera has no CCTP support, so
  // cctpDomain is null and isCctpEnabled()/getCctpDomain() reflect that —
  // this chain only ever quotes/routes via fast_pool. supportsEip3009 is
  // false: confirmed on-chain (DOMAIN_SEPARATOR()/authorizationState() both
  // revert against the real USDC HTS token) — see docs/CHAINS.md "Hedera"
  // and docs/DEPLOYMENTS.md.
  ...(ENABLE_HEDERA
    ? [
        {
          chainId: HEDERA_TESTNET_CHAIN_ID,
          slug: "hedera-testnet",
          name: "Hedera Testnet",
          isDestination: true,
          cctpDomain: null,
          supportsEip3009: false,
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

// A chain is CCTP-enabled only when it's registered AND carries a real CCTP
// domain. Hedera is registered (fast pool works) but has cctpDomain: null —
// confirmed no CCTP support, see docs/CHAINS.md — so this correctly reports
// false for it and router.ts's buildCctpCandidate must check this before
// ever calling getCctpDomain.
export function isCctpEnabled(chainId: number): boolean {
  const role = CHAIN_ROLE_BY_ID.get(chainId);
  return role !== undefined && role.cctpDomain !== null;
}

// false for an unregistered chain too — callers should already have checked
// isSupportedSourceChain before relying on this.
export function supportsEip3009(chainId: number): boolean {
  return CHAIN_ROLE_BY_ID.get(chainId)?.supportsEip3009 ?? false;
}

/** Arc readiness, for status endpoints/logs. */
export function getArcStatus(): { flagEnabled: boolean; chainId: number; live: boolean } {
  return { flagEnabled: ENABLE_ARC, chainId: ARC_TESTNET_CHAIN_ID, live: ENABLE_ARC };
}

/** Hedera readiness, for status endpoints/logs. */
export function getHederaStatus(): { flagEnabled: boolean; chainId: number; live: boolean } {
  return { flagEnabled: ENABLE_HEDERA, chainId: HEDERA_TESTNET_CHAIN_ID, live: ENABLE_HEDERA };
}

export function getCctpDomain(chainId: number): number {
  const role = CHAIN_ROLE_BY_ID.get(chainId);
  if (!role) throw new Error(`Unsupported chain: ${chainId}`);
  if (role.cctpDomain === null) throw new Error(`Chain ${chainId} has no CCTP domain (fast pool only)`);
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
