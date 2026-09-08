# Deployments

> Audience: coding agents first, humans second. Filled in as contracts are deployed. Never guess an address — copy from a deploy transaction's console output or a block explorer.

## Base + Arbitrum + Optimism Sepolia mesh (this build)

Ethereum Sepolia is source-only, per [ARCHITECTURE.md](ARCHITECTURE.md) — no `DestPool` on that chain.

| Chain | Chain ID | SourceVault | DestPool | USDC (Circle) |
|---|---|---|---|---|
| Ethereum Sepolia | 11155111 | `0xcD0dC65c8d64A5D135180bFCA530398f4F2b2424` | — | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` |
| Base Sepolia | 84532 | `0x552431953dd3F087557196A383c436ddAab665ab` | `0x45944B08fea203a7469C82A690F68fabF85B8283` | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| Arbitrum Sepolia | 421614 | `0x5471bab4fC78A946cDC3142d852e54cBD83C181e` | `0xaA45094129D06ab48AEf1e8251071067FC4FED5A` | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |
| Optimism Sepolia | 11155420 | `0x2d18B34880cc67DA1358f8963906492e0d01a567` | `0xA5dd225Beb2Ec0009Fe143eb0B9309Ba07d23737` | `0x5fd84259d66Cd46123540766Be93DFE6D43130D7` |

Deployer / relayer / owner (this build): `0x9bcf302cFCB64406b557342c2715e85Ac62A4693`. Fee: 50 bps.

`SourceVault` was redeployed on all four chains after `relayerWithdraw(address to, uint256 amount)` was added — a relayer-gated function to move payer-deposited funds out of the vault, needed so the relayer can burn them via CCTP (funds land in the vault on deposit, not the relayer's own wallet). The addresses above are current; DestPool addresses are unchanged from the original deploy.

USDC addresses confirmed against block explorers (Basescan / Arbiscan Sepolia / OP Sepolia Etherscan) and cross-checked against Circle's documented testnet addresses. EIP-3009 support verified on-chain for all three via `DOMAIN_SEPARATOR()` and `authorizationState()` — see [CHAINS.md](CHAINS.md).

## Deploy runbook

Per chain, from `contracts/`:

```bash
USDC_ADDRESS=$CHAIN_USDC_ADDRESS \
RELAYER_ADDRESS=$RELAYER_ADDRESS \
forge script script/DeploySourceVault.s.sol:DeploySourceVault \
  --rpc-url $CHAIN_RPC_URL --broadcast

USDC_ADDRESS=$CHAIN_USDC_ADDRESS \
RELAYER_ADDRESS=$RELAYER_ADDRESS \
OWNER_ADDRESS=$OWNER_ADDRESS \
FEE_BPS=$FEE_BPS \
forge script script/DeployDestPool.s.sol:DeployDestPool \
  --rpc-url $CHAIN_RPC_URL --broadcast
