import { getContract, parseAbi, type Chain, type GetContractReturnType, type PublicClient, type WalletClient } from "viem";
import sourceVaultAbi from "../abi/SourceVault.json" with { type: "json" };
import destPoolAbi from "../abi/DestPool.json" with { type: "json" };
import tokenMessengerV2Abi from "../abi/TokenMessengerV2.json" with { type: "json" };
import messageTransmitterV2Abi from "../abi/MessageTransmitterV2.json" with { type: "json" };
import { requireEnv } from "../env.js";
import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
  ARC_TESTNET_CHAIN_ID,
  BASE_SEPOLIA_CHAIN_ID,
  ETHEREUM_SEPOLIA_CHAIN_ID,
  HEDERA_TESTNET_CHAIN_ID,
  OPTIMISM_SEPOLIA_CHAIN_ID,
} from "./chainIds.js";

export {
  isSupportedSourceChain,
  isSupportedDestinationChain,
  isCctpEnabled,
  supportsEip3009,
  listSourceChainIds,
  listDestinationChainIds,
  listRoutePairs,
  getArcStatus,
  getHederaStatus,
  ETHEREUM_SEPOLIA_CHAIN_ID,
  BASE_SEPOLIA_CHAIN_ID,
  ARBITRUM_SEPOLIA_CHAIN_ID,
  OPTIMISM_SEPOLIA_CHAIN_ID,
  ARC_TESTNET_CHAIN_ID,
  HEDERA_TESTNET_CHAIN_ID,
} from "./chainIds.js";

const ENABLE_ARC = process.env.ENABLE_ARC === "true";
const ENABLE_HEDERA = process.env.ENABLE_HEDERA === "true";

type SourceVaultContract = GetContractReturnType<
  typeof sourceVaultAbi,
  { public: PublicClient; wallet: WalletClient }
>;
type DestPoolContract = GetContractReturnType<typeof destPoolAbi, { public: PublicClient; wallet: WalletClient }>;

const erc20Abi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function transfer(address, uint256) returns (bool)",
  "function approve(address, uint256) returns (bool)",
]);
type Erc20Contract = GetContractReturnType<typeof erc20Abi, { public: PublicClient; wallet: WalletClient }>;
type TokenMessengerContract = GetContractReturnType<
  typeof tokenMessengerV2Abi,
  { public: PublicClient; wallet: WalletClient }
>;
type MessageTransmitterContract = GetContractReturnType<
  typeof messageTransmitterV2Abi,
  { public: PublicClient; wallet: WalletClient }
>;

interface ChainEntry {
  chainId: number;
  chain: Chain;
  publicClient: PublicClient<any, any>;
  walletClient: WalletClient<any, any, any>;
  sourceVaultContract: SourceVaultContract;
  destPoolContract: DestPoolContract | null;
  usdcContract: Erc20Contract;
  tokenMessengerContract: TokenMessengerContract;
  messageTransmitterContract: MessageTransmitterContract;
  getGasPrice: () => Promise<bigint>;
}

