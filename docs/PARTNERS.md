# Partners

> Audience: coding agents first, humans second.

ETHGlobal Online 2026 sponsor integrations. Each entry states where it touches the system, why it is load-bearing rather than decorative, and what shipping it requires.

Selection principle: **integrate a sponsor only where the product genuinely needs it.** A judge recognizes a bolt-on immediately. Every integration below is on the critical path regardless of prizes.

## Committed

### Circle / Arc — $10,000

Tracks: Stablecoin-native DeFi ($2.5K), Agentic Economy with Circle Agent Stack ($2.5K), Testnet to Mainnet ($5K).

Touches: `relayer/src/routes/cctp.ts`, chain config, router scoring.

- CCTP as the second route. This is what makes `decideRoute` a real decision instead of a single branch, and it gives users a trust-minimized alternative to the custodial fast pool.
- USDC is the settlement asset on every chain already.
- Arc as a supported chain — native USDC, first-class CCTP.
- Testnet to Mainnet: deploy the full mesh to mainnet with a Safe-owned pool and funded liquidity.

Resources: `developers.circle.com/stablecoins/cctp-getting-started`, `developers.circle.com/arc`, USDC testnet faucet at `faucet.circle.com`.

Verify at build time: CCTP domain IDs per chain, `TokenMessenger` and `MessageTransmitter` addresses, Arc chain ID and RPC. Do not write these from memory.

### The Graph — $15,000

Tracks: Composable or Standardized Graph Products ($5K), AI Tooling or Use Case ($5K), AI Tooling Continuity ($5K).

Touches: `subgraph/`, dashboard, `breeja_history` MCP tool, reconciler.

- Subgraph indexing `PaymentRequested` and `Released` across every chain. This is the durable history layer from [REALTIME.md](REALTIME.md).
- The AI track is served by the MCP server exposing subgraph queries as agent tooling — an agent asks "what have I paid this month" and gets indexed chain data.
- Fixes the v1 bug where payment state lived in a process-local `Map`.

Resources: `thegraph.com/docs`, Graph CLI, Subgraph Studio.

Note: multi-chain means one subgraph per chain, composed at query time. Budget for that.

### Privy — $5,000

Tracks: Best B2B Financial Product ($2.5K), Best Financial Flow ($2.5K).

Touches: `frontend/app/providers.tsx`, wallet connection, SDK signer.

- Replaces RainbowKit for embedded wallets and email/social login. The target user does not have a browser extension.
- Server wallets are the natural custody model for an agent that needs to hold funds — directly on-thesis for the B2B track.
- Plugs into the SDK through the `custom` signer variant; the SDK does not depend on Privy.

Resources: `docs.privy.io`, `@privy-io/react-auth`, `@privy-io/server-auth`.

### Bazantic — $3,000

Tracks: Help an Agent Use Your Hackathon Project ($1K), Recipe Using ETHGlobal Sponsor APIs ($1K), Agentify a New API ($1K).

Touches: `packages/mcp/`, `docs/llms.txt`, `/docs`.

The SDK and MCP server are the submission. Marginal work is near zero once [SDK.md](SDK.md) and [AI_LAYER.md](AI_LAYER.md) are built. All three tracks are addressable with one deliverable plus a recipe combining Breeja with another sponsor's API.

### ENS — $5,000

Tracks: Best Use of ENSv2 ($4.5K), ENSv2 Integration into an Existing Project ($500).

Touches: recipient resolution, agent identity, `/docs`.

- Resolve `alice.eth` as a payment recipient in the widget and the SDK.
- The stronger play is the brief's own phrase, **agent identity**: register agent payment addresses as ENS names so agent-to-agent payments address a name rather than a hex string.
- ENSv2 on Sepolia specifically. Verify the v2 registry and resolver addresses at build time.

Resources: `docs.ens.domains`, ENSv2 Sepolia deployment.

Constraint: resolution runs in code against the registry, never from model output.

### Ledger — $5,000

Tracks: AI Agents x Ledger ($3.5K), Continuity ($1.5K).

Touches: relayer signer, `DestPool` ownership.

The relayer's release key is the single most sensitive credential in the system. Ledger as the trust layer for release authorization is a real security improvement, and "AI agents using Ledger as the trust layer" describes an agent-callable rail whose settlement authority is hardware-backed.

Resources: `developers.ledger.com`, Ledger Device Management Kit, Clear Signing.

### Hedera — $15,000

Tracks: AI and Agentic Payments ($6K), Tokenization of Anything ($6K), Improve the Hedera Harness ($2K), Continuity ($1K).

Touches: `relayer/src/chains/hederaTestnet.ts`, contract deploys, router gas estimation.

Highest reward, highest effort. See the Hedera section of [CHAINS.md](CHAINS.md) — HTS token association, non-EVM-identical semantics, HBAR gas mechanics, no CCTP.

Build last, behind a feature flag. If it slips, the product demos completely without it.

### World — $7,000

Tracks: AgentKit Continuity ($3.5K), Selfie Check ($3.5K).

Touches: spend authorization on the MCP server.

Conceptual fit: **a verified human authorizes an autonomous agent's spending limit.** This is the literal "AI and Human" framing, and it answers the obvious objection to giving an agent a payment tool. World ID proof gates raising an agent's spend cap.

Resources: `docs.world.org`, IDKit, World App.

Priority: after the committed set. Strong narrative, moderate implementation cost.

## Excluded

State this plainly if asked — a deliberate exclusion reads better than a forced integration.

| Sponsor | Prize | Why not |
|---|---|---|
| 1inch | $7K | Aqua apps are DeFi position management. Breeja is payments. A swap bolted onto a bridge is the archetypal forced integration. |
| Uniswap | $5K | AMM and v4 hooks. No natural surface in a settlement rail. |
| Chainlink | $3K | Tracks are Confidential Workflows and Automated Liquidation Protection. There are no liquidations here. CCIP would fit but is not a named track. |

## Frontend partner section

Requirements for the logo section on the landing page:

- Logos styled consistently with the rest of the app — the theme in `frontend/app/globals.css` (`--color-border`, rounded panels), not a separate treatment.
- Each logo is a link to that integration's section in `/docs`, not to the sponsor's homepage. It documents what Breeja does with them.
- One line per partner naming the actual integration: "Circle — CCTP settlement route", "The Graph — indexed payment history".
- Only ship a logo once the integration works. A logo wall of aspirations is checkable and damaging.
- Store assets in `frontend/public/partners/`, SVG preferred.

## Submission checklist

Per track, before submitting:

1. Integration is live in the deployed app, not local-only.
2. A specific file path or route demonstrates it.
3. README names the sponsor and what was built with them.
4. Demo video shows the integration functioning.
5. Continuity tracks: state clearly what existed before and what was added. Breeja is a real prior project with prior deployments; that is an asset for these tracks.
