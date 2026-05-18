// REST surface for TollGate. Mirrors ТЗ §9 (agent-payments-x402-universal-tz-uk.md).
// Route layout & naming ported from kravadk/XSight- (server/src/routes/*, server/src/index.ts).
//
//   GET  /api/services            ?workspace=liquify
//   GET  /api/services/:id
//   GET  /api/agents              ?workspace=0g
//   GET  /api/agents/:id
//   GET  /api/v1/x402-spec        ?workspace=liquify
//   GET  /api/gateway/:serviceId  → 402 + challenge, or unlocked sample response
//   POST /api/gateway/:serviceId
//   GET  /api/receipts            ?workspace=&service=&agent=
//   GET  /api/receipts/:id
//   GET  /api/status/health
//   GET  /api/status/activity
//   GET  /api/status/x402-log

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getAddress, JsonRpcProvider, parseUnits } from "ethers";
import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { env, isProd } from "./env.js";
import { buildArcAlerts, buildArcAuditTrail, buildArcDecisionReplay, evaluateArcDecisionVerification } from "./arc-audit.js";
import {
  appendArcTractionEvent,
  buildArcTractionStats,
  makeArcTractionEvent,
  readArcTractionEvents,
} from "./arc-traction.js";
import { buildPortfolioSimulation, buildProtectedPortfolio } from "./arc-portfolio.js";
import { buildArcReadinessReport } from "./arc-readiness.js";
import { buildArcSignalSourceRadar } from "./arc-signal-sources.js";
import { uploadToOg } from "./og-upload.js";
import { runOgInference } from "./og-compute.js";
import {
  agentById,
  agents,
  serviceById,
  services,
  servicesForWorkspace,
} from "./data.js";
import {
  activitySnapshot,
  appendReceipt,
  listReceipts,
  receiptById,
  receiptStats,
  onReceipt,
  onNftUpdate,
  updateReceiptNft,
  recordActivity,
  x402Log,
} from "./store.js";
import { withX402 } from "./x402.js";
import { mintReceiptNFT } from "./receipt-nft.js";
import { mantleRecordDecision, mantleRecordPayment, ogAnchorReceipt } from "./chain-signer.js";
import type { Service, WorkspaceId } from "./types.js";

const WORKSPACE_IDS: WorkspaceId[] = ["0g", "qie", "arbitrum", "mantle", "sui", "agora", "polygon"];
function asWorkspace(v: unknown): WorkspaceId | undefined {
  return WORKSPACE_IDS.includes(v as WorkspaceId) ? (v as WorkspaceId) : undefined;
}

function publicService(s: Service) {
  return {
    id: s.id,
    name: s.name,
    provider: s.provider,
    providerWallet: s.providerWallet,
    category: s.category,
    priceUsd: s.priceUsd,
    currency: s.currency,
    network: s.network,
    description: s.description,
    status: s.status,
    workspaceIds: s.workspaceIds,
    gatewayUrl: `/api/gateway/${s.id}`,
    sampleResponse: s.sampleResponse,
  };
}

export const apiRouter = Router();

function cleanArcAddress(v: unknown): string | null {
  if (typeof v !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(v)) return null;
  try {
    return getAddress(v);
  } catch {
    return null;
  }
}

async function verifyArcNativePayment(input: {
  txHash: unknown;
  from: unknown;
  minAmountUsd: number;
}): Promise<{ ok: true; txHash: string } | { ok: false; reason: string }> {
  const txHash = typeof input.txHash === "string" && /^0x[0-9a-fA-F]{64}$/.test(input.txHash) ? input.txHash : "";
  const from = cleanArcAddress(input.from);
  const to = cleanArcAddress(env.x402PayoutAddress);
  if (!txHash) return { ok: false, reason: "missing_valid_tx_hash" };
  if (!from) return { ok: false, reason: "missing_valid_wallet" };
  if (!to) return { ok: false, reason: "payout_address_not_configured" };
  if (!process.env.ARC_RPC_URL) return { ok: false, reason: "arc_rpc_not_configured" };

  const provider = new JsonRpcProvider(process.env.ARC_RPC_URL);
  const [tx, receipt] = await Promise.all([
    provider.getTransaction(txHash),
    provider.getTransactionReceipt(txHash),
  ]);
  if (!tx || !receipt) return { ok: false, reason: "tx_not_found_or_pending" };
  if (receipt.status !== 1) return { ok: false, reason: "tx_failed" };
  if (getAddress(tx.from) !== from) return { ok: false, reason: "tx_from_mismatch" };
  if (!tx.to || getAddress(tx.to) !== to) return { ok: false, reason: "tx_to_mismatch" };

  const required = parseUnits(input.minAmountUsd.toFixed(6), 18);
  if (tx.value < required) return { ok: false, reason: "tx_amount_too_low" };
  return { ok: true, txHash };
}

