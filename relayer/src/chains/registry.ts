import type { Chain, GetContractReturnType, PublicClient, WalletClient } from "viem";
import sourceVaultAbi from "../abi/SourceVault.json" with { type: "json" };
import destPoolAbi from "../abi/DestPool.json" with { type: "json" };
import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
  BASE_SEPOLIA_CHAIN_ID,
  ETHEREUM_SEPOLIA_CHAIN_ID,
  OPTIMISM_SEPOLIA_CHAIN_ID,
} from "./chainIds.js";

export {
  isSupportedSourceChain,
  isSupportedDestinationChain,
  listSourceChainIds,
  listDestinationChainIds,
  listRoutePairs,
  ETHEREUM_SEPOLIA_CHAIN_ID,
  BASE_SEPOLIA_CHAIN_ID,
  ARBITRUM_SEPOLIA_CHAIN_ID,
  OPTIMISM_SEPOLIA_CHAIN_ID,
} from "./chainIds.js";

type SourceVaultContract = GetContractReturnType<
  typeof sourceVaultAbi,
  { public: PublicClient; wallet: WalletClient }
>;
type DestPoolContract = GetContractReturnType<typeof destPoolAbi, { public: PublicClient; wallet: WalletClient }>;
type Erc20Contract = GetContractReturnType<any, { public: PublicClient; wallet: WalletClient }>;

interface ChainEntry {
  chainId: number;
  chain: Chain;
  publicClient: PublicClient<any, any>;
  walletClient: WalletClient<any, any, any>;
  sourceVaultContract: SourceVaultContract;
  destPoolContract: DestPoolContract | null;
  usdcContract: Erc20Contract;
  getGasPrice: () => Promise<bigint>;
}

let cachedEntries: Map<number, ChainEntry> | null = null;

/**
 * Chain client modules call requireEnv at import time, so loading this
 * registry eagerly would make chainIds.ts's pure lookups (used by
 * request validation and route rejection) require every chain's RPC env
 * var just to import them. Building the client map lazily, on first use,
 * keeps those pure paths testable without env or network.
 */
async function loadEntries(): Promise<Map<number, ChainEntry>> {
  if (cachedEntries) return cachedEntries;

  const [sepolia, baseSepolia, arbitrumSepolia, optimismSepolia] = await Promise.all([
    import("./sepolia.js"),
    import("./baseSepolia.js"),
    import("./arbitrumSepolia.js"),
    import("./optimismSepolia.js"),
  ]);

  const entries = new Map<number, ChainEntry>();

  entries.set(ETHEREUM_SEPOLIA_CHAIN_ID, {
    chainId: ETHEREUM_SEPOLIA_CHAIN_ID,
    chain: sepolia.sepoliaChain,
    publicClient: sepolia.sepoliaPublicClient,
    walletClient: sepolia.sepoliaWalletClient,
    sourceVaultContract: sepolia.sourceVaultContract as unknown as SourceVaultContract,
    destPoolContract: null,
    usdcContract: sepolia.sepoliaUsdcContract as unknown as Erc20Contract,
    getGasPrice: sepolia.getSepoliaGasPrice,
  });

  entries.set(BASE_SEPOLIA_CHAIN_ID, {
    chainId: BASE_SEPOLIA_CHAIN_ID,
    chain: baseSepolia.baseSepoliaChain,
    publicClient: baseSepolia.baseSepoliaPublicClient,
    walletClient: baseSepolia.baseSepoliaWalletClient,
    sourceVaultContract: baseSepolia.sourceVaultContract as unknown as SourceVaultContract,
    destPoolContract: baseSepolia.destPoolContract as unknown as DestPoolContract,
    usdcContract: baseSepolia.baseSepoliaUsdcContract as unknown as Erc20Contract,
    getGasPrice: baseSepolia.getBaseSepoliaGasPrice,
  });

  entries.set(ARBITRUM_SEPOLIA_CHAIN_ID, {
    chainId: ARBITRUM_SEPOLIA_CHAIN_ID,
    chain: arbitrumSepolia.arbitrumSepoliaChain,
    publicClient: arbitrumSepolia.arbitrumSepoliaPublicClient,
    walletClient: arbitrumSepolia.arbitrumSepoliaWalletClient,
    sourceVaultContract: arbitrumSepolia.sourceVaultContract as unknown as SourceVaultContract,
    destPoolContract: arbitrumSepolia.destPoolContract as unknown as DestPoolContract,
    usdcContract: arbitrumSepolia.arbitrumSepoliaUsdcContract as unknown as Erc20Contract,
    getGasPrice: arbitrumSepolia.getArbitrumSepoliaGasPrice,
  });

  entries.set(OPTIMISM_SEPOLIA_CHAIN_ID, {
    chainId: OPTIMISM_SEPOLIA_CHAIN_ID,
    chain: optimismSepolia.optimismSepoliaChain,
    publicClient: optimismSepolia.optimismSepoliaPublicClient,
    walletClient: optimismSepolia.optimismSepoliaWalletClient,
    sourceVaultContract: optimismSepolia.sourceVaultContract as unknown as SourceVaultContract,
    destPoolContract: optimismSepolia.destPoolContract as unknown as DestPoolContract,
    usdcContract: optimismSepolia.optimismSepoliaUsdcContract as unknown as Erc20Contract,
    getGasPrice: optimismSepolia.getOptimismSepoliaGasPrice,
  });

  cachedEntries = entries;
  return entries;
}

async function requireChainEntry(chainId: number): Promise<ChainEntry> {
  const entries = await loadEntries();
  const entry = entries.get(chainId);
  if (!entry) throw new Error(`Unsupported chain: ${chainId}`);
  return entry;
}

async function requireDestPoolContract(chainId: number): Promise<DestPoolContract> {
  const entry = await requireChainEntry(chainId);
  if (!entry.destPoolContract) throw new Error(`Chain ${chainId} has no DestPool: source-only`);
  return entry.destPoolContract;
}

export async function getSourceVaultContract(chainId: number): Promise<SourceVaultContract> {
  return (await requireChainEntry(chainId)).sourceVaultContract;
}

export async function getDestPoolContract(chainId: number): Promise<DestPoolContract> {
  return requireDestPoolContract(chainId);
}

export async function getDestPoolAddress(chainId: number): Promise<`0x${string}`> {
  return (await requireDestPoolContract(chainId)).address;
}

export async function getUsdcContract(chainId: number): Promise<Erc20Contract> {
  return (await requireChainEntry(chainId)).usdcContract;
}

export async function getPublicClient(chainId: number): Promise<PublicClient<any, any>> {
  return (await requireChainEntry(chainId)).publicClient;
}

export async function getGasPriceForChain(chainId: number): Promise<bigint> {
  return (await requireChainEntry(chainId)).getGasPrice();
}

export async function listChainIds(): Promise<number[]> {
  const entries = await loadEntries();
  return Array.from(entries.keys());
}
