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
export async function* readSseFrames(response: Response): AsyncGenerator<SseFrame> {
  const body = response.body;
  if (!body) return;

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const rawFrame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        let event = "message";
        const dataLines: string[] = [];
        for (const line of rawFrame.split("\n")) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
        }
        if (dataLines.length > 0) {
          yield { event, data: dataLines.join("\n") };
        }

        boundary = buffer.indexOf("\n\n");
      }
    }
  } finally {
    reader.releaseLock();
  }
}