// ─── 0G Storage upload (server-side, uses private key) ──────────────────────

const uploadLimiter = rateLimit({
  windowMs: 60_000, max: 10,
  standardHeaders: true, legacyHeaders: false,
  message: { error: "rate_limit_exceeded", retryAfterSec: 60, scope: "/api/og/upload" },
});

apiRouter.post("/og/upload", uploadLimiter, async (req: Request, res: Response) => {
  const content = typeof req.body?.content === "string" ? req.body.content : "";
  if (!content) return res.status(400).json({ error: "content required" });
  if (content.length > 51200) return res.status(413).json({ error: "content too large (max 50 KB)" });
  try {
    const result = await uploadToOg(content);
    recordActivity("og.upload", "0g");
    res.json({ ok: true, ...result });
  } catch {
    res.status(500).json({ error: "internal_error" });
  }
});

// ─── 0G Compute inference (server-side, uses compute private key) ────────────

const ALLOWED_MODELS = ["risk-scorer-v2", "wallet-labeler", "anomaly-detect", "sentiment-v1", "market-signals"];

apiRouter.post("/og/compute", async (req: Request, res: Response) => {
  const prompt = typeof req.body?.prompt === "string" ? req.body.prompt : "";
  const model = typeof req.body?.model === "string" ? req.body.model : undefined;
  if (!prompt) return res.status(400).json({ error: "prompt required" });
  if (model && !ALLOWED_MODELS.includes(model)) return res.status(400).json({ error: "unknown model" });
  const result = await runOgInference(prompt, model);
  if (!result.ok && result.reason === "compute_not_configured") {
    return res.status(503).json({ ok: false, reason: "compute_not_configured" });
  }
  recordActivity("og.upload", "0g");
  if (!result.ok) return res.status(502).json({ ok: false, reason: "error", message: result.message });
  res.json(result);
});

// ─── Services ───────────────────────────────────────────────────────────────

apiRouter.get("/services", (req: Request, res: Response) => {
  const ws = asWorkspace(req.query["workspace"]);
  recordActivity("services.list", ws ?? "all");
  const pool = ws ? servicesForWorkspace(ws) : services;
  res.json({ services: pool.map(publicService), count: pool.length, workspace: ws ?? null });
});

apiRouter.get("/services/:id", (req: Request, res: Response) => {
  const s = serviceById(String(req.params["id"]));
  if (!s) return res.status(404).json({ error: "unknown_service" });
  res.json(publicService(s));
});

// ─── Agents (policy is read-only here; mutations would need a signature) ────

apiRouter.get("/agents", (req: Request, res: Response) => {
  const ws = asWorkspace(req.query["workspace"]);
  recordActivity("agents.list", ws ?? "all");
  const pool = ws ? agents.filter((a) => a.workspaceId === ws) : agents;
  res.json({ agents: pool, count: pool.length, workspace: ws ?? null });
});

apiRouter.get("/agents/:id", (req: Request, res: Response) => {
  const a = agentById(String(req.params["id"]));
  if (!a) return res.status(404).json({ error: "unknown_agent" });
  res.json(a);
});

// ─── x402 discovery spec (no payment required) ─────────────────────────────

apiRouter.get("/v1/x402-spec", (req: Request, res: Response) => {
  const ws = asWorkspace(req.query["workspace"]);
  recordActivity("spec.read", ws ?? "all");
  const pool = ws ? servicesForWorkspace(ws) : services;
  res.json({
    name: "TollGate x402 API",
    version: "1.0.0",
    description:
      "Pay-per-call API economy for AI agents. Every endpoint is gated by an x402 payment challenge; pay the stablecoin amount and retry with X-PAYMENT to unlock the resource.",
    workspace: ws ?? "all",
    defaultNetwork: env.x402Network,
    defaultAsset: env.x402Asset,
    paymentScheme: "exact",
    paymentInstruction: {
      flow: "GET /api/gateway/<serviceId> → 402 {challenge} → pay <amount> <asset> to <payTo> on <network> → GET again with X-PAYMENT",
      header: "X-PAYMENT",
      format: "base64-encoded JSON of {challengeId, payTo, amount, asset, network, txHash?, payer?}",
      devBypassHeader: isProd() ? null : "X-PAYMENT: dev-bypass (NODE_ENV != production only)",
      replayProtection: "each challenge is single-use, bound to a requestHash, and expires after 5 minutes",
    },
    endpoints: pool.map((s) => ({
      method: "GET",
      path: `/api/gateway/${s.id}`,
      serviceId: s.id,
      name: s.name,
      priceUsd: s.priceUsd,
      currency: s.currency,
      network: s.network,
      category: s.category,
      description: s.description,
      responseShape: s.sampleResponse,
    })),
    examples: {
      unauthenticated_returns_402: `curl -i ${req.protocol}://${req.get("host")}/api/gateway/svc_0g_inference`,
      dev_bypass: isProd() ? undefined : `curl -H "X-PAYMENT: dev-bypass" ${req.protocol}://${req.get("host")}/api/gateway/svc_0g_inference`,
    },
  });
});

