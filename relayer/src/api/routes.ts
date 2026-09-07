import { randomUUID } from "node:crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import { decideRoute } from "../agent/router.js";
import { explainRouteDecision } from "../agent/explain.js";
import { getChainName } from "../chains/chainIds.js";
import { validatePayRequest, type PayRequestBody } from "./validation.js";
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
import {
  submitDepositWithAuthorization,
  submitDeposit,
  submitRelease,
} from "../services/relay.js";

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

async function runDepositAndRelease(id: string, body: PayRequestBody): Promise<void> {
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

    const { txHash: destTxHash } = await submitRelease(body.toChainId, recipient, amount, sourceTxHash);
    const decision = await decideRoute({
      payer,
      recipient,
      amount,
      fromChainId: body.fromChainId,
      toChainId: body.toChainId,
    });
    const explanation = await explainRouteDecision(decision, { destChainName: getChainName(body.toChainId) });

    await markReleased(id, destTxHash, explanation);
  } catch (error) {
    await markFailed(id, String(error));
  }
}

export function createApiRouter(): Router {
  const router = Router();

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
        route: "fast_pool",
      });

      res.status(202).json(toJsonSafe({ id: payment.id, decision }));

      if (isNew) {
        void runDepositAndRelease(payment.id, payload);
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

  return router;
}
