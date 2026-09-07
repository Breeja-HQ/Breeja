import { createPublicClient, createWalletClient, http, getContract, parseAbi } from "viem";
import { arbitrumSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import sourceVaultAbi from "../abi/SourceVault.json" with { type: "json" };
import destPoolAbi from "../abi/DestPool.json" with { type: "json" };

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export const arbitrumSepoliaChain = arbitrumSepolia;

export const arbitrumSepoliaPublicClient = createPublicClient({
  chain: arbitrumSepoliaChain,
  transport: http(requireEnv("ARBITRUM_SEPOLIA_RPC_URL")),
});

export const relayerAccount = privateKeyToAccount(requireEnv("PRIVATE_KEY") as `0x${string}`);

export const arbitrumSepoliaWalletClient = createWalletClient({
  chain: arbitrumSepoliaChain,
  transport: http(requireEnv("ARBITRUM_SEPOLIA_RPC_URL")),
  account: relayerAccount,
});

export const sourceVaultContract = getContract({
  address: requireEnv("ARBITRUM_SEPOLIA_SOURCE_VAULT_ADDRESS") as `0x${string}`,
  abi: sourceVaultAbi,
  client: { public: arbitrumSepoliaPublicClient, wallet: arbitrumSepoliaWalletClient },
});

const erc20ReadAbi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function transfer(address, uint256) returns (bool)",
  "function approve(address, uint256) returns (bool)",
]);

export const arbitrumSepoliaUsdcContract = getContract({
  address: requireEnv("ARBITRUM_SEPOLIA_USDC_ADDRESS") as `0x${string}`,
  abi: erc20ReadAbi,
  client: { public: arbitrumSepoliaPublicClient, wallet: arbitrumSepoliaWalletClient },
});

export const destPoolContract = getContract({
  address: requireEnv("ARBITRUM_SEPOLIA_DEST_POOL_ADDRESS") as `0x${string}`,
  abi: destPoolAbi,
  client: { public: arbitrumSepoliaPublicClient, wallet: arbitrumSepoliaWalletClient },
});

export async function getArbitrumSepoliaGasPrice(): Promise<bigint> {
  return arbitrumSepoliaPublicClient.getGasPrice();
}