// ─── Gateway ────────────────────────────────────────────────────────────────

async function unlockedResponse(req: Request, res: Response): Promise<void> {
  // withX402() already verified payment and attached req.x402.
  const x = (req as Request & { x402?: { service: Service; challengeId: string; requestHash: string; payer: string; txHash?: string; devBypass: boolean } }).x402;
  if (!x) {
    res.status(500).json({ error: "internal", detail: "x402 context missing" });
    return;
  }
  const { service } = x;
  const agentId = ((req.header("X-Agent-Id") ?? "anonymous").slice(0, 128).replace(/[^\x20-\x7E]/g, "") || "anonymous");
  const ws = service.workspaceIds[0] ?? "unknown";
  const receipt = appendReceipt({
    challengeId: x.challengeId,
    workspaceId: ws,
    serviceId: service.id,
    serviceName: service.name,
    agentId,
    payerWallet: x.payer,
    providerWallet: service.providerWallet || env.x402PayoutAddress,
    amount: service.priceUsd,
    currency: service.currency,
    network: service.network,
    txHash: x.txHash,
    requestHash: x.requestHash,
    status: x.txHash ? "verified" : "paid",
    paidAt: new Date().toISOString(),
    verifiedAt: x.txHash ? new Date().toISOString() : undefined,
  });
  // Fire-and-forget on-chain audit trail — does not block the response
  void mantleRecordDecision(receipt.id, JSON.stringify({ serviceId: service.id, amount: service.priceUsd }));
  void ogAnchorReceipt(receipt.id, JSON.stringify({ id: receipt.id, serviceId: service.id, paidAt: receipt.paidAt }));
  const payerAddr = /^0x[0-9a-fA-F]{40}$/.test(x.payer) ? x.payer : "";
  if (payerAddr) void mantleRecordPayment(payerAddr, service.priceUsd);

  // Fire-and-forget NFT mint — does not block the response
  if (payerAddr) {
    mintReceiptNFT({
      to: payerAddr,
      receiptId: receipt.id,
      serviceId: service.id,
      amount: service.priceUsd,
      currency: service.currency,
      paidAt: receipt.paidAt ?? new Date().toISOString(),
      txHash: x.txHash,
    }).then((r) => {
      if (r.ok && r.tokenId != null && r.txHash) {
        updateReceiptNft(receipt.id, r.tokenId, r.txHash);
      }
    }).catch(() => {/* non-critical */});
  }

  res.json({
    serviceId: service.id,
    name: service.name,
    data: service.sampleResponse,
    receiptId: receipt.id,
    receipt,
    note: x.devBypass
      ? "dev-bypass: this response simulates a settled x402 payment. Production verifies a real on-chain proof."
      : "x402 payment verified.",
  });
}

apiRouter.get("/gateway/:serviceId", withX402(), unlockedResponse);
apiRouter.post("/gateway/:serviceId", withX402(), unlockedResponse);

// ─── Receipts ───────────────────────────────────────────────────────────────

apiRouter.get("/receipts", (req: Request, res: Response) => {
  recordActivity("receipts.list");
  const workspaceId = asWorkspace(req.query["workspace"]);
  const serviceId = req.query["service"] ? String(req.query["service"]) : undefined;
  const agentId = req.query["agent"] ? String(req.query["agent"]) : undefined;
  const rows = listReceipts({ workspaceId, serviceId, agentId });
  res.json({ receipts: rows, count: rows.length });
});

apiRouter.get("/receipts/:id", (req: Request, res: Response) => {
  const r = receiptById(String(req.params["id"]));
  if (!r) return res.status(404).json({ error: "unknown_receipt" });
  res.json(r);
});

// ─── Receipt stats (Economy Dashboard) ─────────────────────────────────────

apiRouter.get("/receipts/stats", (_req: Request, res: Response) => {
  res.json(receiptStats());
});

