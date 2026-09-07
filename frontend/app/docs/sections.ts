export interface DocSection {
  id: string;
  title: string;
}

export const DOC_SECTIONS: DocSection[] = [
  { id: "for-agents", title: "For agents" },
  { id: "install", title: "Install" },
  { id: "quick-start", title: "Quick start" },
  { id: "chains", title: "Chains" },
  { id: "amounts", title: "Amounts" },
  { id: "quote", title: "quote()" },
  { id: "pay", title: "pay()" },
  { id: "signers", title: "Signers" },
  { id: "ens", title: "ENS resolution" },
  { id: "status", title: "status()" },
  { id: "watch", title: "watch()" },
  { id: "history", title: "history()" },
  { id: "chains-method", title: "chains()" },
  { id: "errors", title: "Errors" },
  { id: "idempotency", title: "Idempotency" },
  { id: "mcp", title: "MCP" },
  { id: "x402", title: "x402" },
  { id: "live-chains", title: "Live chains" },
  { id: "examples", title: "Examples" },
];

export function isDocSectionId(value: string): boolean {
  return DOC_SECTIONS.some((section) => section.id === value);
}
