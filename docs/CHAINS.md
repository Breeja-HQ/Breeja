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
| Arc Testnet | TBD | Source + dest | USDC native | **Verify** | Native | Circle's own chain; confirm IDs at build time |

Chain IDs for Arc are left as TBD deliberately. Confirm them against Circle's live docs before writing them into config — do not guess, and do not let a model fill them in.

## Verify before you build

Two claims must be checked on-chain, not assumed. v1 lost time to exactly this: HSK's USDT turned out to be an `OptimismMintableERC20` whose `DOMAIN_SEPARATOR()` reverted, so it could not support the gasless permit flow at all. That was discovered after integration work had started.

Run this against every token before adding its chain:

```bash
cast call $TOKEN "DOMAIN_SEPARATOR()(bytes32)" --rpc-url $RPC
cast call $TOKEN "authorizationState(address,bytes32)(bool)" $ZERO $ZERO --rpc-url $RPC
```

If either reverts, the token does not implement EIP-3009 and that chain is CCTP-only or excluded. Record the result in this table rather than rediscovering it.

## Hedera

Hedera is the highest-effort chain here and the decision to include it should stay deliberate.

- It exposes a JSON-RPC relay, so viem works, but it is not EVM-identical.
- USDC is an **HTS token**, not a plain ERC-20. It may need explicit association before an account can receive it, which has no Ethereum analogue and will surface as a confusing revert if missed.
- Gas is denominated in HBAR with different price mechanics; the router's gas estimation needs a Hedera-specific path rather than a generic `getGasPrice`.
- No CCTP. Fast pool is the only route in and out.

Build Hedera **last**, behind a feature flag, after the EVM mesh works end to end. If it slips, the product still demos completely without it.

## Arc

Circle's chain, and the strategic center of the Circle track. USDC is native rather than bridged, and CCTP support is first-class. Treat its chain ID, RPC, and contract addresses as unknowns to be confirmed from Circle's documentation during the build, not from memory.

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
