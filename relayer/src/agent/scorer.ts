const DEFAULT_ROUTE_SIZE_THRESHOLD = 1_000_000_000n; // 1,000 USDC, 6 decimals
const FAST_POOL_ESTIMATED_SECONDS = 10;
const CCTP_STANDARD_ESTIMATED_SECONDS = 17 * 60; // Circle's documented standard-transfer latency

export type RoutePreference = "fast" | "cheap" | "trustless";
export type Custody = "custodial" | "trust-minimized";
export type RouteName = "fast_pool" | "cctp";

export interface FastPoolCandidate {
  route: "fast_pool";
  viable: boolean;
  reason?: string;
  feeBps: number;
  feeAmount: bigint;
  payoutAmount: bigint;
}

export interface CctpCandidate {
  route: "cctp";
  viable: boolean;
  reason?: string;
  feeBps: number;
  feeAmount: bigint;
  payoutAmount: bigint;
}

export interface ScoredRoute {
  route: RouteName;
  viable: boolean;
  reason?: string;
  custody: Custody;
  feeBps: number;
  feeAmount: bigint;
  payoutAmount: bigint;
  estimatedSeconds: number;
}

export interface ScoreRoutesInput {
  amount: bigint;
  preference?: RoutePreference;
  fastPool: FastPoolCandidate;
  cctp: CctpCandidate;
}

function toScoredRoute(candidate: FastPoolCandidate | CctpCandidate): ScoredRoute {
  if (candidate.route === "fast_pool") {
    return {
      route: "fast_pool",
      viable: candidate.viable,
      reason: candidate.reason,
      custody: "custodial",
      feeBps: candidate.feeBps,
      feeAmount: candidate.feeAmount,
      payoutAmount: candidate.payoutAmount,
      estimatedSeconds: candidate.viable ? FAST_POOL_ESTIMATED_SECONDS : 0,
    };
  }
  return {
    route: "cctp",
    viable: candidate.viable,
    reason: candidate.reason,
    custody: "trust-minimized",
    feeBps: candidate.feeBps,
    feeAmount: candidate.feeAmount,
    payoutAmount: candidate.payoutAmount,
    estimatedSeconds: candidate.viable ? CCTP_STANDARD_ESTIMATED_SECONDS : 0,
  };
}

function defaultPreferenceFor(amount: bigint): RoutePreference {
  return amount < DEFAULT_ROUTE_SIZE_THRESHOLD ? "fast" : "trustless";
}

function comparatorFor(preference: RoutePreference): (a: ScoredRoute, b: ScoredRoute) => number {
  if (preference === "trustless") {
    return (a, b) => {
      if (a.custody !== b.custody) return a.custody === "trust-minimized" ? -1 : 1;
      return a.estimatedSeconds - b.estimatedSeconds;
    };
  }
  if (preference === "cheap") {
    return (a, b) => {
      if (a.feeAmount !== b.feeAmount) return a.feeAmount < b.feeAmount ? -1 : 1;
      return a.estimatedSeconds - b.estimatedSeconds;
    };
  }
  return (a, b) => a.estimatedSeconds - b.estimatedSeconds;
}

/**
 * Deterministic route scoring. No LLM involvement anywhere in this function —
 * selecting a route, ranking it, and computing its fee are all forbidden to
 * models per docs/AI_LAYER.md. Only viable routes are ranked; non-viable
 * routes are appended last, unranked, so the caller can see why they failed.
 */
export function scoreRoutes(input: ScoreRoutesInput): ScoredRoute[] {
  const preference = input.preference ?? defaultPreferenceFor(input.amount);
  const scored = [toScoredRoute(input.fastPool), toScoredRoute(input.cctp)];

  const viable = scored.filter((route) => route.viable).sort(comparatorFor(preference));
  const nonViable = scored.filter((route) => !route.viable);

  return [...viable, ...nonViable];
}
