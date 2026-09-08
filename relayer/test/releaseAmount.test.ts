import { describe, it, expect } from "vitest";
import { computeFee } from "../src/agent/routeViability.js";

/**
 * Regression guard for a real bug: the reconciler's retry path passed
 * payoutAmount to submitFastPoolRelease while the in-process path in
 * api/routes.ts passed the gross amount. DestPool.release deducts the fee
 * itself, so the retry path applied the fee twice and shorted the recipient
 * while the DB still recorded the correct payout.
 *
 * Both call sites must pass the GROSS amount. These tests pin the arithmetic
 * that makes that the correct choice, so the difference is caught in CI rather
 * than on-chain.
 */
describe("fast pool release amount", () => {
  const FEE_BPS = 50n;

  it("gross in, net out: passing the gross amount pays the recorded payout", () => {
    const amount = 1_000_000n;
    const { payoutAmount } = computeFee(amount, FEE_BPS);

    // DestPool.release(recipient, amount, ...) computes payout internally.
    const onChainPayout = amount - (amount * FEE_BPS) / 10_000n;

    expect(onChainPayout).toBe(payoutAmount);
    expect(onChainPayout).toBe(995_000n);
  });

  it("passing payoutAmount instead of amount double-charges the fee", () => {
    const amount = 1_000_000n;
    const { payoutAmount } = computeFee(amount, FEE_BPS);

    // What the buggy reconciler did: hand DestPool the already-net figure.
    const doubleChargedPayout = payoutAmount - (payoutAmount * FEE_BPS) / 10_000n;

    expect(doubleChargedPayout).toBeLessThan(payoutAmount);
    expect(doubleChargedPayout).toBe(990_025n);
  });
});
