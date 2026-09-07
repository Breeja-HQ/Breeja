import { describe, it, expect } from "vitest";
import { isFaithful } from "../src/agent/explain.js";
import type { RouteDecision } from "../src/agent/router.js";

const DECISION: RouteDecision = {
  viable: true,
  route: "fast_pool",
  feeBps: 50,
  feeAmount: 5_000n,
  payoutAmount: 995_000n,
  sourceChainGasPriceWei: 0n,
  destChainGasPriceWei: 0n,
  destPoolBalance: 0n,
  destPoolPaused: false,
  estimatedSeconds: 10,
};

describe("isFaithful", () => {
  it("accepts text using only the fee, payout, and estimatedSeconds from the decision", () => {
    const text = "Bridged to Arbitrum Sepolia, fee 0.005 USDC, payout 0.995 USDC, done in 10s.";
    expect(isFaithful(text, DECISION, 6)).toBe(true);
  });

  it("rejects text stating a fee that does not match the decision", () => {
    const text = "Bridged to Arbitrum Sepolia, fee 0.01 USDC, payout 0.995 USDC, done in 10s.";
    expect(isFaithful(text, DECISION, 6)).toBe(false);
  });

  it("rejects text stating an invented time estimate", () => {
    const text = "Bridged to Arbitrum Sepolia, fee 0.005 USDC, payout 0.995 USDC, done in 8s.";
    expect(isFaithful(text, DECISION, 6)).toBe(false);
  });

  it("rejects text with any extra number not traceable to the decision", () => {
    const text = "Bridged to Arbitrum Sepolia, gas cost ~$0.02, fee 0.005 USDC, done in 10s.";
    expect(isFaithful(text, DECISION, 6)).toBe(false);
  });

  it("accepts text with no numbers at all", () => {
    const text = "Bridge complete.";
    expect(isFaithful(text, DECISION, 6)).toBe(true);
  });

  it("accepts payout and estimatedSeconds appearing in either order", () => {
    const text = "Done in 10s — payout 0.995 USDC, fee 0.005 USDC.";
    expect(isFaithful(text, DECISION, 6)).toBe(true);
  });
});
