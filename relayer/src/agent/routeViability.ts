import { isSupportedDestinationChain, isSupportedSourceChain } from "../chains/chainIds.js";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ESTIMATED_RELEASE_SECONDS = 10;

export interface PaymentRequest {
  payer: `0x${string}`;
  recipient: `0x${string}`;
  amount: bigint;
  fromChainId: number;
  toChainId: number;
}

export interface RouteDecision {
  viable: boolean;
  reason?: string;
  feeBps: number;
  feeAmount: bigint;
  payoutAmount: bigint;
  sourceChainGasPriceWei: bigint;
  destChainGasPriceWei: bigint;
  destPoolBalance: bigint;
  destPoolPaused: boolean;
  estimatedSeconds: number;
}

export interface ChainState {
  destPoolPaused: boolean;
  feeBpsRaw: bigint;
  destPoolBalance: bigint;
  sourceChainGasPriceWei: bigint;
  destChainGasPriceWei: bigint;
  /** Payer's USDC balance on the SOURCE chain. Undefined means the caller
   *  could not read it (an RPC failure), which is not the same as zero and
   *  must not reject the payment on its own. */
  payerBalance?: bigint;
}

function emptyDecision(overrides: Partial<RouteDecision> & { reason: string }): RouteDecision {
  return {
    viable: false,
    feeBps: 0,
    feeAmount: 0n,
    payoutAmount: 0n,
    sourceChainGasPriceWei: 0n,
    destChainGasPriceWei: 0n,
    destPoolBalance: 0n,
    destPoolPaused: false,
    estimatedSeconds: 0,
    ...overrides,
  };
}

export function computeFee(amount: bigint, feeBps: bigint): { feeAmount: bigint; payoutAmount: bigint } {
  const feeAmount = (amount * feeBps) / 10_000n;
  const payoutAmount = amount - feeAmount;
  return { feeAmount, payoutAmount };
}

/**
 * Route-independent rejections. `payerBalance` is checked here rather than in
 * a single route's builder so every route inherits the same gate: an
 * underfunded payer cannot settle over the fast pool OR over CCTP, and
 * checking it per-route is how one of them silently kept quoting viable.
 * Undefined means the balance could not be read, which is not the same as
 * zero and must not reject on its own.
 */
export function checkRequestRejection(
  request: PaymentRequest,
  payerBalance?: bigint,
): RouteDecision | null {
  if (!isSupportedSourceChain(request.fromChainId)) {
    return emptyDecision({ reason: "UnsupportedSourceChain" });
  }

  if (!isSupportedDestinationChain(request.toChainId)) {
    return emptyDecision({ reason: "UnsupportedDestChain" });
  }

  if (request.fromChainId === request.toChainId) {
    return emptyDecision({ reason: "UnsupportedDestChain" });
  }

  if (request.amount <= 0n) {
    return emptyDecision({ reason: "ZeroAmount" });
  }

  if (request.recipient.toLowerCase() === ZERO_ADDRESS) {
    return emptyDecision({ reason: "ZeroRecipient" });
  }

  // Reject before quoting rather than letting the payer sign something that
  // can only fail. transferWithAuthorization reverts on an insufficient
  // balance, and because the relayer submits that permit itself, the payer
  // sees a "successful" relayer transaction that moved nothing.
  if (payerBalance !== undefined && payerBalance < request.amount) {
    return emptyDecision({ reason: "InsufficientPayerBalance" });
  }

  return null;
}

export function evaluateRouteViability(request: PaymentRequest, chainState: ChainState): RouteDecision {
  const { destPoolPaused, feeBpsRaw, destPoolBalance, sourceChainGasPriceWei, destChainGasPriceWei, payerBalance } =
    chainState;

  const rejection = checkRequestRejection(request, payerBalance);
  if (rejection) return rejection;

  if (destPoolPaused) {
    return emptyDecision({ reason: "PoolPaused", destPoolPaused: true });
  }

  const feeBps = Number(feeBpsRaw);
  const { feeAmount, payoutAmount } = computeFee(request.amount, feeBpsRaw);

  if (destPoolBalance < payoutAmount) {
    return {
      viable: false,
      reason: "InsufficientLiquidity",
      feeBps,
      feeAmount,
      payoutAmount,
      sourceChainGasPriceWei,
      destChainGasPriceWei,
      destPoolBalance,
      destPoolPaused,
      estimatedSeconds: 0,
    };
  }

  return {
    viable: true,
    feeBps,
    feeAmount,
    payoutAmount,
    sourceChainGasPriceWei,
    destChainGasPriceWei,
    destPoolBalance,
    destPoolPaused,
    estimatedSeconds: ESTIMATED_RELEASE_SECONDS,
  };
}
