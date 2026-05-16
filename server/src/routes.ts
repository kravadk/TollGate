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
import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { env, isProd } from "./env.js";
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

apiRouter.get("/arc-decisions", (_req: Request, res: Response) => {
  if (!existsSync(ARC_LOG)) return res.json({ decisions: [] });
  try {
    const lines = readFileSync(ARC_LOG, "utf8").trim().split("\n").filter(Boolean);
    const decisions = lines
      .slice(-20)
      .reverse()
      .map((l) => JSON.parse(l) as Record<string, unknown>);
    res.json({ decisions });
  } catch {
    res.json({ decisions: [] });
  }
});

// ─── Signals aggregator (ArcMind Signal Hub) ─────────────────────────────────

interface HlCtx { openInterest: string; funding: string }
interface PmMarket { question: string; outcomePrices?: string[]; volume24hr?: number }

apiRouter.get("/signals", async (_req: Request, res: Response) => {
  let whale: { netFlow: number; direction: "bullish" | "bearish" | "neutral" } = { netFlow: 0, direction: "neutral" };
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
          netFlow: isNaN(oi) ? 0 : parseFloat((oi / 1e6).toFixed(1)),
          direction: (!isNaN(fr) && fr > 0.0001) ? "bullish" : (!isNaN(fr) && fr < -0.0001) ? "bearish" : "neutral",
        };
      }
    }
  } catch { /* fallback */ }

  let polymarket: { question: string; yesPct: number; volume24h: number } =
    { question: "ETH above $3000 by EOY?", yesPct: 50, volume24h: 0 };
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
        polymarket = {
          question: mkt.question ?? polymarket.question,
          yesPct: Math.round((prices[0] ?? 0.5) * 100),
          volume24h: mkt.volume24hr ?? 0,
        };
      }
    }
  } catch { /* fallback */ }

  let ethPrice = 0;
  try {
    const cgRes = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
      { signal: AbortSignal.timeout(6_000) }
    );
    if (cgRes.ok) {
      const cgData = await cgRes.json() as { ethereum?: { usd?: number } };
      ethPrice = cgData?.ethereum?.usd ?? 0;
    }
  } catch { /* fallback */ }

  res.json({ polymarket, whale, ethPrice, ts: new Date().toISOString() });
});

// ─── USYC APY (DeFiLlama → Circle USYC pool) ─────────────────────────────────

interface LlamaPool { symbol: string; apy: number; project?: string }

apiRouter.get("/usyc-apy", async (_req: Request, res: Response) => {
  let apy = 5.1; // Circle USYC typical APY fallback
  try {
    const r = await fetch("https://yields.llama.fi/pools", { signal: AbortSignal.timeout(8_000) });
    if (r.ok) {
      const data = await r.json() as { data: LlamaPool[] };
      const pool = data.data?.find(p => p.symbol?.toUpperCase().includes("USYC"));
      if (pool?.apy) apy = parseFloat(pool.apy.toFixed(2));
    }
  } catch { /* fallback */ }
  res.json({ apy, asset: "USYC", provider: "Circle", network: "arc-testnet", ts: new Date().toISOString() });
});

// ─── Swap quote (real ETH price via CoinGecko) ────────────────────────────────

apiRouter.get("/swap-quote", async (req: Request, res: Response) => {
  const side = String(req.query["side"] ?? "BUY").toUpperCase() === "SELL" ? "SELL" : "BUY";
  const amountIn = Math.min(Math.max(parseFloat(String(req.query["amountIn"] ?? "100")) || 100, 0.001), 1_000_000);

  let ethPrice = 3412.5;
  try {
    const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd", { signal: AbortSignal.timeout(6_000) });
    if (r.ok) {
      const d = await r.json() as { ethereum?: { usd?: number } };
      ethPrice = d?.ethereum?.usd ?? ethPrice;
    }
  } catch { /* fallback */ }

  const slippage = 0.001; // 0.1%
  const amountOut = side === "BUY"
    ? parseFloat(((amountIn / ethPrice) * (1 - slippage)).toFixed(8))
    : parseFloat((amountIn * ethPrice * (1 - slippage)).toFixed(4));

  res.json({ pair: "ETH/USDC", side, amountIn, amountOut, price: ethPrice, slippagePct: 0.1, network: "arc-testnet", ts: new Date().toISOString() });
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
