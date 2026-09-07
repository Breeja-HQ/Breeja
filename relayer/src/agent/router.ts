import {
  checkRequestRejection,
  evaluateRouteViability,
  computeFee,
  type PaymentRequest,
  type ChainState,
} from "./routeViability.js";
import { getCctpFeeQuote } from "../routes/cctp.js";
import { scoreRoutes, type RoutePreference, type ScoredRoute } from "./scorer.js";
import {
  getDestPoolContract,
  getDestPoolAddress,
  getGasPriceForChain,
  getUsdcContract,
} from "../chains/registry.js";

export {
  checkRequestRejection,
  evaluateRouteViability,
  computeFee,
  type PaymentRequest,
  type ChainState,
};

export interface RouteDecision {
  viable: boolean;
  reason?: string;
  route: "fast_pool" | "cctp";
  feeBps: number;
  feeAmount: bigint;
  payoutAmount: bigint;
  sourceChainGasPriceWei: bigint;
  destChainGasPriceWei: bigint;
  destPoolBalance: bigint;
  destPoolPaused: boolean;
  estimatedSeconds: number;
}

export interface RouteQuoteRequest extends PaymentRequest {
  preference?: RoutePreference;
}

export interface RouteQuote {
  viable: boolean;
  routes: ScoredRoute[];
  recommended: ScoredRoute | null;
}

async function buildFastPoolCandidate(request: PaymentRequest) {
  const rejection = checkRequestRejection(request);
  if (rejection) {
    return {
      candidate: {
        route: "fast_pool" as const,
        viable: false,
        reason: rejection.reason,
        feeBps: 0,
        feeAmount: 0n,
        payoutAmount: 0n,
      },
      chainState: {
        destPoolPaused: false,
        feeBpsRaw: 0n,
        destPoolBalance: 0n,
        sourceChainGasPriceWei: 0n,
        destChainGasPriceWei: 0n,
      } satisfies ChainState,
    };
  }

  const destPoolContract = await getDestPoolContract(request.toChainId);
  const destPoolPaused = (await destPoolContract.read.paused()) as boolean;
  const feeBpsRaw = (await destPoolContract.read.feeBps()) as bigint;

  const [destPoolAddress, destUsdcContract] = await Promise.all([
    getDestPoolAddress(request.toChainId),
    getUsdcContract(request.toChainId),
  ]);
  const destPoolBalance = (await destUsdcContract.read.balanceOf([destPoolAddress])) as bigint;

  const [sourceChainGasPriceWei, destChainGasPriceWei] = await Promise.all([
    getGasPriceForChain(request.fromChainId),
    getGasPriceForChain(request.toChainId),
  ]);

  const chainState: ChainState = {
    destPoolPaused,
    feeBpsRaw,
    destPoolBalance,
    sourceChainGasPriceWei,
    destChainGasPriceWei,
  };

  const decision = evaluateRouteViability(request, chainState);

  return {
    candidate: {
      route: "fast_pool" as const,
      viable: decision.viable,
      reason: decision.reason,
      feeBps: decision.feeBps,
      feeAmount: decision.feeAmount,
      payoutAmount: decision.payoutAmount,
    },
    chainState,
  };
}

async function buildCctpCandidate(request: PaymentRequest) {
  const rejection = checkRequestRejection(request);
  if (rejection) {
    return { route: "cctp" as const, viable: false, reason: rejection.reason, feeBps: 0, feeAmount: 0n, payoutAmount: 0n };
  }

  try {
    const quote = await getCctpFeeQuote(request.fromChainId, request.toChainId);
    const feeBpsRaw = BigInt(Math.round(quote.minimumFeeBps));
    const { feeAmount, payoutAmount } = computeFee(request.amount, feeBpsRaw);

    return {
      route: "cctp" as const,
      viable: true,
      feeBps: quote.minimumFeeBps,
      feeAmount,
      payoutAmount,
    };
  } catch (error) {
    return {
      route: "cctp" as const,
      viable: false,
      reason: "CctpUnavailable",
      feeBps: 0,
      feeAmount: 0n,
      payoutAmount: 0n,
    };
  }
}

export async function quoteRoutes(request: RouteQuoteRequest): Promise<RouteQuote> {
  const [{ candidate: fastPool }, cctp] = await Promise.all([
    buildFastPoolCandidate(request),
    buildCctpCandidate(request),
  ]);

  const routes = scoreRoutes({
    amount: request.amount,
    preference: request.preference,
    fastPool,
    cctp,
  });

  const recommended = routes.find((route) => route.viable) ?? null;

  return { viable: recommended !== null, routes, recommended };
}

export async function decideRoute(request: RouteQuoteRequest): Promise<RouteDecision> {
  const rejection = checkRequestRejection(request);
  if (rejection) {
    return {
      viable: false,
      reason: rejection.reason,
      route: "fast_pool",
      feeBps: 0,
      feeAmount: 0n,
      payoutAmount: 0n,
      sourceChainGasPriceWei: 0n,
      destChainGasPriceWei: 0n,
      destPoolBalance: 0n,
      destPoolPaused: false,
      estimatedSeconds: 0,
    };
  }

  const [{ candidate: fastPool, chainState }, cctp] = await Promise.all([
    buildFastPoolCandidate(request),
    buildCctpCandidate(request),
  ]);

  const [top] = scoreRoutes({ amount: request.amount, preference: request.preference, fastPool, cctp });

  if (!top || !top.viable) {
    return {
      viable: false,
      reason: top?.reason ?? "NoViableRoute",
      route: "fast_pool",
      feeBps: 0,
      feeAmount: 0n,
      payoutAmount: 0n,
      sourceChainGasPriceWei: chainState.sourceChainGasPriceWei,
      destChainGasPriceWei: chainState.destChainGasPriceWei,
      destPoolBalance: chainState.destPoolBalance,
      destPoolPaused: chainState.destPoolPaused,
      estimatedSeconds: 0,
    };
  }

  return {
    viable: true,
    route: top.route,
    feeBps: top.feeBps,
    feeAmount: top.feeAmount,
    payoutAmount: top.payoutAmount,
    sourceChainGasPriceWei: chainState.sourceChainGasPriceWei,
    destChainGasPriceWei: chainState.destChainGasPriceWei,
    destPoolBalance: chainState.destPoolBalance,
    destPoolPaused: chainState.destPoolPaused,
    estimatedSeconds: top.estimatedSeconds,
  };
}
