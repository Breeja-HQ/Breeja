# Breeja subgraphs

One subgraph per chain, per [PARTNERS.md](../docs/PARTNERS.md): "multi-chain means one subgraph per chain, composed at query time." Each directory here is a fully independent Graph Studio deployment.

| Directory | Chain | Chain ID | Network name | Data sources |
|---|---|---|---|---|
| `ethereum-sepolia/` | Ethereum Sepolia | 11155111 | `sepolia` | `SourceVault` only (source-only chain, no `DestPool`) |
| `base-sepolia/` | Base Sepolia | 84532 | `base-sepolia` | `SourceVault` + `DestPool` |
| `arbitrum-sepolia/` | Arbitrum Sepolia | 421614 | `arbitrum-sepolia` | `SourceVault` + `DestPool` |
| `optimism-sepolia/` | Optimism Sepolia | 11155420 | `optimism-sepolia` | `SourceVault` + `DestPool` |

Network names verified against `graphprotocol/networks-registry` (`registry/eip155/*.json`), which is what `graph init --network` resolves against and what Subgraph Studio expects. Contract addresses copied from [`docs/DEPLOYMENTS.md`](../docs/DEPLOYMENTS.md).

`schema.graphql` at this level is the canonical copy of the schema from [`docs/REALTIME.md`](../docs/REALTIME.md)'s "Subgraph" section; each chain directory has an identical copy since `graph build` reads it as a local relative path per manifest. The only change from REALTIME.md's listing is the addition of `@entity(immutable: …)` arguments, which `specVersion: 1.3.0` requires and REALTIME.md's schema (written before that requirement) doesn't specify — field names and types are untouched.

## Toolchain

- `@graphprotocol/graph-cli` `0.98.1` (current stable at build time, verified via `npm view @graphprotocol/graph-cli version`)
- `@graphprotocol/graph-ts` `0.38.2`
- `specVersion: 1.3.0`, `apiVersion: 0.0.9`, `language: wasm/assemblyscript` — the values graph-cli 0.98.1 itself scaffolds by default (confirmed by extracting the package and reading `dist/scaffold/index.js`, not guessed)

Each chain directory has its own `package.json` and installs its own `node_modules` — simplest thing that works given the differing ABI sets (Ethereum Sepolia has one data source, the other three have two) and keeps each deploy fully independent.

## Design decisions

### `Payment.id`

`${sourceChainId}-${txHash}-${logIndex}`, constructed in `handlePaymentRequested` using a per-chain hardcoded `CHAIN_ID` constant (chain ID is not available from `event` in AssemblyScript, so it's declared once at module scope in each chain's `src/mapping.ts`).

### `ChainStats` increment logic

Not fully specified by REALTIME.md, so decided explicitly: `ChainStats` reports **everything that happened on this chain**, not "source-side" or "dest-side" activity in isolation.

- `handlePaymentRequested` always increments `paymentCount` and adds the requested `amount` to `totalVolume`. This fires on every chain (all four have `SourceVault`).
- `handleReleased` (Base/Arbitrum/Optimism only) adds `payout + fee` to `totalVolume` and `fee` to `totalFees`. It does **not** increment `paymentCount` again — `paymentCount` counts payments requested, not settlement events, so a payment that both originates and later releases on the same chain (source == dest) is counted once, not twice.

This means `totalVolume` on a dest chain mixes "requested from here" and "settled here" activity by design — the two are genuinely different economic events (a deposit vs. a payout net of fee) and REALTIME.md doesn't ask for them to be separated into different fields, so combining them is the simplest correct reading of "per-chain activity." A future iteration could split into `requestedVolume`/`settledVolume` if the dashboard needs to distinguish them.

### Cross-chain `Payment.release` linking

`Released` fires on the **destination** chain; the `Payment` it corresponds to was created by `PaymentRequested` on the **source** chain. Since each subgraph deployment indexes exactly one chain's contracts, the matching `Payment` entity generally does not exist in a dest-chain subgraph's own store — this is not a bug, it's the direct consequence of "one subgraph per chain" from PARTNERS.md.

