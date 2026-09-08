import { isAddress } from "viem";
import { isSupportedDestinationChain, isSupportedSourceChain, supportsEip3009 } from "../chains/chainIds.js";
import type { RoutePreference } from "../agent/scorer.js";

export interface PaymentAuthorization {
  validAfter: string;
  validBefore: string;
  nonce: string;
  v: number;
  r: string;
  s: string;
}

export interface PayRequestBody {
  fromChainId: number;
  toChainId: number;
  payer: string;
  recipient: string;
  amount: string;
  authorization?: PaymentAuthorization;
  preference?: RoutePreference;
}

const ROUTE_PREFERENCES: readonly RoutePreference[] = ["fast", "cheap", "trustless"];

export interface QuoteRequestBody {
  fromChainId: number;
  toChainId: number;
  payer: string;
  recipient: string;
  amount: string;
  preference?: RoutePreference;
}

export function isPositiveBigint(value: string): boolean {
  try {
    return BigInt(value) > 0n;
  } catch {
    return false;
  }
}

export function validatePayRequest(body: Partial<PayRequestBody>): string | null {
  if (typeof body.fromChainId !== "number") return "fromChainId is required and must be a number";
  if (!isSupportedSourceChain(body.fromChainId)) {
    return "fromChainId is not a supported source chain";
  }
  if (typeof body.toChainId !== "number") return "toChainId is required and must be a number";
  if (!isSupportedDestinationChain(body.toChainId)) {
    return "toChainId is not a supported destination chain";
  }
  if (typeof body.payer !== "string" || !isAddress(body.payer)) return "payer must be a valid address";
  if (typeof body.recipient !== "string" || !isAddress(body.recipient)) return "recipient must be a valid address";
  if (typeof body.amount !== "string" || !isPositiveBigint(body.amount)) {
    return "amount must be a stringified positive integer";
  }
  if (body.authorization) {
    const auth = body.authorization;
    if (
      typeof auth.validAfter !== "string" ||
      typeof auth.validBefore !== "string" ||
      typeof auth.nonce !== "string" ||
      typeof auth.v !== "number" ||
      typeof auth.r !== "string" ||
      typeof auth.s !== "string"
    ) {
      return "authorization is malformed";
    }
  } else if (supportsEip3009(body.fromChainId)) {
    // Only chains without EIP-3009 support (Hedera) may omit authorization —
    // their deposit path is approve() (payer, on-chain) + deposit() (relayer,
    // pulled via transferFrom), not a signed permit. Every other chain still
    // requires a signed authorization; this branch is not a general opt-out.
    return "authorization is required";
  }
  if (body.preference !== undefined && !ROUTE_PREFERENCES.includes(body.preference)) {
    return `preference must be one of: ${ROUTE_PREFERENCES.join(", ")}`;
  }
  return null;
}

export function validateQuoteRequest(body: Partial<QuoteRequestBody>): string | null {
  if (typeof body.fromChainId !== "number") return "fromChainId is required and must be a number";
  if (!isSupportedSourceChain(body.fromChainId)) {
    return "fromChainId is not a supported source chain";
  }
  if (typeof body.toChainId !== "number") return "toChainId is required and must be a number";
  if (!isSupportedDestinationChain(body.toChainId)) {
    return "toChainId is not a supported destination chain";
  }
  if (typeof body.payer !== "string" || !isAddress(body.payer)) return "payer must be a valid address";
  if (typeof body.recipient !== "string" || !isAddress(body.recipient)) return "recipient must be a valid address";
  if (typeof body.amount !== "string" || !isPositiveBigint(body.amount)) {
    return "amount must be a stringified positive integer";
  }
  if (body.preference !== undefined && !ROUTE_PREFERENCES.includes(body.preference)) {
    return `preference must be one of: ${ROUTE_PREFERENCES.join(", ")}`;
  }
  return null;
}
