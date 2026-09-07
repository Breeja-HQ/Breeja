import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import { CodeBlock } from "./CodeBlock";
import { DocsSidebar } from "./DocsSidebar";
import { DocsExampleTabs } from "./DocsExampleTabs";
import { LiveChainsPanel, LiveChainsPanelSkeleton } from "./LiveChainsPanel";
import { DOC_SECTIONS } from "./sections";

export const metadata: Metadata = {
  title: "Docs — Breeja SDK",
  description:
    "SDK documentation for agent developers: install, quote, pay, watch, MCP, and x402 examples for @breeja/sdk.",
};

const INSTALL_SNIPPET = `npm install @breeja/sdk`;

const QUICK_START_SNIPPET = `import { Breeja } from "@breeja/sdk";

const breeja = new Breeja({ apiKey: process.env.BREEJA_API_KEY! });

const payment = await breeja.pay({
  from: "base-sepolia",
  to: "arbitrum-sepolia",
  amount: "10.00",
  recipient: "0xAbC0000000000000000000000000000000dEaD",
  signer: {
    type: "private-key",
    key: process.env.PAYER_PRIVATE_KEY as \`0x\${string}\`,
  },
});

console.log(payment.id, payment.status, payment.destExplorerUrl);
`;

const CHAIN_REF_SNIPPET = `type ChainSlug =
  | "base-sepolia"
  | "arbitrum-sepolia"
  | "optimism-sepolia"
  | "hedera-testnet"
  | "arc-testnet"
  | "ethereum-sepolia";

type ChainRef = ChainSlug | number;
`;

const AMOUNTS_SNIPPET = `// Decimal strings in token units, never a JS number.
const amount = "10.00"; // ten USDC

await breeja.pay({
  from: "base-sepolia",
  to: "arbitrum-sepolia",
  amount,
  recipient: "0xAbC0000000000000000000000000000000dEaD",
  signer: { type: "private-key", key: process.env.PAYER_PRIVATE_KEY as \`0x\${string}\` },
});
`;

const SIGNERS_SNIPPET = `type Signer =
  | { type: "viem"; account: Account }
  | { type: "private-key"; key: \`0x\${string}\` }
  | { type: "custom"; address: \`0x\${string}\`; signTypedData: (data: TypedData) => Promise<\`0x\${string}\`> };
`;

const PRIVY_SIGNER_SNIPPET = `import { usePrivy, useSignTypedData, useWallets } from "@privy-io/react-auth";
import type { Signer, TypedData } from "@breeja/sdk";

// Wraps a Privy embedded wallet (email or social login, no extension) as
// the SDK's "custom" signer. The SDK never imports Privy — this hook is
// the only place that does.
function usePrivySigner(): Signer | null {
  const { wallets } = useWallets();
  const { signTypedData } = useSignTypedData();
  const wallet = wallets.find((w) => w.walletClientType === "privy") ?? wallets[0];
  if (!wallet) return null;

  return {
    type: "custom",
    address: wallet.address as \`0x\${string}\`,
    async signTypedData(data: TypedData) {
      const { signature } = await signTypedData(
        { domain: data.domain, types: data.types, primaryType: data.primaryType, message: data.message },
        { address: wallet.address },
      );
      return signature as \`0x\${string}\`;
    },
  };
}
`;

const QUOTE_SNIPPET = `const quote = await breeja.quote({
  from: "base-sepolia",
  to: "arbitrum-sepolia",
  amount: "500.00",
});

for (const route of quote.routes) {
  console.log(route.type, route.feeAmount, route.estimatedSeconds, route.viable);
}

console.log(quote.recommended); // routes[0] when viable, else null
`;

const ENS_PAY_SNIPPET = `import { Breeja } from "@breeja/sdk";

const breeja = new Breeja({ apiKey: process.env.BREEJA_API_KEY! });

// recipient can be an ENS name instead of a hex address. The SDK resolves
// it against ENS's real Universal Resolver on Ethereum mainnet before
// building the EIP-3009 authorization -- a live RPC call, never a guess.
const payment = await breeja.pay({
  from: "base-sepolia",
  to: "arbitrum-sepolia",
  amount: "10.00",
  recipient: "vitalik.eth",
  signer: {
    type: "private-key",
    key: process.env.PAYER_PRIVATE_KEY as \`0x\${string}\`,
  },
});

console.log(payment.recipient); // resolved 0x address, not the name
`;

