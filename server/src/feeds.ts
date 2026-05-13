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
  const agentId = req.header("X-Agent-Id") ?? "anonymous";
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

feedsRouter.get("/mnt-price", forService("svc_mnt_liq"),  withX402(), feedHandler);
feedsRouter.get("/mnt-yield", forService("svc_mnt_meth"), withX402(), feedHandler);
feedsRouter.get("/mnt-rwa",   forService("svc_mnt_rwa"),  withX402(), feedHandler);

// Arc L1 / ArcMind feeds — x402-gated Nanopayments on Arc testnet
feedsRouter.get("/arc-oracle",    forService("svc_arc_oracle"),       withX402(), feedHandler);
feedsRouter.get("/arc-signal-hl", forService("svc_arc_signal_hl"),    withX402(), feedHandler);
feedsRouter.get("/arc-signal-pm", forService("svc_arc_signal_poly"),  withX402(), feedHandler);
feedsRouter.get("/arc-signal-nw", forService("svc_arc_signal_news"),  withX402(), feedHandler);
feedsRouter.get("/arc-signal-wh", forService("svc_arc_signal_whale"), withX402(), feedHandler);
feedsRouter.get("/arc-trace/:id", forService("svc_arc_reasoning"),    withX402(), feedHandler);
