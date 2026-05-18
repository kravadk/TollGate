import { createHash } from "node:crypto";

export type CopyGuardRiskProfile = "conservative" | "balanced" | "aggressive";
export type CopyGuardAction = "COPY" | "REDUCE" | "STOP" | "HOLD_USDC" | "MOVE_TO_USYC";
export type SignalGuardAction = "ALLOW_COPY" | "HOLD_USDC" | "REDUCE" | "MOVE_TO_USYC";

export type CopyGuardSignals = {
  ethPrice: number;
  ethPriceChangePct: number;
  openInterestUsd: number;
  fundingRate: number;
  volatilityPct: number;
  polymarketYesPct?: number | null;
};

export type CopyGuardLeader = {
  id: string;
  name: string;
  winRatePct: number;
  sharpe: number;
  maxDrawdownPct: number;
  recentPnlPct: number;
  liquidityUsd: number;
  recentLosses: number;
  address?: string;
  source?: string;
  sourceUrl?: string;
  metricsNote?: string;
};

export type CopyGuardDecayFactors = {
  drawdown: number;
  recentLosses: number;
  volatility: number;
  confidenceDrop: number;
  signalDivergence: number;
};

export type ScoredCopyGuardLeader = CopyGuardLeader & {
  qualityScore: number;
  degradationScore: number;
  decayFactors: CopyGuardDecayFactors;
  decaySummary: string;
  weightPct: number;
  action: CopyGuardAction;
  reason: string;
};

export type CopyGuardDecision = {
  agent: "ArcMind CopyGuard";
  ts: string;
  riskProfile: CopyGuardRiskProfile;
  primaryAction: CopyGuardAction;
  signals: CopyGuardSignals;
  signalGuard?: SignalGuardDecision;
  leaderScores: ScoredCopyGuardLeader[];
  allocation: { leaderId: string; name: string; weightPct: number; action: CopyGuardAction }[];
  reasoningTrace: string;
  decisionHash: string;
};

export type SignalGuardDecision = {
  mode: "no_nansen_signal_guard";
  action: SignalGuardAction;
  riskScore: number;
  confidenceScore: number;
  sourceCoverage: number;
  reasons: string[];
  inputs: {
    ethPrice: number;
    ethPriceChangePct: number;
    openInterestUsd: number;
    fundingRate: number;
    volatilityPct: number;
    polymarketYesPct?: number | null;
  };
};

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function round(n: number, digits = 2): number {
  const scale = 10 ** digits;
  return Math.round(n * scale) / scale;
}

function profileMultiplier(profile: CopyGuardRiskProfile): number {
  if (profile === "conservative") return 0.65;
  if (profile === "aggressive") return 1.25;
  return 1;
}

function actionReason(action: CopyGuardAction, leader: CopyGuardLeader, quality: number, degradation: number): string {
  if (action === "STOP") {
    return `Stop copying ${leader.name}: degradation risk ${round(degradation, 1)} is too high from drawdown/loss signals.`;
  }
  if (action === "REDUCE") {
    return `Reduce ${leader.name}: quality ${round(quality, 1)} remains useful, but degradation risk ${round(degradation, 1)} is rising.`;
  }
  if (action === "HOLD_USDC") {
    return `Hold USDC instead of copying ${leader.name}: market volatility and crowding are elevated.`;
  }
  if (action === "MOVE_TO_USYC") {
    return `Move idle capital to USYC: ${leader.name} has weak quality and the market is risk-off.`;
  }
  return `Copy ${leader.name}: quality ${round(quality, 1)} with manageable degradation risk ${round(degradation, 1)}.`;
}

function decayFactorLabel(key: keyof CopyGuardDecayFactors): string {
  if (key === "recentLosses") return "recent losses";
  if (key === "confidenceDrop") return "confidence drop";
  if (key === "signalDivergence") return "signal divergence";
  return key;
}

function buildDecaySummary(
  action: CopyGuardAction,
  factors: CopyGuardDecayFactors,
  degradationScore: number,
): string {
  const topFactors = (Object.entries(factors) as Array<[keyof CopyGuardDecayFactors, number]>)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key, value]) => `${decayFactorLabel(key)} ${round(value, 1)}`)
    .join(", ");

  if (action === "STOP") {
    return `Stop copy: strategy decay is high (${round(degradationScore, 1)}) from ${topFactors}.`;
  }
  if (action === "REDUCE") {
    return `Rising decay: reduce allocation while ${topFactors} remain elevated.`;
  }
  if (action === "HOLD_USDC") {
    return `Hold USDC: volatility and signal divergence make copy risk too noisy.`;
  }
  if (action === "MOVE_TO_USYC") {
    return `Risk-off: weak leader confidence and decay pressure favor USYC until signals improve.`;
  }
  return `Low manageable decay (${round(degradationScore, 1)}): copy is allowed while monitoring ${topFactors}.`;
}

