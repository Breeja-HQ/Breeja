import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import { createApiRouter } from "./api/routes.js";
import { watchAllPaymentRequested, watchAllReleased } from "./services/events.js";
import { startReconciler } from "./services/reconciler.js";

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(createApiRouter());

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[api] unhandled error:", err);
  if (res.headersSent) return;
  res.status(500).json({ error: "InternalError" });
});

const port = Number(process.env.PORT ?? 3001);

app.listen(port, () => {
  console.log(`Breeja relayer listening on port ${port}`);

  startReconciler();

  void watchAllPaymentRequested((fromChainId, event) => {
    console.log(
      `[event] PaymentRequested (chain ${fromChainId}) payer=${event.payer} recipient=${event.recipient} amount=${event.amount} destChainId=${event.destChainId} tx=${event.transactionHash}`,
    );
  });

  void watchAllReleased((toChainId, event) => {
    console.log(
      `[event] Released (chain ${toChainId}) recipient=${event.recipient} amount=${event.amount} fee=${event.fee} sourceRef=${event.sourceRef} tx=${event.transactionHash}`,
    );
  });
});
