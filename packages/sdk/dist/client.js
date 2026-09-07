import { errorFromReason, relayerUnavailableError } from "./errors.js";
import { BreejaError } from "./types.js";
const DEFAULT_BASE_URL = "http://localhost:3001";
export function createRelayerClient(config) {
    const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    async function request(path, init) {
        let response;
        try {
            response = await fetch(`${baseUrl}${path}`, {
                ...init,
                headers: {
                    ...init.headers,
                    "x-api-key": config.apiKey,
                },
            });
        }
        catch (error) {
            throw relayerUnavailableError(error);
        }
        let body;
        try {
            body = await response.json();
        }
        catch (error) {
            throw relayerUnavailableError({ status: response.status, parseError: error });
        }
        if (!response.ok) {
            const errorBody = body;
            throw errorFromReason(errorBody.error, { status: response.status, body });
        }
        return body;
    }
    return {
        get(path) {
            return request(path, { method: "GET" });
        },
        post(path, requestBody) {
            return request(path, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            });
        },
        async openStream(path, signal) {
            try {
                const response = await fetch(`${baseUrl}${path}`, { signal });
                if (!response.ok || !response.body) {
                    throw relayerUnavailableError({ status: response.status });
                }
                return response;
            }
            catch (error) {
                if (error instanceof BreejaError)
                    throw error;
                throw relayerUnavailableError(error);
            }
        },
    };
}
//# sourceMappingURL=client.js.map