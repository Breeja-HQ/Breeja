export const DEFAULT_PER_CALL_CAP_USDC = "50";
export const DEFAULT_SESSION_CAP_USDC = "200";
export function loadSpendCapConfig(env) {
    const perCallRaw = env.BREEJA_MAX_PAYMENT_USDC;
    const sessionRaw = env.BREEJA_MAX_SESSION_USDC;
    return {
        perCallCapUsdc: perCallRaw ?? DEFAULT_PER_CALL_CAP_USDC,
        sessionCapUsdc: sessionRaw ?? DEFAULT_SESSION_CAP_USDC,
        usingPerCallDefault: perCallRaw === undefined,
        usingSessionDefault: sessionRaw === undefined,
    };
}
/**
 * Decimal-string USDC amounts are compared as integer micro-units (6 decimals)
 * to avoid floating-point money bugs, matching the SDK's Amount convention.
 */
export function toMicroUsdc(amount) {
    const trimmed = amount.trim();
    if (!/^\d+(\.\d+)?$/.test(trimmed)) {
        throw new Error(`Invalid decimal amount: ${amount}`);
    }
    const [whole, fraction = ""] = trimmed.split(".");
    const paddedFraction = (fraction + "000000").slice(0, 6);
    return BigInt(whole) * 1000000n + BigInt(paddedFraction || "0");
}
export function formatMicroUsdc(micros) {
    const whole = micros / 1000000n;
    const fraction = micros % 1000000n;
    return `${whole}.${fraction.toString().padStart(6, "0")}`;
}
export function checkSpendCap(amount, sessionSpentMicros, config) {
    const amountMicros = toMicroUsdc(amount);
    const perCallCapMicros = toMicroUsdc(config.perCallCapUsdc);
    const sessionCapMicros = toMicroUsdc(config.sessionCapUsdc);
    if (amountMicros > perCallCapMicros) {
        const overBy = formatMicroUsdc(amountMicros - perCallCapMicros);
        return {
            allowed: false,
            reason: "PerCallCapExceeded",
            message: `Payment of ${amount} USDC exceeds the per-call cap of ${config.perCallCapUsdc} USDC by ${overBy} USDC.`,
        };
    }
    const projectedTotal = sessionSpentMicros + amountMicros;
    if (projectedTotal > sessionCapMicros) {
        const overBy = formatMicroUsdc(projectedTotal - sessionCapMicros);
        return {
            allowed: false,
            reason: "SessionCapExceeded",
            message: `Payment of ${amount} USDC would bring session spend to ${formatMicroUsdc(projectedTotal)} USDC, exceeding the per-session cap of ${config.sessionCapUsdc} USDC by ${overBy} USDC.`,
        };
    }
    return { allowed: true };
}
//# sourceMappingURL=spendCap.js.map