import { BreejaError, type BreejaErrorCode } from "./types.js";

const REASON_TO_CODE: Record<string, BreejaErrorCode> = {
  UnsupportedSourceChain: "UnsupportedChain",
  UnsupportedDestChain: "UnsupportedChain",
  InsufficientLiquidity: "InsufficientLiquidity",
  PoolPaused: "PoolPaused",
  ZeroAmount: "InvalidAmount",
  ZeroRecipient: "InvalidRecipient",
  NoViableRoute: "InsufficientLiquidity",
  CctpUnavailable: "InsufficientLiquidity",
  PermitExpired: "PermitExpired",
};

export function errorFromReason(reason: string | undefined, details?: unknown): BreejaError {
  const code = (reason ? REASON_TO_CODE[reason] : undefined) ?? "PaymentFailed";
  return new BreejaError(code, reason ?? "Payment could not be routed", details);
}

export function relayerUnavailableError(details?: unknown): BreejaError {
  return new BreejaError("RelayerUnavailable", "The relayer is unreachable or returned an unexpected response", details);
}
