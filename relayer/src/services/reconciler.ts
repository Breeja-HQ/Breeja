import {
  listStalePendingPayments,
  markDepositConfirmed,
  markFailed,
  markReleased,
} from "../db/paymentsRepository.js";
import { findPaymentRequested, findReleasedBySourceRef } from "./events.js";
import { submitFastPoolRelease } from "../routes/fastPool.js";
import { explainRouteDecision } from "../agent/explain.js";
import { getChainName } from "../chains/chainIds.js";
import type { RouteDecision } from "../agent/router.js";
import type { PaymentStatus } from "../types/payment.js";
import {
  decideDepositConfirmedAction,
  decidePendingDepositAction,
} from "./reconcilerLogic.js";

const RECONCILER_INTERVAL_MS = 30_000;
const STALE_THRESHOLD_MS = 120_000;
const CCTP_STALE_THRESHOLD_MS = 25 * 60_000;
const PERMIT_ABANDONED_THRESHOLD_MS = 30 * 60_000;

const releaseAttemptsByPaymentId = new Map<string, number>();

function paymentDecisionForExplanation(payment: PaymentStatus): RouteDecision {
  return {
    viable: true,
    route: payment.route,
    feeBps: 0,
    feeAmount: BigInt(payment.feeAmount),
    payoutAmount: BigInt(payment.payoutAmount),
    sourceChainGasPriceWei: 0n,
    destChainGasPriceWei: 0n,
    destPoolBalance: 0n,
    destPoolPaused: false,
    estimatedSeconds: 0,
  };
}

async function reconcilePendingDeposit(payment: Extract<PaymentStatus, { state: "pending_deposit" }>): Promise<void> {
  const found = await findPaymentRequested(payment.fromChainId, {
    payer: payment.payer,
    recipient: payment.recipient,
    amount: BigInt(payment.amount),
    destChainId: BigInt(payment.toChainId),
  });

  const ageMs = Date.now() - payment.updatedAt;
  const action = decidePendingDepositAction({
    paymentRequestedFound: found !== null,
    permitExpired: !found && ageMs > PERMIT_ABANDONED_THRESHOLD_MS,
  });

  if (action.type === "advance_to_deposit_confirmed" && found) {
    await markDepositConfirmed(payment.id, found.transactionHash);
    return;
  }
  if (action.type === "mark_failed") {
    await markFailed(payment.id, action.reason);
  }
}

async function reconcileDepositConfirmed(
  payment: Extract<PaymentStatus, { state: "deposit_confirmed" }>,
): Promise<void> {
  if (payment.route === "cctp") {
    // The reconciler only retries fast-pool releases: retrying a CCTP burn
    // would risk a second burn against the same deposit. A CCTP payment stuck
    // here means runDepositAndRelease's own try/catch already failed it, or
    // the process died mid-flight — surface it rather than silently retry.
    await markFailed(payment.id, "CctpReleaseRequiresManualReview");
    console.error(`[reconciler] ALERT: CCTP payment ${payment.id} stuck in deposit_confirmed, marked failed`);
    return;
  }

  const found = await findReleasedBySourceRef(payment.toChainId, payment.sourceTxHash);
  const attempts = releaseAttemptsByPaymentId.get(payment.id) ?? 0;

  const action = decideDepositConfirmedAction({
    releasedFound: found !== null,
    releaseAttempts: attempts,
  });

  if (action.type === "advance_to_released" && found) {
    const explanation = await explainRouteDecision(paymentDecisionForExplanation(payment), {
      destChainName: getChainName(payment.toChainId),
    });
    await markReleased(payment.id, found.transactionHash, explanation);
    releaseAttemptsByPaymentId.delete(payment.id);
    return;
  }

  if (action.type === "retry_release") {
    releaseAttemptsByPaymentId.set(payment.id, attempts + 1);
    try {
      const { txHash } = await submitFastPoolRelease(
        payment.toChainId,
        payment.recipient,
        BigInt(payment.payoutAmount),
        payment.sourceTxHash,
      );
      const explanation = await explainRouteDecision(paymentDecisionForExplanation(payment), {
      destChainName: getChainName(payment.toChainId),
    });
      await markReleased(payment.id, txHash, explanation);
      releaseAttemptsByPaymentId.delete(payment.id);
    } catch {
      // left in deposit_confirmed; retried on the next tick, up to MAX_RELEASE_ATTEMPTS
    }
    return;
  }

  if (action.type === "mark_failed") {
    releaseAttemptsByPaymentId.delete(payment.id);
    await markFailed(payment.id, action.reason);
    if (action.alert) {
      console.error(`[reconciler] ALERT: payment ${payment.id} failed after retries: ${action.reason}`);
    }
  }
}

export async function runReconcilerOnce(): Promise<void> {
  const stalePayments = await listStalePendingPayments(STALE_THRESHOLD_MS, { cctp: CCTP_STALE_THRESHOLD_MS });

  for (const payment of stalePayments) {
    try {
      if (payment.state === "pending_deposit") {
        await reconcilePendingDeposit(payment);
      } else if (payment.state === "deposit_confirmed") {
        await reconcileDepositConfirmed(payment);
      }
    } catch (error) {
      console.error(`[reconciler] failed to reconcile payment ${payment.id}:`, error);
    }
  }
}

export function startReconciler(): () => void {
  const timer = setInterval(() => {
    void runReconcilerOnce();
  }, RECONCILER_INTERVAL_MS);

  return () => clearInterval(timer);
}
