# Breeja

<img src="frontend/public/brand/breeja-logo.png" width="40" height="40" alt="Breeja logo" />

**Cross-chain stablecoin settlement for agents and humans — gasless, multi-route, callable from code or a browser.**

An autonomous agent pays another agent on a different chain with one SDK call. A human sends USDC across chains from a web app. Same contracts, same relayer, same routing. Neither side ever holds a gas token.

Built for ETHGlobal Online 2026.

## What it does

1. A payer — agent or human — signs an EIP-3009 `transferWithAuthorization` permit. A signature, not a transaction. No gas.
2. The relayer submits the deposit on the source chain and pays the gas itself.
3. The router scores available routes on live gas price, destination liquidity, and caller preference, then settles — fast from a pre-funded pool, or trust-minimized via CCTP.
4. Funds land with **any recipient the payer names**, on any supported chain.

Routing is deterministic. An LLM parses natural-language intent on the way in and explains the decision on the way out; it never selects a route, computes a fee, or authorizes a release. See [docs/AI_LAYER.md](docs/AI_LAYER.md).

## Four front doors

```
Human            Agent            Agent            Agent
(web app)        (SDK)            (MCP)            (x402)

connect wallet   npm install      claude config    GET /resource
pick chains      @breeja/sdk      add breeja       → 402
sign permit      breeja.pay()     "pay 5 USDC      → pay()
watch live       await status     to alice.eth"    → retry with proof
```

All four consume the same SDK. The SDK is the product; the web app is one client.

```ts
import { Breeja } from "@breeja/sdk";

const payment = await breeja.pay({
  from: "base-sepolia",
  to: "arbitrum-sepolia",
  amount: "10.00",
  recipient: "alice.eth",
  signer: account,
});
```

## Chains

Every chain is both a source and a destination.

| Chain | Role | Routes |
|---|---|---|
| Base Sepolia | source + dest | fast pool, CCTP |
| Arbitrum Sepolia | source + dest | fast pool, CCTP |
| Optimism Sepolia | source + dest | fast pool, CCTP |
| Hedera Testnet | source + dest | fast pool |
| Arc Testnet | source + dest | fast pool, CCTP |
| Ethereum Sepolia | source only | fast pool, CCTP |

Deployed addresses live in `docs/DEPLOYMENTS.md`. See [docs/CHAINS.md](docs/CHAINS.md) for per-chain constraints.

## Trust model

The fast-pool route is **custodial**: the relayer controls destination liquidity and decides when to release. Users on that route trust the relayer's key and solvency, not a trustless message protocol — the same tradeoff early Across and Hop shipped, and the reason the route is fast.

Narrowed in v2 by offering CCTP as a trust-minimized alternative for the same payment, Safe multisig pool ownership, and a Ledger-backed relayer signer. Not solved: release is still not decentralized. A bonded watcher network is the next real trust reduction and is not in this build.

## Quick start

```bash
# contracts
cd contracts && forge install && forge test

# relayer
cd relayer && npm install && cp .env.example .env && npm run dev

# frontend
cd frontend && npm install && cp .env.example .env.local && npm run dev
```

## Docs

Start at [docs/README.md](docs/README.md). Agent-facing SDK documentation renders at `/docs` in the app.

## Partners

Circle/Arc (CCTP settlement route), The Graph (indexed payment history), Privy (embedded wallets), ENS (agent identity), Ledger (release authority), Hedera (chain), Bazantic (agent tooling), World (human-authorized spend caps). Detail in [docs/PARTNERS.md](docs/PARTNERS.md).

## License

MIT.
