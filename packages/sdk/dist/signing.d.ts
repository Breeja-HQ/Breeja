import { type Address } from "viem";
import type { Signer } from "./types.js";
export interface TransferAuthorization {
    validAfter: string;
    validBefore: string;
    nonce: `0x${string}`;
    v: number;
    r: `0x${string}`;
    s: `0x${string}`;
}
export declare function resolvePayerAddress(signer: Signer): Address;
export declare function readUsdcDomainName(rpcUrl: string, usdcAddress: `0x${string}`): Promise<string>;
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
export declare function buildTransferAuthorization(params: BuildAuthorizationParams): Promise<TransferAuthorization>;
