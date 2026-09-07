import { type Amount } from "./types.js";
export declare const USDC_DECIMALS = 6;
/**
 * Converts a decimal-string Amount ("10.00") to the integer smallest-unit
 * string the relayer expects. Truncates (not rounds) past 6 decimals, matching
 * how USDC's on-chain integer units actually behave.
 */
export declare function toSmallestUnits(amount: Amount): string;
/** Converts an integer smallest-units string back to a decimal display string. */
export declare function toDecimalString(smallestUnits: string): Amount;