// ─── AgentScore (computed from receipt history, mirrors AgentCreditRegistry.sol) ─

function computeAgentScore(agentId: string, receipts: { amount: number }[]) {
  const count = receipts.length;
  const volumeUsd = receipts.reduce((s, r) => s + r.amount, 0);
  const base = Math.min(count * 5, 500);
  const vol = Math.min(Math.floor(volumeUsd), 300);
  const score = Math.min(base + vol, 1000);
  const tier = score >= 850 ? "Platinum" : score >= 700 ? "Gold" : score >= 400 ? "Silver" : "Bronze";
  return { agentId, score, tier, receiptCount: count, volumeUsd: Math.round(volumeUsd * 100) / 100, breakdown: { base, vol, pen: 0 } };
}

apiRouter.get("/agent-score/:agentId", (req: Request, res: Response) => {
  const agentId = String(req.params["agentId"]);
  const receipts = listReceipts({ agentId });
  res.json(computeAgentScore(agentId, receipts));
});

// ─── SSE: live payment stream (Economy Dashboard) ──────────────────────────

apiRouter.get("/events/payments", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const recentRows = listReceipts().slice(0, 10);
  res.write(`data: ${JSON.stringify({ type: "snapshot", receipts: recentRows })}\n\n`);

  const unsub = onReceipt((r) => {
    res.write(`data: ${JSON.stringify({ type: "receipt", receipt: r })}\n\n`);
  });
  const unsubNft = onNftUpdate((receiptId, tokenId, txHash) => {
    res.write(`data: ${JSON.stringify({ type: "nft_update", receiptId, tokenId, txHash })}\n\n`);
  });

  const keepalive = setInterval(() => res.write(": ping\n\n"), 20_000);
  req.on("close", () => { unsub(); unsubNft(); clearInterval(keepalive); });
});

// ─── Status / observability ────────────────────────────────────────────────

const ARC_LOG = join(process.cwd(), "data", "arc-decisions.jsonl");
const ARC_DEPLOYMENT_CANDIDATES = [
  join(process.cwd(), "../contracts/deployments/arcTestnet.json"),
  join(process.cwd(), "contracts/deployments/arcTestnet.json"),
];

function readArcDecisionLog(): Record<string, unknown>[] {
  if (!existsSync(ARC_LOG)) return [];
  try {
    const lines = readFileSync(ARC_LOG, "utf8").trim().split("\n").filter(Boolean);
    return lines
      .slice(-50)
      .reverse()
      .map((l) => JSON.parse(l) as Record<string, unknown>);
  } catch {
    return [];
  }
}

function readArcDeployment(): { registry?: string; escrow?: string } {
  for (const file of ARC_DEPLOYMENT_CANDIDATES) {
    if (!existsSync(file)) continue;
    try {
      const data = JSON.parse(readFileSync(file, "utf8")) as { registry?: unknown; escrow?: unknown };
      return {
        registry: typeof data.registry === "string" ? data.registry : undefined,
        escrow: typeof data.escrow === "string" ? data.escrow : undefined,
      };
    } catch {
      return {};
    }
  }
  return {};
}

apiRouter.get("/arc-decisions", (_req: Request, res: Response) => {
  res.json({ decisions: readArcDecisionLog().slice(0, 20) });
});

apiRouter.post("/arc-traction/event", (req: Request, res: Response) => {
  const event = makeArcTractionEvent({
    type: req.body?.type,
    sessionId: req.body?.sessionId,
    wallet: req.body?.wallet,
    amountUsd: req.body?.amountUsd,
    feedbackPrompt: req.body?.feedbackPrompt,
    feedback: req.body?.feedback,
  });
  if (!event) return res.status(400).json({ error: "invalid_arc_traction_event" });
  appendArcTractionEvent(event);
  res.json({ ok: true, event });
});

apiRouter.get("/arc-traction/stats", (_req: Request, res: Response) => {
  const decisions = readArcDecisionLog();
  const stats = buildArcTractionStats(readArcTractionEvents(), decisions.length);
  res.json({ stats, ts: new Date().toISOString() });
});

