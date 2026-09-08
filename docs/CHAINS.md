# Chains

Every chain below is both a source and a destination unless noted. This is the deploy matrix, the token list, and the per-chain gotchas that will cost a day if discovered late.

## Matrix

| Chain | Chain ID | Role | Stablecoin | EIP-3009 | CCTP | Notes |
|---|---|---|---|---|---|---|
| Ethereum Sepolia | 11155111 | Source only | Circle USDC | Yes | Yes | Easiest faucet; dest liquidity not worth the gas |
| Base Sepolia | 84532 | Source + dest | Circle USDC | Yes | Yes | Primary demo chain, cheapest gas |
| Arbitrum Sepolia | 421614 | Source + dest | Circle USDC | Yes | Yes | Fast finality |
| Optimism Sepolia | 11155420 | Source + dest | Circle USDC | Yes | Yes | Same stack as Base |
| Hedera Testnet | 296 | Source + dest | USDC (HTS) | **Verify** | No | Not EVM-identical — see below |
| Arc Testnet | 5042002 | Source + dest | USDC native | Yes | Native (domain 26) | Circle's own chain; additive, behind `ENABLE_ARC` |

Arc's chain ID, RPC, and contract addresses were confirmed live on 2026-09-08 against `docs.arc.io` (fetched and cross-checked byte-for-byte against the raw page source) and independently corroborated by viem's built-in `arcTestnet` chain definition and by `cast chain-id` against the RPC returning the same id on-chain. See "Arc" below for the full record.

## Verify before you build

Two claims must be checked on-chain, not assumed. v1 lost time to exactly this: HSK's USDT turned out to be an `OptimismMintableERC20` whose `DOMAIN_SEPARATOR()` reverted, so it could not support the gasless permit flow at all. That was discovered after integration work had started.

Run this against every token before adding its chain:

```bash
cast call $TOKEN "DOMAIN_SEPARATOR()(bytes32)" --rpc-url $RPC
cast call $TOKEN "authorizationState(address,bytes32)(bool)" $ZERO $ZERO --rpc-url $RPC
```

If either reverts, the token does not implement EIP-3009 and that chain is CCTP-only or excluded. Record the result in this table rather than rediscovering it.

Verified for the Base/Arbitrum/Optimism Sepolia mesh build — both calls returned cleanly (no revert) against each token, confirming full EIP-3009 support:

| Chain | Token | `DOMAIN_SEPARATOR()` | `authorizationState(0,0)` | EIP-712 `name()` | `version()` |
|---|---|---|---|---|---|
| Base Sepolia | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` | `0x71f17a3b2ff373b803d70a5a07c046c1a2bc8e89c09ef722fcb047abe94c981` | `false` | `USDC` | `2` |
| Arbitrum Sepolia | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` | `0x85944e1292d007732838d6eadfa67589b78ffcededbd4df60488d0af251308b` | `false` | `USD Coin` | `2` |
| Optimism Sepolia | `0x5fd84259d66Cd46123540766Be93DFE6D43130D7` | `0x09d038a3e46040fc37eb01174dbbcdb7981fbd8eafd9e1a857b1c67805dfb29` | `false` | `USDC` | `2` |
| Arc Testnet | `0x3600000000000000000000000000000000000000` | `0x361191522483d32a83e70ae7183b4b9629442c13a78bc9921d6f707911c8c6b0` | `false` | `USDC` | `2` |

Gotcha caught here: Arbitrum Sepolia's USDC has EIP-712 domain `name = "USD Coin"`, not `"USDC"` like the other two. A signer that hardcodes `"USDC"` as the domain name produces a signature that fails to verify on Arbitrum. Read `name()` on-chain per token rather than assuming it matches the symbol.

## Hedera

Hedera is the highest-effort chain here and the decision to include it should stay deliberate.

- It exposes a JSON-RPC relay, so viem works, but it is not EVM-identical.
- USDC is an **HTS token**, not a plain ERC-20. It may need explicit association before an account can receive it, which has no Ethereum analogue and will surface as a confusing revert if missed.
- Gas is denominated in HBAR with different price mechanics; the router's gas estimation needs a Hedera-specific path rather than a generic `getGasPrice`.
- No CCTP. Fast pool is the only route in and out.

Build Hedera **last**, behind a feature flag, after the EVM mesh works end to end. If it slips, the product still demos completely without it.

## Arc

Circle's chain, and the strategic center of the Circle track. USDC is native rather than bridged, and CCTP support is first-class.

