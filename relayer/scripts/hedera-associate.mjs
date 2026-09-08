import { createWalletClient, createPublicClient, http, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const PRIVATE_KEY = process.env.HEDERA_PK;
const RPC = "https://testnet.hashio.io/api";
const PRECOMPILE = "0x0000000000000000000000000000000000000167";
const TOKEN = process.argv[2];

const hederaTestnet = {
  id: 296,
  name: "Hedera Testnet",
  nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
};

const account = privateKeyToAccount(PRIVATE_KEY);
const wallet = createWalletClient({ account, chain: hederaTestnet, transport: http(RPC) });
const publicClient = createPublicClient({ chain: hederaTestnet, transport: http(RPC) });

const abi = [{
  name: "associateToken",
  type: "function",
  stateMutability: "nonpayable",
  inputs: [{ name: "account", type: "address" }, { name: "token", type: "address" }],
  outputs: [{ name: "responseCode", type: "int64" }],
}];

const data = encodeFunctionData({ abi, functionName: "associateToken", args: [account.address, TOKEN] });

const hash = await wallet.sendTransaction({
  to: PRECOMPILE,
  data,
  gas: 800000n,
});
console.log("tx hash:", hash);

const receipt = await publicClient.waitForTransactionReceipt({ hash });
console.log("status:", receipt.status);
console.log(JSON.stringify(receipt, (k, v) => typeof v === "bigint" ? v.toString() : v, 2));
