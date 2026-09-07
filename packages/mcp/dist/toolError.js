import { BreejaError } from "@breeja/sdk";
export function textResult(payload) {
    return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}
export function errorResult(message, details) {
    const text = details === undefined ? message : `${message}\n${JSON.stringify(details, null, 2)}`;
    return { content: [{ type: "text", text }], isError: true };
}
export function toToolError(error) {
    if (error instanceof BreejaError) {
        return errorResult(`Breeja error [${error.code}]: ${error.message}`, error.details);
    }
    if (error instanceof Error) {
        return errorResult(`Unexpected error: ${error.message}`);
    }
    return errorResult("Unexpected error", error);
}
//# sourceMappingURL=toolError.js.map