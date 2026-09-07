export interface SseFrame {
    event: string;
    data: string;
}
/**
 * Minimal SSE frame reader over a fetch Response body. Not every runtime this
 * SDK targets (Node, for the MCP server and CLI scripts) has a native
 * EventSource, so this parses the wire format directly from a streamed
 * fetch response instead of depending on one.
 */
export declare function readSseFrames(response: Response): AsyncGenerator<SseFrame>;
