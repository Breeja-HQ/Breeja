import { BreejaError } from "./types.js";
export function resolveChainIdFromList(ref, chains) {
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
export function resolveChainSlugFromList(chainId, chains) {
    const match = chains.find((chain) => chain.chainId === chainId);
    if (!match) {
        throw new BreejaError("UnsupportedChain", `Chain id ${chainId} is not a supported Breeja chain`, { chainId });
    }
    return match.slug;
}
//# sourceMappingURL=chainRefs.js.map