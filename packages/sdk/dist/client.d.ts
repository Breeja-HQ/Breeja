import { type BreejaConfig } from "./types.js";
export interface RelayerClient {
    get<T>(path: string): Promise<T>;
    post<T>(path: string, body: unknown): Promise<T>;
    /** Raw streaming GET for SSE endpoints — no JSON parsing, no x-api-key
     *  header (the relayer's /events routes are unauthenticated so a browser's
     *  EventSource, which cannot set custom headers, can use them too). */
    openStream(path: string, signal?: AbortSignal): Promise<Response>;
}
export declare function createRelayerClient(config: BreejaConfig): RelayerClient;
