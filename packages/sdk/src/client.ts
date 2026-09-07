import { errorFromReason, relayerUnavailableError } from "./errors.js";
import { BreejaError, type BreejaConfig } from "./types.js";

const DEFAULT_BASE_URL = "http://localhost:3001";

export interface RelayerClient {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  /** Raw streaming GET for SSE endpoints — no JSON parsing, no x-api-key
   *  header (the relayer's /events routes are unauthenticated so a browser's
   *  EventSource, which cannot set custom headers, can use them too). */
  openStream(path: string, signal?: AbortSignal): Promise<Response>;
}

export function createRelayerClient(config: BreejaConfig): RelayerClient {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;

  async function request<T>(path: string, init: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          ...init.headers,
          "x-api-key": config.apiKey,
        },
      });
    } catch (error) {
      throw relayerUnavailableError(error);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch (error) {
      throw relayerUnavailableError({ status: response.status, parseError: error });
    }

    if (!response.ok) {
      const errorBody = body as { error?: string };
      throw errorFromReason(errorBody.error, { status: response.status, body });
    }

    return body as T;
  }

  return {
    get<T>(path: string): Promise<T> {
      return request<T>(path, { method: "GET" });
    },
    post<T>(path: string, requestBody: unknown): Promise<T> {
      return request<T>(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
    },
    async openStream(path: string, signal?: AbortSignal): Promise<Response> {
      try {
        const response = await fetch(`${baseUrl}${path}`, { signal });
        if (!response.ok || !response.body) {
          throw relayerUnavailableError({ status: response.status });
        }
        return response;
      } catch (error) {
        if (error instanceof BreejaError) throw error;
        throw relayerUnavailableError(error);
      }
    },
  };
}
