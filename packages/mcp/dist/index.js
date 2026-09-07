#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { BreejaError } from "@breeja/sdk";
import { createBreejaClient } from "./client.js";
import { requireEnv } from "./env.js";
import { checkSpendCap, loadSpendCapConfig, toMicroUsdc } from "./spendCap.js";
import { errorResult, textResult, toToolError } from "./toolError.js";
const breeja = createBreejaClient();
const spendCapConfig = loadSpendCapConfig(process.env);
if (spendCapConfig.usingPerCallDefault) {
    console.error(`[breeja-mcp] BREEJA_MAX_PAYMENT_USDC not set; defaulting per-call cap to ${spendCapConfig.perCallCapUsdc} USDC.`);
}
if (spendCapConfig.usingSessionDefault) {
    console.error(`[breeja-mcp] BREEJA_MAX_SESSION_USDC not set; defaulting per-session cap to ${spendCapConfig.sessionCapUsdc} USDC.`);
}
// Module-scope running total. Resets on process restart, which is acceptable:
// an MCP server process is one session's worth of trust, and a restart is a
// deliberate operator action, not something an agent can trigger to reset its cap.
let sessionSpentMicros = 0n;
const chainRefSchema = z.union([z.string(), z.number()]);
const preferenceSchema = z.enum(["fast", "cheap", "trustless"]);
const addressSchema = z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "must be a 0x-prefixed 20-byte address");
const server = new McpServer({ name: "breeja", version: "0.1.0" });
server.registerTool("breeja_quote", {
    title: "Quote a cross-chain USDC payment",
    description: "Get ranked, viable routes for a cross-chain USDC payment with fees and ETAs. Read-only — does not move funds.",
    inputSchema: {
        from: chainRefSchema.describe("Source chain slug (e.g. \"base-sepolia\") or numeric chain id"),
        to: chainRefSchema.describe("Destination chain slug or numeric chain id"),
        amount: z.string().describe("Decimal string amount in USDC, e.g. \"10.00\""),
        preference: preferenceSchema.optional().describe("Route preference: fast, cheap, or trustless"),
        payer: addressSchema.optional(),
        recipient: addressSchema.optional(),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
}, async ({ from, to, amount, preference, payer, recipient }) => {
    try {
        const quote = await breeja.quote({ from, to, amount, preference, payer, recipient });
        return textResult(quote);
    }
    catch (error) {
        return toToolError(error);
    }
});
server.registerTool("breeja_pay", {
    title: "Execute a cross-chain USDC payment",
    description: "MOVES REAL FUNDS. Executes a live cross-chain USDC payment on Breeja — this is not a simulation or a dry run. " +
        "Signs and submits an on-chain transfer using the server's configured signer (BREEJA_SIGNER_KEY) and returns " +
        "once the payment is accepted, including explorer URLs for verification. Subject to a per-call and a " +
        "per-session cumulative spend cap; calls that would exceed either cap are rejected before any funds move.",
    inputSchema: {
        from: chainRefSchema.describe("Source chain slug or numeric chain id"),
        to: chainRefSchema.describe("Destination chain slug or numeric chain id"),
        amount: z.string().describe("Decimal string amount in USDC, e.g. \"10.00\""),
        recipient: addressSchema.describe("Recipient address on the destination chain"),
        preference: preferenceSchema.optional().describe("Route preference: fast, cheap, or trustless"),
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
}, async ({ from, to, amount, recipient, preference }) => {
    const decision = checkSpendCap(amount, sessionSpentMicros, spendCapConfig);
    if (!decision.allowed) {
        console.error(`[breeja-mcp] breeja_pay rejected: ${decision.reason} — ${decision.message}`);
        return errorResult(`Payment rejected: ${decision.reason}. ${decision.message}`);
    }
    let signerKey;
    try {
        signerKey = requireEnv("BREEJA_SIGNER_KEY");
    }
    catch (error) {
        return toToolError(error);
    }
    try {
        const payment = await breeja.pay({
            from,
            to,
            amount,
            recipient,
            preference,
            signer: { type: "private-key", key: signerKey },
        });
        sessionSpentMicros += toMicroUsdc(amount);
        return textResult({
            id: payment.id,
            status: payment.status,
            amount: payment.amount,
            feeAmount: payment.feeAmount,
            payoutAmount: payment.payoutAmount,
            route: payment.route,
            sourceTxHash: payment.sourceTxHash,
            destTxHash: payment.destTxHash,
            sourceExplorerUrl: payment.sourceExplorerUrl,
            destExplorerUrl: payment.destExplorerUrl,
            explanation: payment.explanation,
        });
    }
    catch (error) {
        return toToolError(error);
    }
});
server.registerTool("breeja_status", {
    title: "Get the status of a payment",
    description: "Fetch the current state of one Breeja payment by id. Read-only.",
    inputSchema: {
        paymentId: z.string().describe("The payment id returned by breeja_pay"),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
}, async ({ paymentId }) => {
    try {
        const payment = await breeja.status(paymentId);
        return textResult(payment);
    }
    catch (error) {
        return toToolError(error);
    }
});
server.registerTool("breeja_history", {
    title: "Get past payments for an address",
    description: "List past Breeja payments for an address. Read-only. Note: history is not yet backed by a live " +
        "subgraph/endpoint in this deployment and may be unavailable.",
    inputSchema: {
        address: addressSchema.describe("Address to fetch payment history for"),
        limit: z.number().int().positive().optional().describe("Maximum number of payments to return"),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
}, async ({ address, limit }) => {
    try {
        const payments = await breeja.history({ address, limit });
        return textResult(payments);
    }
    catch (error) {
        if (error instanceof BreejaError) {
            return toToolError(error);
        }
        // Breeja.history() currently throws a plain Error ("not yet implemented":
        // no subgraph-backed history endpoint exists). That is an expected,
        // honest limitation — not a BreejaError and not a crash.
        const message = error instanceof Error ? error.message : String(error);
        return errorResult(`Payment history is not available yet in this deployment: ${message}`);
    }
});
server.registerTool("breeja_chains", {
    title: "List supported chains",
    description: "List chains Breeja currently supports as payment sources and destinations, with pool liquidity. Read-only.",
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: true },
}, async () => {
    try {
        const chains = await breeja.chains();
        return textResult(chains);
    }
    catch (error) {
        return toToolError(error);
    }
});
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[breeja-mcp] server started");
//# sourceMappingURL=index.js.map