`handleReleased` still attempts a same-chain, best-effort `Payment.load` using `sourceRef` (the source tx hash the relayer sets) reconstructed into a candidate `Payment.id`, probing log indices 0–19 since the log index isn't recoverable from `sourceRef` alone. This only resolves same-chain roundtrips (a payment whose source and destination are the same chain) or, in a composed/future setup, a Payment that happens to already be in this chain's own store. It never guesses across chains and never fabricates a link — an unresolved `release` (staying `null`) is the correct, honest result when the Payment lives in a different chain's subgraph. Full cross-chain correlation requires composing this subgraph's `Release` with the source chain's subgraph's `Payment` at query time (e.g. two GraphQL queries joined client-side, or a federation layer), exactly as PARTNERS.md specifies. This is documented as a code comment in each dest-chain `src/mapping.ts`, not just here.

### `startBlock`

Every data source uses `startBlock: 0` — the actual deploy block numbers were never recorded (see DEPLOYMENTS.md), and guessing one risks silently missing early events. Indexing from genesis is correct but slow. **Before a real Studio deploy, look up the actual deploy transaction's block number per chain** (from the deploy broadcast receipts under `contracts/broadcast/`, or from the block explorer link for each contract's creation tx) and set `source.startBlock` in each `subgraph.yaml` accordingly.

## Prerequisites for a real deploy

1. A Graph Studio account and a subgraph created per chain (Studio: "My Subgraphs" → "Create a Subgraph", once per directory above — Studio does not support one subgraph spanning multiple chains).
2. A deploy key per subgraph, from the Studio subgraph's dashboard.
3. `startBlock` set to the real deploy block in each `subgraph.yaml` (see above).

## Deploy commands (once credentials exist)

Run per chain directory. Do not run these until Studio credentials exist — this repo has not been deployed anywhere.

```bash
cd subgraph/<chain-dir>
npm install
npx graph codegen
npx graph build

# one-time per subgraph slug, using the deploy key from Studio's dashboard
export GRAPH_DEPLOY_KEY=<studio-deploy-key-for-this-subgraph>
npx graph auth --studio "$GRAPH_DEPLOY_KEY"

npx graph deploy --studio breeja-<chain-dir>
```

Concretely, for each chain (slug is a suggestion, must match whatever is created in Studio):

```bash
cd subgraph/ethereum-sepolia  && npx graph deploy --studio breeja-ethereum-sepolia
cd subgraph/base-sepolia      && npx graph deploy --studio breeja-base-sepolia
cd subgraph/arbitrum-sepolia  && npx graph deploy --studio breeja-arbitrum-sepolia
cd subgraph/optimism-sepolia  && npx graph deploy --studio breeja-optimism-sepolia
```

`graph auth --studio` writes the deploy key to a local config file (not into the repo) — each of the four subgraphs needs its own key from its own Studio project, so `graph auth` must be re-run (or the key re-exported) before deploying each one if using separate Studio API keys per subgraph. `GRAPH_DEPLOY_KEY` above is a naming convention for local shell use; graph-cli does not read that variable name itself, it's passed as an argument to `graph auth`.

## Verification performed

`graph codegen` then `graph build` was run in all four directories with network access available in this environment (both commands need registry/IPFS access for `graph-cli`'s own dependency resolution, even though no subgraph is actually deployed anywhere). All four passed cleanly — see the per-chain build logs; `build/` in each directory contains the compiled `.wasm` and manifest as proof, though `build/` is gitignored.

No network deploy was attempted, per instructions — no Graph Studio credentials exist for this project yet.

## What a human must still do before a real deploy

- Create four subgraphs in Graph Studio (one per chain) and obtain a deploy key for each.
- Look up and fill in the real `startBlock` per chain in each `subgraph.yaml` — currently `0` everywhere.
- Double-check network names (`sepolia`, `base-sepolia`, `arbitrum-sepolia`, `optimism-sepolia`) still match Graph Studio's supported network list at deploy time — they were verified against `graphprotocol/networks-registry` as of this build, but Studio's supported set can lag or diverge from the registry.
- Fund/confirm the four Studio subgraph slugs match the names used in the deploy commands above, or update the commands to match whatever slugs are actually created.
