import { BreejaError, type ChainInfo, type ChainRef } from "./types.js";

export function resolveChainIdFromList(ref: ChainRef, chains: readonly ChainInfo[]): number {
  if (typeof ref === "number") {
    const match = chains.find((chain) => chain.chainId === ref);
    if (!match) {
      throw new BreejaError("UnsupportedChain", `Chain id ${ref} is not a supported Breeja chain`, { ref });
    }
    return match.chainId;
  }

  const match = chains.find((chain) => chain.slug === ref);
  if (!match) {
    throw new BreejaError("UnsupportedChain", `Chain "${ref}" is not a supported Breeja chain`, { ref });
  }
  return match.chainId;
}

export function resolveChainSlugFromList(chainId: number, chains: readonly ChainInfo[]): string {
  const match = chains.find((chain) => chain.chainId === chainId);
  if (!match) {
    throw new BreejaError("UnsupportedChain", `Chain id ${chainId} is not a supported Breeja chain`, { chainId });
  }
  return match.slug;
}
