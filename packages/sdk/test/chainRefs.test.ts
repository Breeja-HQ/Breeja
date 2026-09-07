import { describe, expect, it } from "vitest";
import { resolveChainIdFromList, resolveChainSlugFromList } from "../src/chainRefs.js";
import { BreejaError, type ChainInfo } from "../src/types.js";

const FAKE_CHAINS: ChainInfo[] = [
  { chainId: 11155111, slug: "ethereum-sepolia", name: "Ethereum Sepolia", isSource: true, isDestination: false, poolLiquidity: null },
  { chainId: 84532, slug: "base-sepolia", name: "Base Sepolia", isSource: true, isDestination: true, poolLiquidity: "1000000" },
  { chainId: 421614, slug: "arbitrum-sepolia", name: "Arbitrum Sepolia", isSource: true, isDestination: true, poolLiquidity: "2000000" },
];

describe("resolveChainIdFromList", () => {
  it("resolves a known slug to its chain id", () => {
    expect(resolveChainIdFromList("base-sepolia", FAKE_CHAINS)).toBe(84532);
  });

  it("resolves a known numeric chain id to itself", () => {
    expect(resolveChainIdFromList(421614, FAKE_CHAINS)).toBe(421614);
  });

  it("throws BreejaError for an unknown slug", () => {
    expect(() => resolveChainIdFromList("hedera-testnet", FAKE_CHAINS)).toThrow(BreejaError);
  });

  it("throws BreejaError for an unknown chain id", () => {
    expect(() => resolveChainIdFromList(999999, FAKE_CHAINS)).toThrow(BreejaError);
  });

  it("uses the UnsupportedChain error code", () => {
    try {
      resolveChainIdFromList("nonexistent-chain", FAKE_CHAINS);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(BreejaError);
      expect((error as BreejaError).code).toBe("UnsupportedChain");
    }
  });
});

describe("resolveChainSlugFromList", () => {
  it("resolves a known chain id to its slug", () => {
    expect(resolveChainSlugFromList(84532, FAKE_CHAINS)).toBe("base-sepolia");
  });

  it("throws BreejaError for an unknown chain id", () => {
    expect(() => resolveChainSlugFromList(1, FAKE_CHAINS)).toThrow(BreejaError);
  });
});
