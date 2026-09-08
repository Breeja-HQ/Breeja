# Architecture

> Audience: coding agents first, humans second. Facts are stated declaratively. Every constraint is explicit. Nothing is implied by tone.

## Definition

Breeja is a cross-chain stablecoin settlement rail. Callers are autonomous agents (SDK, MCP, x402, HTTP) and humans (web app). Both use identical contracts, relayer, and routing.

Invariant: **a payer signs a gasless EIP-3009 permit on any supported chain; the relayer submits it and pays all gas; a pre-funded pool on the destination chain releases to any named recipient within seconds.**

## Delta from v1

| Dimension | v1 | v2 |
|---|---|---|
| Destinations | HSK Chain only | Base, Arbitrum, Optimism, Hedera, Arc |
| Routing | Single branch | Fast pool vs CCTP, scored |
| State | In-process `Map` | Postgres + subgraph, event-reconciled |
| Frontend sync | Poll `GET /status/:id` | SSE stream + subgraph history |
| Callers | Browser, raw HTTP | Browser, SDK, MCP, x402 |
| Pool owner | Single EOA | Safe multisig |
| Relayer signer | Hot key | Ledger-backed |

HSK Chain is removed entirely. No HSK code, config, address, or reference survives in v2.

## Topology

Every chain runs both `SourceVault` and `DestPool`. A payment is a directed edge between any two chains.

```
        Base ──────────── Arbitrum
         │  ╲            ╱   │
         │    ╲        ╱     │
    Optimism ──── ╳ ──── Hedera
         │    ╱        ╲     │
         │  ╱            ╲   │
        Arc ───────────── Ethereum Sepolia (source-only)
```

Constraint: Ethereum Sepolia is source-only. Rationale: destination liquidity there costs more gas than the fee earns.

## Components

```
┌─────────────┐   ┌─────────────┐   ┌──────────────┐
│  Web app    │   │  Agent SDK  │   │  MCP server  │
│  (Next.js)  │   │  (npm)      │   │  (agents)    │
└──────┬──────┘   └──────┬──────┘   └───────┬──────┘
       └─────────────────┼──────────────────┘
                         ▼
                ┌─────────────────┐
                │     Relayer     │
                │  POST /quote    │
                │  POST /pay      │
                │  GET  /status   │
                │  GET  /events   │ ← SSE
                └────────┬────────┘
                         │
            ┌────────────┼────────────┐
            ▼            ▼            ▼
      ┌──────────┐ ┌──────────┐ ┌──────────┐
      │  Router  │ │ Postgres │ │ Subgraph │
      └────┬─────┘ └──────────┘ └──────────┘
           │
   ┌───────┴───────┐
   ▼               ▼
SourceVault    DestPool
(per chain)    (per chain)
```

## Lifecycle

State transitions are total. Every payment ends in `released` or `failed`.

| # | Step | Actor | Gas | Emits / writes |
|---|---|---|---|---|
| 1 | `POST /quote` | Caller | none | Ranked viable routes |
| 2 | Sign EIP-3009 permit | Payer | none | Signature only |
| 3 | `POST /pay` | Caller | none | Row `pending_deposit`, returns `202` + id |
| 4 | `depositWithAuthorization` | Relayer | source chain | `PaymentRequested` |
| 5 | `release` | Relayer | dest chain | `Released` |
| 6 | Reconcile | Reconciler | none | Row `released`, SSE push |

Constraint: steps 4 and 5 are the only gas-consuming operations. The relayer pays both. Payer and recipient never hold a native token on any chain.

## Routing

`decideRoute` is deterministic. It MUST NOT call an LLM. No model output may influence route selection, fee computation, or release authorization.

Candidate routes per `(fromChain, toChain, amount)`:

| Route | Latency | Cost | Custody | Viability condition |
|---|---|---|---|---|
| Fast pool | seconds | 0.5% fee | Custodial | `poolBalance >= payout` |
| CCTP | minutes | gas only | Trust-minimized | Both chains CCTP-enabled |

Scoring inputs: source gas price, destination gas price, pool liquidity, amount, caller `preference`.

Default policy: fast pool below the size threshold, CCTP above it. Rationale: custody risk scales with amount, latency tolerance does not.

Caller override: `preference: "fast" | "cheap" | "trustless"`.

LLM boundary — enforced, not advisory:

- Permitted: parsing natural-language intent into a structured request (pre-decision); rendering a decision into prose (post-decision).
- Forbidden: selecting a route, computing a fee, authorizing a release.
- Required: every numeric value in generated prose is validated against the decision object before display. Mismatch → fall back to template.

See [AI_LAYER.md](AI_LAYER.md).

## Trust model

The fast-pool route is **custodial**. The relayer controls `DestPool` liquidity and decides when to release. A user on that route trusts the relayer's key and solvency, not a trustless message protocol. Same tradeoff as early Across and Hop. This is the reason the route is fast.

Mitigations actually deployed in v2:

- CCTP offered as an alternative route for the same payment, with no pool custody in the loop.
- Release is replay-protected on-chain: `DestPool` records every `sourceRef` it has paid, so the same deposit can never be released twice, even if the relayer retries.
- Payment state is durable and forward-only. Terminal payments are never rewritten, and the reconciler recovers anything left in flight by a restart.

Not present in v2, and stated rather than implied:

- **Release is not decentralized.** A bonded watcher network attesting to source deposits before release is the next real trust reduction. Out of scope for this build.
- **The relayer key is a hot server key.** The Safe-multisig pool owner and Ledger-backed signer in the table above are the v2 *target*, not the current deployment. Today one EOA is deployer, relayer and owner on every chain (see [DEPLOYMENTS.md](DEPLOYMENTS.md)). Do not read that row as shipped.

## Failure modes

| Failure | Required behavior |
|---|---|
| Relayer restart mid-payment | Reconciler replays from last processed block, completes release |
| Deposit lands, release reverts | Mark `release_failed`, retry with backoff, alert after 3 attempts, funds owner-recoverable |
| Destination pool underfunded | Route non-viable at quote time; CCTP offered |
| Duplicate `POST /pay` | Idempotent on EIP-3009 nonce; return original id, never double-release |
| Permit expired | Reject at validation, before gas spend |
| LLM unavailable | Deterministic template fallback; routing unaffected |
| Chain RPC down | Route non-viable; other routes unaffected |

## Related

| Doc | Contents |
|---|---|
| [CHAINS.md](CHAINS.md) | Chain matrix, tokens, per-chain constraints |
| [REALTIME.md](REALTIME.md) | SSE contract, subgraph, frontend sync |
| [SDK.md](SDK.md) | Agent-facing interface |
| [AI_LAYER.md](AI_LAYER.md) | LLM boundaries, MCP server |
| [PARTNERS.md](PARTNERS.md) | Sponsor integrations |
| [CONVENTIONS.md](CONVENTIONS.md) | Code patterns all generated code follows |