```

`DestPool` is skipped for Ethereum Sepolia (source-only).

After each deploy, record the printed address in this file and in the relayer's `.env` (`*_SOURCE_VAULT_ADDRESS`, `*_DEST_POOL_ADDRESS`), then fund the `DestPool` with testnet USDC before running the round-trip script.

## Route table

Enumerated by `listRoutePairs()` in `relayer/src/chains/chainIds.ts` — the same source of truth `decideRoute`/`validatePayRequest` check against. Nine viable `(from, to)` pairs:

```
Ethereum Sepolia -> Base Sepolia
Ethereum Sepolia -> Arbitrum Sepolia
Ethereum Sepolia -> Optimism Sepolia
Base Sepolia      -> Arbitrum Sepolia
Base Sepolia      -> Optimism Sepolia
Arbitrum Sepolia  -> Base Sepolia
Arbitrum Sepolia  -> Optimism Sepolia
Optimism Sepolia  -> Base Sepolia
Optimism Sepolia  -> Arbitrum Sepolia
```

## Round-trip verification

`relayer/scripts/test-round-trip.ts`, parameterized by `ROUND_TRIP_FROM_CHAIN` / `ROUND_TRIP_TO_CHAIN` (`ethereum-sepolia` | `base-sepolia` | `arbitrum-sepolia` | `optimism-sepolia`), run once per direction after both `DestPool`s are funded:

```bash
ROUND_TRIP_FROM_CHAIN=base-sepolia ROUND_TRIP_TO_CHAIN=arbitrum-sepolia npx tsx scripts/test-round-trip.ts
ROUND_TRIP_FROM_CHAIN=arbitrum-sepolia ROUND_TRIP_TO_CHAIN=base-sepolia npx tsx scripts/test-round-trip.ts
```

Requires `BREEJA_TEST_API_KEY` (one of `BREEJA_API_KEYS`), `AGENT_A_PRIVATE_KEY` (funded payer), and `AGENT_B_ADDRESS` (recipient) in `relayer/.env`. Results recorded below once run.

### Base Sepolia → Arbitrum Sepolia

Confirmed. Amount 1 USDC, fee 0.005 USDC, payout 0.995 USDC, pending → deposit_confirmed → released in ~9s.

- Source deposit: `0xb34d3aca397b011bf0fbc7ed43c05a5bcb028353a5a1c56df033fd43315efae2` ([Basescan](https://sepolia.basescan.org/tx/0xb34d3aca397b011bf0fbc7ed43c05a5bcb028353a5a1c56df033fd43315efae2))
- Dest release: `0x62d59857f18a728369c3395b528358fefe7ad233baf52f69e9e0e73e05c041cc` ([Arbiscan](https://sepolia.arbiscan.io/tx/0x62d59857f18a728369c3395b528358fefe7ad233baf52f69e9e0e73e05c041cc))

### Arbitrum Sepolia → Base Sepolia

Confirmed. Amount 1 USDC, fee 0.005 USDC, payout 0.995 USDC, pending → deposit_confirmed → released in ~6s.

- Source deposit: `0xcfc18e8356b235f67620aeb00b029063a159f7263b60ab36b71c157967eaa53c` ([Arbiscan](https://sepolia.arbiscan.io/tx/0xcfc18e8356b235f67620aeb00b029063a159f7263b60ab36b71c157967eaa53c))
- Dest release: `0xf92d150720058e293e7e6f2ccda2979765f59a8e01ab756c51d0650e9a257d90` ([Basescan](https://sepolia.basescan.org/tx/0xf92d150720058e293e7e6f2ccda2979765f59a8e01ab756c51d0650e9a257d90))

Both directions used real EIP-3009 signatures — including Arbitrum Sepolia's USDC, whose EIP-712 domain name is `"USD Coin"` rather than `"USDC"` (see [CHAINS.md](CHAINS.md)) — a real relayer-paid deposit, and a real relayer-paid release, recipient distinct from payer.

## Arc Testnet (additive, `ENABLE_ARC`)

Deployed 2026-09-08 using the funded deployer key already present in this repo's `contracts/.env`/`relayer/.env` (`0x9bcf302cFCB64406b557342c2715e85Ac62A4693` — the same address used as deployer/relayer/owner for the four-chain mesh above, confirmed funded with testnet USDC on Arc before deploying). Additive only — gated behind `ENABLE_ARC=true`; the four chains above are unaffected when it is unset.

| Chain | Chain ID | SourceVault | DestPool | USDC (Circle, native) |
|---|---|---|---|---|
| Arc Testnet | 5042002 | `0xfd2f67cD354545712f9d8230170015d7e30d133A` | `0xA5dd225Beb2Ec0009Fe143eb0B9309Ba07d23737` | `0x3600000000000000000000000000000000000000` |

Deploy transactions:

- SourceVault: `0xbaec4ec7d3fe780c92042417d21945bfa58481638887b61033a93508f4b34bde`
- DestPool: `0xe887ff0941b6cfc7e6fd4b73404e9811578157c87abfabafbdb361b52c978b58`
- DestPool funded with 5 USDC: `0x22dbcd8ca3c5986f79998acea174e643e1065f22eca27737a5754f91462122b1`

All checkable on [ArcScan Testnet](https://testnet.arcscan.app).

USDC EIP-3009 support verified on-chain (see [CHAINS.md](CHAINS.md) "Arc" section for the full `cast` output). Fee: 50 bps, matching the rest of the mesh.

### Arc Testnet -> Base Sepolia (fast pool, live round trip)

Confirmed. Amount 1 USDC, fee 0.005 USDC, payout 0.995 USDC, pending_deposit -> deposit_confirmed -> released in ~80s (Arc's block time is slower than the Sepolia rollups; ~77s of that was waiting for the source deposit to confirm).

- Source deposit (Arc Testnet): `0xf3095e650665448beb66a0fd41846618054b5f8e3fbe816a61b257437ab1d43d` ([ArcScan](https://testnet.arcscan.app/tx/0xf3095e650665448beb66a0fd41846618054b5f8e3fbe816a61b257437ab1d43d))
- Dest release (Base Sepolia): `0x2ac8b8062762a82ceb2941a4e605866886f82cf73cd36b1726c629a4e339167b` ([Basescan](https://sepolia.basescan.org/tx/0x2ac8b8062762a82ceb2941a4e605866886f82cf73cd36b1726c629a4e339167b))

A real EIP-3009 `TransferWithAuthorization` signed on Arc (EIP-712 domain name `"USDC"`, version `"2"`), a real relayer-paid deposit into Arc's `SourceVault`, and a real relayer-paid release on Base Sepolia — recipient distinct from payer, run via `relayer/scripts/test-round-trip.ts` against a locally running relayer with `ENABLE_ARC=true`.

CCTP burn/mint through Arc's native route (TokenMessengerV2/MessageTransmitterV2, domain 26) is wired in `relayer/src/chains/registry.ts` the same way as the other four chains but was not separately live-tested end-to-end in this pass — the fast-pool round trip above already exercises the full deposit/release path with real signatures and real funds on Arc specifically.

### Not yet done for Arc

- CCTP burn/mint live test specifically through Arc (wired, not yet run end-to-end).
- Subgraph manifest entry for Arc's contracts (step 8 of the "Adding a chain" checklist).
- A destination round trip *into* Arc (only Arc-as-source was tested above).

## Hedera Testnet (additive, `ENABLE_HEDERA`)

Deployed 2026-09-08 using the funded payer/relayer key already present in this repo's `contracts/.env`/`relayer/.env` (`0x08c3657C368975D6175cfF6a5c084a1E5F7E7609`, funded with testnet HBAR and testnet USDC before deploying). Additive only — gated behind `ENABLE_HEDERA=true`; the chains above are unaffected when it is unset.

| Chain | Chain ID | SourceVault | DestPool | USDC (HTS) |
|---|---|---|---|---|
| Hedera Testnet | 296 | `0xfd80365F46C776eE7c08642F700E268e69247228` | `0xD2B5A9a82B91a60eb7AD28770a5453546746b8f6` | `0x0000000000000000000000000000000000068cda` |

USDC on Hedera is Hedera Token Service token `0.0.429274` accessed through its EVM/ERC-20 facade at the address above (6 decimals). EIP-3009 support verified on-chain — **not supported**, see [CHAINS.md](CHAINS.md) "Hedera" for the full `cast` output. Fee: 50 bps, matching the rest of the mesh.

Deploy and setup transactions, all checkable on [HashScan Testnet](https://hashscan.io/testnet) or via the [mirror node REST API](https://testnet.mirrornode.hedera.com/api/v1/docs/):

- SourceVault deploy: `0x4e7025a50240cd319969055faebcc3a825c02e7f1d882d36e750b4e3d66689d1` ([HashScan](https://hashscan.io/testnet/transaction/0x4e7025a50240cd319969055faebcc3a825c02e7f1d882d36e750b4e3d66689d1))
- SourceVault `associateToken()`: `0x4418c8d2eb73de25420ecb68802ebdd6de4c67ed9def7bcd03c70a1f73f7f632` ([HashScan](https://hashscan.io/testnet/transaction/0x4418c8d2eb73de25420ecb68802ebdd6de4c67ed9def7bcd03c70a1f73f7f632))
- DestPool deploy: `0xd9d9ae74906478e2e7b540bf6508d79bfe2928facc266fe7c6a470d004bc291c` ([HashScan](https://hashscan.io/testnet/transaction/0xd9d9ae74906478e2e7b540bf6508d79bfe2928facc266fe7c6a470d004bc291c))
- DestPool `associateToken()`: `0x284a9a91d8f23c966087fc3fba62831cfea87a8801e9363f8ed370cc5920f8f4` ([HashScan](https://hashscan.io/testnet/transaction/0x284a9a91d8f23c966087fc3fba62831cfea87a8801e9363f8ed370cc5920f8f4))
- DestPool funded with 5 USDC: transaction id `0.0.7314364-1788864066-359941875` (a native HTS token transfer via the Hedera SDK, so it carries a 48-byte Hedera-native transaction hash rather than a standard 32-byte EVM `0x` hash — findable on HashScan by transaction ID, or via the mirror node at `/api/v1/transactions?account.id=0.0.10420222`)

Both contracts were also created with `max_automatic_token_associations: -1` (unlimited auto-association), confirmed via the mirror node — the explicit `associateToken()` calls above were a belt-and-suspenders step, not strictly load-bearing, but confirm the contract-level HTS association question either way.

### Hedera Testnet -> Optimism Sepolia (fast pool, live round trip)

Confirmed. Amount 1 USDC, fee 0.005 USDC, payout 0.995 USDC, pending_deposit -> deposit_confirmed -> released in ~16s.

Since Hedera's USDC does not support EIP-3009, this used the real `approve()` + `deposit()` flow, not a signed permit:

1. Payer called `USDC.approve(sourceVault, 1000000)` on Hedera directly (on-chain, payer-paid HBAR gas): `0x171fd7abc1f294f4630f313702029df93df941febefa7c2ac07baa04af42d832` ([HashScan](https://hashscan.io/testnet/transaction/0x171fd7abc1f294f4630f313702029df93df941febefa7c2ac07baa04af42d832))
2. `POST /pay` to a locally running relayer (`ENABLE_HEDERA=true`) with `fromChainId: 296`, `toChainId: 11155420`, and no `authorization` field — accepted, decided `fast_pool` (no CCTP route offered for Hedera, confirming the router restriction), fee 50 bps.
3. Relayer called `SourceVault.deposit(payer, recipient, amount, destChainId)` on Hedera (relayer-paid HBAR gas, pulls via `transferFrom`):
   - Source deposit (Hedera Testnet): `0x0e0b512b2c23d3de0ac1a41cde340570b0f0f73f6eff6570dcff34f76400b855` ([HashScan](https://hashscan.io/testnet/transaction/0x0e0b512b2c23d3de0ac1a41cde340570b0f0f73f6eff6570dcff34f76400b855))
4. Relayer released from Optimism Sepolia's `DestPool` (relayer-paid gas):
   - Dest release (Optimism Sepolia): `0xad406535409b5b6d6833d890ff1a50b7558f300f203a937b9ad6ea3c22a729fa` ([Etherscan](https://sepolia-optimism.etherscan.io/tx/0xad406535409b5b6d6833d890ff1a50b7558f300f203a937b9ad6ea3c22a729fa))

Recipient's USDC balance on Optimism Sepolia confirmed at 0.995 USDC directly on-chain after release (read via `balanceOf`, recipient distinct from payer). Hedera's `SourceVault` balance confirmed at 1 USDC after the deposit.

This is a real on-chain `approve()` paid by the payer, a real relayer-paid `deposit()` pulling funds via `transferFrom`, and a real relayer-paid fast-pool release on a separate chain — run against a locally running relayer with `ENABLE_HEDERA=true`, `BREEJA_TEST_API_KEY`/`BREEJA_API_KEYS=local-dev-key`, hitting `/pay` and `/status/:id` directly (not through `test-round-trip.ts`, which only builds EIP-3009 signatures and has no Hedera case — see "Not yet done for Hedera" below).

### Not yet done for Hedera

- `relayer/scripts/test-round-trip.ts` has no Hedera case: it only builds EIP-3009 `TransferWithAuthorization` signatures, which Hedera cannot use. The live round trip above was run by calling `/pay` and `/status/:id` directly rather than through that script. A dedicated `approve()` + `/pay`-without-authorization script for Hedera would be a reasonable follow-up if repeated testing is needed.
- The frontend payment widget (`usePaymentWidget.ts`) does not send a real `approve()` transaction for Hedera as a source chain — it detects `supportsEip3009: false` and fails with an explanatory error rather than attempting (and silently breaking) an EIP-3009 signature flow. Wiring a real `useWriteContract` approve step for non-EIP-3009 chains is a documented follow-up, not done in this pass.
- A destination round trip *into* Hedera (only Hedera-as-source was tested above) — Hedera's `DestPool` fast-pool release path (`release()`) is the same contract code as every other chain's `DestPool` and was not separately exercised as a destination in this pass, though its USDC balance (5 USDC) and association are both confirmed live.
- CCTP is confirmed unsupported for Hedera (no domain, no test needed — this isn't a gap, it's the correct behavior per docs/CHAINS.md).
- Subgraph manifest entry for Hedera's contracts (step 8 of the "Adding a chain" checklist).
