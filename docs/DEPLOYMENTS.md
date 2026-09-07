# Deployments

> Audience: coding agents first, humans second. Filled in as contracts are deployed. Never guess an address — copy from a deploy transaction's console output or a block explorer.

## Base + Arbitrum + Optimism Sepolia mesh (this build)

Ethereum Sepolia is source-only, per [ARCHITECTURE.md](ARCHITECTURE.md) — no `DestPool` on that chain.

| Chain | Chain ID | SourceVault | DestPool | USDC (Circle) |
|---|---|---|---|---|
| Ethereum Sepolia | 11155111 | `0x6F70269Ed4a213F7db423b4A6D3B4C7079961343` | — | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` |
| Base Sepolia | 84532 | `0xCAa8b30F4c71B8bB8C7149b2F5f709ed2DB461ab` | `0x45944B08fea203a7469C82A690F68fabF85B8283` | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| Arbitrum Sepolia | 421614 | `0xBE369c4BB4E06ed375926bc3AC284ed01d546d8B` | `0xaA45094129D06ab48AEf1e8251071067FC4FED5A` | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |
| Optimism Sepolia | 11155420 | `0xfd2f67cD354545712f9d8230170015d7e30d133A` | `0xA5dd225Beb2Ec0009Fe143eb0B9309Ba07d23737` | `0x5fd84259d66Cd46123540766Be93DFE6D43130D7` |

Deployer / relayer / owner (this build): `0x9bcf302cFCB64406b557342c2715e85Ac62A4693`. Fee: 50 bps.

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
