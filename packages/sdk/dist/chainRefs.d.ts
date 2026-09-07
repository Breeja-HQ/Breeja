import { type ChainInfo, type ChainRef } from "./types.js";
export declare function resolveChainIdFromList(ref: ChainRef, chains: readonly ChainInfo[]): number;
export declare function resolveChainSlugFromList(chainId: number, chains: readonly ChainInfo[]): string;
