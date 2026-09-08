import { createPublicClient, createWalletClient, http, getContract, parseAbi, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import sourceVaultAbi from "../abi/HederaSourceVault.json" with { type: "json" };
import destPoolAbi from "../abi/HederaDestPool.json" with { type: "json" };

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

// Hedera Testnet — not EVM-identical. USDC is an HTS token whose ERC-20
// facade does NOT implement EIP-3009: verified on-chain on 2026-09-08
// against the real token at 0.0.429274 / 0x0000...068cda —
//   cast call $USDC "DOMAIN_SEPARATOR()(bytes32)" --rpc-url https://testnet.hashio.io/api
//     -> reverts (empty data)
//   cast call $USDC "authorizationState(address,bytes32)(bool)" 0x0 0x0 --rpc-url https://testnet.hashio.io/api
//     -> reverts (empty data)
// depositWithAuthorization is therefore unusable here. The only deposit path
// is approve() (payer, their own gas) + deposit() (relayer, relayer-gated,
// pulls via transferFrom) — see src/hedera/HederaSourceVault.sol and
// src/hedera/HederaDestPool.sol in contracts/. This is NOT gasless for the
// payer on this chain: they pay their own gas for approve(), unlike every
// EIP-3009 chain in this mesh where the permit is signed off-chain for free
// and the relayer pays all on-chain gas. See docs/CHAINS.md "Hedera".
//
// HTS token association is also required at the CONTRACT level, separate
// from any user account association: HederaSourceVault/HederaDestPool each
// call associateToken() against the HTS system contract precompile at
// 0x167 once, right after deploy (see docs/DEPLOYMENTS.md for the real
// association tx hashes) — without it, a transfer into either contract
// reverts with no useful ERC-20-shaped error.
//
// Chain id verified live: `cast chain-id --rpc-url https://testnet.hashio.io/api` -> 296.
// See docs/CHAINS.md and docs/DEPLOYMENTS.md for the full verification record.
export const hederaTestnetChain = defineChain({
  id: 296,
  name: "Hedera Testnet",
  nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet.hashio.io/api"] },
  },
  blockExplorers: {
    default: { name: "HashScan", url: "https://hashscan.io/testnet" },
  },
  testnet: true,
});

export const hederaTestnetPublicClient = createPublicClient({
  chain: hederaTestnetChain,
  transport: http(requireEnv("HEDERA_TESTNET_RPC_URL")),
});

export const hederaRelayerAccount = privateKeyToAccount(requireEnv("HEDERA_TESTNET_PRIVATE_KEY") as `0x${string}`);

export const hederaTestnetWalletClient = createWalletClient({
  chain: hederaTestnetChain,
  transport: http(requireEnv("HEDERA_TESTNET_RPC_URL")),
  account: hederaRelayerAccount,
});

// Deployed and self-associated 2026-09-08 — see docs/DEPLOYMENTS.md for
// addresses, deploy tx hashes, and the association tx hashes.
export const sourceVaultContract = getContract({
  address: requireEnv("HEDERA_TESTNET_SOURCE_VAULT_ADDRESS") as `0x${string}`,
  abi: sourceVaultAbi,
  client: { public: hederaTestnetPublicClient, wallet: hederaTestnetWalletClient },
});

const erc20ReadAbi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function transfer(address, uint256) returns (bool)",
  "function approve(address, uint256) returns (bool)",
]);

export const hederaTestnetUsdcContract = getContract({
  address: requireEnv("HEDERA_TESTNET_USDC_ADDRESS") as `0x${string}`,
  abi: erc20ReadAbi,
  client: { public: hederaTestnetPublicClient, wallet: hederaTestnetWalletClient },
});

export const destPoolContract = getContract({
  address: requireEnv("HEDERA_TESTNET_DEST_POOL_ADDRESS") as `0x${string}`,
  abi: destPoolAbi,
  client: { public: hederaTestnetPublicClient, wallet: hederaTestnetWalletClient },
});

// Gas on Hedera is HBAR-denominated with different price mechanics than the
// Sepolia/Arc EVM chains (per docs/CHAINS.md's explicit warning): the JSON-RPC
// relay (Hashio) reports a value via eth_gasPrice for viem/ethers compatibility,
// but it reflects Hedera's own fee schedule (fixed USD-denominated fees
// converted to HBAR/tinybar, not an EIP-1559-style base-fee market) rather than
// a competitive gas auction. publicClient.getGasPrice() still works
// mechanically (it calls eth_gasPrice under the hood, which Hashio serves),
// but the number it returns should not be treated as a real-time market
// signal the way it is on the other chains in this mesh — it's this chain's
// current fee-schedule-derived price, not evidence of network congestion.
export async function getHederaTestnetGasPrice(): Promise<bigint> {
  return hederaTestnetPublicClient.getGasPrice();
}
