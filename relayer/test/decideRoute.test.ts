import { describe, it, expect } from "vitest";
import {
  checkRequestRejection,
  evaluateRouteViability,
  type PaymentRequest,
  type ChainState,
} from "../src/agent/routeViability.js";

const SEPOLIA_CHAIN_ID = 11155111;
const BASE_SEPOLIA_CHAIN_ID = 84532;
const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;

const VALID_REQUEST: PaymentRequest = {
  payer: "0x1111111111111111111111111111111111111111",
  recipient: "0x2222222222222222222222222222222222222222",
  amount: 1_000_000n,
  fromChainId: SEPOLIA_CHAIN_ID,
  toChainId: BASE_SEPOLIA_CHAIN_ID,
};

const VIABLE_CHAIN_STATE: ChainState = {
  destPoolPaused: false,
  feeBpsRaw: 50n,
  destPoolBalance: 10_000_000n,
  sourceChainGasPriceWei: 1_000_000_000n,
  destChainGasPriceWei: 1_000_000_000n,
};

// checkRequestRejection is the exact pre-chain-call gate that decideRoute in
// src/agent/router.ts runs first and returns from immediately, before touching
// any RPC or contract client. Testing it directly exercises decideRoute's
// rejection branches without needing chain state.
describe("decideRoute rejection branches (via checkRequestRejection)", () => {
  it("rejects an unsupported source chain", () => {
    const result = checkRequestRejection({ ...VALID_REQUEST, fromChainId: 999999 });
    expect(result).not.toBeNull();
    expect(result?.reason).toBe("UnsupportedSourceChain");
    expect(result?.viable).toBe(false);
  });

  it("accepts arbitrum sepolia as a supported source chain", () => {
    const result = checkRequestRejection({ ...VALID_REQUEST, fromChainId: ARBITRUM_SEPOLIA_CHAIN_ID });
    expect(result).toBeNull();
  });

  it("rejects an unsupported destination chain", () => {
    const result = checkRequestRejection({ ...VALID_REQUEST, toChainId: 8453 });
    expect(result).not.toBeNull();
    expect(result?.reason).toBe("UnsupportedDestChain");
  });

  it("rejects ethereum sepolia as a destination (source-only)", () => {
    const result = checkRequestRejection({ ...VALID_REQUEST, toChainId: SEPOLIA_CHAIN_ID });
    expect(result).not.toBeNull();
    expect(result?.reason).toBe("UnsupportedDestChain");
  });

  it("rejects a request where fromChainId equals toChainId", () => {
    const result = checkRequestRejection({
      ...VALID_REQUEST,
      fromChainId: BASE_SEPOLIA_CHAIN_ID,
      toChainId: BASE_SEPOLIA_CHAIN_ID,
    });
    expect(result).not.toBeNull();
    expect(result?.reason).toBe("UnsupportedDestChain");
  });

  it("rejects a zero amount", () => {
    const result = checkRequestRejection({ ...VALID_REQUEST, amount: 0n });
    expect(result).not.toBeNull();
    expect(result?.reason).toBe("ZeroAmount");
  });

  it("rejects a negative amount", () => {
    const result = checkRequestRejection({ ...VALID_REQUEST, amount: -1n });
    expect(result).not.toBeNull();
    expect(result?.reason).toBe("ZeroAmount");
  });

  it("rejects the zero address as recipient", () => {
    const result = checkRequestRejection({
      ...VALID_REQUEST,
      recipient: "0x0000000000000000000000000000000000000000",
    });
    expect(result).not.toBeNull();
    expect(result?.reason).toBe("ZeroRecipient");
  });

  it("rejects the zero address as recipient regardless of case", () => {
    const result = checkRequestRejection({
      ...VALID_REQUEST,
      recipient: "0x0000000000000000000000000000000000000000".toUpperCase() as `0x${string}`,
    });
    expect(result).not.toBeNull();
    expect(result?.reason).toBe("ZeroRecipient");
  });

  it("returns null (no rejection) for a fully valid request", () => {
    const result = checkRequestRejection(VALID_REQUEST);
    expect(result).toBeNull();
  });
});

