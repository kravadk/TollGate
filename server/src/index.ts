// TollGate server — entry point.
// Layout ported from kravadk/XSight- (server/src/index.ts).

import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { env } from "./env.js";
import { apiRouter, statusRouter } from "./routes.js";
import { mcpRouter } from "./mcp.js";
import { feedsRouter } from "./feeds.js";
import { log, newRequestId } from "./logger.js";
import { arcAgentLoop } from "./arc-agent-loop.js";

const app = express();
app.set("trust proxy", 1); // honour X-Forwarded-For on Render / fly.io

const allowedOrigins = env.corsOrigin === "*"
  ? true
  : env.corsOrigin.split(",").map((o) => o.trim()).filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "1mb" }));

// Security headers — basic protections for all responses.
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  next();
});

// Request-id middleware — validate client-supplied ID to prevent log injection.
app.use((req: Request, res: Response, next: NextFunction) => {
  const clientRid = req.headers["x-request-id"] as string | undefined;
  const rid = (clientRid && /^[a-zA-Z0-9_-]{1,64}$/.test(clientRid)) ? clientRid : newRequestId();
  (req as Request & { rid: string }).rid = rid;
  res.setHeader("X-Request-Id", rid);
  next();
});

// Rate limits — protect MCP and gateway from DoS / scraping.
const mcpLimiter = rateLimit({
  windowMs: 60_000, max: 60,
  standardHeaders: true, legacyHeaders: false,
  message: { error: "rate_limit_exceeded", retryAfterSec: 60, scope: "/mcp" },
});
const gatewayLimiter = rateLimit({
  windowMs: 60_000, max: 30,
  standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}::${req.params["serviceId"] ?? "default"}`,
  message: { error: "rate_limit_exceeded", retryAfterSec: 60, scope: "/api/gateway" },
});

app.use("/mcp", mcpLimiter, mcpRouter);
app.use("/api/gateway/:serviceId", gatewayLimiter);

app.use("/api", apiRouter);
app.use("/api/status", statusRouter);
app.use("/api/feeds", feedsRouter);

// Version endpoint for ops/uptime monitors.
const VERSION = {
  name: "tollgate-server",
  version: "0.1.0",
  commit: process.env.RENDER_GIT_COMMIT ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown",
  builtAt: process.env.BUILD_TIME ?? new Date().toISOString(),
  node:    process.version,
  env:     env.nodeEnv,
};
app.get("/api/version", (_req, res) => res.json(VERSION));

app.get("/", (_req, res) => {
  res.json({
    name: "TollGate server",
    version: VERSION.version,
    note: "x402 gateway + MCP + activity tracker. Ported from kravadk/XSight-.",
    defaultNetwork: env.x402Network,
    defaultAsset: env.x402Asset,
    endpoints: {
      services: "GET /api/services?workspace=liquify",
      serviceDetail: "GET /api/services/:id",
      agents: "GET /api/agents?workspace=0g",
      agentDetail: "GET /api/agents/:id",
      x402Spec: "GET /api/v1/x402-spec?workspace=liquify",
      gateway: "GET|POST /api/gateway/:serviceId   (402 + challenge, retry with X-PAYMENT) — 30 r/min/IP",
      receipts: "GET /api/receipts?workspace=&service=&agent=",
      receiptDetail: "GET /api/receipts/:id",
      health: "GET /api/status/health",
      version: "GET /api/version",
      activity: "GET /api/status/activity",
      x402Log: "GET /api/status/x402-log",
      mcp: "POST /mcp   (MCP JSON-RPC 2.0) — 60 r/min/IP",
      mcpDiscover: "GET /mcp   (capability discovery)",
    },
  });
});

// 404 JSON for API consistency.
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "not_found",
    path: req.path,
    method: req.method,
    hint: "GET / for endpoint list",
  });
});

// Final error handler — log with rid, return safe JSON.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  const rid = (req as Request & { rid?: string }).rid;
  log.error("unhandled_error", { rid, path: req.path, method: req.method, err: err.message });
  if (res.headersSent) return;
  res.status(500).json({ error: "internal_error", rid });
});

app.listen(env.port, () => {
  log.info("server_listening", { port: env.port, env: env.nodeEnv, version: VERSION.version });
  arcAgentLoop().catch((e) => console.error("[arc-loop] startup error:", (e as Error).message));
  setInterval(() => arcAgentLoop().catch((e) => console.error("[arc-loop] error:", (e as Error).message)), 30 * 60 * 1000);
});
