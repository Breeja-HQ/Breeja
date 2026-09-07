import { randomUUID } from "node:crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import { decideRoute, quoteRoutes, type RouteDecision } from "../agent/router.js";
import { explainRouteDecision } from "../agent/explain.js";
import { getChainName, listChainInfo } from "../chains/chainIds.js";
import { validatePayRequest, validateQuoteRequest, type PayRequestBody, type QuoteRequestBody } from "./validation.js";
import { requireApiKey } from "../middleware/auth.js";
import { rateLimitByApiKey } from "../middleware/rateLimit.js";
import {
  createPayment,
  getPaymentById,
  markDepositConfirmed,
  markFailed,
  markReleased,
} from "../db/paymentsRepository.js";
import type { PaymentStatus } from "../types/payment.js";
import { submitDepositWithAuthorization, submitDeposit, submitRelayerWithdraw } from "../services/relay.js";
import { submitFastPoolRelease } from "../routes/fastPool.js";
import { submitCctpTransfer } from "../routes/cctp.js";
import { getDestPoolAddress, getRelayerAddress, getUsdcContract } from "../chains/registry.js";
import { streamPaymentById, streamPaymentsByRecipient } from "./sse.js";

function toJsonSafe(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value, (_key, v) => (typeof v === "bigint" ? v.toString() : v)));
}

function asyncHandler(
  handler: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    handler(req, res).catch(next);
  };
}

async function runDepositAndRelease(id: string, body: PayRequestBody, decision: RouteDecision): Promise<void> {
  const payer = body.payer as `0x${string}`;
  const recipient = body.recipient as `0x${string}`;
  const amount = BigInt(body.amount);
  const destChainId = BigInt(body.toChainId);

  try {
    const { txHash: sourceTxHash } = body.authorization
      ? await submitDepositWithAuthorization({
          payer,
          recipient,
          amount,
          destChainId,
          validAfter: BigInt(body.authorization.validAfter),
          validBefore: BigInt(body.authorization.validBefore),
          nonce: body.authorization.nonce as `0x${string}`,
          v: body.authorization.v,
          r: body.authorization.r as `0x${string}`,
          s: body.authorization.s as `0x${string}`,
          fromChainId: body.fromChainId,
        })
      : await submitDeposit({ payer, recipient, amount, destChainId, fromChainId: body.fromChainId });

    await markDepositConfirmed(id, sourceTxHash);

    const destTxHash =
      decision.route === "cctp"
        ? await runCctpRelease(body.fromChainId, body.toChainId, amount, recipient)
        : (await submitFastPoolRelease(body.toChainId, recipient, amount, sourceTxHash)).txHash;

    // Explain the route actually executed, not a freshly re-decided one — chain
    // state (pool liquidity, CCTP fees) can shift between accepting the payment
    // and releasing it, and the explanation must describe what happened.
    const explanation = await explainRouteDecision(decision, { destChainName: getChainName(body.toChainId) });

    await markReleased(id, destTxHash, explanation);
  } catch (error) {
    // The reconciler runs concurrently and may have already moved this payment
    // to a terminal state (e.g. a CCTP payment stuck past the stale threshold) —
    // markFailed throwing on an already-terminal row is expected, not a crash.
    try {
      await markFailed(id, String(error));
    } catch (markFailedError) {
      console.error(`[pay] payment ${id} failed but could not be marked failed:`, markFailedError);
    }
  }
}

async function runCctpRelease(
  fromChainId: number,
  toChainId: number,
  amount: bigint,
  recipient: `0x${string}`,
): Promise<`0x${string}`> {
  // depositWithAuthorization/deposit land funds in SourceVault, not the relayer's
  // wallet, so CCTP's burn call needs them moved to the relayer first.
  const relayerAddress = await getRelayerAddress(fromChainId);
  await submitRelayerWithdraw(fromChainId, relayerAddress, amount);

  const { mintTxHash } = await submitCctpTransfer({ fromChainId, toChainId, amount, recipient });
  return mintTxHash;
}

export function createApiRouter(): Router {
  const router = Router();

  router.post(
    "/quote",
    requireApiKey(),
    rateLimitByApiKey(),
    asyncHandler(async (req: Request, res: Response) => {
      const body = req.body as Partial<QuoteRequestBody>;
      const validationError = validateQuoteRequest(body);
      if (validationError) {
        res.status(400).json({ error: validationError });
        return;
      }

      const payload = body as QuoteRequestBody;

      const quote = await quoteRoutes({
        payer: payload.payer as `0x${string}`,
        recipient: payload.recipient as `0x${string}`,
        amount: BigInt(payload.amount),
        fromChainId: payload.fromChainId,
        toChainId: payload.toChainId,
        preference: payload.preference,
      });

      if (!quote.viable) {
        res.status(422).json(toJsonSafe({ error: "NoViableRoute", quote }));
        return;
      }

      res.json(toJsonSafe(quote));
    }),
  );

  router.post(
    "/pay",
    requireApiKey(),
    rateLimitByApiKey(),
    asyncHandler(async (req: Request, res: Response) => {
      const body = req.body as Partial<PayRequestBody>;
      const validationError = validatePayRequest(body);
      if (validationError) {
        res.status(400).json({ error: validationError });
        return;
      }

      const payload = body as PayRequestBody;

      const decision = await decideRoute({
        payer: payload.payer as `0x${string}`,
        recipient: payload.recipient as `0x${string}`,
        amount: BigInt(payload.amount),
        fromChainId: payload.fromChainId,
        toChainId: payload.toChainId,
        preference: payload.preference,
      });

      if (!decision.viable) {
        res.status(422).json(toJsonSafe({ error: decision.reason, decision }));
        return;
      }

      if (!payload.authorization) {
        res.status(400).json({ error: "authorization is required" });
        return;
      }

      const { payment, isNew } = await createPayment({
        id: randomUUID(),
        nonce: payload.authorization.nonce as `0x${string}`,
        fromChainId: payload.fromChainId,
        toChainId: payload.toChainId,
        payer: payload.payer as `0x${string}`,
        recipient: payload.recipient as `0x${string}`,
        amount: payload.amount,
        feeAmount: decision.feeAmount.toString(),
        payoutAmount: decision.payoutAmount.toString(),
        route: decision.route,
      });

      res.status(202).json(toJsonSafe({ id: payment.id, decision }));

      if (isNew) {
        void runDepositAndRelease(payment.id, payload, decision);
      }
    }),
  );

  router.get(
    "/status/:id",
    asyncHandler(async (req: Request, res: Response) => {
      const status: PaymentStatus | null = await getPaymentById(req.params.id);
      if (!status) {
        res.status(404).json({ error: `No payment found with id ${req.params.id}` });
        return;
      }
      res.json(toJsonSafe(status));
    }),
  );

  router.get("/events/:paymentId", streamPaymentById);
  router.get("/events", streamPaymentsByRecipient);

  router.get(
    "/chains",
    asyncHandler(async (_req: Request, res: Response) => {
      const chains = await Promise.all(
        listChainInfo().map(async (chain) => {
          if (!chain.isDestination) {
            return { ...chain, poolLiquidity: null };
          }
          const [destPoolAddress, usdcContract] = await Promise.all([
            getDestPoolAddress(chain.chainId),
            getUsdcContract(chain.chainId),
          ]);
          const poolLiquidity = (await usdcContract.read.balanceOf([destPoolAddress])) as bigint;
          return { ...chain, poolLiquidity: poolLiquidity.toString() };
        }),
      );

      res.json({ chains });
    }),
  );

  return router;
}
