import type { PublicClient } from "viem";
import sourceVaultAbi from "../abi/SourceVault.json" with { type: "json" };
import destPoolAbi from "../abi/DestPool.json" with { type: "json" };
import { sepoliaPublicClient } from "../chains/sepolia.js";
import { baseSepoliaPublicClient } from "../chains/baseSepolia.js";
import { hskPublicClient } from "../chains/hsk.js";
import { requireEnv } from "../env.js";

const SEPOLIA_CHAIN_ID = 11155111;
const BASE_SEPOLIA_CHAIN_ID = 84532;
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

function watchPaymentRequestedOn(
  publicClient: PublicClient<any, any>,
  sourceVaultAddress: `0x${string}`,
  onEvent: (event: PaymentRequestedEvent) => void,
): () => void {
  return publicClient.watchContractEvent({
    address: sourceVaultAddress,
    abi: sourceVaultAbi,
    eventName: "PaymentRequested",
    onLogs: (logs) => {
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

export function watchPaymentRequested(onEvent: (event: PaymentRequestedEvent) => void): () => void {
  const sourceVaultAddress = requireEnv("SOURCE_VAULT_ADDRESS") as `0x${string}`;
  return watchPaymentRequestedOn(sepoliaPublicClient, sourceVaultAddress, onEvent);
}

export function watchBaseSepoliaPaymentRequested(onEvent: (event: PaymentRequestedEvent) => void): () => void {
  const sourceVaultAddress = requireEnv("BASE_SEPOLIA_SOURCE_VAULT_ADDRESS") as `0x${string}`;
  return watchPaymentRequestedOn(baseSepoliaPublicClient, sourceVaultAddress, onEvent);
}

export interface ReleasedEvent {
  recipient: `0x${string}`;
  amount: bigint;
  fee: bigint;
  sourceRef: `0x${string}`;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
}

export function watchReleased(onEvent: (event: ReleasedEvent) => void): () => void {
  const destPoolAddress = requireEnv("DEST_POOL_ADDRESS") as `0x${string}`;
  return hskPublicClient.watchContractEvent({
    address: destPoolAddress,
    abi: destPoolAbi,
    eventName: "Released",
    onLogs: (logs) => {
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

function sourceVaultAddressForChain(fromChainId: number): `0x${string}` {
  if (fromChainId === SEPOLIA_CHAIN_ID) return requireEnv("SOURCE_VAULT_ADDRESS") as `0x${string}`;
  if (fromChainId === BASE_SEPOLIA_CHAIN_ID) return requireEnv("BASE_SEPOLIA_SOURCE_VAULT_ADDRESS") as `0x${string}`;
  throw new Error(`Unsupported fromChainId: ${fromChainId}`);
}

function publicClientForChain(fromChainId: number): PublicClient<any, any> {
  if (fromChainId === SEPOLIA_CHAIN_ID) return sepoliaPublicClient;
  if (fromChainId === BASE_SEPOLIA_CHAIN_ID) return baseSepoliaPublicClient;
  throw new Error(`Unsupported fromChainId: ${fromChainId}`);
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
  const publicClient = publicClientForChain(fromChainId);
  const address = sourceVaultAddressForChain(fromChainId);
  const latestBlock = await publicClient.getBlockNumber();
  const fromBlock = latestBlock > RECONCILER_LOOKBACK_BLOCKS ? latestBlock - RECONCILER_LOOKBACK_BLOCKS : 0n;

  const logs = await publicClient.getContractEvents({
    address,
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

export async function findReleasedBySourceRef(sourceRef: `0x${string}`): Promise<ReleasedEvent | null> {
  const destPoolAddress = requireEnv("DEST_POOL_ADDRESS") as `0x${string}`;
  const latestBlock = await hskPublicClient.getBlockNumber();
  const fromBlock = latestBlock > RECONCILER_LOOKBACK_BLOCKS ? latestBlock - RECONCILER_LOOKBACK_BLOCKS : 0n;

  const logs = await hskPublicClient.getContractEvents({
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
