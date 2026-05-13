// TollGate server — entry point.
// Layout ported from kravadk/XSight- (server/src/index.ts).

import express from "express";
import cors from "cors";
import { env } from "./env.js";
import { apiRouter, statusRouter } from "./routes.js";
import { mcpRouter } from "./mcp.js";
import { feedsRouter } from "./feeds.js";

const app = express();

const allowedOrigins = env.corsOrigin === "*"
  ? true
  : env.corsOrigin.split(",").map((o) => o.trim()).filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "1mb" }));

app.use("/api", apiRouter);
app.use("/api/status", statusRouter);
app.use("/api/feeds", feedsRouter);
app.use("/mcp", mcpRouter);

app.get("/", (_req, res) => {
  res.json({
    name: "TollGate server",
    version: "0.1.0",
    note: "x402 gateway + MCP + activity tracker. Ported from kravadk/XSight-.",
    defaultNetwork: env.x402Network,
    defaultAsset: env.x402Asset,
    endpoints: {
      services: "GET /api/services?workspace=liquify",
      serviceDetail: "GET /api/services/:id",
      agents: "GET /api/agents?workspace=0g",
      agentDetail: "GET /api/agents/:id",
      x402Spec: "GET /api/v1/x402-spec?workspace=liquify",
      gateway: "GET|POST /api/gateway/:serviceId   (402 + challenge, retry with X-PAYMENT)",
      receipts: "GET /api/receipts?workspace=&service=&agent=",
      receiptDetail: "GET /api/receipts/:id",
      health: "GET /api/status/health",
      activity: "GET /api/status/activity",
      x402Log: "GET /api/status/x402-log",
      mcp: "POST /mcp   (MCP JSON-RPC 2.0)",
      mcpDiscover: "GET /mcp   (capability discovery)",
    },
  });
});

app.listen(env.port, () => {
  console.log(`[tollgate-server] listening on http://localhost:${env.port}  (env=${env.nodeEnv})`);
});