apiRouter.post("/arc-trace/unlock", async (req: Request, res: Response) => {
  const wallet = cleanArcAddress(req.body?.wallet);
  const amountUsd = 0.01;
  if (!wallet) return res.status(400).json({ error: "wallet_required" });
  try {
    const payment = await verifyArcNativePayment({ txHash: req.body?.txHash, from: wallet, minAmountUsd: amountUsd });
    if (!payment.ok) return res.status(402).json({ error: "arc_payment_not_verified", reason: payment.reason });
    const session = typeof req.body?.sessionId === "string" ? req.body.sessionId : "anonymous";
    const receipt = appendReceipt({
      challengeId: `ch_trace_${payment.txHash.slice(2, 18)}`,
      workspaceId: "agora",
      serviceId: "svc_arc_reasoning",
      serviceName: "ArcMind Reasoning Trace Unlock",
      agentId: session.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "anonymous",
      payerWallet: wallet,
      providerWallet: env.x402PayoutAddress,
      amount: amountUsd,
      currency: "USDC",
      network: "arc-testnet",
      txHash: payment.txHash,
      requestHash: `trace:${payment.txHash}`,
      status: "verified",
      paidAt: new Date().toISOString(),
      verifiedAt: new Date().toISOString(),
    });
    const event = makeArcTractionEvent({
      type: "trace_unlock",
      sessionId: session,
      wallet,
      amountUsd,
    });
    if (event) appendArcTractionEvent(event);
    res.json({ ok: true, receipt });
  } catch (err) {
    res.status(502).json({ error: "arc_payment_verification_failed", detail: err instanceof Error ? err.message : "unknown" });
  }
});

apiRouter.post("/arc-portfolio/simulate", (req: Request, res: Response) => {
  const decisions = readArcDecisionLog();
  const simulation = buildPortfolioSimulation({
    latestDecision: decisions[0] ?? null,
    riskProfile: req.body?.riskProfile,
    amountUsd: req.body?.amountUsd,
    sessionId: req.body?.sessionId,
    selectedLeaderId: req.body?.selectedLeaderId,
    maxDrawdownPct: req.body?.maxDrawdownPct,
  });
  res.json({ ok: true, simulation, ts: new Date().toISOString() });
});

apiRouter.post("/arc-portfolio/start", async (req: Request, res: Response) => {
  const decisions = readArcDecisionLog();
  const mode = process.env.ARC_PRIVATE_KEY && process.env.ARC_AGENT_ID ? "arc" : "paper";
  const wallet = cleanArcAddress(req.body?.wallet);
  if (!wallet) return res.status(400).json({ error: "wallet_required" });
  const portfolio = buildProtectedPortfolio({
    latestDecision: decisions[0] ?? null,
    riskProfile: req.body?.riskProfile,
    amountUsd: req.body?.amountUsd,
    sessionId: req.body?.sessionId,
    wallet,
    mode,
  });
  try {
    const payment = await verifyArcNativePayment({ txHash: req.body?.txHash, from: wallet, minAmountUsd: portfolio.amountUsd });
    if (!payment.ok) return res.status(402).json({ error: "arc_payment_not_verified", reason: payment.reason });
  const receipt = appendReceipt({
    challengeId: `ch_${portfolio.portfolioId}`,
    workspaceId: "agora",
    serviceId: "svc_arc_copytrade",
    serviceName: "ArcMind CopyGuard Protected Portfolio",
    agentId: portfolio.sessionId,
    payerWallet: wallet,
    providerWallet: env.x402PayoutAddress,
    amount: portfolio.amountUsd,
    currency: "USDC",
    network: "arc-testnet",
      txHash: payment.txHash,
      requestHash: portfolio.requestHash,
      status: "verified",
    paidAt: portfolio.createdAt,
      verifiedAt: portfolio.createdAt,
  });
  const event = makeArcTractionEvent({
    type: "portfolio_start",
    sessionId: portfolio.sessionId,
    wallet: portfolio.wallet,
    amountUsd: portfolio.amountUsd,
  });
  if (event) appendArcTractionEvent(event);
  res.json({ ok: true, portfolio, receipt });
  } catch (err) {
    res.status(502).json({ error: "arc_payment_verification_failed", detail: err instanceof Error ? err.message : "unknown" });
  }
});

apiRouter.get("/arc-readiness", (_req: Request, res: Response) => {
  const decisions = readArcDecisionLog();
  const receipts = listReceipts({ workspaceId: "agora" });
  const stats = buildArcTractionStats(readArcTractionEvents(), decisions.length);
  const agoraServices = servicesForWorkspace("agora");
  const deployedContracts = readArcDeployment();
  const readiness = buildArcReadinessReport({
    env: process.env,
    x402PayoutAddress: env.x402PayoutAddress,
    x402Network: env.x402Network,
    deployedContracts,
    decisions,
    receipts,
    stats,
    agoraServiceCount: agoraServices.length,
  });
  res.json({
    ...readiness,
    ts: new Date().toISOString(),
  });
});

