import { createRelayerClient } from "./client.js";
import { resolveChainIdFromList } from "./chainRefs.js";
import { toSmallestUnits, toDecimalString } from "./amount.js";
import { buildTransferAuthorization, resolvePayerAddress } from "./signing.js";
import { getKnownAddresses } from "./knownAddresses.js";
import { explorerTxUrl } from "./explorers.js";
import { readSseFrames } from "./sse.js";
import { resolveRecipient } from "./ens.js";
import { BreejaError } from "./types.js";
const WATCH_RECONNECT_DELAY_MS = 2000;
// Placeholder payer/recipient for pure fee/viability quoting when the caller
// supplies neither, per docs/SDK.md's quote() example. quote() is read-only
// and never moves funds, so a real address is not required — but the relayer
// rejects the zero address as ZeroRecipient, so this must be any well-formed
// non-zero address instead.
const PLACEHOLDER_ADDRESS = "0x000000000000000000000000000000000000dEaD";
function toSdkRoute(entry) {
    return {
        type: entry.route,
        viable: entry.viable,
        reason: entry.reason,
        custody: entry.custody,
        feeBps: entry.feeBps,
        feeAmount: toDecimalString(entry.feeAmount),
        payoutAmount: toDecimalString(entry.payoutAmount),
        estimatedSeconds: entry.estimatedSeconds,
    };
}
function toSdkPayment(status) {
    return {
        id: status.id,
        status: status.state,
        fromChainId: status.fromChainId,
        toChainId: status.toChainId,
        payer: status.payer,
        recipient: status.recipient,
        amount: toDecimalString(status.amount),
        feeAmount: toDecimalString(status.feeAmount),
        payoutAmount: toDecimalString(status.payoutAmount),
        route: status.route,
        sourceTxHash: status.sourceTxHash ?? null,
        destTxHash: status.destTxHash ?? null,
        explanation: status.explanation ?? null,
        error: status.error ?? null,
        sourceExplorerUrl: explorerTxUrl(status.fromChainId, status.sourceTxHash ?? null),
        destExplorerUrl: explorerTxUrl(status.toChainId, status.destTxHash ?? null),
        createdAt: status.createdAt,
        updatedAt: status.updatedAt,
    };
}
export class Breeja {
    client;
    chainsCache = null;
    constructor(config) {
        this.client = createRelayerClient(config);
    }
    async chains() {
        if (this.chainsCache)
            return this.chainsCache;
        const response = await this.client.get("/chains");
        this.chainsCache = response.chains;
        return response.chains;
    }
    async resolveChain(ref) {
        const chains = await this.chains();
        return resolveChainIdFromList(ref, chains);
    }
    /**
     * Resolves a recipient that may be an ENS name to a raw address against
     * the real ENS registry (never from model output, per docs/PARTNERS.md).
     * Throws InvalidRecipient if a name-like input fails to resolve, rather
     * than silently falling through to the relayer with garbage input.
     */
    async resolveRecipientOrThrow(recipient) {
        const resolved = await resolveRecipient(recipient);
        if (!resolved) {
            throw new BreejaError("InvalidRecipient", `Could not resolve "${recipient}" to an address`, { recipient });
        }
        return resolved;
    }
    async quote(request) {
        const [fromChainId, toChainId] = await Promise.all([
            this.resolveChain(request.from),
            this.resolveChain(request.to),
        ]);
        const amount = toSmallestUnits(request.amount);
        const resolvedRecipient = request.recipient
            ? await this.resolveRecipientOrThrow(request.recipient)
            : undefined;
        const payer = request.payer ?? resolvedRecipient ?? PLACEHOLDER_ADDRESS;
        const recipient = resolvedRecipient ?? request.payer ?? PLACEHOLDER_ADDRESS;
        const response = await this.client.post("/quote", {
            fromChainId,
            toChainId,
            payer,
            recipient,
            amount,
            ...(request.preference ? { preference: request.preference } : {}),
        });
        return {
            viable: response.viable,
            routes: response.routes.map(toSdkRoute),
            recommended: response.recommended ? toSdkRoute(response.recommended) : null,
        };
    }
    async pay(request) {
        const [fromChainId, toChainId, recipient] = await Promise.all([
            this.resolveChain(request.from),
            this.resolveChain(request.to),
            this.resolveRecipientOrThrow(request.recipient),
        ]);
        const amount = toSmallestUnits(request.amount);
        const payer = resolvePayerAddress(request.signer);
        const known = getKnownAddresses(fromChainId);
        if (!known) {
            throw new BreejaError("UnsupportedChain", `No known SourceVault/USDC address for chain id ${fromChainId} — cannot build a signable authorization`, { fromChainId });
        }
        const authorization = await buildTransferAuthorization({
            signer: request.signer,
            chainId: fromChainId,
            rpcUrl: known.rpcUrl,
            usdcAddress: known.usdcAddress,
            sourceVaultAddress: known.sourceVaultAddress,
            payer,
            amount: BigInt(amount),
        });
        const response = await this.client.post("/pay", {
            fromChainId,
            toChainId,
            payer,
            recipient,
            amount,
            authorization,
            ...(request.preference ? { preference: request.preference } : {}),
        });
        return this.status(response.id);
    }
    async status(paymentId) {
        const status = await this.client.get(`/status/${paymentId}`);
        return toSdkPayment(status);
    }
    /**
     * Subscribes to live transitions over the relayer's SSE endpoint (push,
     * not poll) and calls onUpdate on every state change. The stream closes
     * itself after a terminal state; a dropped connection before that
     * reconnects automatically, matching EventSource's own behavior, since
     * this runs in Node contexts (the MCP server, CLI scripts) that don't
     * have a native EventSource to delegate reconnect logic to.
     */
    watch(paymentId, onUpdate) {
        let stopped = false;
        let reconnectTimer = null;
        let activeAbort = null;
        const stop = () => {
            stopped = true;
            if (reconnectTimer !== null)
                clearTimeout(reconnectTimer);
            if (activeAbort)
                activeAbort.abort();
        };
        const run = async () => {
            if (stopped)
                return;
            const abort = new AbortController();
            activeAbort = abort;
            try {
                const response = await this.client.openStream(`/events/${paymentId}`, abort.signal);
                for await (const frame of readSseFrames(response)) {
                    if (stopped)
                        return;
                    if (frame.event !== "state" && frame.event !== "error")
                        continue;
                    const payment = toSdkPayment(JSON.parse(frame.data));
                    onUpdate(payment);
                    if (payment.status === "released" || payment.status === "failed") {
                        stop();
                        return;
                    }
                }
            }
            catch (error) {
                console.error(`[breeja] watch(${paymentId}) stream error, reconnecting:`, error);
            }
            if (!stopped) {
                reconnectTimer = setTimeout(() => void run(), WATCH_RECONNECT_DELAY_MS);
            }
        };
        void run();
        return stop;
    }
    history(_filter) {
        throw new Error("Breeja.history() is not yet implemented: the relayer has no subgraph-backed history endpoint. " +
            "This is a missing feature, not a payment failure — do not catch it as a BreejaError.");
    }
}
export { BreejaError } from "./types.js";
export { toSmallestUnits, toDecimalString, USDC_DECIMALS } from "./amount.js";
export { explorerTxUrl } from "./explorers.js";
export { readUsdcDomainName } from "./signing.js";
export { resolveEnsName, resolveEnsAddress, resolveRecipient, isLikelyEnsName } from "./ens.js";
//# sourceMappingURL=index.js.map