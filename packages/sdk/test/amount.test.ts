import { describe, expect, it } from "vitest";
import { toDecimalString, toSmallestUnits } from "../src/amount.js";
import { BreejaError } from "../src/types.js";

describe("toSmallestUnits", () => {
  it("converts whole-dollar amounts", () => {
    expect(toSmallestUnits("10.00")).toBe("10000000");
  });

  it("converts the smallest representable unit", () => {
    expect(toSmallestUnits("0.000001")).toBe("1");
  });

  it("converts a plain integer string", () => {
    expect(toSmallestUnits("5")).toBe("5000000");
  });

  it("converts zero", () => {
    expect(toSmallestUnits("0")).toBe("0");
  });

  it("truncates precision beyond 6 decimals rather than rounding", () => {
    // 10.0000001 truncates to 10.000000 -> 10000000, not a rounded-up value.
    expect(toSmallestUnits("10.0000001")).toBe("10000000");
    expect(toSmallestUnits("0.0000009")).toBe("0");
  });

  it("rejects negative amounts", () => {
    expect(() => toSmallestUnits("-1")).toThrow(BreejaError);
  });

  it("rejects non-numeric strings", () => {
    expect(() => toSmallestUnits("abc")).toThrow(BreejaError);
  });

  it("rejects empty strings", () => {
    expect(() => toSmallestUnits("")).toThrow(BreejaError);
  });

  it("rejects malformed decimals", () => {
    expect(() => toSmallestUnits("1.2.3")).toThrow(BreejaError);
    expect(() => toSmallestUnits(".5")).toThrow(BreejaError);
  });

  it("throws BreejaError with InvalidAmount code", () => {
    try {
      toSmallestUnits("not-a-number");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(BreejaError);
      expect((error as BreejaError).code).toBe("InvalidAmount");
    }
  });
});

describe("toDecimalString", () => {
  it("round-trips whole-dollar amounts", () => {
    expect(toDecimalString("10000000")).toBe("10");
  });

  it("round-trips the smallest unit", () => {
    expect(toDecimalString("1")).toBe("0.000001");
  });

  it("round-trips zero", () => {
    expect(toDecimalString("0")).toBe("0");
  });

  it("round-trips arbitrary fractional amounts", () => {
    expect(toDecimalString("1500000")).toBe("1.5");
  });
});

describe("round trip", () => {
  it("toDecimalString(toSmallestUnits(x)) is stable for exact 6-decimal inputs", () => {
    expect(toDecimalString(toSmallestUnits("42.123456"))).toBe("42.123456");
  });
});