describe("evaluateRouteViability", () => {
  it("rejects before touching chain state when the request itself is invalid", () => {
    const decision = evaluateRouteViability(
      { ...VALID_REQUEST, fromChainId: 999999 },
      VIABLE_CHAIN_STATE,
    );
    expect(decision.viable).toBe(false);
    expect(decision.reason).toBe("UnsupportedSourceChain");
  });

  it("rejects when the destination pool is paused", () => {
    const decision = evaluateRouteViability(VALID_REQUEST, {
      ...VIABLE_CHAIN_STATE,
      destPoolPaused: true,
    });
    expect(decision.viable).toBe(false);
    expect(decision.reason).toBe("PoolPaused");
    expect(decision.destPoolPaused).toBe(true);
  });

  it("rejects when the destination pool balance is below the payout amount", () => {
    const decision = evaluateRouteViability(VALID_REQUEST, {
      ...VIABLE_CHAIN_STATE,
      destPoolBalance: 1n,
    });
    expect(decision.viable).toBe(false);
    expect(decision.reason).toBe("InsufficientLiquidity");
    expect(decision.estimatedSeconds).toBe(0);
  });

  it("rejects when the payer holds less USDC than the amount being sent", () => {
    const decision = evaluateRouteViability(VALID_REQUEST, {
      ...VIABLE_CHAIN_STATE,
      payerBalance: VALID_REQUEST.amount - 1n,
    });
    expect(decision.viable).toBe(false);
    expect(decision.reason).toBe("InsufficientPayerBalance");
  });

  it("accepts when the payer's balance exactly covers the amount", () => {
    const decision = evaluateRouteViability(VALID_REQUEST, {
      ...VIABLE_CHAIN_STATE,
      payerBalance: VALID_REQUEST.amount,
    });
    expect(decision.viable).toBe(true);
  });

  it("does not reject on an unreadable payer balance, since undefined is not zero", () => {
    const decision = evaluateRouteViability(VALID_REQUEST, {
      ...VIABLE_CHAIN_STATE,
      payerBalance: undefined,
    });
    expect(decision.viable).toBe(true);
  });

  // The balance gate lives in checkRequestRejection precisely so it is not
  // per-route. It was originally only in the fast-pool path, which let CCTP
  // keep quoting viable for a wallet holding nothing; these pin the shared
  // gate directly so a future route cannot silently skip it.
  it("rejects an underfunded payer at the shared gate, independent of route", () => {
    const rejection = checkRequestRejection(VALID_REQUEST, VALID_REQUEST.amount - 1n);
    expect(rejection).not.toBeNull();
    expect(rejection?.reason).toBe("InsufficientPayerBalance");
  });

  it("passes the shared gate when the balance covers the amount", () => {
    expect(checkRequestRejection(VALID_REQUEST, VALID_REQUEST.amount)).toBeNull();
  });

  it("passes the shared gate when the balance is unknown", () => {
    expect(checkRequestRejection(VALID_REQUEST, undefined)).toBeNull();
  });

  it("returns a viable decision when the pool is unpaused and sufficiently funded", () => {
    const decision = evaluateRouteViability(VALID_REQUEST, VIABLE_CHAIN_STATE);
    expect(decision.viable).toBe(true);
    expect(decision.reason).toBeUndefined();
    expect(decision.feeBps).toBe(50);
    expect(decision.feeAmount).toBe(5_000n);
    expect(decision.payoutAmount).toBe(995_000n);
    expect(decision.estimatedSeconds).toBeGreaterThan(0);
  });

  it("is viable at the exact liquidity boundary (balance == payout)", () => {
    const decision = evaluateRouteViability(VALID_REQUEST, {
      ...VIABLE_CHAIN_STATE,
      destPoolBalance: 995_000n,
    });
    expect(decision.viable).toBe(true);
  });

  it("carries through the observed gas prices on a viable decision", () => {
    const decision = evaluateRouteViability(VALID_REQUEST, {
      ...VIABLE_CHAIN_STATE,
      sourceChainGasPriceWei: 42n,
      destChainGasPriceWei: 7n,
    });
    expect(decision.sourceChainGasPriceWei).toBe(42n);
    expect(decision.destChainGasPriceWei).toBe(7n);
  });
});