export function scoreLeader(
  leader: CopyGuardLeader,
  signals: CopyGuardSignals,
  riskProfile: CopyGuardRiskProfile,
): ScoredCopyGuardLeader {
  const win = clamp(leader.winRatePct, 0, 100);
  const sharpe = clamp((leader.sharpe / 3) * 100, 0, 100);
  const drawdownQuality = clamp(100 - leader.maxDrawdownPct * 2.2, 0, 100);
  const recent = clamp(50 + leader.recentPnlPct * 4, 0, 100);
  const liquidity = clamp((Math.log10(Math.max(leader.liquidityUsd, 1)) - 4) * 28, 0, 100);
  const qualityScore = round(win * 0.35 + sharpe * 0.25 + drawdownQuality * 0.2 + recent * 0.1 + liquidity * 0.1, 2);

  const drawdownTrend = clamp(leader.maxDrawdownPct * 2.4, 0, 100);
  const fundingCrowding = clamp(Math.abs(signals.fundingRate) * 320_000, 0, 100);
  const volatilitySpike = clamp(signals.volatilityPct * 10, 0, 100);
  const recentLosses = clamp(leader.recentLosses * 18 + Math.max(0, -leader.recentPnlPct) * 2.5, 0, 100);
  const confidenceDrop = clamp(
    (100 - win) * 0.35 + Math.max(0, 1.6 - leader.sharpe) * 28 + Math.max(0, -leader.recentPnlPct) * 2.2,
    0,
    100,
  );
  const polymarketYesPct = typeof signals.polymarketYesPct === "number" ? signals.polymarketYesPct : null;
  const marketBearishness = polymarketYesPct === null ? 0 : Math.max(0, 50 - polymarketYesPct) * 1.6;
  const momentumAgainst = Math.max(0, -signals.ethPriceChangePct) * 12;
  const signalDivergence = clamp(marketBearishness + momentumAgainst + fundingCrowding * 0.2, 0, 100);
  const lossClusterPenalty = Math.max(0, recentLosses - 35) * 0.08;
  const decayFactors: CopyGuardDecayFactors = {
    drawdown: round(drawdownTrend, 2),
    recentLosses: round(recentLosses, 2),
    volatility: round(volatilitySpike, 2),
    confidenceDrop: round(confidenceDrop, 2),
    signalDivergence: round(signalDivergence, 2),
  };
  const degradationScore = round(clamp(
    drawdownTrend * 0.28
      + fundingCrowding * 0.17
      + volatilitySpike * 0.17
      + recentLosses * 0.22
      + confidenceDrop * 0.08
      + signalDivergence * 0.08
      + lossClusterPenalty,
    0,
    100,
  ), 2);

  let action: CopyGuardAction = "COPY";
  if (degradationScore >= 70 || leader.maxDrawdownPct >= 30 || leader.recentLosses >= 5) {
    action = "STOP";
  } else if (degradationScore >= 48) {
    action = "REDUCE";
  } else if (signals.volatilityPct >= 9 && qualityScore < 68) {
    action = "HOLD_USDC";
  } else if (qualityScore < 42 && degradationScore >= 40) {
    action = "MOVE_TO_USYC";
  }

  const baseWeight = action === "COPY"
    ? qualityScore * (1 - degradationScore / 125) * profileMultiplier(riskProfile) * 0.28
    : action === "REDUCE"
      ? qualityScore * (1 - degradationScore / 110) * profileMultiplier(riskProfile) * 0.12
      : 0;

  return {
    ...leader,
    qualityScore,
    degradationScore,
    decayFactors,
    decaySummary: buildDecaySummary(action, decayFactors, degradationScore),
    action,
    weightPct: round(clamp(baseWeight, 0, riskProfile === "aggressive" ? 35 : 25), 2),
    reason: actionReason(action, leader, qualityScore, degradationScore),
  };
}