function buildCctpContracts(
  publicClient: PublicClient<any, any>,
  walletClient: WalletClient<any, any, any>,
): { tokenMessengerContract: TokenMessengerContract; messageTransmitterContract: MessageTransmitterContract } {
  const tokenMessengerContract = getContract({
    address: requireEnv("CCTP_TOKEN_MESSENGER_ADDRESS") as `0x${string}`,
    abi: tokenMessengerV2Abi,
    client: { public: publicClient, wallet: walletClient },
  }) as unknown as TokenMessengerContract;

  const messageTransmitterContract = getContract({
    address: requireEnv("CCTP_MESSAGE_TRANSMITTER_ADDRESS") as `0x${string}`,
    abi: messageTransmitterV2Abi,
    client: { public: publicClient, wallet: walletClient },
  }) as unknown as MessageTransmitterContract;

  return { tokenMessengerContract, messageTransmitterContract };
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

  const [sepolia, baseSepolia, arbitrumSepolia, optimismSepolia, arcTestnet, hederaTestnet] = await Promise.all([
    import("./sepolia.js"),
    import("./baseSepolia.js"),
    import("./arbitrumSepolia.js"),
    import("./optimismSepolia.js"),
    // Imported unconditionally so the module graph stays static, but its
    // requireEnv calls only run — and only matter — when ENABLE_ARC is set;
    // see the ENABLE_ARC guard below before this entry is added to the map.
    ENABLE_ARC ? import("./arcTestnet.js") : Promise.resolve(null),
    // Same pattern as Arc: only matters when ENABLE_HEDERA is set.
    ENABLE_HEDERA ? import("./hederaTestnet.js") : Promise.resolve(null),
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
    ...buildCctpContracts(sepolia.sepoliaPublicClient, sepolia.sepoliaWalletClient),
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
    ...buildCctpContracts(baseSepolia.baseSepoliaPublicClient, baseSepolia.baseSepoliaWalletClient),
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
    ...buildCctpContracts(arbitrumSepolia.arbitrumSepoliaPublicClient, arbitrumSepolia.arbitrumSepoliaWalletClient),
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
    ...buildCctpContracts(optimismSepolia.optimismSepoliaPublicClient, optimismSepolia.optimismSepoliaWalletClient),
    getGasPrice: optimismSepolia.getOptimismSepoliaGasPrice,
  });

  // Additive, non-blocking: Arc is only registered when ENABLE_ARC is set.
  // The existing four chains above are unaffected either way.
  if (ENABLE_ARC && arcTestnet) {
    entries.set(ARC_TESTNET_CHAIN_ID, {
      chainId: ARC_TESTNET_CHAIN_ID,
      chain: arcTestnet.arcTestnetChain,
      publicClient: arcTestnet.arcTestnetPublicClient,
      walletClient: arcTestnet.arcTestnetWalletClient,
      sourceVaultContract: arcTestnet.sourceVaultContract as unknown as SourceVaultContract,
      destPoolContract: arcTestnet.destPoolContract as unknown as DestPoolContract,
      usdcContract: arcTestnet.arcTestnetUsdcContract as unknown as Erc20Contract,
      ...buildCctpContracts(arcTestnet.arcTestnetPublicClient, arcTestnet.arcTestnetWalletClient),
      getGasPrice: arcTestnet.getArcTestnetGasPrice,
    });
  }

  // Additive, non-blocking: Hedera is only registered when ENABLE_HEDERA is
  // set. The existing chains above are unaffected either way. Hedera has no
  // CCTP support (confirmed — see docs/CHAINS.md), so isCctpEnabled() is
  // false for it (cctpDomain: null in chainIds.ts) and router.ts never lets
  // a Hedera-involved quote reach the CCTP contracts wired in here — they're
  // built anyway (same global CCTP env vars as every other chain) only so
  // this entry has the same shape as the rest; they're simply never called.
  if (ENABLE_HEDERA && hederaTestnet) {
    entries.set(HEDERA_TESTNET_CHAIN_ID, {
      chainId: HEDERA_TESTNET_CHAIN_ID,
      chain: hederaTestnet.hederaTestnetChain,
      publicClient: hederaTestnet.hederaTestnetPublicClient,
      walletClient: hederaTestnet.hederaTestnetWalletClient,
      sourceVaultContract: hederaTestnet.sourceVaultContract as unknown as SourceVaultContract,
      destPoolContract: hederaTestnet.destPoolContract as unknown as DestPoolContract,
      usdcContract: hederaTestnet.hederaTestnetUsdcContract as unknown as Erc20Contract,
      ...buildCctpContracts(hederaTestnet.hederaTestnetPublicClient, hederaTestnet.hederaTestnetWalletClient),
      getGasPrice: hederaTestnet.getHederaTestnetGasPrice,
    });
  }

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

export async function getSourceVaultAddress(chainId: number): Promise<`0x${string}`> {
  return (await requireChainEntry(chainId)).sourceVaultContract.address;
}

export async function getRelayerAddress(chainId: number): Promise<`0x${string}`> {
  const entry = await requireChainEntry(chainId);
  const address = entry.walletClient.account?.address;
  if (!address) throw new Error(`Chain ${chainId} wallet client has no account`);
  return address;
}

export async function getTokenMessengerContract(chainId: number): Promise<TokenMessengerContract> {
  return (await requireChainEntry(chainId)).tokenMessengerContract;
}

export async function getMessageTransmitterContract(chainId: number): Promise<MessageTransmitterContract> {
  return (await requireChainEntry(chainId)).messageTransmitterContract;
}

export async function getMessageTransmitterAddress(chainId: number): Promise<`0x${string}`> {
  return (await requireChainEntry(chainId)).messageTransmitterContract.address;
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
