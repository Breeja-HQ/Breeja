import { BreejaError } from "./types.js";
export declare function errorFromReason(reason: string | undefined, details?: unknown): BreejaError;
export declare function relayerUnavailableError(details?: unknown): BreejaError;
