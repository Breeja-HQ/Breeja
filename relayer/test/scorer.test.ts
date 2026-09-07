import { describe, it, expect } from "vitest";
import { scoreRoutes, type CctpCandidate, type FastPoolCandidate } from "../src/agent/scorer.js";

const VIABLE_FAST_POOL: FastPoolCandidate = {
  route: "fast_pool",
  viable: true,
  feeBps: 50,
  feeAmount: 5_000n,
  payoutAmount: 995_000n,
};

const NON_VIABLE_FAST_POOL: FastPoolCandidate = {
  route: "fast_pool",
  viable: false,
  reason: "InsufficientLiquidity",
  feeBps: 0,
  feeAmount: 0n,
  payoutAmount: 0n,
};

const VIABLE_CCTP: CctpCandidate = {
  route: "cctp",
  viable: true,
  feeBps: 0,
  feeAmount: 0n,
  payoutAmount: 1_000_000n,
};

const NON_VIABLE_CCTP: CctpCandidate = {
  route: "cctp",
  viable: false,
  reason: "CctpUnavailable",
  feeBps: 0,
  feeAmount: 0n,
  payoutAmount: 0n,
};

describe("scoreRoutes", () => {
  it("marks fast_pool custodial and cctp trust-minimized", () => {
    const routes = scoreRoutes({ amount: 1_000_000n, fastPool: VIABLE_FAST_POOL, cctp: VIABLE_CCTP });
    const fastPool = routes.find((r) => r.route === "fast_pool")!;
    const cctp = routes.find((r) => r.route === "cctp")!;
    expect(fastPool.custody).toBe("custodial");
    expect(cctp.custody).toBe("trust-minimized");
  });

  it("gives fast_pool a lower estimatedSeconds than cctp when both viable", () => {
    const routes = scoreRoutes({ amount: 1_000_000n, fastPool: VIABLE_FAST_POOL, cctp: VIABLE_CCTP });
    const fastPool = routes.find((r) => r.route === "fast_pool")!;
    const cctp = routes.find((r) => r.route === "cctp")!;
    expect(fastPool.estimatedSeconds).toBeLessThan(cctp.estimatedSeconds);
  });

  describe("default preference (no override) — amount-based threshold", () => {
    it("recommends fast_pool for a small amount below the 1,000 USDC threshold", () => {
      const routes = scoreRoutes({ amount: 1_000_000n, fastPool: VIABLE_FAST_POOL, cctp: VIABLE_CCTP });
      expect(routes[0].route).toBe("fast_pool");
    });

    it("recommends cctp for a large amount at or above the 1,000 USDC threshold", () => {
      const routes = scoreRoutes({ amount: 1_000_000_000n, fastPool: VIABLE_FAST_POOL, cctp: VIABLE_CCTP });
      expect(routes[0].route).toBe("cctp");
    });

    it("quotes the same payment differently just below vs at the threshold", () => {
      const below = scoreRoutes({ amount: 999_999_999n, fastPool: VIABLE_FAST_POOL, cctp: VIABLE_CCTP });
      const atThreshold = scoreRoutes({ amount: 1_000_000_000n, fastPool: VIABLE_FAST_POOL, cctp: VIABLE_CCTP });
      expect(below[0].route).toBe("fast_pool");
      expect(atThreshold[0].route).toBe("cctp");
    });
  });

  describe("preference override", () => {
    it("'fast' always recommends the lower-latency route regardless of amount", () => {
      const routes = scoreRoutes({
        amount: 1_000_000_000n,
        preference: "fast",
        fastPool: VIABLE_FAST_POOL,
        cctp: VIABLE_CCTP,
      });
      expect(routes[0].route).toBe("fast_pool");
    });

    it("'trustless' always recommends cctp over fast_pool when both are viable", () => {
      const routes = scoreRoutes({
        amount: 1_000n,
        preference: "trustless",
        fastPool: VIABLE_FAST_POOL,
        cctp: VIABLE_CCTP,
      });
      expect(routes[0].route).toBe("cctp");
    });

    it("'cheap' recommends whichever route has the lower fee", () => {
      const cheaperCctp: CctpCandidate = { ...VIABLE_CCTP, feeAmount: 0n };
      const pricierFastPool: FastPoolCandidate = { ...VIABLE_FAST_POOL, feeAmount: 5_000n };
      const routes = scoreRoutes({
        amount: 1_000_000n,
        preference: "cheap",
        fastPool: pricierFastPool,
        cctp: cheaperCctp,
      });
      expect(routes[0].route).toBe("cctp");
    });

    it("the same payment quotes differently under 'fast' vs 'trustless'", () => {
      const fast = scoreRoutes({
        amount: 1_000_000n,
        preference: "fast",
        fastPool: VIABLE_FAST_POOL,
        cctp: VIABLE_CCTP,
      });
      const trustless = scoreRoutes({
        amount: 1_000_000n,
        preference: "trustless",
        fastPool: VIABLE_FAST_POOL,
        cctp: VIABLE_CCTP,
      });
      expect(fast[0].route).not.toBe(trustless[0].route);
    });
  });

  describe("liquidity levels / viability", () => {
    it("recommends cctp when fast_pool is not viable due to insufficient liquidity", () => {
      const routes = scoreRoutes({ amount: 1_000n, fastPool: NON_VIABLE_FAST_POOL, cctp: VIABLE_CCTP });
      expect(routes[0].route).toBe("cctp");
      expect(routes[0].viable).toBe(true);
    });

    it("recommends fast_pool when cctp is unavailable", () => {
      const routes = scoreRoutes({ amount: 1_000_000_000n, fastPool: VIABLE_FAST_POOL, cctp: NON_VIABLE_CCTP });
      expect(routes[0].route).toBe("fast_pool");
      expect(routes[0].viable).toBe(true);
    });

    it("returns both routes as non-viable, unranked, when neither works", () => {
      const routes = scoreRoutes({ amount: 1_000_000n, fastPool: NON_VIABLE_FAST_POOL, cctp: NON_VIABLE_CCTP });
      expect(routes.every((r) => !r.viable)).toBe(true);
      expect(routes).toHaveLength(2);
    });

    it("preserves the rejection reason on a non-viable route", () => {
      const routes = scoreRoutes({ amount: 1_000n, fastPool: NON_VIABLE_FAST_POOL, cctp: VIABLE_CCTP });
      const fastPool = routes.find((r) => r.route === "fast_pool")!;
      expect(fastPool.reason).toBe("InsufficientLiquidity");
    });

    it("still prefers trustless over a viable but non-preferred fast_pool", () => {
      const routes = scoreRoutes({
        amount: 1_000n,
        preference: "trustless",
        fastPool: VIABLE_FAST_POOL,
        cctp: NON_VIABLE_CCTP,
      });
      // cctp isn't viable, so fast_pool is the only real option despite the preference
      expect(routes.find((r) => r.viable)?.route).toBe("fast_pool");
    });
  });
});
