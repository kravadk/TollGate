import { createHash } from "node:crypto";
import type { CopyGuardAction, CopyGuardRiskProfile } from "./arc-copyguard.js";

type DecisionAllocation = {
  leaderId: string;
  name: string;
  weightPct: number;
  action: CopyGuardAction;
};

type LatestDecisionLike = {
  ts?: string;
  decisionHash?: string;
  copyGuardHash?: string;
  allocation?: DecisionAllocation[];
};

export type ProtectedPortfolio = {
  portfolioId: string;
  riskProfile: CopyGuardRiskProfile;
  amountUsd: number;
  sessionId: string;
  wallet?: string;
  mode: "paper" | "arc";
  decisionHash?: string;
  copyGuardHash?: string;
  copyAllocations: Array<{
    leaderId: string;
    name: string;
    weightPct: number;
    notionalUsd: number;
    action: CopyGuardAction;
  }>;
  blockedLeaders: Array<{ leaderId: string; name: string; action: CopyGuardAction }>;
  riskOff: { asset: "USDC" | "USYC"; weightPct: number; notionalUsd: number };
  requestHash: string;
  createdAt: string;
};

export type PortfolioSimulation = {
  readOnly: true;
  portfolio: ProtectedPortfolio;
  selectedLeader?: {
    leaderId: string;
    name: string;
    weightPct: number;
    action: CopyGuardAction;
  };
  expectedStopThresholdPct: number;
  estimatedFeesUsd: number;
  summary: string;
};

function round(n: number, digits = 2): number {
  const scale = 10 ** digits;
  return Math.round(n * scale) / scale;
}

function cleanSessionId(v: unknown): string {
  if (typeof v !== "string") return "anonymous";
  const clean = v.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  return clean || "anonymous";
}

function cleanWallet(v: unknown): string | undefined {
  return typeof v === "string" && /^0x[0-9a-fA-F]{40}$/.test(v) ? v : undefined;
}

function hashPayload(payload: unknown): string {
  return "0x" + createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function normalizeRiskProfile(v: unknown): CopyGuardRiskProfile {
  return v === "conservative" || v === "balanced" || v === "aggressive" ? v : "balanced";
}

export function normalizePortfolioAmount(v: unknown): number {
  const raw = typeof v === "number" && Number.isFinite(v) ? v : 10;
  return round(Math.min(10_000, Math.max(1, raw)), 2);
}

export function buildProtectedPortfolio(input: {
  latestDecision?: LatestDecisionLike | null;
  riskProfile: unknown;
  amountUsd: unknown;
  sessionId: unknown;
  wallet?: unknown;
  mode?: "paper" | "arc";
  nowIso?: string;
}): ProtectedPortfolio {
  const riskProfile = normalizeRiskProfile(input.riskProfile);
  const amountUsd = normalizePortfolioAmount(input.amountUsd);
  const sessionId = cleanSessionId(input.sessionId);
  const wallet = cleanWallet(input.wallet);
  const createdAt = input.nowIso ?? new Date().toISOString();
  const allocations = Array.isArray(input.latestDecision?.allocation)
    ? input.latestDecision.allocation
    : [];

  const copyAllocations = allocations
    .filter((a) => a.action === "COPY" || a.action === "REDUCE")
    .filter((a) => Number.isFinite(a.weightPct) && a.weightPct > 0)
    .map((a) => ({
      leaderId: String(a.leaderId),
      name: String(a.name),
      weightPct: round(Math.min(100, Math.max(0, Number(a.weightPct)))),
      notionalUsd: round(amountUsd * Math.min(100, Math.max(0, Number(a.weightPct))) / 100),
      action: a.action,
    }));

  const blockedLeaders = allocations
    .filter((a) => a.action === "STOP" || a.action === "HOLD_USDC" || a.action === "MOVE_TO_USYC")
    .map((a) => ({ leaderId: String(a.leaderId), name: String(a.name), action: a.action }));

  const copyWeight = round(copyAllocations.reduce((sum, item) => sum + item.weightPct, 0));
  const riskOffWeight = round(Math.max(0, 100 - copyWeight));
  const riskOffAsset: "USDC" | "USYC" = riskProfile === "conservative" || riskOffWeight >= 70 ? "USYC" : "USDC";
  const riskOff = {
    asset: riskOffAsset,
    weightPct: riskOffWeight,
    notionalUsd: round(amountUsd * riskOffWeight / 100),
  };

  const requestBasis = {
    sessionId,
    wallet,
    riskProfile,
    amountUsd,
    decisionHash: input.latestDecision?.decisionHash,
    copyGuardHash: input.latestDecision?.copyGuardHash,
    copyAllocations,
    riskOff,
    createdAt,
  };
  const requestHash = hashPayload(requestBasis);

  return {
    portfolioId: "pf_arc_" + requestHash.slice(2, 18),
    riskProfile,
    amountUsd,
    sessionId,
    wallet,
    mode: input.mode ?? "paper",
    decisionHash: input.latestDecision?.decisionHash,
    copyGuardHash: input.latestDecision?.copyGuardHash,
    copyAllocations,
    blockedLeaders,
    riskOff,
    requestHash,
    createdAt,
  };
}

export function buildPortfolioSimulation(input: {
  latestDecision?: LatestDecisionLike | null;
  riskProfile: unknown;
  amountUsd: unknown;
  sessionId: unknown;
  selectedLeaderId?: unknown;
  maxDrawdownPct?: unknown;
  nowIso?: string;
}): PortfolioSimulation {
  const portfolio = buildProtectedPortfolio({
    latestDecision: input.latestDecision,
    riskProfile: input.riskProfile,
    amountUsd: input.amountUsd,
    sessionId: input.sessionId,
    mode: "paper",
    nowIso: input.nowIso,
  });
  const allocations = Array.isArray(input.latestDecision?.allocation) ? input.latestDecision.allocation : [];
  const selectedLeaderId = typeof input.selectedLeaderId === "string" ? input.selectedLeaderId : undefined;
  const selected = allocations.find((leader) => leader.leaderId === selectedLeaderId) ?? allocations[0];
  const selectedLeader = selected ? {
    leaderId: selected.leaderId,
    name: selected.name,
    weightPct: round(Math.max(0, Math.min(100, Number(selected.weightPct)))),
    action: selected.action,
  } : undefined;
  const expectedStopThresholdPct = round(
    typeof input.maxDrawdownPct === "number" && Number.isFinite(input.maxDrawdownPct)
      ? Math.min(60, Math.max(1, input.maxDrawdownPct))
      : 12,
  );
  const estimatedFeesUsd = 0.01;
  const selectedPhrase = selectedLeader
    ? `${selectedLeader.action} ${selectedLeader.name}`
    : "hold until a copyable leader appears";
  const summary = `ArcMind would ${selectedPhrase}, keep ${portfolio.riskOff.notionalUsd} ${portfolio.riskOff.asset} risk-off, stop at ${expectedStopThresholdPct}% drawdown, and spend about $${estimatedFeesUsd.toFixed(2)} in Arc fees.`;

  return {
    readOnly: true,
    portfolio,
    selectedLeader,
    expectedStopThresholdPct,
    estimatedFeesUsd,
    summary,
  };
}
