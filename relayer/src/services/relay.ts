import { getDestPoolContract, getPublicClient, getSourceVaultContract } from "../chains/registry.js";

export interface DepositParams {
  payer: `0x${string}`;
  recipient: `0x${string}`;
  amount: bigint;
  destChainId: bigint;
  validAfter: bigint;
  validBefore: bigint;
  nonce: `0x${string}`;
  v: number;
  r: `0x${string}`;
  s: `0x${string}`;
  fromChainId: number;
}

export async function submitDepositWithAuthorization(params: DepositParams): Promise<{ txHash: `0x${string}` }> {
  const args = [
    params.payer,
    params.recipient,
    params.amount,
    params.destChainId,
    params.validAfter,
    params.validBefore,
    params.nonce,
    params.v,
    params.r,
    params.s,
  ] as const;

  const [sourceVaultContract, publicClient] = await Promise.all([
    getSourceVaultContract(params.fromChainId),
    getPublicClient(params.fromChainId),
  ]);

  const hash = await sourceVaultContract.write.depositWithAuthorization(args);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return { txHash: receipt.transactionHash };
}

export interface FallbackDepositParams {
  payer: `0x${string}`;
  recipient: `0x${string}`;
  amount: bigint;
  destChainId: bigint;
  fromChainId: number;
}

export async function submitDeposit(params: FallbackDepositParams): Promise<{ txHash: `0x${string}` }> {
  const args = [params.payer, params.recipient, params.amount, params.destChainId] as const;

  const [sourceVaultContract, publicClient] = await Promise.all([
    getSourceVaultContract(params.fromChainId),
    getPublicClient(params.fromChainId),
  ]);

  const hash = await sourceVaultContract.write.deposit(args);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return { txHash: receipt.transactionHash };
}

export async function submitRelease(
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
