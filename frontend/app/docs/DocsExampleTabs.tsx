"use client";

import { useState } from "react";
import { CodeBlock } from "./CodeBlock";

const PAY_EXAMPLE = `import { Breeja } from "@breeja/sdk";

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

const QUOTE_EXAMPLE = `import { Breeja } from "@breeja/sdk";

const breeja = new Breeja({ apiKey: process.env.BREEJA_API_KEY! });

const quote = await breeja.quote({
  from: "base-sepolia",
  to: "arbitrum-sepolia",
  amount: "500.00",
});

for (const route of quote.routes) {
  console.log(route.type, route.feeAmount, route.estimatedSeconds, route.viable);
}

if (quote.recommended) {
  const payment = await breeja.pay({
    ...quote.recommended,
    from: "base-sepolia",
    to: "arbitrum-sepolia",
    amount: "500.00",
    recipient: "0xAbC0000000000000000000000000000000dEaD",
    signer: {
      type: "private-key",
      key: process.env.PAYER_PRIVATE_KEY as \`0x\${string}\`,
    },
  });
  console.log(payment.id, payment.status);
}
`;

const WATCH_EXAMPLE = `import { Breeja } from "@breeja/sdk";

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

const stop = breeja.watch(payment.id, (update) => {
  console.log("status:", update.status);

  if (update.status === "released") {
    console.log("settled", update.destTxHash);
    stop();
  }

  if (update.status === "failed") {
    console.log("failed", update.error);
    stop();
  }
});
`;

const MCP_EXAMPLE = `{
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

const X402_EXAMPLE = `import { Breeja } from "@breeja/sdk";
import type { ChainSlug, Payment } from "@breeja/sdk";

const breeja = new Breeja({ apiKey: process.env.BREEJA_API_KEY! });

// 1. Ask for the resource. No proof yet.
const first = await fetch("http://localhost:4021/resource");

if (first.status === 402) {
  const { accepts } = await first.json();
  // accepts: { amount, chain, recipient, proof: { header } }

  // 2. Settle the payment through Breeja — cross-chain, gasless.
  const payment: Payment = await breeja.pay({
    from: "base-sepolia" as ChainSlug,
    to: accepts.chain,
    amount: accepts.amount,
    recipient: accepts.recipient,
    signer: {
      type: "private-key",
      key: process.env.PAYER_PRIVATE_KEY as \`0x\${string}\`,
    },
  });

  // 3. Retry with the payment id as proof.
  const second = await fetch("http://localhost:4021/resource", {
    headers: { [accepts.proof.header]: payment.id },
  });

  console.log(await second.json());
}
`;

type TabId = "pay" | "quote" | "watch" | "mcp" | "x402";

interface Tab {
  id: TabId;
  label: string;
  code: string;
  language: string;
  filename: string;
  description: string;
}

const TABS: Tab[] = [
  {
    id: "pay",
    label: "pay",
    code: PAY_EXAMPLE,
    language: "ts",
    filename: "pay.ts",
    description: "One call: quote, sign, submit, and return once accepted.",
  },
  {
    id: "quote",
    label: "quote",
    code: QUOTE_EXAMPLE,
    language: "ts",
    filename: "quote.ts",
    description: "Inspect ranked routes before committing to one.",
  },
  {
    id: "watch",
    label: "watch",
    code: WATCH_EXAMPLE,
    language: "ts",
    filename: "watch.ts",
    description: "Push-style subscription to a payment's state transitions.",
  },
  {
    id: "mcp",
    label: "MCP",
    code: MCP_EXAMPLE,
    language: "json",
    filename: "mcp.json",
    description: "Drop into any MCP-speaking agent host's config.",
  },
  {
    id: "x402",
    label: "x402",
    code: X402_EXAMPLE,
    language: "ts",
    filename: "x402.ts",
    description: "An agent pays a 402-gated resource, cross-chain, then retries with proof.",
  },
];

export function DocsExampleTabs() {
  const [activeTab, setActiveTab] = useState<TabId>("pay");
  const active = TABS.find((tab) => tab.id === activeTab) ?? TABS[0];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tab.id === activeTab
                ? "bg-ink text-white"
                : "bg-badge-bg text-ink hover:opacity-80"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <p className="text-base text-body">{active.description}</p>
      <CodeBlock code={active.code} language={active.language} filename={active.filename} />
    </div>
  );
}
