// In-memory stores: activity tracker (ported from kravadk/XSight- server/src/services/activityTracker.ts,
// generalized), x402 challenge store (replay + expiry), and the receipt ledger.
// Swap these for a real DB if you outgrow a single process.

import { randomUUID } from "node:crypto";
import type { PaymentChallenge, Receipt, X402CallLogEntry } from "./types.js";

// ─── Activity tracker ───────────────────────────────────────────────────────

export type ActivityKind =
  | "gateway.402"
  | "gateway.paid"
  | "gateway.rejected"
  | "gateway.replayed"
  | "gateway.expired"
  | "services.list"
  | "agents.list"
  | "receipts.list"
  | "spec.read"
  | "mcp.initialize"
  | "mcp.tools.list"
  | "mcp.tools.call"
  | "og.upload";

export interface ActivityEvent {
  timestamp: number;
  kind: ActivityKind;
  detail?: string;
}

interface CounterState {
  total: number;
  byKind: Record<string, number>;
  lastEventAt: number;
  recent: ActivityEvent[];
}

const RECENT_LIMIT = 100;
const activity: CounterState = { total: 0, byKind: {}, lastEventAt: 0, recent: [] };

export function recordActivity(kind: ActivityKind, detail?: string): void {
  const event: ActivityEvent = { timestamp: Date.now(), kind, detail };
  activity.total += 1;
  activity.byKind[kind] = (activity.byKind[kind] ?? 0) + 1;
  activity.lastEventAt = event.timestamp;
  activity.recent.unshift(event);
  if (activity.recent.length > RECENT_LIMIT) activity.recent.pop();
}

export function activitySnapshot() {
  return {
    totalCalls: activity.total,
    byKind: { ...activity.byKind },
    lastEventAt: activity.lastEventAt,
    paid: activity.byKind["gateway.paid"] ?? 0,
    rejected: activity.byKind["gateway.rejected"] ?? 0,
    challenges402: activity.byKind["gateway.402"] ?? 0,
    replays: activity.byKind["gateway.replayed"] ?? 0,
    mcpCalls: activity.byKind["mcp.tools.call"] ?? 0,
    recent: activity.recent.slice(0, 50),
  };
}

// ─── x402 call log (rejected + paid, like XSight's x402Log) ────────────────

export const x402Log: X402CallLogEntry[] = [];

export function logX402Call(entry: X402CallLogEntry): void {
  x402Log.push(entry);
  if (x402Log.length > 500) x402Log.shift();
}

// ─── Challenge store (replay protection + expiry) ──────────────────────────

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const challenges = new Map<string, PaymentChallenge>();

export function issueChallenge(input: {
  serviceId: string;
  amount: string;
  currency: string;
  network: string;
  payTo: string;
  requestHash: string;
}): PaymentChallenge {
  const now = Date.now();
  const challenge: PaymentChallenge = {
    challengeId: "ch_" + randomUUID().replace(/-/g, "").slice(0, 24),
    ...input,
    createdAt: now,
    expiresAt: now + CHALLENGE_TTL_MS,
    used: false,
  };
  challenges.set(challenge.challengeId, challenge);
  // Opportunistic GC.
  for (const [id, c] of challenges) if (c.expiresAt < now - CHALLENGE_TTL_MS) challenges.delete(id);
  return challenge;
}

export type ChallengeCheck =
  | { ok: true; challenge: PaymentChallenge }
  | { ok: false; reason: "unknown" | "expired" | "replayed" | "service_mismatch" | "request_mismatch" };

export function consumeChallenge(id: string, serviceId: string, requestHash: string): ChallengeCheck {
  const c = challenges.get(id);
  if (!c) return { ok: false, reason: "unknown" };
  if (c.used) return { ok: false, reason: "replayed" };
  if (c.expiresAt < Date.now()) return { ok: false, reason: "expired" };
  if (c.serviceId !== serviceId) return { ok: false, reason: "service_mismatch" };
  if (c.requestHash !== requestHash) return { ok: false, reason: "request_mismatch" };
  c.used = true;
  return { ok: true, challenge: c };
}

// ─── Receipt ledger ─────────────────────────────────────────────────────────

const receipts: Receipt[] = [];

export function appendReceipt(r: Omit<Receipt, "id" | "createdAt"> & Partial<Pick<Receipt, "id" | "createdAt">>): Receipt {
  const receipt: Receipt = {
    id: r.id ?? "rcpt_" + randomUUID().replace(/-/g, "").slice(0, 20),
    createdAt: r.createdAt ?? new Date().toISOString(),
    ...r,
  } as Receipt;
  receipts.unshift(receipt);
  if (receipts.length > 1000) receipts.pop();
  return receipt;
}

export function listReceipts(filter?: { workspaceId?: string; serviceId?: string; agentId?: string }): Receipt[] {
  return receipts.filter((r) =>
    (!filter?.workspaceId || r.workspaceId === filter.workspaceId) &&
    (!filter?.serviceId || r.serviceId === filter.serviceId) &&
    (!filter?.agentId || r.agentId === filter.agentId),
  );
}

export function receiptById(id: string): Receipt | undefined {
  return receipts.find((r) => r.id === id);
}
