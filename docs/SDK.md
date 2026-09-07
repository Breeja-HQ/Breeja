# SDK

> Audience: coding agents first, humans second.

`@breeja/sdk` is the primary interface. The web app, the MCP server, and the x402 handler are all consumers of it. Nothing calls the relayer HTTP API directly except the SDK.

Design constraint: **an agent must be able to make a cross-chain payment in one call, with no knowledge of permits, nonces, chain IDs, or gas.** Everything below follows from that.

## Install

```bash
npm install @breeja/sdk
```

## Minimal use

```ts
import { Breeja } from "@breeja/sdk";

const breeja = new Breeja({ apiKey: process.env.BREEJA_API_KEY });

const payment = await breeja.pay({
  from: "base-sepolia",
  to: "arbitrum-sepolia",
  amount: "10.00",
  recipient: "0xAbC…",
  signer: account,
});

console.log(payment.id, payment.status);
```

The SDK internally: quotes routes, selects one, builds the EIP-3009 typed data, requests a signature from `signer`, posts to `/pay`, and returns once accepted.

## Chain identifiers

Accept both human slugs and numeric chain IDs. Slugs are stable across environments; chain IDs are not.

```ts
type ChainRef = "base-sepolia" | "arbitrum-sepolia" | "optimism-sepolia"
              | "hedera-testnet" | "arc-testnet" | "ethereum-sepolia" | number;
```

## Amounts

Accept decimal strings in token units: `"10.00"` is ten USDC. Convert internally with `parseUnits` against the destination token's decimals.

Constraint: never accept a JavaScript `number` for an amount. Reject it at the type level. Floating-point money is a correctness bug, not a style preference.

## API surface

```ts
class Breeja {
  constructor(config: BreejaConfig);

  quote(request: QuoteRequest): Promise<Quote>;
  pay(request: PayRequest): Promise<Payment>;
  status(paymentId: string): Promise<Payment>;
  watch(paymentId: string, onUpdate: (p: Payment) => void): () => void;
  history(filter: HistoryFilter): Promise<Payment[]>;
  chains(): Promise<ChainInfo[]>;
}
```

| Method | Purpose | Backed by |
|---|---|---|
| `quote` | Ranked viable routes with fees and ETAs | `POST /quote` |
| `pay` | Sign and submit a payment | `POST /pay` |
| `status` | One-shot current state | `GET /status/:id` |
| `watch` | Subscribe to transitions; returns unsubscribe | SSE `GET /events/:id` |
| `history` | Past payments by address | Subgraph |
| `chains` | Supported chains, tokens, liquidity | `GET /chains` |

## Quoting before paying

```ts
const quote = await breeja.quote({
  from: "base-sepolia",
  to: "hedera-testnet",
  amount: "500.00",
});

for (const route of quote.routes) {
  console.log(route.type, route.feeAmount, route.estimatedSeconds, route.viable);
}

const payment = await breeja.pay({ ...quote.recommended, recipient, signer });
```

`quote.routes` is ordered best-first under the caller's preference. `quote.recommended` is `routes[0]` when viable.

## Watching

```ts
const stop = breeja.watch(payment.id, (update) => {
  if (update.status === "released") {
    console.log("settled", update.destTxHash);
    stop();
  }
});
```

## Signers

```ts
type Signer =
  | { type: "viem"; account: Account }
  | { type: "private-key"; key: `0x${string}` }
  | { type: "custom"; signTypedData: (data: TypedData) => Promise<`0x${string}`> };
```

The `custom` variant is what lets Ledger, Privy embedded wallets, and agent key-management backends plug in without the SDK depending on any of them.

## Errors

```ts
class BreejaError extends Error {
  code: BreejaErrorCode;
  details?: unknown;
}

type BreejaErrorCode =
  | "UnsupportedChain"
  | "InsufficientLiquidity"
  | "PoolPaused"
  | "InvalidAmount"
  | "InvalidRecipient"
  | "PermitExpired"
  | "PermitRejected"
  | "RelayerUnavailable"
  | "PaymentFailed";
```

Constraint: codes are stable and match the relayer's rejection reasons and the Solidity custom errors. An agent branches on `code`, never on message text. Never change a code's meaning; add a new one.

## Idempotency

`pay` is idempotent on the EIP-3009 nonce. Calling it twice with the same signed permit returns the same payment id and does not double-release. Agents retrying on network failure are the expected case, not an edge case.

## Agent-native affordances

These are what separate an SDK an agent can use from one it merely can call.

1. **`chains()` is discoverable at runtime.** An agent must not hardcode a chain list. New chains appear without an SDK upgrade.
2. **Errors are typed and enumerable.** An agent can exhaustively handle every failure.
3. **Quotes are inspectable before commitment.** An agent can reason about cost and latency, then decide.
4. **`watch` is push, not poll.** An agent does not burn a loop waiting.
5. **Every response includes explorer URLs.** An agent reporting to a human hands over something verifiable.
6. **`llms.txt` is published** at the docs root so agents can retrieve the full API surface in one fetch.

## Docs route

The SDK documentation renders at `/docs` in the Next.js app, styled with [font-theme.md](font-theme.md).

Requirements:

- Every code block has a copy button. This is the single most-used control on a docs page.
- Tabs for `pay` / `quote` / `watch` / MCP / x402, each with a complete runnable example — imports included, no `…` elisions in code that is meant to be copied.
- A live-values panel: current supported chains and pool liquidity, read from `GET /chains`, so examples reflect reality.
- Left sidebar navigation, sticky, with a section for each SDK method.
- An "For agents" section linking `llms.txt` and the MCP server config, above the fold.
- Landing page links to `/docs` from the primary nav and from a dedicated section near the partner logos.

Constraint: no example may contain a placeholder that would fail if copied verbatim, except an obvious `0xYourAddress` or an env var. A copied example that throws is worse than no example.