Public testnet launched October 28, 2025 (mainnet targeted September 16, 2026, per Circle's public communications — not relevant to this testnet integration). Verified live on 2026-09-08:

| Field | Value | Source |
|---|---|---|
| Chain ID | `5042002` | `docs.arc.io/arc/references/rpc-endpoints`; confirmed on-chain via `cast chain-id --rpc-url https://rpc.testnet.arc.io`; matches viem's built-in `arcTestnet` export |
| RPC (primary) | `https://rpc.testnet.arc.io` (also `rpc.testnet.arc.network`, both resolve to the same chain) | docs.arc.io; live-tested |
| Block explorer | `https://testnet.arcscan.app` | docs.arc.io; live-tested via its API |
| Native gas token | USDC, 18 decimals | docs.arc.io "Stablecoin native model" |
| USDC (ERC-20 interface) | `0x3600000000000000000000000000000000000000`, 6 decimals | docs.arc.io/arc/references/contract-addresses |
| CCTP domain | `26` | docs.arc.io/arc/references/contract-addresses |
| TokenMessengerV2 | `0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA` | docs.arc.io/arc/references/contract-addresses |
| MessageTransmitterV2 | `0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275` | docs.arc.io/arc/references/contract-addresses |
| TokenMinterV2 | `0xb43db544E2c27092c107639Ad201b3dEfAbcF192` | docs.arc.io/arc/references/contract-addresses |
| MessageV2 | `0xbaC0179bB358A8936169a63408C8481D582390C4` | docs.arc.io/arc/references/contract-addresses |
| Faucet | `https://faucet.circle.com` | docs.arc.io |

Note: `TokenMessengerV2`/`MessageTransmitterV2` on Arc use the same addresses as this project's existing `CCTP_TOKEN_MESSENGER_ADDRESS`/`CCTP_MESSAGE_TRANSMITTER_ADDRESS` (Circle deploys CCTP V2 deterministically at the same address across chains), which independently corroborates these values against what was already verified for the Sepolia mesh.

Arc's USDC is architecturally different from the other chains: it's the native gas asset (an `OptimismMintableERC20`-style situation does NOT apply here — this is Circle's own `FiatTokenProxy`/`NativeFiatTokenV2_2`, verified on ArcScan as a verified contract), with an "optional" ERC-20 interface at the fixed address above sharing the same underlying balance. EIP-3009 was verified live rather than assumed:

```
$ cast call 0x3600000000000000000000000000000000000000 "DOMAIN_SEPARATOR()(bytes32)" --rpc-url https://rpc.testnet.arc.io
0x361191522483d32a83e70ae7183b4b9629442c13a78bc9921d6f707911c8c6b0
$ cast call 0x3600000000000000000000000000000000000000 "authorizationState(address,bytes32)(bool)" 0x0 0x0 --rpc-url https://rpc.testnet.arc.io
false
$ # name() -> "USDC", symbol() -> "USDC", decimals() -> 6, version() -> "2"
```

Both calls returned cleanly — full EIP-3009 support, same gasless permit flow as every other chain, no special-casing needed in the signer.

Arc is additive and gated behind `ENABLE_ARC=true` (relayer env var) — the existing four-chain mesh's behavior, routing, and UI paths are unaffected when it's unset (the default in `.env.example`). See [DEPLOYMENTS.md](DEPLOYMENTS.md) for deployed contract addresses and the live round-trip record.

## Frontend chain switching

The wallet is on one chain; the payment may start on another. Handle this explicitly rather than letting wagmi throw.

Rules:

1. **Source chain is chosen in the UI, not inherited from the wallet.** A user on Arbitrum can select Base as their source; the app then asks them to switch.
2. **Prompt, do not auto-switch.** Silent `switchChain` calls surface as an unexplained wallet popup. Show what is being switched and why, then call it on click.
3. **Block the sign action while mismatched.** The permit is domain-bound to the source chain — signing on the wrong one produces a valid signature that will fail on-chain. Disable the button, do not merely warn.
4. **Destination needs no switch.** The payer never transacts on the destination chain. Make that visible, since it surprises people.
5. **Unknown chain in wallet** → offer `addChain` with the right params rather than an error.

The state machine the widget implements:

```
idle
  ↓ user picks source + dest
quoting          → route list from POST /quote
  ↓ user confirms
wrong_network    → "Switch to Base Sepolia" button   [if walletChain != sourceChain]
  ↓ switch succeeds
ready_to_sign
  ↓ user signs permit
submitting       → POST /pay
  ↓ 202 + payment id
tracking         → SSE stream drives the rest
  ↓
released | failed
```

Every one of those states needs a real UI. `wrong_network` and `failed` are the two most often skipped and the two most often hit in a live demo.

## Adding a chain

1. Confirm chain ID, RPC, explorer URL from primary sources.
2. Verify the token implements EIP-3009 with the `cast` calls above.
3. Add the chain definition to `relayer/src/chains/` following the existing per-chain module pattern.
4. Deploy `SourceVault` and `DestPool` via the Foundry scripts.
5. Add to the router's route table with a gas-estimation strategy.
6. Add to the frontend chain list with logo, explorer, and faucet link.
7. Fund the destination pool.
8. Add the chain's contracts to the subgraph manifest.
9. Run the end-to-end test both directions.

Nine steps, and skipping 7 or 9 is how a chain looks supported in the UI and fails in the demo.
