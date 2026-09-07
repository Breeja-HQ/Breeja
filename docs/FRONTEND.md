# Frontend

> Audience: coding agents first, humans second.

Next.js App Router. Design system is [font-theme.md](font-theme.md) and it is authoritative — neo-brutalist, hard 2px borders, offset shadows with zero blur, square corners except pills, oklch paper background.

## Routes

| Route | Purpose | Rendering |
|---|---|---|
| `/` | Landing: hero, how it works, partners, live stats, docs CTA | Server, stats client-side |
| `/pay` | The payment widget | Client |
| `/dashboard` | Payment history from subgraph | Client |
| `/docs` | SDK documentation for agent developers | Server, copy buttons client |
| `/docs/[section]` | Per-method docs pages | Server |

`/bridge` from v1 becomes `/pay`. The product is a payment rail, not a bridge, and the route should say so.

## Landing page

Sections in order:

1. **Hero** — the claim, one line. Two CTAs: "Send a payment" and "Read the docs". The docs CTA is not secondary; agent developers are half the audience.
2. **How it works** — three steps, the gasless permit flow.
3. **Live stats** — volume, payments, chains, from the subgraph. Skeleton while loading, never zeros.
4. **Chains** — the supported mesh, visually. Every chain is both source and destination; the graphic should show that rather than a linear A→B bridge.
5. **Partners** — logo grid per [PARTNERS.md](PARTNERS.md), each linking into `/docs`.
6. **For agents** — SDK snippet, `npm install @breeja/sdk`, MCP config, link to `/docs`. This section is why an agent developer stays.
7. **Trust model** — custody stated plainly. Do not bury it.
8. **FAQ**, **Footer**.

## Payment widget

Implements the state machine in [CHAINS.md](CHAINS.md). Every state needs real UI:

| State | Required UI |
|---|---|
| `idle` | Chain selectors, amount, recipient |
| `quoting` | Route list with fee, ETA, custody label per route |
| `wrong_network` | Explicit switch prompt naming the chain; sign disabled |
| `ready_to_sign` | Summary: exact amount out, fee, recipient, route |
| `submitting` | Signature accepted, awaiting relayer |
| `tracking` | Live SSE-driven progress with explorer links |
| `released` | Final amount, both tx links |
| `failed` | Specific reason, recovery guidance |

Constraints:

- Never render optimistic state as confirmed. Only a `Released` event moves the UI to done.
- Show the exact amount the recipient receives, before signing. Fee arithmetic must not be a surprise.
- Recipient defaults to the connected address but is editable — third-party payment is the point, not an edge case.
- Resolve ENS names in the recipient field, showing the resolved hex address before signing.
- The route list shows custody honestly: "Fast — custodial" vs "CCTP — trust-minimized".

## Chain switching

Rules from [CHAINS.md](CHAINS.md), restated because this is where the implementation lives:

1. Source chain is selected in the UI, not inherited from the wallet.
2. Prompt for the switch on click. Never auto-switch silently.
3. Disable signing while the wallet is on the wrong chain — a permit signed against the wrong domain is valid but unusable.
4. The destination requires no switch. Say so in the UI; it surprises people.
5. Unknown chain → offer `addChain` rather than an error.

## Realtime

`usePaymentStream` from [REALTIME.md](REALTIME.md). Subgraph for history and stats, polled every 30s. No polling of payment status.

## Docs route

The requirements in [SDK.md](SDK.md) are binding. Restated:

- Copy button on every code block.
- Complete runnable examples, imports included, no elisions.
- Sticky sidebar nav, one section per SDK method.
- Live values panel from `GET /chains`.
- "For agents" section above the fold with `llms.txt` and MCP config.
- Tabs: `pay`, `quote`, `watch`, MCP, x402.

Styling: JetBrains Mono for code, the `--of-line` border token on code blocks, offset shadow. Code blocks are the primary content — give them the visual weight the design system reserves for cards.

## Design system compliance

From [font-theme.md](font-theme.md), the rules most often violated:

- `var(--of-line)` for every border. Never `2px solid black`.
- Shadows have zero blur: `box-shadow: 6px 6px 0 var(--of-ink)`.
- No `border-radius` except `999px` pills.
- Headings constrained by `ch`, not px.
- Weights 600 and above only.
- `680px` is the primary breakpoint.
- Wrap the app in `.overflow-theme`.

## Required states

Every async surface needs loading, empty, and error states. A component rendering only its happy path is incomplete. The three most often skipped, and most often hit live: `wrong_network`, `failed`, and the empty dashboard.
