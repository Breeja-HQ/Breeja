import type { Account, TypedDataDefinition } from "viem";
export type ChainSlug = "base-sepolia" | "arbitrum-sepolia" | "optimism-sepolia" | "hedera-testnet" | "arc-testnet" | "ethereum-sepolia";
export type ChainRef = ChainSlug | number;
/**
 * Decimal string in token units, e.g. "10.00" for ten USDC. Never a JS
 * number — floating-point money is a correctness bug, not a style choice.
 */
export type Amount = string;
export interface BreejaConfig {
    apiKey: string;
    baseUrl?: string;
}
export type TypedData = TypedDataDefinition;
export type Signer = {
    type: "viem";
    account: Account;
} | {
    type: "private-key";
    key: `0x${string}`;
} | {
    type: "custom";
    address: `0x${string}`;
    signTypedData: (data: TypedData) => Promise<`0x${string}`>;
};
export type RoutePreference = "fast" | "cheap" | "trustless";
export type RouteType = "fast_pool" | "cctp";
export type Custody = "custodial" | "trust-minimized";
/**
 * A payment recipient: a raw hex address, or an ENS name (e.g. "alice.eth")
 * resolved against the real ENS registry before the authorization is built.
 * Never resolved from model output — see docs/PARTNERS.md.
 */
export type Recipient = `0x${string}` | string;
export interface Route {
    type: RouteType;
    viable: boolean;
    reason?: string;
    custody: Custody;
    feeBps: number;
    feeAmount: Amount;
    payoutAmount: Amount;
    estimatedSeconds: number;
}
export interface QuoteRequest {
    from: ChainRef;
    to: ChainRef;
    amount: Amount;
    payer?: `0x${string}`;
    recipient?: Recipient;
    preference?: RoutePreference;
}
export interface Quote {
    viable: boolean;
    routes: Route[];
    recommended: Route | null;
}
export interface PayRequest {
    from: ChainRef;
    to: ChainRef;
    amount: Amount;
    recipient: Recipient;
    signer: Signer;
    preference?: RoutePreference;
}
export type PaymentState = "pending_deposit" | "deposit_confirmed" | "released" | "failed";
export interface Payment {
    id: string;
    status: PaymentState;
    fromChainId: number;
    toChainId: number;
    payer: `0x${string}`;
    recipient: `0x${string}`;
    amount: Amount;
    feeAmount: Amount;
    payoutAmount: Amount;
    route: RouteType;
    sourceTxHash: `0x${string}` | null;
    destTxHash: `0x${string}` | null;
    explanation: string | null;
    error: string | null;
    sourceExplorerUrl: string | null;
    destExplorerUrl: string | null;
    createdAt: number;
    updatedAt: number;
}
export interface HistoryFilter {
    address: `0x${string}`;
    limit?: number;
}
export interface ChainInfo {
    chainId: number;
    slug: string;
    name: string;
    isSource: boolean;
    isDestination: boolean;
    poolLiquidity: Amount | null;
}
export type BreejaErrorCode = "UnsupportedChain" | "InsufficientLiquidity" | "PoolPaused" | "InvalidAmount" | "InvalidRecipient" | "PermitExpired" | "PermitRejected" | "RelayerUnavailable" | "PaymentFailed";
export declare class BreejaError extends Error {
    code: BreejaErrorCode;
    details?: unknown;
    constructor(code: BreejaErrorCode, message: string, details?: unknown);
}
