import { BreejaError } from "@breeja/sdk";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export function textResult(payload: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

export function errorResult(message: string, details?: unknown): CallToolResult {
  const text = details === undefined ? message : `${message}\n${JSON.stringify(details, null, 2)}`;
  return { content: [{ type: "text", text }], isError: true };
}

export function toToolError(error: unknown): CallToolResult {
  if (error instanceof BreejaError) {
    return errorResult(`Breeja error [${error.code}]: ${error.message}`, error.details);
  }
  if (error instanceof Error) {
    return errorResult(`Unexpected error: ${error.message}`);
  }
  return errorResult("Unexpected error", error);
}
