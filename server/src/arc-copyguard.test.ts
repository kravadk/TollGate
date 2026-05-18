import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCopyGuardDecision,
  scoreLeader,
  type CopyGuardLeader,
  type CopyGuardSignals,
} from "./arc-copyguard.js";

const baseSignals: CopyGuardSignals = {
  ethPrice: 3400,
  ethPriceChangePct: 1.2,
  openInterestUsd: 1_250_000_000,
  fundingRate: 0.00004,
  volatilityPct: 2.5,
  polymarketYesPct: 54,
};

const strongLeader: CopyGuardLeader = {
  id: "hl_whale_alpha",
  name: "Verified Leader Alpha",
  winRatePct: 68,
  sharpe: 2.1,
  maxDrawdownPct: 9,
  recentPnlPct: 6,
  liquidityUsd: 2_500_000,
  recentLosses: 1,
};

describe("Arc CopyGuard scoring", () => {
  it("copies a high-quality leader when degradation risk is low", () => {
    const scored = scoreLeader(strongLeader, baseSignals, "balanced");

    assert.equal(scored.action, "COPY");
    assert.ok(scored.weightPct > 0);
    assert.ok(scored.degradationScore < 35);
    assert.match(scored.reason, /copy/i);
  });

  it("stops copying when drawdown and losses show strategy decay", () => {
    const decayingLeader: CopyGuardLeader = {
      ...strongLeader,
      id: "hl_crowded_decay",
      maxDrawdownPct: 34,
      recentPnlPct: -12,
      recentLosses: 5,
    };
    const crowdedSignals: CopyGuardSignals = {
      ...baseSignals,
      fundingRate: 0.00024,
      volatilityPct: 8.5,
    };

    const scored = scoreLeader(decayingLeader, crowdedSignals, "balanced");

    assert.equal(scored.action, "STOP");
    assert.equal(scored.weightPct, 0);
    assert.ok(scored.degradationScore >= 70);
    assert.match(scored.reason, /degradation|drawdown|loss/i);
  });

  it("returns a low decay factor breakdown for a healthy leader", () => {
    const scored = scoreLeader(strongLeader, baseSignals, "balanced");

    assert.ok(scored.decayFactors.drawdown < 30);
    assert.ok(scored.decayFactors.recentLosses < 35);
    assert.ok(scored.decayFactors.volatility < 35);
    assert.ok(scored.decayFactors.confidenceDrop < 30);
    assert.ok(scored.decayFactors.signalDivergence < 35);
    assert.match(scored.decaySummary, /manageable|low/i);
  });

  it("returns a high decay factor breakdown for drawdown, losses, and signal divergence", () => {
    const scored = scoreLeader({
      ...strongLeader,
      maxDrawdownPct: 31,
      recentPnlPct: -11,
      recentLosses: 5,
      sharpe: 0.7,
      winRatePct: 47,
    }, {
      ...baseSignals,
      ethPriceChangePct: -4.2,
      fundingRate: 0.00022,
      volatilityPct: 9.5,
      polymarketYesPct: 36,
    }, "balanced");

    assert.equal(scored.action, "STOP");
    assert.ok(scored.decayFactors.drawdown >= 70);
    assert.ok(scored.decayFactors.recentLosses >= 80);
    assert.ok(scored.decayFactors.volatility >= 80);
    assert.ok(scored.decayFactors.confidenceDrop >= 40);
    assert.ok(scored.decayFactors.signalDivergence >= 40);
    assert.match(scored.decaySummary, /drawdown|loss|divergence|volatility/i);
  });

  it("returns a medium decay factor breakdown for leaders that should be reduced", () => {
    const scored = scoreLeader({
      ...strongLeader,
      maxDrawdownPct: 18,
      recentPnlPct: -4,
      recentLosses: 3,
      sharpe: 1.4,
    }, {
      ...baseSignals,
      fundingRate: 0.00016,
      volatilityPct: 5.2,
    }, "balanced");

    assert.equal(scored.action, "REDUCE");
    assert.ok(scored.degradationScore >= 48);
    assert.ok(scored.degradationScore < 70);
    assert.match(scored.decaySummary, /rising|reduce/i);
  });

  it("builds a portfolio decision with public trace fields and a hash", () => {
    const decision = buildCopyGuardDecision({
      signals: baseSignals,
      leaders: [
        strongLeader,
        { ...strongLeader, id: "hl_small_fast", name: "Small Fast", liquidityUsd: 80_000, sharpe: 0.7, recentPnlPct: -2 },
      ],
      riskProfile: "balanced",
      nowIso: "2026-05-17T20:00:00.000Z",
    });

    assert.equal(decision.agent, "ArcMind CopyGuard");
    assert.equal(decision.primaryAction, "COPY");
    assert.ok(decision.decisionHash.startsWith("0x"));
    assert.equal(decision.decisionHash.length, 66);
    assert.ok(decision.leaderScores.length >= 2);
    assert.ok(decision.reasoningTrace.includes("Verified Leader Alpha"));
  });

  it("runs SignalGuard instead of inventing leaders when no verified feed exists", () => {
    const decision = buildCopyGuardDecision({
      signals: {
        ...baseSignals,
        ethPriceChangePct: -3.4,
        fundingRate: 0.00022,
        volatilityPct: 7.8,
        polymarketYesPct: 39,
      },
      leaders: [],
      riskProfile: "balanced",
      sourceCoverage: 3,
      nowIso: "2026-05-19T09:00:00.000Z",
    });

    assert.equal(decision.leaderScores.length, 0);
    assert.equal(decision.allocation.length, 0);
    assert.ok(decision.signalGuard);
    assert.ok(["REDUCE", "MOVE_TO_USYC"].includes(decision.signalGuard.action));
    assert.ok(decision.signalGuard.riskScore >= 55);
    assert.match(decision.reasoningTrace, /does not display synthetic copy leaders/i);
    assert.match(decision.reasoningTrace, /SignalGuard action/i);
  });
});