const ENS_RESOLVE_SNIPPET = `import { resolveEnsName, resolveEnsAddress } from "@breeja/sdk";

// Forward: name -> address
const address = await resolveEnsName("vitalik.eth");
// 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

// Reverse: address -> primary name, for display ("paid to alice.eth"
// instead of a bare hex string). Returns null if no primary name is set.
const name = await resolveEnsAddress("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
// "vitalik.eth"
`;

const ENS_AGENT_IDENTITY_SNIPPET = `# Register an ENS name for an agent's payment address using the
# official ENS CLI (or app.ens.domains for a point-and-click flow).
npx @ensdomains/ens-cli register mytradingbot.eth \\
  --owner 0xYourAgentPaymentAddress \\
  --set-address 0xYourAgentPaymentAddress

# Once registered, the agent's Breeja payments resolve as mytradingbot.eth
# everywhere Breeja shows a recipient -- the widget, the payment tracker,
# and any breeja.history() output -- instead of a bare hex string.
`;

const STATUS_SNIPPET = `const payment = await breeja.status("pay_abc123");

console.log(payment.status); // "pending_deposit" | "deposit_confirmed" | "released" | "failed"
console.log(payment.sourceExplorerUrl, payment.destExplorerUrl);
`;

const WATCH_SNIPPET = `const stop = breeja.watch(payment.id, (update) => {
  if (update.status === "released") {
    console.log("settled", update.destTxHash);
    stop();
  }
});

// Call stop() any time to unsubscribe early — e.g. on component unmount.
`;

const HISTORY_SNIPPET = `// Not yet backed by the relayer — throws today, not a BreejaError.
// Do not catch it as a payment failure.
try {
  await breeja.history({ address: "0xAbC0000000000000000000000000000000dEaD" });
} catch (error) {
  console.log("history() is not yet implemented:", error);
}
`;

const CHAINS_METHOD_SNIPPET = `const chains = await breeja.chains();

for (const chain of chains) {
  console.log(chain.slug, chain.name, chain.poolLiquidity);
}

// Never hardcode a chain list — new chains appear here without an SDK upgrade.
`;

const ERRORS_SNIPPET = `import { Breeja, BreejaError } from "@breeja/sdk";

const breeja = new Breeja({ apiKey: process.env.BREEJA_API_KEY! });

try {
  await breeja.pay({
    from: "base-sepolia",
    to: "arbitrum-sepolia",
    amount: "10.00",
    recipient: "0xAbC0000000000000000000000000000000dEaD",
    signer: { type: "private-key", key: process.env.PAYER_PRIVATE_KEY as \`0x\${string}\` },
  });
} catch (error) {
  if (error instanceof BreejaError) {
    switch (error.code) {
      case "InsufficientLiquidity":
        console.log("pool too shallow right now, try cctp preference");
        break;
      case "PoolPaused":
        console.log("fast pool paused, retry later or use trustless preference");
        break;
      default:
        console.log(error.code, error.message);
    }
  } else {
    throw error;
  }
}
`;

const IDEMPOTENCY_SNIPPET = `// Safe to retry on network failure — same signed permit, same payment id,
// no double release.
async function payWithRetry(request: Parameters<typeof breeja.pay>[0]) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await breeja.pay(request);
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }
  throw new Error("unreachable");
}
`;

const MCP_CONFIG_SNIPPET = `{
  "mcpServers": {
    "breeja": {
      "command": "npx",
      "args": ["-y", "@breeja/mcp"],
      "env": {
        "BREEJA_API_KEY": "…",
        "BREEJA_SIGNER_KEY": "…",
        "BREEJA_MAX_PAYMENT_USDC": "50",
        "BREEJA_MAX_SESSION_USDC": "200"
      }
    }
  }
}
`;

const X402_SEQUENCE_SNIPPET = `Agent                    Resource server              Breeja
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
`;

const MCP_TOOLS = [
  { tool: "breeja_quote", purpose: "Ranked routes for a payment", mutating: false },
  { tool: "breeja_pay", purpose: "Execute a cross-chain payment — moves real funds", mutating: true },
  { tool: "breeja_status", purpose: "State of one payment", mutating: false },
  { tool: "breeja_history", purpose: "Past payments for an address (not yet backed)", mutating: false },
  { tool: "breeja_chains", purpose: "Supported chains and liquidity", mutating: false },
];

function SectionHeading({ id, title }: { id: string; title: string }) {
  return (
    <h2 id={id} className="scroll-mt-24 text-2xl md:text-3xl font-bold tracking-tight text-ink">
      {title}
    </h2>
  );
}

