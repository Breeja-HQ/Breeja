const MAX_RELEASE_ATTEMPTS = 3;

export interface PendingDepositObservation {
  paymentRequestedFound: boolean;
  permitExpired: boolean;
}

export interface DepositConfirmedObservation {
  releasedFound: boolean;
  releaseAttempts: number;
}

export type ReconcilerAction =
  | { type: "advance_to_deposit_confirmed" }
  | { type: "advance_to_released" }
  | { type: "retry_release" }
  | { type: "mark_failed"; reason: string; alert: boolean }
  | { type: "no_action" };

export function decidePendingDepositAction(observation: PendingDepositObservation): ReconcilerAction {
  if (observation.paymentRequestedFound) {
    return { type: "advance_to_deposit_confirmed" };
  }
  if (observation.permitExpired) {
    return { type: "mark_failed", reason: "PermitExpired", alert: false };
  }
  return { type: "no_action" };
}

export function decideDepositConfirmedAction(observation: DepositConfirmedObservation): ReconcilerAction {
  if (observation.releasedFound) {
    return { type: "advance_to_released" };
  }
  if (observation.releaseAttempts >= MAX_RELEASE_ATTEMPTS) {
    return { type: "mark_failed", reason: "ReleaseFailedAfterRetries", alert: true };
  }
  return { type: "retry_release" };
}

export type ReconcilerObservation =
  | { state: "pending_deposit"; observation: PendingDepositObservation }
  | { state: "deposit_confirmed"; observation: DepositConfirmedObservation };

export function decideReconciliationAction(input: ReconcilerObservation): ReconcilerAction {
  if (input.state === "pending_deposit") {
    return decidePendingDepositAction(input.observation);
  }
  return decideDepositConfirmedAction(input.observation);
}
