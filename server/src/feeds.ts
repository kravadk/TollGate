// x402-gated Mantle price / yield feeds.
// GET /api/feeds/mnt-price  → 402 challenge (svc_mnt_liq, $0.04)
// GET /api/feeds/mnt-yield  → 402 challenge (svc_mnt_meth, $0.10)
// GET /api/feeds/mnt-rwa    → 402 challenge (svc_mnt_rwa,  $0.06)
//
// The withX402() middleware reads req.params.serviceId; the forService()
// helper injects that param before the middleware runs.

import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import { withX402 } from "./x402.js";
import { appendReceipt } from "./store.js";
import { serviceById } from "./data.js";
import { env } from "./env.js";

function forService(id: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.params["serviceId"] = id;
    next();
  };
}

function feedHandler(req: Request, res: Response): void {
  const x = (req as Request & { x402?: { service: ReturnType<typeof serviceById>; challengeId: string; requestHash: string; payer: string; txHash?: string; devBypass: boolean } }).x402;
  if (!x || !x.service) { res.status(500).json({ error: "x402 context missing" }); return; }

  const { service } = x;
  const agentId = ((req.header("X-Agent-Id") ?? "anonymous").slice(0, 128).replace(/[^\x20-\x7E]/g, "") || "anonymous");
  const ws = service.workspaceIds[0] ?? "mantle";

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

  res.json({ ...(service.sampleResponse as Record<string, unknown>), receiptId: receipt.id, ts: new Date().toISOString() });
}

export const feedsRouter = Router();

// #20 Real Agni Finance on-chain liquidity via DeFiLlama pools API.
async function agniLiquidityHandler(req: Request, res: Response): Promise<void> {
  const x = (req as Request & { x402?: { service: ReturnType<typeof serviceById>; challengeId: string; requestHash: string; payer: string; txHash?: string; devBypass: boolean } }).x402;
  if (!x || !x.service) { res.status(500).json({ error: "x402 context missing" }); return; }

  const { service } = x;
  const agentId = ((req.header("X-Agent-Id") ?? "anonymous").slice(0, 128).replace(/[^\x20-\x7E]/g, "") || "anonymous");
  const ws = service.workspaceIds[0] ?? "mantle";

  appendReceipt({
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

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const resp = await fetch("https://yields.llama.fi/pools", { signal: ctrl.signal });
    clearTimeout(t);
    type Pool = { chain: string; project: string; symbol: string; tvlUsd: number; apy: number; pool: string };
    const all = (await resp.json()) as { data: Pool[] };
    const mantlePools = all.data
      .filter((p) => p.chain === "Mantle" && p.tvlUsd > 100_000)
      .sort((a, b) => b.tvlUsd - a.tvlUsd)
      .slice(0, 8)
      .map((p) => ({ symbol: p.symbol, tvlUsd: Math.round(p.tvlUsd), apy: p.apy, pool: p.pool, project: p.project }));
    res.json({ pools: mantlePools, source: "DeFiLlama", ts: new Date().toISOString() });
  } catch {
    res.json({
      pools: [
        { symbol: "mETH-USDT", tvlUsd: 12_400_000, apy: 3.9, pool: "agni-meth-usdt", project: "agni-finance" },
        { symbol: "USDY-USDC", tvlUsd: 8_200_000, apy: 5.1, pool: "agni-usdy-usdc", project: "agni-finance" },
      ],
      source: "fallback",
      ts: new Date().toISOString(),
    });
  }
}

feedsRouter.get("/mnt-price",     forService("svc_mnt_liq"),  withX402(), feedHandler);
feedsRouter.get("/mnt-yield",     forService("svc_mnt_meth"), withX402(), feedHandler);
feedsRouter.get("/mnt-rwa",       forService("svc_mnt_rwa"),  withX402(), feedHandler);
feedsRouter.get("/mnt-liquidity", forService("svc_mnt_liq"),  withX402(), (req, res) => { void agniLiquidityHandler(req, res); });

// Arc L1 / ArcMind feeds — x402-gated Nanopayments on Arc testnet
feedsRouter.get("/arc-oracle",    forService("svc_arc_oracle"),       withX402(), feedHandler);
feedsRouter.get("/arc-signal-hl", forService("svc_arc_signal_hl"),    withX402(), feedHandler);
feedsRouter.get("/arc-signal-pm", forService("svc_arc_signal_poly"),  withX402(), feedHandler);
feedsRouter.get("/arc-signal-nw", forService("svc_arc_signal_news"),  withX402(), feedHandler);
feedsRouter.get("/arc-signal-wh", forService("svc_arc_signal_whale"), withX402(), feedHandler);
feedsRouter.get("/arc-trace/:id", forService("svc_arc_reasoning"),    withX402(), feedHandler);
