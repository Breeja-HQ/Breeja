import "dotenv/config";
import express, { type Request, type Response } from "express";
import { Breeja } from "@breeja/sdk";
import type { ChainSlug } from "@breeja/sdk";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

const PORT = Number(process.env.PORT ?? 4021);
const RESOURCE_PRICE_USDC = "0.10";
const RESOURCE_CHAIN: ChainSlug = "arbitrum-sepolia";
const PAYMENT_ID_HEADER = "x-payment-id";

const breejaApiKey = requireEnv("BREEJA_API_KEY");
const recipientAddress = requireEnv("X402_SERVER_RECIPIENT_ADDRESS") as `0x${string}`;

const breeja = new Breeja({ apiKey: breejaApiKey });

interface PaymentRequiredBody {
  error: "payment_required" | "payment_invalid";
  reason?: string;
  accepts: {
    amount: string;
    chain: ChainSlug;
    recipient: `0x${string}`;
    proof: {
      type: "breeja-payment-id";
      header: string;
    };
  };
}

function paymentRequiredBody(reason?: string): PaymentRequiredBody {
  return {
    error: reason ? "payment_invalid" : "payment_required",
    ...(reason ? { reason } : {}),
    accepts: {
      amount: RESOURCE_PRICE_USDC,
      chain: RESOURCE_CHAIN,
      recipient: recipientAddress,
      proof: {
        type: "breeja-payment-id",
        header: PAYMENT_ID_HEADER,
      },
    },
  };
}

const app = express();

app.get("/resource", async (req: Request, res: Response) => {
  const paymentId = req.header(PAYMENT_ID_HEADER) ?? (req.query.paymentId as string | undefined);

  if (!paymentId) {
    console.log("[server] GET /resource with no payment proof -> 402 Payment Required");
    res.status(402).json(paymentRequiredBody());
    return;
  }

  console.log(`[server] GET /resource with payment id ${paymentId} -> verifying with Breeja`);

  const payment = await breeja.status(paymentId).catch((error: unknown) => {
    console.log(`[server] status lookup failed for ${paymentId}: ${String(error)}`);
    return null;
  });

  if (!payment) {
    console.log(`[server] payment ${paymentId} not found -> 402`);
    res.status(402).json(paymentRequiredBody("Payment not found"));
    return;
  }

  if (payment.status !== "released") {
    console.log(`[server] payment ${paymentId} status is "${payment.status}", not "released" -> 402`);
    res.status(402).json(paymentRequiredBody(`Payment not yet settled (status: ${payment.status})`));
    return;
  }

  if (payment.recipient.toLowerCase() !== recipientAddress.toLowerCase()) {
    console.log(`[server] payment ${paymentId} recipient ${payment.recipient} does not match this server -> 402`);
    res.status(402).json(paymentRequiredBody("Payment was not made to this resource's recipient"));
    return;
  }

  // Check what the payer committed to (payment.amount), not payment.payoutAmount
  // — the relayer's routing fee is the cost of settlement, not a shortfall the
  // resource server should reject. The 402 response advertised "pay 0.10 USDC";
  // the payer did, exactly.
  if (Number(payment.amount) < Number(RESOURCE_PRICE_USDC)) {
    console.log(`[server] payment ${paymentId} amount ${payment.amount} is below price ${RESOURCE_PRICE_USDC} -> 402`);
    res.status(402).json(paymentRequiredBody("Payment amount is below the resource price"));
    return;
  }

  console.log(`[server] payment ${paymentId} verified (released, correct recipient, sufficient amount) -> 200`);
  res.status(200).json({
    data: "the secret resource content",
    paidVia: paymentId,
  });
});

app.listen(PORT, () => {
  console.log(`[server] x402 demo resource server listening on port ${PORT}`);
  console.log(`[server] paid resource: GET http://localhost:${PORT}/resource`);
  console.log(`[server] price: ${RESOURCE_PRICE_USDC} USDC on ${RESOURCE_CHAIN}, recipient ${recipientAddress}`);
});
