# Conventions

> Audience: coding agents first, humans second. All generated code MUST follow this document.

## Comments

Write almost none. The existing codebase is nearly comment-free and that is deliberate.

Permitted:
- A comment explaining *why* a non-obvious constraint exists.
- `// slither-disable-next-line <rule> -- <reason>` suppressions.

Forbidden:
- Restating what the code does.
- Section banners, decorative separators, JSDoc on obvious functions.
- `// TODO` left in delivered code.

Correct, from `SourceVault.sol`:

```solidity
// slither-disable-next-line arbitrary-send-erc20 -- relayer-gated by NotRelayer; payer must have pre-approved this vault
token.safeTransferFrom(payer, address(this), amount);
```

Incorrect:

```ts
// Get the gas price
const gasPrice = await client.getGasPrice();
```

A comment that survives review states something the reader could not derive from the code.

## TypeScript

- ESM throughout. Relative imports carry the `.js` extension: `import { decideRoute } from "../agent/router.js";`
- Named exports only. No default exports.
- Typed addresses: `` `0x${string}` ``, never bare `string`.
- `bigint` for every token amount and chain value. Never `number`. Never floating point on money.
- Interfaces for object shapes, `type` for unions.
- Discriminated unions for state, following the existing `PaymentStatus` pattern — each state carries exactly the fields valid in that state.
- No `any`. Where viem's generics resist, narrow with an explicit cast and keep it local.
- Env access through a `requireEnv(name: string): string` helper that throws on missing. Never `process.env.X!`.
- Module-scope constants in `SCREAMING_SNAKE_CASE`, declared at the top of the file.
- Early return over nested conditionals.

Shape to follow:

```ts
const SUPPORTED_CHAIN_IDS = [8453, 42161, 10] as const;

export interface RouteRequest {
  payer: `0x${string}`;
  recipient: `0x${string}`;
  amount: bigint;
  fromChainId: number;
  toChainId: number;
}

export async function decideRoute(request: RouteRequest): Promise<RouteDecision> {
  if (!SUPPORTED_CHAIN_IDS.includes(request.fromChainId)) {
    return rejection("UnsupportedSourceChain");
  }
  ...
}
```

## Errors

- Return typed rejection objects from routing and validation. Do not throw for expected outcomes.
- Throw only for programmer error and unrecoverable I/O.
- Error reasons are `PascalCase` string literals matching the Solidity custom errors: `InsufficientLiquidity`, `PoolPaused`, `UnsupportedSourceChain`.
- Never surface a raw `String(error)` to an API caller. Map to a known reason; log the detail server-side.

## Solidity

- Pin `pragma solidity 0.8.24;` exactly in deployed contracts.
- Custom errors, never `require` strings.
- Checks-Effects-Interactions. `nonReentrant` on anything moving tokens.
- `immutable` for constructor-set values that never change.
- `SafeERC20` for every transfer.
- Events past-tense: `Released`, `PaymentRequested`.
- Every state-changing external function emits an event.

## React / Next.js

- App Router. Server Components by default; `"use client"` only where hooks or browser APIs are needed.
- One component per file, named export, filename matches component.
- Co-locate in `app/components/`.
- Hooks in `lib/hooks/`, prefixed `use`.
- No CSS-in-JS. The design system in [font-theme.md](font-theme.md) is authoritative — use `var(--of-line)` for every border, never `2px solid black`.
- Loading, empty, and error states are required for every async surface. A component that renders only its happy path is incomplete.

## API

- Routes are verb-explicit: `POST /pay`, `POST /quote`, `GET /status/:id`, `GET /events/:id`.
- Validate the full request body before any side effect. Return `400` with a specific message naming the offending field.
- `202` for accepted async work, with an id the caller can track.
- `422` for a well-formed request that cannot be routed, with the decision object attached.
- Serialize `bigint` as decimal strings. Never `JSON.stringify` a raw bigint.
- Idempotency keyed on the EIP-3009 nonce on every mutating endpoint.

## Naming

| Thing | Convention | Example |
|---|---|---|
| Files (TS) | camelCase | `routeScoring.ts` |
| Files (components) | PascalCase | `BridgeWidget.tsx` |
| Files (contracts) | PascalCase | `DestPool.sol` |
| Functions | camelCase, verb-first | `decideRoute`, `submitRelease` |
| Booleans | `is`/`has`/`can` prefix | `isViable`, `hasSufficientLiquidity` |
| Async | no `Async` suffix | `getGasPrice` |
| Chain modules | one per chain, camelCase | `chains/baseSepolia.ts` |

## Testing

- Foundry for contracts. Every custom error path gets a test.
- Vitest for the relayer. Pure functions first: `computeFee`, `decideRoute` rejection branches, request validation, route scoring.
- No mocking of chain clients in unit tests — extract pure logic so it does not need them.
- Integration tests live in `scripts/` and hit real testnets, following the existing `test-round-trip.ts` pattern.

## Copy

- Never claim more than the system does. "AI-routed" is only accurate once routing genuinely chooses between routes.
- State custody plainly wherever a user commits funds.
- No em-dash-heavy marketing voice in UI strings. Short, factual, lowercase-ish status text as in the existing mono status bars.
