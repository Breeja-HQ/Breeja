import "dotenv/config";
import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, createWalletClient, http, parseSignature, toHex, parseUnits, formatUnits, type Chain } from "viem";
import { baseSepolia, arbitrumSepolia, optimismSepolia, sepolia, arcTestnet } from "viem/chains";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

const RELAYER_URL = process.env.RELAYER_API_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;
const AMOUNT = parseUnits("1", 6);

interface ChainConfig {
  chainId: number;
  viemChain: Chain;
  rpcUrlEnv: string;
  usdcAddressEnv: string;
  sourceVaultAddressEnv: string;
  destPoolAddressEnv: string;
  explorerTxUrl: (hash: string) => string;
}

const CHAINS: Record<string, ChainConfig> = {
  "ethereum-sepolia": {
    chainId: 11155111,
    viemChain: sepolia,
    rpcUrlEnv: "ETHEREUM_SEPOLIA_RPC_URL",
    usdcAddressEnv: "ETHEREUM_SEPOLIA_USDC_ADDRESS",
    sourceVaultAddressEnv: "ETHEREUM_SEPOLIA_SOURCE_VAULT_ADDRESS",
    destPoolAddressEnv: "",
    explorerTxUrl: (hash) => `https://sepolia.etherscan.io/tx/${hash}`,
  },
  "base-sepolia": {
    chainId: 84532,
    viemChain: baseSepolia,
    rpcUrlEnv: "BASE_SEPOLIA_RPC_URL",
    usdcAddressEnv: "BASE_SEPOLIA_USDC_ADDRESS",
    sourceVaultAddressEnv: "BASE_SEPOLIA_SOURCE_VAULT_ADDRESS",
    destPoolAddressEnv: "BASE_SEPOLIA_DEST_POOL_ADDRESS",
    explorerTxUrl: (hash) => `https://sepolia.basescan.org/tx/${hash}`,
  },
  "arbitrum-sepolia": {
    chainId: 421614,
    viemChain: arbitrumSepolia,
    rpcUrlEnv: "ARBITRUM_SEPOLIA_RPC_URL",
    usdcAddressEnv: "ARBITRUM_SEPOLIA_USDC_ADDRESS",
    sourceVaultAddressEnv: "ARBITRUM_SEPOLIA_SOURCE_VAULT_ADDRESS",
    destPoolAddressEnv: "ARBITRUM_SEPOLIA_DEST_POOL_ADDRESS",
    explorerTxUrl: (hash) => `https://sepolia.arbiscan.io/tx/${hash}`,
  },
  "optimism-sepolia": {
    chainId: 11155420,
    viemChain: optimismSepolia,
    rpcUrlEnv: "OPTIMISM_SEPOLIA_RPC_URL",
    usdcAddressEnv: "OPTIMISM_SEPOLIA_USDC_ADDRESS",
    sourceVaultAddressEnv: "OPTIMISM_SEPOLIA_SOURCE_VAULT_ADDRESS",
    destPoolAddressEnv: "OPTIMISM_SEPOLIA_DEST_POOL_ADDRESS",
    explorerTxUrl: (hash) => `https://sepolia-optimism.etherscan.io/tx/${hash}`,
  },
  "arc-testnet": {
    chainId: 5_042_002,
    viemChain: arcTestnet,
    rpcUrlEnv: "ARC_TESTNET_RPC_URL",
    usdcAddressEnv: "ARC_TESTNET_USDC_ADDRESS",
    sourceVaultAddressEnv: "ARC_TESTNET_SOURCE_VAULT_ADDRESS",
    destPoolAddressEnv: "ARC_TESTNET_DEST_POOL_ADDRESS",
    explorerTxUrl: (hash) => `https://testnet.arcscan.app/tx/${hash}`,
  },
};

interface PayResponse {
  id: string;
  decision: { viable: boolean; feeBps: number; feeAmount: string; payoutAmount: string };
}

type StatusResponse =
  | { state: "pending_deposit" }
  | { state: "deposit_confirmed"; sourceTxHash: string }
  | { state: "released"; sourceTxHash: string; destTxHash: string; explanation: string }
  | { state: "failed"; error: string };

function timestamp(): string {
  return new Date().toISOString().split("T")[1].replace("Z", "");
}

function log(message: string): void {
  console.log(`[${timestamp()}] ${message}`);
}

