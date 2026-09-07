import { BreejaError } from "./types.js";
const REASON_TO_CODE = {
    UnsupportedSourceChain: "UnsupportedChain",
    UnsupportedDestChain: "UnsupportedChain",
    InsufficientLiquidity: "InsufficientLiquidity",
    PoolPaused: "PoolPaused",
    ZeroAmount: "InvalidAmount",
    ZeroRecipient: "InvalidRecipient",
    NoViableRoute: "InsufficientLiquidity",
    CctpUnavailable: "InsufficientLiquidity",
    PermitExpired: "PermitExpired",
};
export function errorFromReason(reason, details) {
    const code = (reason ? REASON_TO_CODE[reason] : undefined) ?? "PaymentFailed";
    return new BreejaError(code, reason ?? "Payment could not be routed", details);
}
export function relayerUnavailableError(details) {
    return new BreejaError("RelayerUnavailable", "The relayer is unreachable or returned an unexpected response", details);
}
//# sourceMappingURL=errors.js.map