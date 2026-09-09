# Breeja

<img src="frontend/public/brand/breeja-logo.png" width="40" height="40" alt="Breeja logo" />

**Cross-chain USDC settlement for agents and humans — gasless, multi-route, callable from code or a browser.**

An autonomous agent pays another agent on a different chain with one SDK call. A human sends USDC across chains from a web app. Same contracts, same relayer, same routing. On every EIP-3009 chain, neither side ever holds a gas token.

| | |
|---|---|
| **Live app** | https://breeja-frontend.vercel.app/ |
| **Relayer API** | https://breeja-relayer.onrender.com |
| **GitHub** | https://github.com/Breeja-HQ/Breeja |
| **X** | https://x.com/usebreeja |
| **Pitch deck** | [Google Slides](https://docs.google.com/presentation/d/1Uz701EtaVXlCI3QkhYeWl4SV9VPj8FuF/edit?usp=sharing&ouid=114786194621053890385&rtpof=true&sd=true) |
| **Demo video** | https://youtu.be/pOrM9hVgczU |

**Deployed and live-verified on 6 chains** with real on-chain round trips: Ethereum Sepolia (source-only), Base Sepolia, Arbitrum Sepolia, Optimism Sepolia, **Arc Testnet** (Circle's own chain, native USDC), and **Hedera Testnet**. Every address and transaction hash below is real and clickable. Testnet only.

## Sponsor integrations

Every row below is working code on the critical path, not a logo. `docs/PARTNERS.md`'s rule: *only ship a logo once the integration works.*

| Sponsor | What was built | Where it lives | Status |
|---|---|---|---|
| **Circle — CCTP** | CCTP V2 burn/mint as the trust-minimized second route, scored against the fast pool by the router | `relayer/src/routes/cctp.ts`, `relayer/src/chains/registry.ts` | Wired on all 5 EVM chains; fast-pool route is the live-tested one |
| **Circle — Arc** | Arc Testnet (chain id 5042002) as a full source + destination chain, native USDC at `0x3600…0000`, CCTP domain 26 | `relayer/src/chains/arcTestnet.ts` | **Live** — contracts deployed, Arc → Base Sepolia round trip confirmed on-chain |
| **The Graph** | 5 subgraphs (one per chain, composed at query time) indexing `PaymentRequested` + `Released`; drives the live stats bar and `/dashboard` | `subgraph/`, `frontend/lib/subgraphs.ts`, `frontend/app/dashboard` | **3 of 5 deployed** to Subgraph Studio (free tier caps at 3); Optimism + Ethereum Sepolia built, not deployed |
| **ENS** | Recipient resolution (`alice.eth` → address) and reverse lookup for display, through ENSv2's Universal Resolver; shared by SDK and frontend | `packages/sdk/src/ens.ts`, `frontend/lib/hooks/useEnsName.ts` | **Live** |
| **Hedera** | Hedera Testnet (chain id 296) as source + destination, with HTS-aware contracts (`associateToken()` against the `0x167` precompile) and a non-EIP-3009 deposit path | `relayer/src/chains/hederaTestnet.ts`, `contracts/src/hedera/` | **Live** — contracts deployed, Hedera → Optimism Sepolia round trip confirmed on-chain. **Not gasless**, see below |
| **Bazantic** | Agent-facing SDK and an MCP server exposing payments and history as tools; `docs/llms.txt` and a `/docs` route for agents | `packages/sdk/`, `packages/mcp/`, `docs/llms.txt` | **Live** |
| **Privy** | Embedded-wallet / email-social login wrapped as the SDK's `custom` signer variant — the SDK never imports Privy | `frontend/lib/hooks/usePrivySigner.ts`, `frontend/app/providers.tsx` | **Code wired, not verified end to end.** No real Privy app id has been tested; `PrivyProvider` is skipped when `NEXT_PUBLIC_PRIVY_APP_ID` is unset |

Not integrated in this build, stated plainly rather than implied: Ledger (hardware-backed release authority) and World (human-verified agent spend caps) are designed in `docs/PARTNERS.md` but are not shipping code here.

## Deployed contracts

Deployer / relayer / owner for the EVM mesh and Arc: `0x9bcf302cFCB64406b557342c2715e85Ac62A4693`. Hedera used `0x08c3657C368975D6175cfF6a5c084a1E5F7E7609`. Fee is 50 bps on every chain.

| Chain | Chain ID | SourceVault | DestPool | USDC |
|---|---|---|---|---|
| Ethereum Sepolia | 11155111 | [`0xcD0dC65c8d64A5D135180bFCA530398f4F2b2424`](https://sepolia.etherscan.io/address/0xcD0dC65c8d64A5D135180bFCA530398f4F2b2424) | — (source only) | [`0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`](https://sepolia.etherscan.io/address/0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238) |
| Base Sepolia | 84532 | [`0x552431953dd3F087557196A383c436ddAab665ab`](https://sepolia.basescan.org/address/0x552431953dd3F087557196A383c436ddAab665ab) | [`0x45944B08fea203a7469C82A690F68fabF85B8283`](https://sepolia.basescan.org/address/0x45944B08fea203a7469C82A690F68fabF85B8283) | [`0x036CbD53842c5426634e7929541eC2318f3dCF7e`](https://sepolia.basescan.org/address/0x036CbD53842c5426634e7929541eC2318f3dCF7e) |
| Arbitrum Sepolia | 421614 | [`0x5471bab4fC78A946cDC3142d852e54cBD83C181e`](https://sepolia.arbiscan.io/address/0x5471bab4fC78A946cDC3142d852e54cBD83C181e) | [`0xaA45094129D06ab48AEf1e8251071067FC4FED5A`](https://sepolia.arbiscan.io/address/0xaA45094129D06ab48AEf1e8251071067FC4FED5A) | [`0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`](https://sepolia.arbiscan.io/address/0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d) |
| Optimism Sepolia | 11155420 | [`0x2d18B34880cc67DA1358f8963906492e0d01a567`](https://sepolia-optimism.etherscan.io/address/0x2d18B34880cc67DA1358f8963906492e0d01a567) | [`0xA5dd225Beb2Ec0009Fe143eb0B9309Ba07d23737`](https://sepolia-optimism.etherscan.io/address/0xA5dd225Beb2Ec0009Fe143eb0B9309Ba07d23737) | [`0x5fd84259d66Cd46123540766Be93DFE6D43130D7`](https://sepolia-optimism.etherscan.io/address/0x5fd84259d66Cd46123540766Be93DFE6D43130D7) |
| **Arc Testnet** | 5042002 | [`0xfd2f67cD354545712f9d8230170015d7e30d133A`](https://testnet.arcscan.app/address/0xfd2f67cD354545712f9d8230170015d7e30d133A) | [`0xA5dd225Beb2Ec0009Fe143eb0B9309Ba07d23737`](https://testnet.arcscan.app/address/0xA5dd225Beb2Ec0009Fe143eb0B9309Ba07d23737) | [`0x3600000000000000000000000000000000000000`](https://testnet.arcscan.app/address/0x3600000000000000000000000000000000000000) (native) |
| **Hedera Testnet** | 296 | [`0xfd80365F46C776eE7c08642F700E268e69247228`](https://hashscan.io/testnet/contract/0xfd80365F46C776eE7c08642F700E268e69247228) | [`0xD2B5A9a82B91a60eb7AD28770a5453546746b8f6`](https://hashscan.io/testnet/contract/0xD2B5A9a82B91a60eb7AD28770a5453546746b8f6) | [`0x0000000000000000000000000000000000068cda`](https://hashscan.io/testnet/token/0.0.429274) (HTS `0.0.429274`) |

Arc and Hedera are additive and gated behind `ENABLE_ARC` / `ENABLE_HEDERA`; the four-chain mesh is unaffected when they are unset. Full record, including deploy tx hashes and pool-funding transactions, in [docs/DEPLOYMENTS.md](docs/DEPLOYMENTS.md).

## Proof of real usage

Four live round trips, each a real signed permit (or real `approve()` on Hedera), a real relayer-paid deposit, and a real relayer-paid release to a recipient distinct from the payer. 1 USDC in, 0.005 USDC fee, 0.995 USDC out.

| Route | Source deposit | Destination release | Time |
|---|---|---|---|
| Base Sepolia → Arbitrum Sepolia | [`0xb34d3aca…`](https://sepolia.basescan.org/tx/0xb34d3aca397b011bf0fbc7ed43c05a5bcb028353a5a1c56df033fd43315efae2) | [`0x62d59857…`](https://sepolia.arbiscan.io/tx/0x62d59857f18a728369c3395b528358fefe7ad233baf52f69e9e0e73e05c041cc) | ~9s |
| Arbitrum Sepolia → Base Sepolia | [`0xcfc18e83…`](https://sepolia.arbiscan.io/tx/0xcfc18e8356b235f67620aeb00b029063a159f7263b60ab36b71c157967eaa53c) | [`0xf92d1507…`](https://sepolia.basescan.org/tx/0xf92d150720058e293e7e6f2ccda2979765f59a8e01ab756c51d0650e9a257d90) | ~6s |
| **Arc Testnet → Base Sepolia** | [`0xf3095e65…`](https://testnet.arcscan.app/tx/0xf3095e650665448beb66a0fd41846618054b5f8e3fbe816a61b257437ab1d43d) | [`0x2ac8b806…`](https://sepolia.basescan.org/tx/0x2ac8b8062762a82ceb2941a4e605866886f82cf73cd36b1726c629a4e339167b) | ~80s |
| **Hedera Testnet → Optimism Sepolia** | [`0x0e0b512b…`](https://hashscan.io/testnet/transaction/0x0e0b512b2c23d3de0ac1a41cde340570b0f0f73f6eff6570dcff34f76400b855) | [`0xad406535…`](https://sepolia-optimism.etherscan.io/tx/0xad406535409b5b6d6833d890ff1a50b7558f300f203a937b9ad6ea3c22a729fa) | ~16s |

Deploy transactions:

- Arc `SourceVault` [`0xbaec4ec7…`](https://testnet.arcscan.app/tx/0xbaec4ec7d3fe780c92042417d21945bfa58481638887b61033a93508f4b34bde), `DestPool` [`0xe887ff09…`](https://testnet.arcscan.app/tx/0xe887ff0941b6cfc7e6fd4b73404e9811578157c87abfabafbdb361b52c978b58), pool funded with 5 USDC [`0x22dbcd8c…`](https://testnet.arcscan.app/tx/0x22dbcd8ca3c5986f79998acea174e643e1065f22eca27737a5754f91462122b1)
- Hedera `SourceVault` [`0x4e7025a5…`](https://hashscan.io/testnet/transaction/0x4e7025a50240cd319969055faebcc3a825c02e7f1d882d36e750b4e3d66689d1) + `associateToken()` [`0x4418c8d2…`](https://hashscan.io/testnet/transaction/0x4418c8d2eb73de25420ecb68802ebdd6de4c67ed9def7bcd03c70a1f73f7f632), `DestPool` [`0xd9d9ae74…`](https://hashscan.io/testnet/transaction/0xd9d9ae74906478e2e7b540bf6508d79bfe2928facc266fe7c6a470d004bc291c) + `associateToken()` [`0x284a9a91…`](https://hashscan.io/testnet/transaction/0x284a9a91d8f23c966087fc3fba62831cfea87a8801e9363f8ed370cc5920f8f4). Pool funded with 5 USDC via native HTS transfer, transaction id `0.0.7314364-1788864066-359941875` (48-byte Hedera-native hash, findable on HashScan by transaction ID).
- Hedera payer-paid `approve()` before the round trip: [`0x171fd7ab…`](https://hashscan.io/testnet/transaction/0x171fd7abc1f294f4630f313702029df93df941febefa7c2ac07baa04af42d832)

EIP-3009 support was verified on-chain per token — not assumed — via `DOMAIN_SEPARATOR()` and `authorizationState()`. Full `cast` output in [docs/CHAINS.md](docs/CHAINS.md), including the gotcha that Arbitrum Sepolia's USDC uses EIP-712 domain name `"USD Coin"` rather than `"USDC"`.

## Live infrastructure

| Service | Where | Notes |
|---|---|---|
| Relayer | https://breeja-relayer.onrender.com | Node + Postgres on Render, defined in [`render.yaml`](render.yaml) |
| Frontend | https://breeja-frontend.vercel.app/ | Next.js |
| Subgraphs | Subgraph Studio, `https://api.studio.thegraph.com/query/1758927/<slug>/v0.0.1` | Deployed slugs: `arc-sepolia`, `base-sepolia`, `arbitrum-sepolia`. `optimism-sepolia` and `ethereum-sepolia` are built in `subgraph/` but not deployed — Studio's free tier caps at 3. |

## What it does

1. A payer — agent or human — signs an EIP-3009 `transferWithAuthorization` permit. A signature, not a transaction. No gas. (Exception: Hedera, see trust model.)
2. The relayer submits the deposit on the source chain and pays the gas itself.
3. The router scores available routes on live gas price, destination liquidity, and caller preference, then settles — fast from a pre-funded pool, or trust-minimized via CCTP.
4. Funds land with **any recipient the payer names**, on any supported chain — including an ENS name.

Routing is deterministic. An LLM parses natural-language intent on the way in and explains the decision on the way out; it never selects a route, computes a fee, or authorizes a release. See [docs/AI_LAYER.md](docs/AI_LAYER.md).

## Four front doors

```
Human              Agent              Agent              Agent
(web app)          (SDK)              (MCP)              (x402)

connect wallet     npm install        claude config      GET /resource
pick chains        @breeja/sdk        add breeja         → 402
sign permit        breeja.pay()       "pay 5 USDC        → pay()
watch live         await status       to alice.eth"      → retry with proof
```

All four consume the same SDK. The SDK is the product; the web app is one client. The x402 example lives in [`examples/x402/`](examples/x402).

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

## Architecture

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
            ┌────────────┴────────────┐
            ▼                         ▼
     SourceVault (n chains)    DestPool (n chains)
        deposit / permit          release to recipient
                         │
                         ▼
              Postgres + subgraphs (history)
```

Every chain runs both `SourceVault` and `DestPool` (except Ethereum Sepolia, source-only — destination liquidity there costs more gas than the fee earns). A payment is a directed edge between any two chains. Full design in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

| Chain | Role | Routes | Gasless for payer |
|---|---|---|---|
| Base Sepolia | source + dest | fast pool, CCTP | Yes |
| Arbitrum Sepolia | source + dest | fast pool, CCTP | Yes |
| Optimism Sepolia | source + dest | fast pool, CCTP | Yes |
| Arc Testnet | source + dest | fast pool, CCTP | Yes |
| Ethereum Sepolia | source only | fast pool, CCTP | Yes |
| Hedera Testnet | source + dest | fast pool only | **No** |

## Trust model and known limitations

Stated plainly, because a judge will find them anyway and the docs already are candid about them.

**The fast-pool route is custodial.** The relayer controls `DestPool` liquidity and decides when to release. Users on that route trust the relayer's key and solvency, not a trustless message protocol — the same tradeoff early Across and Hop shipped, and the reason the route is fast. **CCTP is the trust-minimized alternative** offered for the same payment. Release is also replay-protected on-chain: `DestPool` records every `sourceRef` it has paid, so a retry can never pay the same deposit twice.

**The relayer key is a hot server key.** Safe multisig pool ownership and a Ledger-backed signer appear in `docs/ARCHITECTURE.md` as the v2 *target*, and neither is deployed. Today a single EOA is deployer, relayer and owner on every chain. Release is also still not decentralized; a bonded watcher network attesting to source deposits is the next real trust reduction and is not in this build.

**Hedera is not gasless.** Its USDC is an HTS token whose EVM facade does not implement EIP-3009 — verified on-chain, both `DOMAIN_SEPARATOR()` and `authorizationState()` revert. The payer therefore calls `approve()` themselves and pays their own HBAR gas, unlike every other chain in the mesh. The relayer enforces this at the API boundary (`supportsEip3009` in `relayer/src/api/validation.ts`), and the frontend widget surfaces it rather than attempting a signature that cannot work — but paying *from* Hedera through the browser UI is not a wired end-to-end flow in this pass. The relayer path is, and was exercised live (see the round trip above).

**Testnet only.** No mainnet deployment.

**Other gaps**, per [docs/DEPLOYMENTS.md](docs/DEPLOYMENTS.md): CCTP burn/mint is wired for Arc but was not separately live-tested end to end; only Arc-as-source and Hedera-as-source were round-tripped (not as destinations); Arc and Hedera contracts are not yet in the subgraph manifests; Privy has no verified app id.

## Quick start

```bash
# contracts
cd contracts && forge install && forge test

# relayer
cd relayer && npm install && cp .env.example .env && npm run dev

# frontend
cd frontend && npm install && cp .env.example .env.local && npm run dev
```

Arc and Hedera are off by default. Set `ENABLE_ARC=true` / `ENABLE_HEDERA=true` in `relayer/.env` to enable them.

## Docs

Start at [docs/README.md](docs/README.md). Agent-facing SDK documentation renders at `/docs` in the app, and [`docs/llms.txt`](docs/llms.txt) is the machine-readable index.

| Doc | What's in it |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, components, honest trust model |
| [DEPLOYMENTS.md](docs/DEPLOYMENTS.md) | Every address, deploy tx, and round-trip record |
| [CHAINS.md](docs/CHAINS.md) | Per-chain matrix, EIP-3009 verification, gotchas |
| [PARTNERS.md](docs/PARTNERS.md) | Sponsor integrations and why each is load-bearing |
| [SDK.md](docs/SDK.md) / [AI_LAYER.md](docs/AI_LAYER.md) / [REALTIME.md](docs/REALTIME.md) | SDK surface, LLM boundaries, SSE + subgraph history |

## License

MIT.