apiRouter.get("/arc-audit", (_req: Request, res: Response) => {
  const decisions = readArcDecisionLog();
  const receipts = listReceipts({ workspaceId: "agora" });
  const auditTrail = buildArcAuditTrail({
    registrationTxHash: process.env.ARC_AGENT_REGISTER_TX,
    decisions,
    receipts,
  });
  res.json({ auditTrail, ts: new Date().toISOString() });
});

apiRouter.get("/arc-alerts", (req: Request, res: Response) => {
  const threshold = Number(req.query["threshold"] ?? 50);
  const alerts = buildArcAlerts(readArcDecisionLog(), Number.isFinite(threshold) ? threshold : 50);
  res.json({ alerts, ts: new Date().toISOString() });
});

apiRouter.get("/arc-decision-replay/latest", (_req: Request, res: Response) => {
  const replay = buildArcDecisionReplay(readArcDecisionLog()[0] ?? null);
  res.json({ replay, ts: new Date().toISOString() });
});

apiRouter.get("/arc-signal-sources", (_req: Request, res: Response) => {
  res.json(buildArcSignalSourceRadar(process.env));
});

apiRouter.get("/arc-verify/latest", async (_req: Request, res: Response) => {
  const latest = readArcDecisionLog()[0];
  const txHash = typeof latest?.["txHash"] === "string" ? latest["txHash"] : undefined;
  let receiptState: { found: boolean; status?: number | null } = { found: false };
  if (txHash && process.env.ARC_RPC_URL) {
    try {
      const provider = new JsonRpcProvider(process.env.ARC_RPC_URL);
      const receipt = await provider.getTransactionReceipt(txHash);
      receiptState = { found: Boolean(receipt), status: receipt?.status ?? null };
    } catch {
      receiptState = { found: false };
    }
  }
  res.json({
    verification: evaluateArcDecisionVerification(latest, receiptState),
    ts: new Date().toISOString(),
  });
});

apiRouter.get("/arc-live", (_req: Request, res: Response) => {
  const decisions = readArcDecisionLog();
  const receipts = listReceipts({ workspaceId: "agora" });
  const stats = buildArcTractionStats(readArcTractionEvents(), decisions.length);
  const auditTrail = buildArcAuditTrail({
    registrationTxHash: process.env.ARC_AGENT_REGISTER_TX,
    decisions,
    receipts,
  });
  const alerts = buildArcAlerts(decisions);
  const decisionReplay = buildArcDecisionReplay(decisions[0] ?? null);
  res.json({
    status: {
      server: "online",
      mode: process.env.ARC_PRIVATE_KEY && process.env.ARC_AGENT_ID ? "arc" : "paper",
      network: "arc-testnet",
      nextLoopHintMinutes: 30,
      payoutAddress: env.x402PayoutAddress,
      agentId: process.env.ARC_AGENT_ID,
      registrationTxHash: process.env.ARC_AGENT_REGISTER_TX,
    },
    latestDecision: decisions[0] ?? null,
    decisions: decisions.slice(0, 10),
    receipts: receipts.slice(0, 10),
    stats,
    auditTrail,
    alerts,
    decisionReplay,
    ts: new Date().toISOString(),
  });
});

// ─── Signals aggregator (ArcMind Signal Hub) ─────────────────────────────────

interface HlCtx { openInterest: string; funding: string }
interface PmMarket { question: string; outcomePrices?: string[]; volume24hr?: number }