async function pollStatus(id: string, apiKey: string, timeoutMs: number): Promise<StatusResponse> {
  const deadline = Date.now() + timeoutMs;
  let lastState = "";
  while (Date.now() < deadline) {
    const res = await fetch(`${RELAYER_URL}/status/${id}`, { headers: { "x-api-key": apiKey } });
    const status = (await res.json()) as StatusResponse;
    if (status.state !== lastState) {
      lastState = status.state;
      log(`Status: ${status.state}`);
    }
    if (status.state === "released" || status.state === "failed") return status;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error("Timed out waiting for payment status to resolve");
}

async function main() {
  const fromKey = requireEnv("ROUND_TRIP_FROM_CHAIN");
  const toKey = requireEnv("ROUND_TRIP_TO_CHAIN");
  const preference = process.env.ROUND_TRIP_PREFERENCE as "fast" | "cheap" | "trustless" | undefined;

  const fromChain = CHAINS[fromKey];
  const toChain = CHAINS[toKey];
  if (!fromChain) throw new Error(`Unknown ROUND_TRIP_FROM_CHAIN: ${fromKey}`);
  if (!toChain) throw new Error(`Unknown ROUND_TRIP_TO_CHAIN: ${toKey}`);
  if (!toChain.destPoolAddressEnv) throw new Error(`${toKey} has no DestPool: source-only chain`);

  console.log("=".repeat(64));
  console.log(`Breeja — Round Trip: ${fromKey} -> ${toKey}`);
  console.log("=".repeat(64));
  console.log("");

  const apiKey = requireEnv("BREEJA_TEST_API_KEY");
  const payerPrivateKey = requireEnv("AGENT_A_PRIVATE_KEY") as `0x${string}`;
  const recipientAddress = requireEnv("AGENT_B_ADDRESS") as `0x${string}`;
  const sourceVaultAddress = requireEnv(fromChain.sourceVaultAddressEnv) as `0x${string}`;
  const usdcAddress = requireEnv(fromChain.usdcAddressEnv) as `0x${string}`;
  const rpcUrl = requireEnv(fromChain.rpcUrlEnv);

  const payer = privateKeyToAccount(payerPrivateKey);

  console.log(`Payer (source):      ${payer.address}`);
  console.log(`Recipient (dest):    ${recipientAddress}`);
  console.log(`Amount:              ${formatUnits(AMOUNT, 6)} USDC`);
  console.log(`Relayer:             ${RELAYER_URL}`);
  console.log("");

  const publicClient = createPublicClient({ chain: fromChain.viemChain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account: payer, chain: fromChain.viemChain, transport: http(rpcUrl) });

  const domainName = (await publicClient.readContract({
    address: usdcAddress,
    abi: [
      { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
    ] as const,
    functionName: "name",
  })) as string;

  log(`USDC EIP-712 domain name on ${fromKey}: "${domainName}"`);

  const validAfter = 0n;
  const validBefore = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const nonce = toHex(crypto.getRandomValues(new Uint8Array(32)));

  log("Payer signing EIP-3009 transfer authorization (off-chain, no gas)...");

  const signature = await walletClient.signTypedData({
    domain: {
      name: domainName,
      version: "2",
      chainId: fromChain.chainId,
      verifyingContract: usdcAddress,
    },
    types: {
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    },
    primaryType: "TransferWithAuthorization",
    message: {
      from: payer.address,
      to: sourceVaultAddress,
      value: AMOUNT,
      validAfter,
      validBefore,
      nonce,
    },
  });

  const { v, r, s } = parseSignature(signature);

  log("Signed. POSTing to relayer's /pay endpoint...");

  const payRes = await fetch(`${RELAYER_URL}/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({
      fromChainId: fromChain.chainId,
      toChainId: toChain.chainId,
      payer: payer.address,
      recipient: recipientAddress,
      amount: AMOUNT.toString(),
      authorization: {
        validAfter: validAfter.toString(),
        validBefore: validBefore.toString(),
        nonce,
        v: Number(v),
        r,
        s,
      },
      ...(preference ? { preference } : {}),
    }),
  });

  if (payRes.status !== 202) {
    const body = await payRes.text();
    throw new Error(`POST /pay failed with ${payRes.status}: ${body}`);
  }

  const { id, decision } = (await payRes.json()) as PayResponse;
  log(`Accepted. Payment id: ${id}`);
  log(`Fee: ${formatUnits(BigInt(decision.feeAmount), 6)} USDC, payout: ${formatUnits(BigInt(decision.payoutAmount), 6)} USDC`);
  console.log("");

  const pollTimeoutMs = preference === "trustless" ? 25 * 60_000 : 180_000;
  const finalStatus = await pollStatus(id, apiKey, pollTimeoutMs);

  if (finalStatus.state === "failed") {
    throw new Error(`Round trip failed: ${finalStatus.error}`);
  }
  if (finalStatus.state !== "released") {
    throw new Error(`Unexpected terminal state: ${finalStatus.state}`);
  }

  const destUsdcAddress = requireEnv(toChain.usdcAddressEnv) as `0x${string}`;
  const destPublicClient = createPublicClient({ chain: toChain.viemChain, transport: http(requireEnv(toChain.rpcUrlEnv)) });

  const recipientBalance = (await destPublicClient.readContract({
    address: destUsdcAddress,
    abi: [
      {
        type: "function",
        name: "balanceOf",
        stateMutability: "view",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ type: "uint256" }],
      },
    ] as const,
    functionName: "balanceOf",
    args: [recipientAddress],
  })) as bigint;

  console.log("");
  console.log("=".repeat(64));
  console.log("Round trip complete.");
  console.log(`Source deposit tx (${fromKey}): ${fromChain.explorerTxUrl(finalStatus.sourceTxHash)}`);
  console.log(`Dest release tx (${toKey}):     ${toChain.explorerTxUrl(finalStatus.destTxHash)}`);
  console.log(`Explanation: ${finalStatus.explanation}`);
  console.log("");
  console.log(`Recipient's balance is now ${formatUnits(recipientBalance, 6)} USDC on ${toKey} (read directly from chain).`);
  console.log("This was a real signed permit, a real on-chain deposit, and a real release —");
  console.log("recipient != payer, called with no browser involved at all.");
  console.log("=".repeat(64));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
