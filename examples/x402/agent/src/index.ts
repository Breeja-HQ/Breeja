import "dotenv/config";
import { Breeja } from "@breeja/sdk";
import type { ChainSlug, Payment } from "@breeja/sdk";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

const SERVER_URL = process.env.X402_SERVER_URL ?? "http://localhost:4021";
const AGENT_SOURCE_CHAIN: ChainSlug = "base-sepolia";
const PAYMENT_ID_HEADER = "x-payment-id";
const WATCH_TIMEOUT_MS = 180_000;

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

function waitForReleased(breeja: Breeja, paymentId: string): Promise<Payment> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      stop();
      reject(new Error(`Timed out waiting for payment ${paymentId} to settle`));
    }, WATCH_TIMEOUT_MS);

    const stop = breeja.watch(paymentId, (update) => {
      console.log(`[agent] payment ${paymentId} status: ${update.status}`);
      if (update.status === "released") {
        clearTimeout(timer);
        stop();
        resolve(update);
        return;
      }
      if (update.status === "failed") {
        clearTimeout(timer);
        stop();
        reject(new Error(`Payment ${paymentId} failed`));
      }
    });
  });
}

async function main() {
  const breejaApiKey = requireEnv("BREEJA_API_KEY");
  const agentPrivateKey = requireEnv("X402_AGENT_PRIVATE_KEY") as `0x${string}`;

  console.log(`[agent] GET ${SERVER_URL}/resource (no payment proof)`);
  const firstResponse = await fetch(`${SERVER_URL}/resource`);

  if (firstResponse.status !== 402) {
    throw new Error(`Expected 402 Payment Required, got ${firstResponse.status}`);
  }

  const paymentDetails = (await firstResponse.json()) as PaymentRequiredBody;
  console.log("[agent] received 402 Payment Required:");
  console.log(paymentDetails);

  const { amount, chain: destChain, recipient } = paymentDetails.accepts;

  const breeja = new Breeja({ apiKey: breejaApiKey });

  console.log(`[agent] paying ${amount} USDC from ${AGENT_SOURCE_CHAIN} to ${destChain} for recipient ${recipient}`);
  const payment = await breeja.pay({
    from: AGENT_SOURCE_CHAIN,
    to: destChain,
    amount,
    recipient,
    signer: { type: "private-key", key: agentPrivateKey },
  });

  console.log(`[agent] payment submitted: id=${payment.id} status=${payment.status}`);

  const released = payment.status === "released" ? payment : await waitForReleased(breeja, payment.id);

  console.log(`[agent] payment released: ${released.id}`);
  if (released.destExplorerUrl) {
    console.log(`[agent] dest explorer: ${released.destExplorerUrl}`);
  }

  console.log(`[agent] retrying GET ${SERVER_URL}/resource with proof of payment`);
  const secondResponse = await fetch(`${SERVER_URL}/resource`, {
    headers: { [PAYMENT_ID_HEADER]: released.id },
  });

  if (secondResponse.status !== 200) {
    const body = await secondResponse.text();
    throw new Error(`Expected 200 after payment, got ${secondResponse.status}: ${body}`);
  }

  const resource = (await secondResponse.json()) as unknown;
  console.log("");
  console.log("=".repeat(64));
  console.log("x402 flow complete. Resource server granted access after cross-chain settlement:");
  console.log(resource);
  console.log("=".repeat(64));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
