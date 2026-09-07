import {
  createWalletClient,
  createPublicClient,
  http,
  parseSignature,
  toHex,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { Signer, TypedData } from "./types.js";

const USDC_NAME_ABI = [
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
] as const;

export interface TransferAuthorization {
  validAfter: string;
  validBefore: string;
  nonce: `0x${string}`;
  v: number;
  r: `0x${string}`;
  s: `0x${string}`;
}

export function resolvePayerAddress(signer: Signer): Address {
  if (signer.type === "viem") return signer.account.address;
  if (signer.type === "private-key") return privateKeyToAccount(signer.key).address;
  return signer.address;
}

async function signWithViemAccount(
  account: Parameters<typeof createWalletClient>[0]["account"],
  rpcUrl: string,
  typedData: TypedData,
): Promise<`0x${string}`> {
  const walletClient = createWalletClient({ account, transport: http(rpcUrl) });
  return walletClient.signTypedData(typedData as Parameters<typeof walletClient.signTypedData>[0]);
}

async function signTypedDataWithSigner(signer: Signer, rpcUrl: string, typedData: TypedData): Promise<`0x${string}`> {
  if (signer.type === "viem") {
    return signWithViemAccount(signer.account, rpcUrl, typedData);
  }
  if (signer.type === "private-key") {
    const account = privateKeyToAccount(signer.key);
    return signWithViemAccount(account, rpcUrl, typedData);
  }
  return signer.signTypedData(typedData);
}

export async function readUsdcDomainName(rpcUrl: string, usdcAddress: `0x${string}`): Promise<string> {
  const publicClient = createPublicClient({ transport: http(rpcUrl) });
  const name = await publicClient.readContract({
    address: usdcAddress,
    abi: USDC_NAME_ABI,
    functionName: "name",
  });
  return name;
}

export interface BuildAuthorizationParams {
  signer: Signer;
  chainId: number;
  rpcUrl: string;
  usdcAddress: `0x${string}`;
  sourceVaultAddress: `0x${string}`;
  payer: Address;
  amount: bigint;
  validAfter?: bigint;
  validBeforeSecondsFromNow?: bigint;
}

/**
 * Builds and signs the EIP-3009 TransferWithAuthorization typed data. The
 * domain `name` is read live from the token contract rather than hardcoded —
 * Arbitrum Sepolia's USDC reports "USD Coin" while the others report "USDC",
 * and a mismatched domain name produces a signature the contract rejects.
 */
export async function buildTransferAuthorization(params: BuildAuthorizationParams): Promise<TransferAuthorization> {
  const domainName = await readUsdcDomainName(params.rpcUrl, params.usdcAddress);

  const validAfter = params.validAfter ?? 0n;
  const validBefore = BigInt(Math.floor(Date.now() / 1000)) + (params.validBeforeSecondsFromNow ?? 3600n);
  const nonce = toHex(crypto.getRandomValues(new Uint8Array(32)));

  const typedData: TypedData = {
    domain: {
      name: domainName,
      version: "2",
      chainId: params.chainId,
      verifyingContract: params.usdcAddress,
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
      from: params.payer,
      to: params.sourceVaultAddress,
      value: params.amount,
      validAfter,
      validBefore,
      nonce,
    },
  };

  const signature = await signTypedDataWithSigner(params.signer, params.rpcUrl, typedData);
  const { v, r, s } = parseSignature(signature);

  return {
    validAfter: validAfter.toString(),
    validBefore: validBefore.toString(),
    nonce,
    v: Number(v),
    r,
    s,
  };
}
