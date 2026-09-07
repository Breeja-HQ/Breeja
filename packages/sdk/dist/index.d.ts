import type { BreejaConfig, ChainInfo, HistoryFilter, PayRequest, Payment, Quote, QuoteRequest } from "./types.js";
export declare class Breeja {
    private readonly client;
    private chainsCache;
    constructor(config: BreejaConfig);
    chains(): Promise<ChainInfo[]>;
    private resolveChain;
    /**
     * Resolves a recipient that may be an ENS name to a raw address against
     * the real ENS registry (never from model output, per docs/PARTNERS.md).
     * Throws InvalidRecipient if a name-like input fails to resolve, rather
     * than silently falling through to the relayer with garbage input.
     */
    private resolveRecipientOrThrow;
    quote(request: QuoteRequest): Promise<Quote>;
    pay(request: PayRequest): Promise<Payment>;
    status(paymentId: string): Promise<Payment>;
    /**
     * Subscribes to live transitions over the relayer's SSE endpoint (push,
     * not poll) and calls onUpdate on every state change. The stream closes
     * itself after a terminal state; a dropped connection before that
     * reconnects automatically, matching EventSource's own behavior, since
     * this runs in Node contexts (the MCP server, CLI scripts) that don't
     * have a native EventSource to delegate reconnect logic to.
     */
    watch(paymentId: string, onUpdate: (p: Payment) => void): () => void;
    history(_filter: HistoryFilter): Promise<Payment[]>;
}
export type { ChainRef, ChainSlug, Amount, Signer, TypedData, Quote, QuoteRequest, Recipient, Route, RoutePreference, RouteType, Custody, PayRequest, Payment, PaymentState, HistoryFilter, ChainInfo, BreejaConfig, BreejaErrorCode, } from "./types.js";
export { BreejaError } from "./types.js";
export { toSmallestUnits, toDecimalString, USDC_DECIMALS } from "./amount.js";
export { explorerTxUrl } from "./explorers.js";
export { readUsdcDomainName } from "./signing.js";
export { resolveEnsName, resolveEnsAddress, resolveRecipient, isLikelyEnsName } from "./ens.js";
