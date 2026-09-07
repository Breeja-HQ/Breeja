import { Breeja } from "@breeja/sdk";
import { optionalEnv, requireEnv } from "./env.js";
export function createBreejaClient() {
    const apiKey = requireEnv("BREEJA_API_KEY");
    const baseUrl = optionalEnv("BREEJA_RELAYER_URL");
    return new Breeja({ apiKey, ...(baseUrl ? { baseUrl } : {}) });
}
//# sourceMappingURL=client.js.map