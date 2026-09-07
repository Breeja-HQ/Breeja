import type { NextFunction, Request, Response } from "express";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;

interface WindowState {
  count: number;
  windowStartedAt: number;
}

export function rateLimitByApiKey() {
  const windowsByApiKey = new Map<string, WindowState>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const apiKey = res.locals.apiKey as string | undefined;
    if (!apiKey) {
      res.status(401).json({ error: "InvalidApiKey" });
      return;
    }

    const now = Date.now();
    const existing = windowsByApiKey.get(apiKey);

    if (!existing || now - existing.windowStartedAt >= RATE_LIMIT_WINDOW_MS) {
      windowsByApiKey.set(apiKey, { count: 1, windowStartedAt: now });
      next();
      return;
    }

    if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
      res.status(429).json({ error: "RateLimitExceeded" });
      return;
    }

    existing.count += 1;
    next();
  };
}
