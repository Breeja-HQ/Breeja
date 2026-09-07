import { formatUnits, parseUnits } from "viem";
import { BreejaError, type Amount } from "./types.js";

export const USDC_DECIMALS = 6;

const DECIMAL_STRING_PATTERN = /^\d+(\.\d+)?$/;

/**
 * Converts a decimal-string Amount ("10.00") to the integer smallest-unit
 * string the relayer expects. Truncates (not rounds) past 6 decimals, matching
 * how USDC's on-chain integer units actually behave.
 */
export function toSmallestUnits(amount: Amount): string {
  if (typeof amount !== "string" || !DECIMAL_STRING_PATTERN.test(amount)) {
    throw new BreejaError("InvalidAmount", `Amount must be a non-negative decimal string, got: ${JSON.stringify(amount)}`);
  }

  const [whole, fraction = ""] = amount.split(".");
  const truncatedFraction = fraction.slice(0, USDC_DECIMALS);
  const normalized = `${whole}.${truncatedFraction}`;

  try {
    return parseUnits(normalized, USDC_DECIMALS).toString();
  } catch (error) {
    throw new BreejaError("InvalidAmount", `Could not parse amount: ${amount}`, error);
  }
}

/** Converts an integer smallest-units string back to a decimal display string. */
export function toDecimalString(smallestUnits: string): Amount {
  return formatUnits(BigInt(smallestUnits), USDC_DECIMALS);
}
