# x402 demo

Cross-chain x402 settlement through Breeja: a resource server gates `GET /resource`
behind a `402 Payment Required` response, and an agent pays through the Breeja
relayer to unlock it. The payment is **not** a same-chain EIP-3009 transfer
straight to the resource server — the agent holds funds on `base-sepolia`, the
resource server is paid on `arbitrum-sepolia`, and the Breeja relayer moves value
across that boundary. Neither side handles gas on the other's chain.

```
Agent                    Resource server              Breeja
  │  GET /resource              │                       │
  │ ───────────────────────────>│                       │
  │  402 + payment details      │                       │
  │ <───────────────────────────│                       │
  │  breeja.pay()                                       │
  │ ───────────────────────────────────────────────────>│
  │  payment id + proof                                 │
  │ <───────────────────────────────────────────────────│
  │  GET /resource + proof      │                       │
  │ ───────────────────────────>│                       │
  │  200 + resource             │                       │
  │ <───────────────────────────│                       │
```

## Proof-of-payment mechanism

The `402` body names an `accepts.proof.header` (`x-payment-id`). The agent pays
with `@breeja/sdk`, waits for the payment to reach `"released"`, then retries
`GET /resource` with `x-payment-id: <payment id>`. The server looks the id up via
its own `Breeja` instance (`breeja.status(id)`) and only serves the resource if the
payment is `released`, its `recipient` matches the server's own configured
address, and its payout amount meets the price. The server never trusts the id
alone — it re-verifies against the relayer on every request.

## Setup

Copy the env files and fill them in:

```bash
cp examples/x402/server/.env.example examples/x402/server/.env
cp examples/x402/agent/.env.example examples/x402/agent/.env
```

**`examples/x402/server/.env`**

| Var | Meaning |
|---|---|
| `BREEJA_API_KEY` | Key the server uses to read payment status (from the relayer's `BREEJA_API_KEYS`) |
| `X402_SERVER_RECIPIENT_ADDRESS` | The server operator's own address on `arbitrum-sepolia`, paid by the agent |
| `PORT` | Defaults to `4021` |

**`examples/x402/agent/.env`**

| Var | Meaning |
|---|---|
| `BREEJA_API_KEY` | Key the agent uses to quote/pay/watch (from the relayer's `BREEJA_API_KEYS`) |
| `X402_AGENT_PRIVATE_KEY` | The agent's own funded testnet private key on `base-sepolia` |
| `X402_SERVER_URL` | Defaults to `http://localhost:4021` |

## Run

Start the server first:

```bash
cd examples/x402/server && npm install && npm run dev
```

Then, in another terminal, run the agent:

```bash
cd examples/x402/agent && npm install && npm start
```

The agent prints each step of the flow — the initial `402`, the payment id, the
watched status transitions, and finally the unlocked resource content.

## Requirements to actually run this

- A running Breeja relayer, reachable by the SDK, with a `BREEJA_API_KEY` that
  matches an entry in the relayer's own `BREEJA_API_KEYS` config.
- Real testnet USDC funds on `X402_AGENT_PRIVATE_KEY`'s address on `base-sepolia`.
- The agent's source chain (`base-sepolia`) and the server's destination chain
  (`arbitrum-sepolia`) must stay different — that's what makes this a cross-chain
  demo rather than a same-chain EIP-3009 transfer.
