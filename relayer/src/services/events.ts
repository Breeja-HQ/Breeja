import sourceVaultAbi from "../abi/SourceVault.json" with { type: "json" };
import destPoolAbi from "../abi/DestPool.json" with { type: "json" };
import { listDestinationChainIds, listSourceChainIds } from "../chains/chainIds.js";
import { getDestPoolAddress, getPublicClient, getSourceVaultContract } from "../chains/registry.js";

const RECONCILER_LOOKBACK_BLOCKS = 200_000n;

export interface PaymentRequestedEvent {
  payer: `0x${string}`;
  recipient: `0x${string}`;
  amount: bigint;
  destChainId: bigint;
  nonce: bigint;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
}

async function watchPaymentRequestedOn(
  fromChainId: number,
  onEvent: (event: PaymentRequestedEvent) => void,
): Promise<() => void> {
  const [publicClient, sourceVaultContract] = await Promise.all([
    getPublicClient(fromChainId),
    getSourceVaultContract(fromChainId),
  ]);

  return publicClient.watchContractEvent({
    address: sourceVaultContract.address,
    abi: sourceVaultAbi,
    eventName: "PaymentRequested",
    onLogs: (logs: unknown[]) => {
      for (const log of logs) {
        const { args, blockNumber, transactionHash } = log as unknown as {
          args: { payer: `0x${string}`; recipient: `0x${string}`; amount: bigint; destChainId: bigint; nonce: bigint };
          blockNumber: bigint;
          transactionHash: `0x${string}`;
        };
        onEvent({
          payer: args.payer,
          recipient: args.recipient,
          amount: args.amount,
          destChainId: args.destChainId,
          nonce: args.nonce,
          blockNumber,
          transactionHash,
        });
      }
    },
  });
}

export async function watchAllPaymentRequested(
  onEvent: (fromChainId: number, event: PaymentRequestedEvent) => void,
): Promise<() => void> {
  const unwatchFns = await Promise.all(
    listSourceChainIds().map((chainId) => watchPaymentRequestedOn(chainId, (event) => onEvent(chainId, event))),
  );
  return () => {
    for (const unwatch of unwatchFns) unwatch();
  };
}

export interface ReleasedEvent {
  recipient: `0x${string}`;
  amount: bigint;
  fee: bigint;
  sourceRef: `0x${string}`;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
}

async function watchReleasedOn(toChainId: number, onEvent: (event: ReleasedEvent) => void): Promise<() => void> {
  const [publicClient, destPoolAddress] = await Promise.all([
    getPublicClient(toChainId),
    getDestPoolAddress(toChainId),
  ]);

  return publicClient.watchContractEvent({
    address: destPoolAddress,
    abi: destPoolAbi,
    eventName: "Released",
    onLogs: (logs: unknown[]) => {
      for (const log of logs) {
        const { args, blockNumber, transactionHash } = log as unknown as {
          args: { recipient: `0x${string}`; amount: bigint; fee: bigint; sourceRef: `0x${string}` };
          blockNumber: bigint;
          transactionHash: `0x${string}`;
        };
        onEvent({
          recipient: args.recipient,
          amount: args.amount,
          fee: args.fee,
          sourceRef: args.sourceRef,
          blockNumber,
          transactionHash,
        });
      }
    },
  });
}

export async function watchAllReleased(
  onEvent: (toChainId: number, event: ReleasedEvent) => void,
): Promise<() => void> {
  const unwatchFns = await Promise.all(
    listDestinationChainIds().map((chainId) => watchReleasedOn(chainId, (event) => onEvent(chainId, event))),
  );
  return () => {
    for (const unwatch of unwatchFns) unwatch();
  };
}

export interface PaymentRequestedLookup {
  payer: `0x${string}`;
  recipient: `0x${string}`;
  amount: bigint;
  destChainId: bigint;
}

/**
 * The EIP-3009 authorization nonce (bytes32, our idempotency key) is not the
 * same value as SourceVault's emitted PaymentRequested.nonce (uint256, an
 * internal replay counter) — the contract does not echo the EIP-3009 nonce
 * in the event. Correlation is by request fields instead.
 */
export async function findPaymentRequested(
  fromChainId: number,
  lookup: PaymentRequestedLookup,
): Promise<PaymentRequestedEvent | null> {
  const [publicClient, sourceVaultContract] = await Promise.all([
    getPublicClient(fromChainId),
    getSourceVaultContract(fromChainId),
  ]);
  const latestBlock = await publicClient.getBlockNumber();
  const fromBlock = latestBlock > RECONCILER_LOOKBACK_BLOCKS ? latestBlock - RECONCILER_LOOKBACK_BLOCKS : 0n;

  const logs = await publicClient.getContractEvents({
    address: sourceVaultContract.address,
    abi: sourceVaultAbi,
    eventName: "PaymentRequested",
    fromBlock,
    toBlock: "latest",
  });

  for (const log of logs) {
    const { args, blockNumber, transactionHash } = log as unknown as {
      args: { payer: `0x${string}`; recipient: `0x${string}`; amount: bigint; destChainId: bigint; nonce: bigint };
      blockNumber: bigint;
      transactionHash: `0x${string}`;
    };
    if (
      args.payer.toLowerCase() === lookup.payer.toLowerCase() &&
      args.recipient.toLowerCase() === lookup.recipient.toLowerCase() &&
      args.amount === lookup.amount &&
      args.destChainId === lookup.destChainId
    ) {
      return {
        payer: args.payer,
        recipient: args.recipient,
        amount: args.amount,
        destChainId: args.destChainId,
        nonce: args.nonce,
        blockNumber,
        transactionHash,
      };
    }
  }
  return null;
}

export async function findReleasedBySourceRef(
  toChainId: number,
  sourceRef: `0x${string}`,
): Promise<ReleasedEvent | null> {
  const [publicClient, destPoolAddress] = await Promise.all([
    getPublicClient(toChainId),
    getDestPoolAddress(toChainId),
  ]);
  const latestBlock = await publicClient.getBlockNumber();
  const fromBlock = latestBlock > RECONCILER_LOOKBACK_BLOCKS ? latestBlock - RECONCILER_LOOKBACK_BLOCKS : 0n;

  const logs = await publicClient.getContractEvents({
    address: destPoolAddress,
    abi: destPoolAbi,
    eventName: "Released",
    fromBlock,
    toBlock: "latest",
  });

  for (const log of logs) {
    const { args, blockNumber, transactionHash } = log as unknown as {
      args: { recipient: `0x${string}`; amount: bigint; fee: bigint; sourceRef: `0x${string}` };
      blockNumber: bigint;
      transactionHash: `0x${string}`;
    };
    if (args.sourceRef.toLowerCase() === sourceRef.toLowerCase()) {
      return {
        recipient: args.recipient,
        amount: args.amount,
        fee: args.fee,
        sourceRef: args.sourceRef,
        blockNumber,
        transactionHash,
      };
    }
  }
  return null;
}
