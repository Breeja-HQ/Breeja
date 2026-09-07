"use client";

import { useState } from "react";

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
}

export function CodeBlock({ code, language = "ts", filename }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-ink overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <span className="font-mono text-xs text-white/50">
          {filename ?? language}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-full bg-white/10 px-3 py-1 font-mono text-xs font-medium text-white hover:bg-white/20 transition-colors"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-4">
        <code className="font-mono text-[13px] leading-relaxed text-white/90 whitespace-pre">
          {code}
        </code>
      </pre>
    </div>
  );
}
