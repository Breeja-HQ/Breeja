import { getPublicClient, getSourceVaultContract } from "../chains/registry.js";

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

const WITHDRAW_RETRY_ATTEMPTS = 3;
const WITHDRAW_RETRY_DELAY_MS = 3_000;

export async function submitRelayerWithdraw(
  fromChainId: number,
  to: `0x${string}`,
  amount: bigint,
): Promise<{ txHash: `0x${string}` }> {
  const [sourceVaultContract, publicClient] = await Promise.all([
    getSourceVaultContract(fromChainId),
    getPublicClient(fromChainId),
  ]);

  // The just-mined deposit that funds this withdrawal can lag behind on a
  // load-balanced public RPC endpoint even after waitForTransactionReceipt
  // resolved against a different backend node — retry the revert once or
  // twice rather than failing a payment over eventual consistency.
  let lastError: unknown;
  for (let attempt = 1; attempt <= WITHDRAW_RETRY_ATTEMPTS; attempt++) {
    try {
      const hash = await sourceVaultContract.write.relayerWithdraw([to, amount]);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      return { txHash: receipt.transactionHash };
    } catch (error) {
      lastError = error;
      if (attempt < WITHDRAW_RETRY_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, WITHDRAW_RETRY_DELAY_MS));
      }
    }
  }
  throw lastError;
}
