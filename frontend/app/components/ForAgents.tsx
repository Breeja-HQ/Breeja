import Link from "next/link";

const SDK_SNIPPET = `import { Breeja } from "@breeja/sdk";

const breeja = new Breeja({ apiKey: process.env.BREEJA_API_KEY });

const payment = await breeja.pay({
  from: "base-sepolia",
  to: "arbitrum-sepolia",
  amount: "10.00",
  recipient: "0xAbC0000000000000000000000000000000dEaD",
  signer: account,
});

console.log(payment.id, payment.status);`;

const MCP_SNIPPET = `{
  "mcpServers": {
    "breeja": {
      "command": "npx",
      "args": ["-y", "@breeja/mcp"],
      "env": {
        "BREEJA_API_KEY": "your-api-key",
        "BREEJA_SIGNER_KEY": "0xyour-signer-key"
      }
    }
  }
}`;

function TerminalPanel({ title, code }: { title: string; code: string }) {
  return (
    <div className="rounded-xl border border-border bg-ink overflow-hidden shadow-lg">
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-5 py-3.5">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        <span className="ml-3 font-mono text-sm text-white/50">{title}</span>
      </div>
      <pre className="overflow-x-auto px-6 py-6 font-mono text-base leading-relaxed text-white/90">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function ForAgents() {
  return (
    <section id="for-agents" className="w-full bg-surface py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex items-center rounded-full bg-badge-bg px-5 py-2 text-lg font-medium text-accent">
            For agents
          </span>
          <h2 className="mt-4 text-5xl md:text-6xl font-bold tracking-tight text-ink">
            One call, no gas, no permits to reason about
          </h2>
          <p className="mt-4 max-w-2xl text-xl text-body leading-relaxed">
            Install the SDK or point an MCP-speaking agent at the server.
            Either way, quoting, signing, and submission happen inside the
            call.
          </p>
        </div>

        <div className="mt-6 flex justify-center">
          <code className="rounded-full border border-border bg-white px-6 py-2.5 font-mono text-base text-ink">
            npm install @breeja/sdk
          </code>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TerminalPanel title="sdk.ts" code={SDK_SNIPPET} />
          <TerminalPanel title="mcp-config.json" code={MCP_SNIPPET} />
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            href="/docs"
            className="bg-accent text-white rounded-full px-8 py-4 text-xl font-medium hover:opacity-90 transition-opacity"
          >
            Read the docs
          </Link>
        </div>
      </div>
    </section>
  );
}