apiRouter.get("/signals", async (_req: Request, res: Response) => {
  let whale: { available: boolean; netFlow: number | null; direction: "bullish" | "bearish" | "neutral"; status: string } = {
    available: false,
    netFlow: null,
    direction: "neutral",
    status: "hyperliquid_unavailable",
  };
  try {
    const hlRes = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "metaAndAssetCtxs" }),
      signal: AbortSignal.timeout(7_000),
    });
    if (hlRes.ok) {
      const hlData = await hlRes.json() as [{ universe: { name: string }[] }, HlCtx[]];
      const ethIdx = hlData[0].universe.findIndex((u) => u.name === "ETH");
      if (ethIdx >= 0 && hlData[1][ethIdx]) {
        const ctx = hlData[1][ethIdx];
        const oi  = parseFloat(ctx.openInterest);
        const fr  = parseFloat(ctx.funding);
        whale = {
          available: Number.isFinite(oi),
          netFlow: Number.isFinite(oi) ? parseFloat((oi / 1e6).toFixed(1)) : null,
          direction: (!isNaN(fr) && fr > 0.0001) ? "bullish" : (!isNaN(fr) && fr < -0.0001) ? "bearish" : "neutral",
          status: "live",
        };
      }
    }
  } catch { /* source stays unavailable */ }

  let polymarket: { available: boolean; question: string | null; yesPct: number | null; volume24h: number | null; status: string } = {
    available: false,
    question: null,
    yesPct: null,
    volume24h: null,
    status: "polymarket_unavailable",
  };
  try {
    const pmRes = await fetch(
      "https://gamma-api.polymarket.com/markets?tag=crypto&limit=5&active=true",
      { signal: AbortSignal.timeout(6_000) }
    );
    if (pmRes.ok) {
      const pmData = await pmRes.json() as PmMarket[];
      const mkt = Array.isArray(pmData) ? pmData[0] : null;
      if (mkt) {
        const prices = Array.isArray(mkt.outcomePrices) ? mkt.outcomePrices.map(Number) : [0.5];
        const yesPct = Number.isFinite(prices[0]) ? Math.round((prices[0] ?? 0.5) * 100) : null;
        polymarket = {
          available: yesPct !== null,
          question: mkt.question ?? null,
          yesPct,
          volume24h: typeof mkt.volume24hr === "number" ? mkt.volume24hr : null,
          status: "live",
        };
      }
    }
  } catch { /* source stays unavailable */ }

  let ethPrice: number | null = null;
  try {
    const cgRes = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
      { signal: AbortSignal.timeout(6_000) }
    );
    if (cgRes.ok) {
      const cgData = await cgRes.json() as { ethereum?: { usd?: number } };
      ethPrice = typeof cgData?.ethereum?.usd === "number" ? cgData.ethereum.usd : null;
    }
  } catch { /* source stays unavailable */ }

  res.json({
    polymarket,
    whale,
    ethPrice,
    sources: {
      hyperliquid: whale.available ? "live" : "unavailable",
      polymarket: polymarket.available ? "live" : "unavailable",
      coingecko: ethPrice !== null ? "live" : "unavailable",
    },
    ts: new Date().toISOString(),
  });
});

// ─── USYC APY (DeFiLlama → Circle USYC pool) ─────────────────────────────────

interface LlamaPool { symbol: string; apy: number; project?: string }

apiRouter.get("/usyc-apy", async (_req: Request, res: Response) => {
  try {
    const r = await fetch("https://yields.llama.fi/pools", { signal: AbortSignal.timeout(8_000) });
    if (r.ok) {
      const data = await r.json() as { data: LlamaPool[] };
      const pool = data.data?.find(p => p.symbol?.toUpperCase().includes("USYC"));
      if (pool?.apy) {
        const apy = parseFloat(pool.apy.toFixed(2));
        return res.json({ apy, asset: "USYC", provider: "DeFiLlama", network: "arc-testnet", ts: new Date().toISOString() });
      }
    }
  } catch { /* handled below */ }
  res.status(503).json({ ok: false, reason: "usyc_apy_unavailable", asset: "USYC", provider: "DeFiLlama", network: "arc-testnet", ts: new Date().toISOString() });
});

// ─── Swap quote (real ETH price via CoinGecko) ────────────────────────────────

apiRouter.get("/swap-quote", async (req: Request, res: Response) => {
  const side = String(req.query["side"] ?? "BUY").toUpperCase() === "SELL" ? "SELL" : "BUY";
  const amountIn = Math.min(Math.max(parseFloat(String(req.query["amountIn"] ?? "100")) || 100, 0.001), 1_000_000);

  let ethPrice: number | null = null;
  try {
    const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd", { signal: AbortSignal.timeout(6_000) });
    if (r.ok) {
      const d = await r.json() as { ethereum?: { usd?: number } };
      ethPrice = typeof d?.ethereum?.usd === "number" ? d.ethereum.usd : null;
    }
  } catch { /* handled below */ }
  if (ethPrice === null) {
    return res.status(503).json({ error: "eth_price_unavailable", source: "coingecko", ts: new Date().toISOString() });
  }

  const slippage = 0.001; // 0.1%
  const amountOut = side === "BUY"
    ? parseFloat(((amountIn / ethPrice) * (1 - slippage)).toFixed(8))
    : parseFloat((amountIn * ethPrice * (1 - slippage)).toFixed(4));

  res.json({ pair: "ETH/USDC", side, amountIn, amountOut, price: ethPrice, slippagePct: 0.1, network: "arc-testnet", ts: new Date().toISOString() });
});

// ─── Multi-agent debate (Bullish vs Bearish) ──────────────────────────────────

