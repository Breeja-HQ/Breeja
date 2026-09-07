import { isAddress } from "viem";

export interface PaymentAuthorization {
  validAfter: string;
  validBefore: string;
  nonce: string;
  v: number;
  r: string;
  s: string;
}

export interface PayRequestBody {
  fromChainId: number;
  toChainId: number;
  payer: string;
  recipient: string;
  amount: string;
  authorization?: PaymentAuthorization;
}

const SUPPORTED_SOURCE_CHAIN_IDS = [11155111, 84532];

export function isPositiveBigint(value: string): boolean {
  try {
    return BigInt(value) > 0n;
  } catch {
    return false;
  }
}

export function validatePayRequest(body: Partial<PayRequestBody>): string | null {
  if (typeof body.fromChainId !== "number") return "fromChainId is required and must be a number";
  if (!SUPPORTED_SOURCE_CHAIN_IDS.includes(body.fromChainId)) {
    return "fromChainId must be one of: 11155111 (Sepolia), 84532 (Base Sepolia)";
  }
  if (typeof body.toChainId !== "number") return "toChainId is required and must be a number";
  if (typeof body.payer !== "string" || !isAddress(body.payer)) return "payer must be a valid address";
  if (typeof body.recipient !== "string" || !isAddress(body.recipient)) return "recipient must be a valid address";
  if (typeof body.amount !== "string" || !isPositiveBigint(body.amount)) {
    return "amount must be a stringified positive integer";
  }
  if (body.authorization) {
    const auth = body.authorization;
    if (
      typeof auth.validAfter !== "string" ||
      typeof auth.validBefore !== "string" ||
      typeof auth.nonce !== "string" ||
      typeof auth.v !== "number" ||
      typeof auth.r !== "string" ||
      typeof auth.s !== "string"
    ) {
      return "authorization is malformed";
    }
  }
  return null;
}
