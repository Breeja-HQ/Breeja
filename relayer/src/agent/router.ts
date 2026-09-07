import { getSepoliaGasPrice } from "../chains/sepolia.js";
import { getBaseSepoliaGasPrice } from "../chains/baseSepolia.js";
import { destPoolContract, hskTokenContract, getHskGasPrice } from "../chains/hsk.js";
import {
  checkRequestRejection,
  evaluateRouteViability,
  computeFee,
  type PaymentRequest,
  type RouteDecision,
  type ChainState,
} from "./routeViability.js";

export {
  checkRequestRejection,
  evaluateRouteViability,
  computeFee,
  type PaymentRequest,
  type RouteDecision,
  type ChainState,
};

const SEPOLIA_CHAIN_ID = 11155111;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function getSourceChainGasPrice(fromChainId: number): Promise<bigint> {
  if (fromChainId === SEPOLIA_CHAIN_ID) return getSepoliaGasPrice();
  return getBaseSepoliaGasPrice();
}

export async function decideRoute(request: PaymentRequest): Promise<RouteDecision> {
  const rejection = checkRequestRejection(request);
  if (rejection) return rejection;

  const destPoolPaused = (await destPoolContract.read.paused()) as boolean;
  const feeBpsRaw = (await destPoolContract.read.feeBps()) as bigint;

  const destPoolAddress = requireEnv("DEST_POOL_ADDRESS") as `0x${string}`;
  const destPoolBalance = (await hskTokenContract.read.balanceOf([destPoolAddress])) as bigint;

  const [sourceChainGasPriceWei, hskGasPriceWei] = await Promise.all([
    getSourceChainGasPrice(request.fromChainId),
    getHskGasPrice(),
  ]);

  return evaluateRouteViability(request, {
    destPoolPaused,
    feeBpsRaw,
    destPoolBalance,
    sourceChainGasPriceWei,
    hskGasPriceWei,
  });
}
