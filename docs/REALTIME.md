# Realtime

> Audience: coding agents first, humans second.

How the frontend stays synchronized with on-chain state. Three layers, each with a distinct job. Do not collapse them.

| Layer | Job | Latency | Source of truth |
|---|---|---|---|
| SSE stream | Live transitions for in-flight payments | <100ms | Relayer memory + Postgres |
| Postgres | Durable state, idempotency, recovery | — | Written by relayer, corrected by reconciler |
| Subgraph | History, dashboards, analytics | 1–3s | Chain events |

Rule: the chain is always the final authority. Postgres is a cache of intent plus observed results. When they disagree, the reconciler rewrites Postgres from chain events.

## Why not polling

v1 polled `GET /status/:id`. It fails on three counts: visible lag on a demo screen, wasted requests for a resource that changes 3 times in its life, and no way to observe a payment the client did not initiate. SSE fixes all three and is one-directional, which matches the data flow exactly. WebSocket is unnecessary — clients never push.

## Data model

```sql
create table payments (
  id              uuid primary key,
  nonce           bytea not null,           -- EIP-3009 nonce, idempotency key
  from_chain_id   integer not null,
  to_chain_id     integer not null,
  payer           bytea not null,
  recipient       bytea not null,
  amount          numeric(78,0) not null,
  fee_amount      numeric(78,0) not null,
  payout_amount   numeric(78,0) not null,
  route           text not null,            -- 'fast_pool' | 'cctp'
  state           text not null,
  source_tx_hash  bytea,
  dest_tx_hash    bytea,
  error           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index payments_nonce_chain_idx on payments (nonce, from_chain_id);
create index payments_state_idx on payments (state) where state not in ('released', 'failed');
create index payments_recipient_idx on payments (recipient);
```

The unique index on `(nonce, from_chain_id)` is the idempotency mechanism. A duplicate `POST /pay` conflicts on insert and returns the existing row. This is the fix for the v1 bug where the same request could double-release.

The partial index on `state` is what the reconciler scans. It stays small because terminal rows drop out of it.

## State machine

```
pending_deposit ──→ deposit_confirmed ──→ released
      │                     │
      └──→ failed ←─────────┘
```

| State | Meaning | Terminal |
|---|---|---|
| `pending_deposit` | Row written, permit not yet submitted | no |
| `deposit_confirmed` | `PaymentRequested` observed on source chain | no |
| `released` | `Released` observed on destination chain | yes |
| `failed` | Unrecoverable; `error` populated | yes |

Constraint: transitions are forward-only. A terminal state is never rewritten.

## SSE contract

```
GET /events/:paymentId      → stream for one payment
GET /events?recipient=0x…   → stream for all payments to an address
```

Headers:

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

`X-Accel-Buffering: no` is required. Without it a proxy buffers the stream and every event arrives at once when the connection closes.

Event frames:

```
event: state
data: {"id":"…","state":"deposit_confirmed","sourceTxHash":"0x…","updatedAt":1234567890}

event: state
data: {"id":"…","state":"released","destTxHash":"0x…","payoutAmount":"9950000","explanation":"…"}

event: error
data: {"id":"…","state":"failed","error":"ReleaseReverted"}

: heartbeat
```

Requirements:

- Emit a comment heartbeat every 15s. Idle connections are dropped by proxies without it.
- On connect, immediately send the current state before streaming transitions. A client joining late must not wait for the next change.
- Close the stream after a terminal state.
- Cap concurrent streams per IP.

## Client

```ts
export function usePaymentStream(paymentId: string | null) {
  const [payment, setPayment] = useState<Payment | null>(null);

  useEffect(() => {
    if (!paymentId) return;

    const source = new EventSource(`${API_URL}/events/${paymentId}`);

    source.addEventListener("state", (event) => {
      setPayment(JSON.parse(event.data));
    });

    source.addEventListener("error", (event) => {
      setPayment(JSON.parse((event as MessageEvent).data));
      source.close();
    });

    return () => source.close();
  }, [paymentId]);

  return payment;
}
```

`EventSource` reconnects on its own. Do not hand-roll retry logic around it.

Constraint: never render optimistic state as confirmed. A pending release and a completed one must be visually distinct, and only a `Released` event moves the UI to done. Showing success before the chain confirms it is how a demo lies.

## Subgraph

Indexes `PaymentRequested` on every `SourceVault` and `Released` on every `DestPool`.

```graphql
type Payment @entity {
  id: ID!                      # sourceChainId-txHash-logIndex
  payer: Bytes!
  recipient: Bytes!
  amount: BigInt!
  sourceChainId: BigInt!
  destChainId: BigInt!
  sourceTxHash: Bytes!
  requestedAt: BigInt!
  release: Release
}

type Release @entity {
  id: ID!
  recipient: Bytes!
  payout: BigInt!
  fee: BigInt!
  sourceRef: Bytes!
  destChainId: BigInt!
  destTxHash: Bytes!
  releasedAt: BigInt!
}

type ChainStats @entity {
  id: ID!                      # chainId
  totalVolume: BigInt!
  totalFees: BigInt!
  paymentCount: BigInt!
}
```

`Payment.release` is linked via `sourceRef`, which the relayer sets to the source transaction hash. This is what makes cross-chain correlation possible in a single query.

Used for: the dashboard, per-chain stats on the landing page, agent history queries via MCP, and reconciler cross-checks. Not used for live in-flight state — that is SSE's job.

## Reconciler

Runs every 30s. Purpose: guarantee no payment is lost when the relayer restarts. This is the fix for the v1 failure where in-memory state vanished on restart while funds had already moved.

```
1. Select payments where state not in ('released', 'failed')
   and updated_at < now() - interval '2 minutes'
2. For each:
   a. state = pending_deposit    → check source chain for PaymentRequested
                                   found → advance to deposit_confirmed
                                   not found, permit expired → mark failed
   b. state = deposit_confirmed  → check dest chain for Released
                                   found → advance to released
                                   not found → retry release with backoff
3. After 3 failed release attempts → mark failed, emit alert
```

Constraint: the reconciler is idempotent and safe to run concurrently with the main flow. It advances state only on observed chain events, never on inference.

## Landing page live stats

The stats bar reads the subgraph, not the relayer. It must degrade to a skeleton, never to zeros — a `0` reads as "nothing has ever happened here", which is worse than an obvious loading state.

Poll every 30s. These are aggregates; they do not need SSE.
