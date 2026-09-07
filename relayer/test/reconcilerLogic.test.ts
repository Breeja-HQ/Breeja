import { describe, it, expect } from "vitest";
import {
  decideReconciliationAction,
  decidePendingDepositAction,
  decideDepositConfirmedAction,
} from "../src/services/reconcilerLogic.js";

describe("decidePendingDepositAction", () => {
  it("advances to deposit_confirmed when PaymentRequested is found", () => {
    const action = decidePendingDepositAction({ paymentRequestedFound: true, permitExpired: false });
    expect(action).toEqual({ type: "advance_to_deposit_confirmed" });
  });

  it("takes no action when not found and the permit has not expired", () => {
    const action = decidePendingDepositAction({ paymentRequestedFound: false, permitExpired: false });
    expect(action).toEqual({ type: "no_action" });
  });

  it("marks failed when not found and the permit has expired", () => {
    const action = decidePendingDepositAction({ paymentRequestedFound: false, permitExpired: true });
    expect(action.type).toBe("mark_failed");
    if (action.type === "mark_failed") {
      expect(action.reason).toBeTruthy();
    }
  });

  it("prefers advancing over failing when both found and expired are true", () => {
    const action = decidePendingDepositAction({ paymentRequestedFound: true, permitExpired: true });
    expect(action).toEqual({ type: "advance_to_deposit_confirmed" });
  });
});

describe("decideDepositConfirmedAction", () => {
  it("advances to released when Released is found", () => {
    const action = decideDepositConfirmedAction({ releasedFound: true, releaseAttempts: 0 });
    expect(action).toEqual({ type: "advance_to_released" });
  });

  it("retries release when not found and under the max attempt threshold", () => {
    const action = decideDepositConfirmedAction({ releasedFound: false, releaseAttempts: 0 });
    expect(action).toEqual({ type: "retry_release" });
  });

  it("retries release on the second attempt", () => {
    const action = decideDepositConfirmedAction({ releasedFound: false, releaseAttempts: 1 });
    expect(action).toEqual({ type: "retry_release" });
  });

  it("marks failed and alerts after 3 failed release attempts", () => {
    const action = decideDepositConfirmedAction({ releasedFound: false, releaseAttempts: 3 });
    expect(action.type).toBe("mark_failed");
    if (action.type === "mark_failed") {
      expect(action.alert).toBe(true);
    }
  });

  it("stays marked failed for attempt counts beyond the threshold", () => {
    const action = decideDepositConfirmedAction({ releasedFound: false, releaseAttempts: 5 });
    expect(action.type).toBe("mark_failed");
  });

  it("found takes priority over an exhausted attempt count", () => {
    const action = decideDepositConfirmedAction({ releasedFound: true, releaseAttempts: 10 });
    expect(action).toEqual({ type: "advance_to_released" });
  });
});

describe("decideReconciliationAction", () => {
  it("dispatches pending_deposit observations to the pending deposit rule", () => {
    const action = decideReconciliationAction({
      state: "pending_deposit",
      observation: { paymentRequestedFound: true, permitExpired: false },
    });
    expect(action).toEqual({ type: "advance_to_deposit_confirmed" });
  });

  it("dispatches deposit_confirmed observations to the deposit confirmed rule", () => {
    const action = decideReconciliationAction({
      state: "deposit_confirmed",
      observation: { releasedFound: false, releaseAttempts: 0 },
    });
    expect(action).toEqual({ type: "retry_release" });
  });
});
