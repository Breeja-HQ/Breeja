import Anthropic from "@anthropic-ai/sdk";
import { formatUnits } from "viem";
import type { RouteDecision } from "./router.js";

const EXPLAIN_MODEL = "claude-haiku-4-5";
const EXPLAIN_TIMEOUT_MS = 5000;
const DEFAULT_TOKEN_DECIMALS = 6;
const DEFAULT_TOKEN_SYMBOL = "USDC";

interface ExplainContext {
  tokenSymbol?: string;
  tokenDecimals?: number;
  destChainName?: string;
}

const DEFAULT_DEST_CHAIN_NAME = "the destination chain";

const REJECTION_MESSAGES: Record<string, string> = {
  InsufficientLiquidity:
    "Bridge unavailable right now — the destination pool doesn't have enough liquidity for this amount.",
  PoolPaused: "Bridging is temporarily paused.",
  ZeroAmount: "This payment amount is too small to bridge.",
  ZeroRecipient: "A valid recipient address is required to bridge.",
};

function explainRejection(reason: string | undefined): string {
  if (reason && REJECTION_MESSAGES[reason]) {
    return REJECTION_MESSAGES[reason];
  }
  return "Bridge unavailable right now — this payment can't be routed.";
}

function templatedStatus(
  decision: RouteDecision,
  tokenSymbol: string,
  tokenDecimals: number,
  destChainName: string,
): string {
  const feeDisplay = formatUnits(decision.feeAmount, tokenDecimals);
  return `Bridged to ${destChainName} · fee ${feeDisplay} ${tokenSymbol} · ${decision.estimatedSeconds}s`;
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error("explain timeout")), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

async function generateLlmSummary(
  decision: RouteDecision,
  tokenSymbol: string,
  tokenDecimals: number,
  destChainName: string,
): Promise<string> {
  const client = new Anthropic();
  const feeDisplay = formatUnits(decision.feeAmount, tokenDecimals);
  const payoutDisplay = formatUnits(decision.payoutAmount, tokenDecimals);

  const response = await withTimeout(
    client.messages.create({
      model: EXPLAIN_MODEL,
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content:
            "Write one short, natural sentence for a UI status message summarizing a completed cross-chain bridge payment. " +
            "Use only these facts, do not invent anything: " +
            `bridged to ${destChainName}, fee ${feeDisplay} ${tokenSymbol}, payout ${payoutDisplay} ${tokenSymbol}, ` +
            `estimated time ${decision.estimatedSeconds} seconds. ` +
            `Style example: 'Routed to ${destChainName}, gas cost ~$0.02, fee 0.5 USDC, done in 8s.' ` +
            "Respond with only the sentence, no preamble or quotes.",
        },
      ],
    }),
    EXPLAIN_TIMEOUT_MS,
  );

  const textBlock = response.content.find((block) => block.type === "text");
  const text = textBlock && "text" in textBlock ? textBlock.text.trim() : "";
  if (!text) {
    throw new Error("empty LLM response");
  }
  return text;
}

/**
 * Every number the model states must trace back to the decision object.
 * Extract numerics from the generated text and check each one is a value
 * the decision actually produced — an LLM stating a wrong fee in a payments
 * UI is a correctness failure, not a style issue. See docs/AI_LAYER.md.
 */
export function isFaithful(text: string, decision: RouteDecision, tokenDecimals: number): boolean {
  const claimed = text.match(/\d+\.?\d*/g) ?? [];
  const allowed = new Set([
    formatUnits(decision.feeAmount, tokenDecimals),
    formatUnits(decision.payoutAmount, tokenDecimals),
    String(decision.estimatedSeconds),
  ]);
  return claimed.every((n) => allowed.has(n));
}

export async function explainRouteDecision(
  decision: RouteDecision,
  context?: ExplainContext,
): Promise<string> {
  if (!decision.viable) {
    return explainRejection(decision.reason);
  }

  const tokenSymbol = context?.tokenSymbol ?? DEFAULT_TOKEN_SYMBOL;
  const tokenDecimals = context?.tokenDecimals ?? DEFAULT_TOKEN_DECIMALS;
  const destChainName = context?.destChainName ?? DEFAULT_DEST_CHAIN_NAME;

  if (!process.env.ANTHROPIC_API_KEY) {
    return templatedStatus(decision, tokenSymbol, tokenDecimals, destChainName);
  }

  try {
    const generated = await generateLlmSummary(decision, tokenSymbol, tokenDecimals, destChainName);
    if (!isFaithful(generated, decision, tokenDecimals)) {
      return templatedStatus(decision, tokenSymbol, tokenDecimals, destChainName);
    }
    return generated;
  } catch {
    return templatedStatus(decision, tokenSymbol, tokenDecimals, destChainName);
  }
}
