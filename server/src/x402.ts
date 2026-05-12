// x402 payment-gate middleware. Ported from kravadk/XSight- (server/src/middleware/x402.ts)
// and extended for TollGate's workspace/service model:
//  - issues a per-request PaymentChallenge with a requestHash + 5-min expiry
//  - verifies the X-PAYMENT proof against the challenge (replay-safe, single-use)
//  - "X-PAYMENT: dev-bypass" works only when NODE_ENV != production
//  - logs every call (paid + rejected) and bumps the activity tracker
//
// Wire it per route:  router.get("/:serviceId", withX402(), handler)

import { createHash } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env, isProd } from "./env.js";
import { serviceById } from "./data.js";
import {
  consumeChallenge,
  issueChallenge,
  logX402Call,
  recordActivity,
} from "./store.js";
import type { Service, X402PaymentProof } from "./types.js";

if (!isProd()) {
  console.warn('[x402] dev-bypass enabled — set NODE_ENV=production to disable');
}

export function requestHashFor(req: Request, serviceId: string): string {
  const basis = JSON.stringify({
    serviceId,
    method: req.method,
    path: req.path,
    query: req.query ?? {},
    agent: req.header("X-Agent-Id") ?? "anonymous",
  });
  return "0x" + createHash("sha256").update(basis).digest("hex");
}

function parsePaymentHeader(header: string): X402PaymentProof | null {
  try {
    const obj = JSON.parse(Buffer.from(header, "base64").toString("utf-8")) as X402PaymentProof;
    if (typeof obj.payTo !== "string" || typeof obj.amount !== "string") return null;
    return obj;
  } catch {
    return null;
  }
}

function challengeBody(service: Service, opts: {
  challengeId: string; amount: string; payTo: string; network: string; currency: string; requestHash: string; expiresAt: number;
}) {
  return {
    x402Version: 1,
    error: "payment_required",
    challenge: {
      challengeId: opts.challengeId,
      serviceId: service.id,
      amount: opts.amount,
      currency: opts.currency,
      network: opts.network,
      payTo: opts.payTo,
      requestHash: opts.requestHash,
      expiresAt: new Date(opts.expiresAt).toISOString(),
    },
    accepts: [
      {
        scheme: "exact",
        network: opts.network,
        asset: opts.currency,
        amount: opts.amount,
        payTo: opts.payTo,
        description: service.description,
        gasSponsored: true,
      },
    ],
  };
}

/** Resolve the :serviceId param into a known active service, or null. */
export function resolveService(req: Request): Service | null {
  const id = String(req.params["serviceId"] ?? "");
  const svc = serviceById(id);
  if (!svc || svc.status !== "active") return null;
  return svc;
}

export function withX402() {
  return (req: Request, res: Response, next: NextFunction) => {
    const service = resolveService(req);
    if (!service) {
      res.status(404).json({ error: "unknown_service", serviceId: req.params["serviceId"] ?? null });
      return;
    }

    const endpoint = req.originalUrl;
    const amount = service.priceUsd.toString();
    const currency = service.currency;
    const network = service.network;
    const payTo = service.providerWallet || env.x402PayoutAddress;
    const reqHash = requestHashFor(req, service.id);
    const header = req.header("X-PAYMENT");

    // No payment → 402 with a fresh challenge.
    if (!header) {
      const ch = issueChallenge({ serviceId: service.id, amount, currency, network, payTo, requestHash: reqHash });
      logX402Call({ timestamp: Date.now(), endpoint, serviceId: service.id, caller: req.header("X-Agent-Id") ?? "anonymous", amount: service.priceUsd, asset: currency, status: "rejected", reason: "no_payment" });
      recordActivity("gateway.402", service.id);
      res.status(402).json(challengeBody(service, { challengeId: ch.challengeId, amount, payTo, network, currency, requestHash: reqHash, expiresAt: ch.expiresAt }));
      return;
    }

    // Dev bypass — still requires a challenge round-trip in spirit; we mint+consume one.
    if (header === "dev-bypass" && !isProd()) {
      const ch = issueChallenge({ serviceId: service.id, amount, currency, network, payTo, requestHash: reqHash });
      consumeChallenge(ch.challengeId, service.id, reqHash);
      logX402Call({ timestamp: Date.now(), endpoint, serviceId: service.id, caller: "dev-bypass", amount: service.priceUsd, asset: currency, status: "paid", reason: "dev_bypass" });
      recordActivity("gateway.paid", service.id);
      (req as Request & { x402?: unknown }).x402 = { challengeId: ch.challengeId, requestHash: reqHash, payer: "dev-bypass", devBypass: true, service };
      next();
      return;
    }

    const proof = parsePaymentHeader(header);
    if (!proof) {
      logX402Call({ timestamp: Date.now(), endpoint, serviceId: service.id, caller: "invalid", amount: service.priceUsd, asset: currency, status: "rejected", reason: "invalid_header" });
      recordActivity("gateway.rejected", service.id);
      res.status(402).json({ error: "invalid_payment_header" });
      return;
    }

    // Need a challengeId to bind the proof to a challenge.
    if (!proof.challengeId) {
      logX402Call({ timestamp: Date.now(), endpoint, serviceId: service.id, caller: proof.payer ?? "unknown", amount: Number(proof.amount), asset: currency, status: "rejected", reason: "missing_challenge_id" });
      recordActivity("gateway.rejected", service.id);
      res.status(402).json({ error: "missing_challenge_id" });
      return;
    }

    const check = consumeChallenge(proof.challengeId, service.id, reqHash);
    if (!check.ok) {
      const kind = check.reason === "replayed" ? "gateway.replayed" : check.reason === "expired" ? "gateway.expired" : "gateway.rejected";
      logX402Call({ timestamp: Date.now(), endpoint, serviceId: service.id, caller: proof.payer ?? "unknown", amount: Number(proof.amount), asset: currency, status: "rejected", reason: check.reason });
      recordActivity(kind, service.id);
      res.status(402).json({ error: "challenge_invalid", reason: check.reason });
      return;
    }

    const isValidAddress = /^0x[0-9a-fA-F]{40}$/.test(proof.payTo);
    const matchesPayTo = isValidAddress && proof.payTo.toLowerCase() === payTo.toLowerCase();
    const matchesAmount = Number(proof.amount) >= service.priceUsd;
    const matchesNetwork = proof.network === network;
    const matchesAsset = proof.asset === currency;
    const valid = matchesPayTo && matchesAmount && matchesNetwork && matchesAsset;

    if (!valid) {
      logX402Call({ timestamp: Date.now(), endpoint, serviceId: service.id, caller: proof.payer ?? "unknown", amount: Number(proof.amount), asset: currency, status: "rejected", reason: "verification_failed" });
      recordActivity("gateway.rejected", service.id);
      res.status(402).json({
        error: "payment_verification_failed",
        details: { matchesPayTo, matchesAmount, matchesNetwork, matchesAsset },
      });
      return;
    }

    logX402Call({ timestamp: Date.now(), endpoint, serviceId: service.id, caller: proof.payer ?? (isValidAddress ? proof.payTo.slice(0, 12) : "unknown"), amount: Number(proof.amount), asset: currency, status: "paid" });
    recordActivity("gateway.paid", service.id);
    (req as Request & { x402?: unknown }).x402 = { challengeId: proof.challengeId, requestHash: reqHash, payer: proof.payer ?? proof.payTo, txHash: proof.txHash, devBypass: false, service };
    next();
  };
}
