import { getDestPoolAddress, getUsdcContract } from "../chains/registry.js";

export async function getDestPoolLiquidity(chainId: number): Promise<bigint> {
  const [destPoolAddress, usdcContract] = await Promise.all([
    getDestPoolAddress(chainId),
    getUsdcContract(chainId),
  ]);
  return usdcContract.read.balanceOf([destPoolAddress]) as Promise<bigint>;
}

export async function hasSufficientLiquidity(chainId: number, payoutAmount: bigint): Promise<boolean> {
  const liquidity = await getDestPoolLiquidity(chainId);
  return liquidity >= payoutAmount;
}
