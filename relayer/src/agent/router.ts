import {
  checkRequestRejection,
  evaluateRouteViability,
  computeFee,
  type PaymentRequest,
  type RouteDecision,
  type ChainState,
} from "./routeViability.js";
import { getDestPoolContract, getDestPoolAddress, getGasPriceForChain, getUsdcContract } from "../chains/registry.js";

export {
  checkRequestRejection,
  evaluateRouteViability,
  computeFee,
  type PaymentRequest,
  type RouteDecision,
  type ChainState,
};

export async function decideRoute(request: PaymentRequest): Promise<RouteDecision> {
  const rejection = checkRequestRejection(request);
  if (rejection) return rejection;

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

  return evaluateRouteViability(request, {
    destPoolPaused,
    feeBpsRaw,
    destPoolBalance,
    sourceChainGasPriceWei,
    destChainGasPriceWei,
  });
}