const BULLISH_ARGS = [
  (eth: number, oi: string) => `ETH at $${eth.toLocaleString()} with OI ${oi} signals accumulation. Institutional buyers are absorbing sell pressure. Kelly sizing suggests 18% long.`,
  (eth: number) => `$${eth.toLocaleString()} is a structural support zone on the 4h chart. Funding rate normalized — ideal entry for a mean-reversion long.`,
  (_eth: number, oi: string) => `Open interest ${oi} expanding while price holds. Shorts are getting squeezed. Momentum favors the bulls.`,
];
const BEARISH_ARGS = [
  (eth: number, oi: string) => `OI ${oi} at elevated levels with ETH at $${eth.toLocaleString()} — classic overextension. Risk of long squeeze if price breaks support.`,
  (eth: number) => `$${eth.toLocaleString()} rejected at resistance twice. Funding rate elevated — longs overleveraged. SELL signal.`,
  (_eth: number, oi: string) => `Open interest ${oi} diverging from price — bearish. Smart money is reducing exposure. Short the bounce.`,
];

apiRouter.get("/arc-debate", async (_req: Request, res: Response) => {
  let ethPrice: number | null = null;
  let oiValue: string | null = null;
  let fundingRate: number | null = null;
  try {
    const cg = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd", { signal: AbortSignal.timeout(6_000) });
    const cgData = await cg.json() as { ethereum?: { usd?: number } };
    ethPrice = typeof cgData?.ethereum?.usd === "number" ? cgData.ethereum.usd : null;
  } catch { /* handled below */ }
  try {
    const hl = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "metaAndAssetCtxs" }), signal: AbortSignal.timeout(6_000),
    });
    const hlData = await hl.json() as [{ universe: { name: string }[] }, { openInterest: string; funding?: string }[]];
    const idx = hlData[0].universe.findIndex(u => u.name === "ETH");
    if (idx >= 0 && hlData[1][idx]) {
      const oi = parseFloat(hlData[1][idx].openInterest);
      oiValue = Number.isFinite(oi) ? `${(oi / 1e6).toFixed(1)}M` : null;
      const fr = parseFloat(hlData[1][idx].funding ?? "");
      fundingRate = Number.isFinite(fr) ? fr : null;
    }
  } catch { /* handled below */ }
  if (ethPrice === null || oiValue === null) {
    return res.status(503).json({ ok: false, reason: "live_sources_unavailable", ts: new Date().toISOString() });
  }

  const fundingSignal = fundingRate ?? 0;
  const fallbackBull = (eth: number, oi: string) =>
    `ETH at $${eth.toLocaleString()} with OI ${oi} signals accumulation. Kelly sizing suggests a cautious long.`;
  const fallbackBear = (eth: number, oi: string) =>
    `OI ${oi} with ETH at $${eth.toLocaleString()} suggests crowding risk. Reduce exposure until confirmation improves.`;
  const bullArg = (BULLISH_ARGS[0] ?? fallbackBull)(ethPrice, oiValue);
  const bearArg = (BEARISH_ARGS[0] ?? fallbackBear)(ethPrice, oiValue);
  const verdict: "BUY" | "SELL" | "HOLD" = fundingSignal > 0.0001 ? "BUY" : fundingSignal < -0.0001 ? "SELL" : "HOLD";

  res.json({ ethPrice, oiValue, bullArg, bearArg, verdict, fundingRate, ts: new Date().toISOString() });
});

// ─── Agent leaderboard ────────────────────────────────────────────────────────

apiRouter.get("/leaderboard", (_req: Request, res: Response) => {
  const all = listReceipts();
  const byAgent = new Map<string, { amount: number }[]>();
  for (const r of all) {
    if (!byAgent.has(r.agentId)) byAgent.set(r.agentId, []);
    byAgent.get(r.agentId)!.push({ amount: r.amount });
  }
  const rows = Array.from(byAgent.entries())
    .map(([agentId, receipts]) => {
      const s = computeAgentScore(agentId, receipts);
      return { agentId, score: s.score, tier: s.tier, receipts: receipts.length, volumeUsd: s.volumeUsd };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  res.json({ leaderboard: rows, ts: new Date().toISOString() });
});

export const statusRouter = Router();

statusRouter.get("/health", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: "tollgate-server",
    nodeEnv: env.nodeEnv,
    defaultNetwork: env.x402Network,
    defaultAsset: env.x402Asset,
    payoutAddress: env.x402PayoutAddress,
    serviceCount: services.length,
    agentCount: agents.length,
  });
});

statusRouter.get("/activity", (_req: Request, res: Response) => {
  res.json({ ...activitySnapshot() });
});

statusRouter.get("/x402-log", (_req: Request, res: Response) => {
  res.json({ calls: x402Log.slice(-100).reverse() });
});
