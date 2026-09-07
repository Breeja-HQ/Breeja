import type { NextFunction, Request, Response } from "express";
import { requireEnv } from "../env.js";

function loadApiKeys(): Set<string> {
  return new Set(
    requireEnv("BREEJA_API_KEYS")
      .split(",")
      .map((key) => key.trim())
      .filter((key) => key.length > 0),
  );
}

export function requireApiKey() {
  const apiKeys = loadApiKeys();

  return (req: Request, res: Response, next: NextFunction): void => {
    const apiKey = req.header("x-api-key");
    if (!apiKey || !apiKeys.has(apiKey)) {
      res.status(401).json({ error: "InvalidApiKey" });
      return;
    }
    res.locals.apiKey = apiKey;
    next();
  };
}
