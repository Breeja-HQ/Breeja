export const ETHEREUM_SEPOLIA_CHAIN_ID = 11155111;
export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;
export const OPTIMISM_SEPOLIA_CHAIN_ID = 11155420;

interface ChainRole {
  chainId: number;
  name: string;
  isDestination: boolean;
}

const CHAIN_ROLES: readonly ChainRole[] = [
  { chainId: ETHEREUM_SEPOLIA_CHAIN_ID, name: "Ethereum Sepolia", isDestination: false },
  { chainId: BASE_SEPOLIA_CHAIN_ID, name: "Base Sepolia", isDestination: true },
  { chainId: ARBITRUM_SEPOLIA_CHAIN_ID, name: "Arbitrum Sepolia", isDestination: true },
  { chainId: OPTIMISM_SEPOLIA_CHAIN_ID, name: "Optimism Sepolia", isDestination: true },
];

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
