# Docs

> Audience: coding agents first, humans second.

Read in this order when starting work.

| # | Doc | Contents |
|---|---|---|
| 1 | [ARCHITECTURE.md](ARCHITECTURE.md) | System definition, lifecycle, routing, trust model, failure modes |
| 2 | [CONVENTIONS.md](CONVENTIONS.md) | Code patterns. Binding on all generated code. |
| 3 | [CHAINS.md](CHAINS.md) | Chain matrix, token verification, chain-switching rules |
| 4 | [REALTIME.md](REALTIME.md) | Postgres schema, SSE contract, subgraph, reconciler |
| 5 | [SDK.md](SDK.md) | `@breeja/sdk` surface, agent affordances, `/docs` requirements |
| 6 | [AI_LAYER.md](AI_LAYER.md) | LLM boundaries, MCP server, x402, what may be claimed |
| 7 | [FRONTEND.md](FRONTEND.md) | Routes, widget state machine, design compliance |
| 8 | [PARTNERS.md](PARTNERS.md) | Sponsor integrations, exclusions, submission checklist |
| 9 | [BUILD_PLAN.md](BUILD_PLAN.md) | Phased order, cut list |
| — | [font-theme.md](font-theme.md) | Design system. Authoritative. |
| — | DEPLOYMENTS.md | Deployed addresses. Created during Prompt 2. |

## Non-negotiables

These appear across several docs because violating any one of them breaks the product or the pitch.

1. **No LLM inside a money decision.** Models parse intent and explain outcomes. They never select a route, compute a fee, or authorize a release.
2. **Never invent an address, chain ID, or RPC.** Verify against primary sources or stop and ask.
3. **State custody plainly.** The fast-pool route is custodial. Say it wherever a user commits funds.
4. **Claim only what is built.** v1's README said "AI-routed" when one model call rewrote a status string. Do not repeat that.
5. **Idempotency on every mutating endpoint**, keyed on the EIP-3009 nonce.
6. **Near-zero comments.** Only real ones explaining a non-obvious why.
7. **`bigint` for money.** Never a JS number, never floating point.

## Removed in v2

HSK Chain is gone entirely — no code, config, address, or reference. `MockUSDC` leaves the deploy path; every v2 chain has real Circle USDC.
