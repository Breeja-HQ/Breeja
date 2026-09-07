# AI layer

> Audience: coding agents first, humans second.

Defines where models are permitted to act, where they are forbidden, and how agents consume Breeja.

## The boundary

Non-negotiable, and the reason the product is defensible:

| Stage | Deterministic | LLM |
|---|---|---|
| Parse natural-language intent | — | permitted |
| Validate parsed request | required | forbidden |
| Select route | required | forbidden |
| Compute fee | required | forbidden |
| Authorize release | required | forbidden |
| Explain the decision | — | permitted |

**No model output may influence where money goes or how much moves.** An LLM sits on either side of the decision, never inside it.

v1 overclaimed: the README said "AI-routed" when the only model call rewrote a status string. Do not repeat that. The claim becomes true when the router genuinely chooses between fast pool and CCTP, and when agents call the rail. State exactly what is implemented.

## Intent parsing

Input: `"send 50 usdc to alice.eth on arbitrum, cheapest way"`

Output: a structured `PayRequest`, or a clarification request.

```ts
interface ParsedIntent {
  amount?: string;
  token?: string;
  recipient?: string;
  toChain?: ChainRef;
  fromChain?: ChainRef;
  preference?: "fast" | "cheap" | "trustless";
  missing: string[];
  ambiguous: string[];
}
```

Requirements:

- Return the structured object only. Never let the parser trigger a payment.
- Unresolved fields go in `missing`; the caller asks the user. Never infer an amount or a recipient.
- ENS names are resolved by the resolver, not the model. A model that hallucinates an address sends funds to a stranger.
- The parsed request passes through the same validation as any API call. No trusted path.

## Explanation

Post-decision prose for the UI. Extends the existing `explain.ts` pattern.

Hard requirement, new in v2: **validate every number in the output against the decision object.** Extract numerics from the generated string; if any value is absent from the decision, discard the output and use the template. An LLM stating a wrong fee in a payments UI is a correctness failure.

```ts
function isFaithful(text: string, decision: RouteDecision): boolean {
  const claimed = text.match(/\d+\.?\d*/g) ?? [];
  const allowed = new Set([
    formatUnits(decision.feeAmount, decimals),
    formatUnits(decision.payoutAmount, decimals),
    String(decision.estimatedSeconds),
  ]);
  return claimed.every((n) => allowed.has(n));
}
```

Also required: 5s timeout, template fallback on any error, and no model call on the rejection path — rejections are a fixed map.

## MCP server

`@breeja/mcp` exposes the rail to any MCP-speaking agent. This is the concrete "an AI agent pays another agent" demonstration.

```json
{
  "mcpServers": {
    "breeja": {
      "command": "npx",
      "args": ["-y", "@breeja/mcp"],
      "env": { "BREEJA_API_KEY": "…", "BREEJA_SIGNER_KEY": "…" }
    }
  }
}
```

Tools:

| Tool | Purpose | Mutating |
|---|---|---|
| `breeja_quote` | Ranked routes for a payment | no |
| `breeja_pay` | Execute a cross-chain payment | **yes** |
| `breeja_status` | State of one payment | no |
| `breeja_history` | Past payments for an address | no |
| `breeja_chains` | Supported chains and liquidity | no |

Requirements for `breeja_pay`:

- Description states plainly that it moves real funds.
- Returns explorer URLs so a human can verify.
- Respects a configured per-call and per-session spend cap. An agent with an unbounded payment tool is a liability.
- Read-only tools are annotated as such so hosts can auto-approve them without auto-approving spending.

## x402

`POST /pay` sits behind an x402 flow: an agent requests a paid resource, receives `402 Payment Required` with payment details, settles through Breeja, and retries with proof.

```
Agent                    Resource server              Breeja
  │  GET /resource              │                       │
  │ ───────────────────────────>│                       │
  │  402 + payment details      │                       │
  │ <───────────────────────────│                       │
  │  pay()                                              │
  │ ───────────────────────────────────────────────────>│
  │  payment id + proof                                 │
  │ <───────────────────────────────────────────────────│
  │  GET /resource + proof      │                       │
  │ ───────────────────────────>│                       │
  │  200 + resource             │                       │
  │ <───────────────────────────│                       │
```

Ship a working demo of both sides: a 402-gated endpoint and an agent that pays it. Cross-chain settlement is the differentiator — the agent holds funds on one chain, the resource server is paid on another, and neither side handles gas.

## Agent identity

An agent paying another agent needs both to be addressable. ENS provides this: an agent's payment address published as an ENS name, resolved at payment time.

Constraint: resolution happens in code against the registry. Model output is never treated as an address.

## What to claim

Accurate once built:

- "Agents settle cross-chain payments through an SDK, an MCP server, and x402."
- "Routing is deterministic; the LLM parses intent and explains decisions, and is validated against the decision object."
- "The same rail serves a human in a browser and an autonomous agent with no browser."

Do not claim autonomous financial decision-making, an LLM choosing routes, or agent custody of funds. None of those are true, and each is checkable in about thirty seconds of reading the source.
