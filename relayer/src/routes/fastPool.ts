import { getDestPoolContract, getPublicClient } from "../chains/registry.js";

export async function submitFastPoolRelease(
  toChainId: number,
  recipient: `0x${string}`,
  amount: bigint,
  sourceRef: `0x${string}`,
): Promise<{ txHash: `0x${string}` }> {
  const [destPoolContract, publicClient] = await Promise.all([
    getDestPoolContract(toChainId),
    getPublicClient(toChainId),
  ]);

  const hash = await destPoolContract.write.release([recipient, amount, sourceRef]);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return { txHash: receipt.transactionHash };
}
