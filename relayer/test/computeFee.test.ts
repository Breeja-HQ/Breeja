import { describe, it, expect } from "vitest";
import { computeFee } from "../src/agent/routeViability.js";

describe("computeFee", () => {
  it("computes fee and payout for a normal case", () => {
    const { feeAmount, payoutAmount } = computeFee(1_000_000n, 50n);
    expect(feeAmount).toBe(5_000n);
    expect(payoutAmount).toBe(995_000n);
  });

  it("returns zero fee and zero payout for zero amount", () => {
    const { feeAmount, payoutAmount } = computeFee(0n, 50n);
    expect(feeAmount).toBe(0n);
    expect(payoutAmount).toBe(0n);
  });

  it("returns zero fee and full payout when feeBps is 0", () => {
    const { feeAmount, payoutAmount } = computeFee(1_000_000n, 0n);
    expect(feeAmount).toBe(0n);
    expect(payoutAmount).toBe(1_000_000n);
  });

  it("truncates fee amount via integer bigint division", () => {
    const { feeAmount, payoutAmount } = computeFee(3n, 1n);
    expect(feeAmount).toBe(0n);
    expect(payoutAmount).toBe(3n);
  });

  it("truncates rather than rounds up on a fractional remainder", () => {
    const { feeAmount, payoutAmount } = computeFee(999n, 50n);
    expect(feeAmount).toBe(4n);
    expect(payoutAmount).toBe(995n);
  });

  it("handles large amounts without overflow", () => {
    const amount = 1_000_000_000_000_000_000_000n;
    const { feeAmount, payoutAmount } = computeFee(amount, 50n);
    expect(feeAmount).toBe(5_000_000_000_000_000_000n);
    expect(payoutAmount).toBe(amount - feeAmount);
  });

  it("caps fee at the full amount when feeBps is 10000 (100%)", () => {
    const { feeAmount, payoutAmount } = computeFee(1_000n, 10_000n);
    expect(feeAmount).toBe(1_000n);
    expect(payoutAmount).toBe(0n);
  });
});
