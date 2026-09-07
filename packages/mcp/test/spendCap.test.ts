import { describe, expect, it } from "vitest";
import {
  checkSpendCap,
  formatMicroUsdc,
  loadSpendCapConfig,
  toMicroUsdc,
  DEFAULT_PER_CALL_CAP_USDC,
  DEFAULT_SESSION_CAP_USDC,
} from "../src/spendCap.js";

describe("toMicroUsdc / formatMicroUsdc", () => {
  it("converts whole numbers", () => {
    expect(toMicroUsdc("10")).toBe(10_000_000n);
  });

  it("converts decimals", () => {
    expect(toMicroUsdc("10.50")).toBe(10_500_000n);
  });

  it("truncates excess precision beyond 6 decimals", () => {
    expect(toMicroUsdc("1.1234567")).toBe(1_123_456n);
  });

  it("rejects invalid input", () => {
    expect(() => toMicroUsdc("abc")).toThrow();
    expect(() => toMicroUsdc("-5")).toThrow();
  });

  it("formats back to decimal string", () => {
    expect(formatMicroUsdc(10_500_000n)).toBe("10.500000");
    expect(formatMicroUsdc(0n)).toBe("0.000000");
  });
});

describe("loadSpendCapConfig", () => {
  it("uses configured env values", () => {
    const config = loadSpendCapConfig({
      BREEJA_MAX_PAYMENT_USDC: "100",
      BREEJA_MAX_SESSION_USDC: "500",
    });
    expect(config.perCallCapUsdc).toBe("100");
    expect(config.sessionCapUsdc).toBe("500");
    expect(config.usingPerCallDefault).toBe(false);
    expect(config.usingSessionDefault).toBe(false);
  });

  it("falls back to conservative defaults when unset", () => {
    const config = loadSpendCapConfig({});
    expect(config.perCallCapUsdc).toBe(DEFAULT_PER_CALL_CAP_USDC);
    expect(config.sessionCapUsdc).toBe(DEFAULT_SESSION_CAP_USDC);
    expect(config.usingPerCallDefault).toBe(true);
    expect(config.usingSessionDefault).toBe(true);
  });
});

describe("checkSpendCap", () => {
  const config = loadSpendCapConfig({
    BREEJA_MAX_PAYMENT_USDC: "100",
    BREEJA_MAX_SESSION_USDC: "250",
  });

  it("allows a payment within both caps", () => {
    const decision = checkSpendCap("50", 0n, config);
    expect(decision.allowed).toBe(true);
  });

  it("allows a payment exactly at the per-call cap", () => {
    const decision = checkSpendCap("100", 0n, config);
    expect(decision.allowed).toBe(true);
  });

  it("rejects a payment exceeding the per-call cap", () => {
    const decision = checkSpendCap("150", 0n, config);
    expect(decision.allowed).toBe(false);
    if (decision.allowed) throw new Error("unreachable");
    expect(decision.reason).toBe("PerCallCapExceeded");
    expect(decision.message).toContain("50");
  });

  it("allows a payment exactly at the session cap", () => {
    const decision = checkSpendCap("50", 200_000_000n, config);
    expect(decision.allowed).toBe(true);
  });

  it("rejects a payment that would exceed the cumulative session cap", () => {
    const decision = checkSpendCap("60", 200_000_000n, config);
    expect(decision.allowed).toBe(false);
    if (decision.allowed) throw new Error("unreachable");
    expect(decision.reason).toBe("SessionCapExceeded");
    expect(decision.message).toContain("10");
  });

  it("rejects a payment when session cap is already exhausted", () => {
    const decision = checkSpendCap("1", 250_000_000n, config);
    expect(decision.allowed).toBe(false);
    if (decision.allowed) throw new Error("unreachable");
    expect(decision.reason).toBe("SessionCapExceeded");
  });

  it("checks per-call cap before session cap when both would be exceeded", () => {
    const decision = checkSpendCap("300", 200_000_000n, config);
    expect(decision.allowed).toBe(false);
    if (decision.allowed) throw new Error("unreachable");
    expect(decision.reason).toBe("PerCallCapExceeded");
  });
});