function decisionHash(payload: unknown): string {
  return "0x" + createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function buildSignalGuardDecision(signals: CopyGuardSignals, sourceCoverage = 0): SignalGuardDecision {
  const fundingCrowding = clamp(Math.abs(signals.fundingRate) * 320_000, 0, 100);
  const volatilityStress = clamp(signals.volatilityPct * 10, 0, 100);
  const priceDownStress = clamp(Math.max(0, -signals.ethPriceChangePct) * 18, 0, 100);
  const openInterestStress = clamp((Math.log10(Math.max(signals.openInterestUsd, 1)) - 6) * 18, 0, 100);
  const polymarketYesPct = typeof signals.polymarketYesPct === "number" ? signals.polymarketYesPct : null;
  const sentimentStress = polymarketYesPct === null ? 18 : clamp(55 - polymarketYesPct, 0, 100);
  const riskScore = round(clamp(
    fundingCrowding * 0.25
      + volatilityStress * 0.25
      + priceDownStress * 0.18
      + openInterestStress * 0.17
      + sentimentStress * 0.15,
    0,
    100,
  ), 2);
  const confidenceScore = round(clamp(35 + sourceCoverage * 8 + (polymarketYesPct === null ? 0 : 12), 0, 92), 2);

  let action: SignalGuardAction = "ALLOW_COPY";
  if (riskScore >= 72) action = "MOVE_TO_USYC";
  else if (riskScore >= 54) action = "REDUCE";
  else if (riskScore >= 34) action = "HOLD_USDC";

  const reasons = [
    `Funding crowding ${round(fundingCrowding, 1)} and volatility stress ${round(volatilityStress, 1)} from live market feeds.`,
    `Open interest stress ${round(openInterestStress, 1)} with ETH move ${round(signals.ethPriceChangePct, 2)}%.`,
    polymarketYesPct === null
      ? "Prediction sentiment unavailable; confidence is intentionally capped instead of filled with a default."
      : `Prediction sentiment is ${polymarketYesPct}% YES, adding ${round(sentimentStress, 1)} risk stress.`,
    sourceCoverage > 0
      ? `${sourceCoverage} configured source layers are available for sourced explanation and replay.`
      : "No extra source layers configured; SignalGuard stays conservative.",
  ];

  return {
    mode: "no_nansen_signal_guard",
    action,
    riskScore,
    confidenceScore,
    sourceCoverage,
    reasons,
    inputs: {
      ethPrice: signals.ethPrice,
      ethPriceChangePct: signals.ethPriceChangePct,
      openInterestUsd: signals.openInterestUsd,
      fundingRate: signals.fundingRate,
      volatilityPct: signals.volatilityPct,
      polymarketYesPct,
    },
  };
}

export function buildCopyGuardDecision(input: {
  signals: CopyGuardSignals;
  leaders: CopyGuardLeader[];
  riskProfile: CopyGuardRiskProfile;
  nowIso?: string;
  sourceCoverage?: number;
}): CopyGuardDecision {
  const ts = input.nowIso ?? new Date().toISOString();
  const leaderScores = input.leaders
    .map((leader) => scoreLeader(leader, input.signals, input.riskProfile))
    .sort((a, b) => b.weightPct - a.weightPct || a.degradationScore - b.degradationScore);

  const allocation = leaderScores.map((leader) => ({
    leaderId: leader.id,
    name: leader.name,
    weightPct: leader.weightPct,
    action: leader.action,
  }));
  const firstActive = leaderScores.find((leader) => leader.weightPct > 0);
  const signalGuard = leaderScores.length ? undefined : buildSignalGuardDecision(input.signals, input.sourceCoverage ?? 0);
  const signalGuardPrimary: CopyGuardAction = signalGuard?.action === "MOVE_TO_USYC"
    ? "MOVE_TO_USYC"
    : signalGuard?.action === "REDUCE"
      ? "REDUCE"
      : "HOLD_USDC";
  const primaryAction = firstActive?.action ?? (leaderScores.some((leader) => leader.action === "STOP") ? "STOP" : signalGuardPrimary);
  const reasoningTrace = leaderScores.length
    ? leaderScores
      .map((leader) => `${leader.name}: ${leader.action} ${leader.weightPct}% - ${leader.reason}`)
      .join("\n")
    : [
      "No verified copy-leader feed is configured. ArcMind does not display synthetic copy leaders.",
      `SignalGuard action: ${signalGuard?.action ?? "HOLD_USDC"} with risk ${signalGuard?.riskScore ?? 0}/100 and confidence ${signalGuard?.confidenceScore ?? 0}/100.`,
      ...(signalGuard?.reasons ?? []),
    ].join("\n");

  const hashBasis = {
    ts,
    riskProfile: input.riskProfile,
    signals: input.signals,
    signalGuard,
    allocation,
    reasoningTrace,
  };

  return {
    agent: "ArcMind CopyGuard",
    ts,
    riskProfile: input.riskProfile,
    primaryAction,
    signals: input.signals,
    signalGuard,
    leaderScores,
    allocation,
    reasoningTrace,
    decisionHash: decisionHash(hashBasis),
  };
}