export default function DocsPage() {
  return (
    <div className="flex flex-col flex-1 bg-surface">
      <Nav />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-12 md:py-16">
          <div className="max-w-[68ch]">
            <span className="inline-flex items-center rounded-full bg-badge-bg px-4 py-1.5 text-base font-medium text-accent">
              Docs
            </span>
            <h1 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight text-ink">
              @breeja/sdk
            </h1>
            <p className="mt-4 text-lg text-body">
              Cross-chain USDC settlement for people and agents. One call quotes a
              route, signs a gasless permit, and submits — no permits, nonces,
              chain IDs, or gas to reason about.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-10">
            <aside className="hidden lg:block">
              <DocsSidebar sections={DOC_SECTIONS} />
            </aside>

            <div className="flex flex-col gap-16 min-w-0">
              <section id="for-agents" className="scroll-mt-24 flex flex-col gap-4">
                <SectionHeading id="for-agents-heading" title="For agents" />
                <p className="max-w-[68ch] text-base text-body">
                  Everything on this page is machine-readable in one fetch, and the
                  same rail is reachable over MCP for any agent host that speaks it.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="rounded-xl border border-border bg-white p-6 flex flex-col gap-3">
                    <span className="font-mono text-sm font-semibold text-ink">llms.txt</span>
                    <p className="text-base text-body">
                      The full API surface — SDK, HTTP API, MCP, x402 — in one
                      machine-readable file, published at the docs root.
                    </p>
                    <a
                      href="/llms.txt"
                      className="mt-auto inline-flex items-center gap-1.5 text-base font-medium text-accent hover:opacity-80 transition-opacity"
                    >
                      /llms.txt &rarr;
                    </a>
                  </div>
                  <div className="rounded-xl border border-border bg-white p-6 flex flex-col gap-3">
                    <span className="font-mono text-sm font-semibold text-ink">MCP server</span>
                    <p className="text-base text-body">
                      <code className="font-mono">@breeja/mcp</code> exposes quote, pay,
                      status, history, and chains as MCP tools with spend caps.
                    </p>
                    <a
                      href="#mcp"
                      className="mt-auto inline-flex items-center gap-1.5 text-base font-medium text-accent hover:opacity-80 transition-opacity"
                    >
                      Jump to MCP config &rarr;
                    </a>
                  </div>
                </div>
              </section>

              <section id="install" className="scroll-mt-24 flex flex-col gap-4">
                <SectionHeading id="install-heading" title="Install" />
                <CodeBlock code={INSTALL_SNIPPET} language="bash" filename="terminal" />
              </section>

              <section id="quick-start" className="scroll-mt-24 flex flex-col gap-4">
                <SectionHeading id="quick-start-heading" title="Quick start" />
                <p className="max-w-[68ch] text-base text-body">
                  <code className="font-mono">pay</code> internally quotes routes,
                  selects one, builds the EIP-3009 typed data, requests a signature
                  from <code className="font-mono">signer</code>, posts to the
                  relayer, and returns once accepted.
                </p>
                <CodeBlock code={QUICK_START_SNIPPET} language="ts" filename="quickstart.ts" />
              </section>

              <section id="chains" className="scroll-mt-24 flex flex-col gap-4">
                <SectionHeading id="chains-heading" title="Chains" />
                <p className="max-w-[68ch] text-base text-body">
                  Accept both human slugs and numeric chain IDs. Slugs are stable
                  across environments; chain IDs are not.
                </p>
                <CodeBlock code={CHAIN_REF_SNIPPET} language="ts" filename="types.ts" />
              </section>

              <section id="amounts" className="scroll-mt-24 flex flex-col gap-4">
                <SectionHeading id="amounts-heading" title="Amounts" />
                <p className="max-w-[68ch] text-base text-body">
                  Decimal strings in token units — <code className="font-mono">&quot;10.00&quot;</code> is
                  ten USDC. Never a JavaScript number; floating-point money is a
                  correctness bug, not a style preference.
                </p>
                <CodeBlock code={AMOUNTS_SNIPPET} language="ts" filename="amounts.ts" />
              </section>

              <section id="quote" className="scroll-mt-24 flex flex-col gap-4">
                <SectionHeading id="quote-heading" title="quote()" />
                <p className="max-w-[68ch] text-base text-body">
                  Ranked viable routes with fees and ETAs, backed by{" "}
                  <code className="font-mono">POST /quote</code>.{" "}
                  <code className="font-mono">quote.routes</code> is ordered
                  best-first under the caller&apos;s preference;{" "}
                  <code className="font-mono">quote.recommended</code> is{" "}
                  <code className="font-mono">routes[0]</code> when viable.
                </p>
                <CodeBlock code={QUOTE_SNIPPET} language="ts" filename="quote.ts" />
              </section>

              <section id="pay" className="scroll-mt-24 flex flex-col gap-4">
                <SectionHeading id="pay-heading" title="pay()" />
                <p className="max-w-[68ch] text-base text-body">
                  Sign and submit a payment, backed by{" "}
                  <code className="font-mono">POST /pay</code>. Idempotent on the
                  EIP-3009 nonce.
                </p>
                <CodeBlock code={QUICK_START_SNIPPET} language="ts" filename="pay.ts" />
              </section>

              <section id="signers" className="scroll-mt-24 flex flex-col gap-4">
                <SectionHeading id="signers-heading" title="Signers" />
                <p className="max-w-[68ch] text-lg text-body">
                  <code className="font-mono">pay()</code> takes a{" "}
                  <code className="font-mono">signer</code>, not a raw key wherever
                  that can be avoided. The <code className="font-mono">custom</code>{" "}
                  variant is a plain function, so any wallet or key-management
                  backend can plug in without the SDK depending on it.
                </p>
                <CodeBlock code={SIGNERS_SNIPPET} language="ts" filename="types.ts" />
                <div className="rounded-xl border border-border bg-badge-bg/40 p-6 flex flex-col gap-3">
                  <span className="font-mono text-sm font-semibold text-ink">Privy embedded wallets</span>
                  <p className="text-lg text-body">
                    Breeja&apos;s own <code className="font-mono">/pay</code> widget
                    uses this to let a user pay by signing in with email or a
                    social account instead of installing a browser extension.
                    Privy issues an embedded wallet on login;{" "}
                    <code className="font-mono">useSignTypedData</code> from{" "}
                    <code className="font-mono">@privy-io/react-auth</code> signs
                    the same EIP-3009{" "}
                    <code className="font-mono">TransferWithAuthorization</code>{" "}
                    payload the widget already builds for a browser-extension
                    wallet, wrapped as a <code className="font-mono">custom</code>{" "}
                    signer.
                  </p>
                  <CodeBlock code={PRIVY_SIGNER_SNIPPET} language="ts" filename="usePrivySigner.ts" />
                </div>
              </section>

              <section id="ens" className="scroll-mt-24 flex flex-col gap-4">
                <SectionHeading id="ens-heading" title="ENS resolution" />
                <p className="max-w-[68ch] text-lg text-body">
                  Pass an ENS name as <code className="font-mono">recipient</code> in{" "}
                  <code className="font-mono">pay()</code> or <code className="font-mono">quote()</code> and
                  the SDK resolves it to an address before building the EIP-3009
                  authorization. Resolution is a real RPC call against ENS&apos;s
                  Universal Resolver on Ethereum mainnet (the same resolver
                  architecture ENSv2 formalizes) -- it never runs through model
                  output. The widget and the SDK share this one implementation, so
                  a name that resolves in the SDK resolves the same way in the
                  payment widget.
                </p>
                <CodeBlock code={ENS_PAY_SNIPPET} language="ts" filename="pay-with-ens.ts" />
                <p className="max-w-[68ch] text-lg text-body">
                  <code className="font-mono">resolveEnsName</code> and{" "}
                  <code className="font-mono">resolveEnsAddress</code> are also exported
                  standalone, for a frontend or an agent that wants to resolve without
                  paying. Reverse resolution (address to primary name) is what powers
                  &quot;paid to alice.eth&quot; wherever Breeja shows a payment recipient --
                  the raw address stays visible alongside it, never hidden.
                </p>
                <CodeBlock code={ENS_RESOLVE_SNIPPET} language="ts" filename="resolve.ts" />
                <div className="rounded-xl border border-border bg-badge-bg/40 p-6 flex flex-col gap-3">
                  <span className="font-mono text-sm font-semibold text-ink">Agent identity</span>
                  <p className="text-lg text-body">
                    The stronger play is treating an ENS name as an agent&apos;s
                    identity: register a name for the agent&apos;s payment address so
                    agent-to-agent payments address <code className="font-mono">mytradingbot.eth</code> rather
                    than a hex string. Register today with the official{" "}
                    <a
                      href="https://github.com/ensdomains/ens-cli"
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-accent hover:opacity-80"
                    >
                      ENS CLI
                    </a>{" "}
                    or through{" "}
                    <a
                      href="https://app.ens.domains"
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-accent hover:opacity-80"
                    >
                      app.ens.domains
                    </a>{" "}
                    if you prefer a UI. Point the name&apos;s address record at the
                    agent&apos;s Breeja payment address, and every Breeja surface that
                    reverse-resolves a recipient will show the name from then on.
                  </p>
                  <CodeBlock code={ENS_AGENT_IDENTITY_SNIPPET} language="bash" filename="register-agent-identity.sh" />
                  <p className="text-lg text-body">
                    This build resolves against Ethereum mainnet&apos;s live ENS
                    registry through ENS&apos;s Universal Resolver, the same proxy
                    address ENSv2 deploys behind on both mainnet and Sepolia. ENSv2
                    itself is live in beta on Sepolia today (contracts verified
                    on-chain against{" "}
                    <a
                      href="https://github.com/ensdomains/contracts-v2"
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-accent hover:opacity-80"
                    >
                      ensdomains/contracts-v2
                    </a>
                    ) but has not yet reached mainnet, so production resolution here
                    targets the real, currently-live registry rather than a beta
                    namespace that could change before launch.
                  </p>
                </div>
              </section>

              <section id="status" className="scroll-mt-24 flex flex-col gap-4">
                <SectionHeading id="status-heading" title="status()" />
                <p className="max-w-[68ch] text-base text-body">
                  One-shot current state, backed by{" "}
                  <code className="font-mono">GET /status/:id</code>.
                </p>
                <CodeBlock code={STATUS_SNIPPET} language="ts" filename="status.ts" />
              </section>

              <section id="watch" className="scroll-mt-24 flex flex-col gap-4">
                <SectionHeading id="watch-heading" title="watch()" />
                <p className="max-w-[68ch] text-base text-body">
                  Subscribe to transitions; returns an unsubscribe function. Push,
                  not poll — an agent does not burn a loop waiting.
                </p>
                <CodeBlock code={WATCH_SNIPPET} language="ts" filename="watch.ts" />
              </section>

              <section id="history" className="scroll-mt-24 flex flex-col gap-4">
                <SectionHeading id="history-heading" title="history()" />
                <p className="max-w-[68ch] text-base text-body">
                  Past payments by address, backed by a subgraph.{" "}
                  <strong className="font-semibold text-ink">
                    Not yet backed by the relayer
                  </strong>{" "}
                  — it throws today. This is a missing feature, not a payment
                  failure; do not catch it as a{" "}
                  <code className="font-mono">BreejaError</code>.
                </p>
                <CodeBlock code={HISTORY_SNIPPET} language="ts" filename="history.ts" />
              </section>

              <section id="chains-method" className="scroll-mt-24 flex flex-col gap-4">
                <SectionHeading id="chains-method-heading" title="chains()" />
                <p className="max-w-[68ch] text-base text-body">
                  Supported chains, tokens, and live liquidity, backed by{" "}
                  <code className="font-mono">GET /chains</code>. Discoverable at
                  runtime — an agent must not hardcode a chain list.
                </p>
                <CodeBlock code={CHAINS_METHOD_SNIPPET} language="ts" filename="chains.ts" />
              </section>

              <section id="errors" className="scroll-mt-24 flex flex-col gap-4">
                <SectionHeading id="errors-heading" title="Errors" />
                <p className="max-w-[68ch] text-base text-body">
                  Codes are stable and match the relayer&apos;s rejection reasons and
                  the Solidity custom errors. Branch on{" "}
                  <code className="font-mono">code</code>, never on message text.
                </p>
                <CodeBlock code={ERRORS_SNIPPET} language="ts" filename="errors.ts" />
              </section>

              <section id="idempotency" className="scroll-mt-24 flex flex-col gap-4">
                <SectionHeading id="idempotency-heading" title="Idempotency" />
                <p className="max-w-[68ch] text-base text-body">
                  <code className="font-mono">pay</code> is idempotent on the
                  EIP-3009 nonce. Calling it twice with the same signed permit
                  returns the same payment id and does not double-release. Agents
                  retrying on network failure are the expected case.
                </p>
                <CodeBlock code={IDEMPOTENCY_SNIPPET} language="ts" filename="idempotency.ts" />
              </section>

              <section id="mcp" className="scroll-mt-24 flex flex-col gap-4">
                <SectionHeading id="mcp-heading" title="MCP" />
                <p className="max-w-[68ch] text-base text-body">
                  <code className="font-mono">@breeja/mcp</code> exposes the rail to
                  any MCP-speaking agent — the concrete &quot;an AI agent pays another
                  agent&quot; demonstration.
                </p>
                <CodeBlock code={MCP_CONFIG_SNIPPET} language="json" filename="mcp-config.json" />
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-badge-bg/40">
                        <th className="px-4 py-3 font-semibold text-ink">Tool</th>
                        <th className="px-4 py-3 font-semibold text-ink">Purpose</th>
                        <th className="px-4 py-3 font-semibold text-ink">Mutating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MCP_TOOLS.map((row) => (
                        <tr key={row.tool} className="border-b border-border last:border-b-0">
                          <td className="px-4 py-3 font-mono text-ink">{row.tool}</td>
                          <td className="px-4 py-3 text-body">{row.purpose}</td>
                          <td className="px-4 py-3">
                            {row.mutating ? (
                              <span className="rounded-full bg-badge-bg px-2.5 py-1 font-mono text-xs text-accent">
                                yes
                              </span>
                            ) : (
                              <span className="text-body">no</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="max-w-[68ch] text-base text-body">
                  <code className="font-mono">breeja_pay</code> states plainly that it
                  moves real funds, returns explorer URLs, and enforces both a
                  per-call and a per-session cumulative spend cap read from{" "}
                  <code className="font-mono">BREEJA_MAX_PAYMENT_USDC</code> /{" "}
                  <code className="font-mono">BREEJA_MAX_SESSION_USDC</code>.
                  Read-only tools are annotated{" "}
                  <code className="font-mono">readOnlyHint: true</code> so a host can
                  auto-approve them without auto-approving spending.
                </p>
              </section>

              <section id="x402" className="scroll-mt-24 flex flex-col gap-4">
                <SectionHeading id="x402-heading" title="x402" />
                <p className="max-w-[68ch] text-base text-body">
                  <code className="font-mono">POST /pay</code> sits behind an x402
                  flow: an agent requests a paid resource, receives{" "}
                  <code className="font-mono">402 Payment Required</code> with
                  payment details, settles through Breeja, and retries with proof.
                  Cross-chain settlement is the differentiator — the agent holds
                  funds on one chain, the resource server is paid on another, and
                  neither side handles gas.
                </p>
                <CodeBlock code={X402_SEQUENCE_SNIPPET} language="text" filename="sequence" />
                <p className="max-w-[68ch] text-base text-body">
                  The resource server verifies via{" "}
                  <code className="font-mono">breeja.status(paymentId)</code> that the
                  payment is <code className="font-mono">released</code>, paid to its
                  own address, and meets the price — it never trusts the id alone.
                  Full runnable demo:{" "}
                  <code className="font-mono">examples/x402/</code> (
                  <code className="font-mono">server/</code> and{" "}
                  <code className="font-mono">agent/</code>).
                </p>
              </section>

              <section id="live-chains" className="scroll-mt-24 flex flex-col gap-4">
                <SectionHeading id="live-chains-heading" title="Live chains" />
                <p className="max-w-[68ch] text-base text-body">
                  Read live from <code className="font-mono">GET /chains</code> —
                  what the SDK&apos;s <code className="font-mono">chains()</code>{" "}
                  method returns right now, so the examples above reflect reality.
                </p>
                <Suspense fallback={<LiveChainsPanelSkeleton />}>
                  <LiveChainsPanel />
                </Suspense>
              </section>

              <section id="examples" className="scroll-mt-24 flex flex-col gap-4">
                <SectionHeading id="examples-heading" title="Examples" />
                <p className="max-w-[68ch] text-base text-body">
                  Complete, runnable examples — pick a tab.
                </p>
                <DocsExampleTabs />
              </section>

              <div className="rounded-xl border border-border bg-badge-bg/40 p-6 flex flex-col gap-2">
                <span className="font-mono text-sm font-semibold text-ink">
                  Deep link to one method
                </span>
                <p className="text-base text-body">
                  Every section above also has its own URL, e.g.{" "}
                  <Link href="/docs/pay" className="font-medium text-accent hover:opacity-80">
                    /docs/pay
                  </Link>{" "}
                  or{" "}
                  <Link href="/docs/watch" className="font-medium text-accent hover:opacity-80">
                    /docs/watch
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
