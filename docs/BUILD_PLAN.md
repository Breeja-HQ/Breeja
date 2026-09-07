# Build plan

> Audience: coding agents first, humans second.

Ordered by dependency, not by prize value. Each phase is independently demoable.

## Phase 0 — Strip

Remove every HSK reference. Already done at the file level; verify nothing remains.

```bash
grep -ri "hsk" --include="*.ts" --include="*.tsx" --include="*.sol" --include="*.json" --include="*.md" .
```

Expected result: no matches. Also remove `MockUSDC` from the deploy path — every v2 chain has real Circle USDC, so a mock stand-in is no longer needed and its presence invites the question of whether the demo is real.

## Phase 1 — Durable state

Blocks everything. The SDK's `status` and `watch`, the reconciler, and idempotency all depend on it.

- Postgres schema from [REALTIME.md](REALTIME.md).
- Repository layer replacing the in-memory `Map`.
- Idempotency on `(nonce, from_chain_id)`.
- Reconciler on a 30s interval.
- Auth on `POST /pay` — currently anyone can spend the relayer's gas.
- Vitest covering `computeFee`, rejection branches, validation.

Demo: kill the relayer mid-payment; it completes the release on restart.

## Phase 2 — Multi-chain mesh

- Chain modules for Base, Arbitrum, Optimism Sepolia following the existing per-chain pattern.
- Deploy `SourceVault` and `DestPool` to each.
- Router route table across all pairs.
- Fund destination pools.
- End-to-end test every direction.

Demo: a payment Base → Arbitrum and Arbitrum → Base.

## Phase 3 — Real routing

- CCTP integration as the second route.
- Route scoring on cost, latency, viability.
- `POST /quote` returning ranked routes.
- `preference` override.

Demo: the same payment quoted two ways, with the tradeoff shown.

This is the phase that makes "AI-routed" defensible. Until routing chooses, do not claim it.

## Phase 4 — SDK and agents

- `@breeja/sdk` per [SDK.md](SDK.md).
- `@breeja/mcp` per [AI_LAYER.md](AI_LAYER.md).
- x402 demo, both sides.
- `llms.txt`.

Demo: Claude makes a cross-chain payment through MCP. This is the headline.

## Phase 5 — Realtime and frontend

- SSE endpoint and heartbeat.
- Subgraph deployed per chain.
- `/pay` widget with the full state machine.
- `/dashboard` from subgraph.
- `/docs` with copyable examples.
- Landing page: partners, chains mesh, agent section.

Demo: a payment tracked live, no polling.

## Phase 6 — Partner integrations

- Privy wallets.
- ENS recipient resolution and agent identity.
- Ledger signer for release authority.
- Safe multisig on pool ownership.
- World ID spend authorization.

## Phase 7 — Hedera and Arc

Behind feature flags. Hedera has the HTS and gas caveats in [CHAINS.md](CHAINS.md). Arc needs its chain params confirmed from Circle's docs.

If either slips, the product demos completely without it. That is the reason they are last.

## Phase 8 — Mainnet

Circle's Testnet to Mainnet track. Safe-owned pools, funded liquidity, verified contracts, incident runbook.

## Cut list

Under time pressure, cut in this order: World ID, Hedera, mainnet, Ledger, `/dashboard`. Never cut: durable state, idempotency, the SDK, or the honest trust-model copy.
