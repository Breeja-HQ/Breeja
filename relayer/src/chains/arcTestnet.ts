import { createPublicClient, createWalletClient, http, getContract, parseAbi, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import sourceVaultAbi from "../abi/SourceVault.json" with { type: "json" };
import destPoolAbi from "../abi/DestPool.json" with { type: "json" };

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

// Arc Testnet — Circle's own L1, USDC-native (gas token) with an optional
// ERC-20 interface over the same balance at a fixed system address.
// Verified live against docs.arc.io and on-chain via `cast` on 2026-09-08:
//   - chain id: `cast chain-id --rpc-url https://rpc.testnet.arc.io` -> 5042002
//   - USDC (FiatTokenProxy / NativeFiatTokenV2_2), EIP-3009 confirmed:
//       cast call 0x3600000000000000000000000000000000000000 "DOMAIN_SEPARATOR()(bytes32)" --rpc-url https://rpc.testnet.arc.io
//         -> 0x361191522483d32a83e70ae7183b4b9629442c13a78bc9921d6f707911c8c6b0
//       cast call 0x3600000000000000000000000000000000000000 "authorizationState(address,bytes32)(bool)" 0x0 0x0 --rpc-url https://rpc.testnet.arc.io
//         -> false (no revert)
//       name() -> "USDC", symbol() -> "USDC", decimals() -> 6, version() -> "2"
// See docs/CHAINS.md and docs/DEPLOYMENTS.md for the full verification record.
export const arcTestnetChain = defineChain({
  id: 5_042_002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.arc.io"], webSocket: ["wss://rpc.testnet.arc.io"] },
  },
  blockExplorers: {
    default: { name: "ArcScan", url: "https://testnet.arcscan.app", apiUrl: "https://testnet.arcscan.app/api" },
  },
  testnet: true,
});

export const arcTestnetPublicClient = createPublicClient({
  chain: arcTestnetChain,
  transport: http(requireEnv("ARC_TESTNET_RPC_URL")),
});

export const relayerAccount = privateKeyToAccount(requireEnv("PRIVATE_KEY") as `0x${string}`);

export const arcTestnetWalletClient = createWalletClient({
  chain: arcTestnetChain,
  transport: http(requireEnv("ARC_TESTNET_RPC_URL")),
  account: relayerAccount,
});

// Deployed 2026-09-08 — see docs/DEPLOYMENTS.md for addresses, tx hashes,
// and the funding record.
export const sourceVaultContract = getContract({
  address: requireEnv("ARC_TESTNET_SOURCE_VAULT_ADDRESS") as `0x${string}`,
  abi: sourceVaultAbi,
  client: { public: arcTestnetPublicClient, wallet: arcTestnetWalletClient },
});

const erc20ReadAbi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function transfer(address, uint256) returns (bool)",
  "function approve(address, uint256) returns (bool)",
]);

// The ERC-20 interface over Arc's native USDC balance, at the fixed system
// address 0x3600...0000 (see docs.arc.io "Stablecoin native model"). This is
// not a conventional deployed token contract, but it satisfies IERC20 and
// EIP-3009 directly (verified above), so the existing permit flow applies
// unmodified.
export const arcTestnetUsdcContract = getContract({
  address: requireEnv("ARC_TESTNET_USDC_ADDRESS") as `0x${string}`,
  abi: erc20ReadAbi,
  client: { public: arcTestnetPublicClient, wallet: arcTestnetWalletClient },
});

export const destPoolContract = getContract({
  address: requireEnv("ARC_TESTNET_DEST_POOL_ADDRESS") as `0x${string}`,
  abi: destPoolAbi,
  client: { public: arcTestnetPublicClient, wallet: arcTestnetWalletClient },
});

export async function getArcTestnetGasPrice(): Promise<bigint> {
  return arcTestnetPublicClient.getGasPrice();
}
