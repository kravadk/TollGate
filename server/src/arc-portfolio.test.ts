import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPortfolioSimulation, buildProtectedPortfolio, normalizePortfolioAmount, normalizeRiskProfile } from "./arc-portfolio.js";

const latestDecision = {
  ts: "2026-05-17T20:00:00.000Z",
  decisionHash: "0x" + "a".repeat(64),
  copyGuardHash: "0x" + "b".repeat(64),
  allocation: [
    { leaderId: "alpha", name: "HL Whale Alpha", weightPct: 17, action: "COPY" as const },
    { leaderId: "decay", name: "Low-Liq Sprinter", weightPct: 0, action: "STOP" as const },
  ],
};

describe("Arc protected portfolio builder", () => {
  it("normalizes risk profile and amount inputs", () => {
    assert.equal(normalizeRiskProfile("aggressive"), "aggressive");
    assert.equal(normalizeRiskProfile("unknown"), "balanced");
    assert.equal(normalizePortfolioAmount(0), 1);
    assert.equal(normalizePortfolioAmount(25.123), 25.12);
    assert.equal(normalizePortfolioAmount(50_000), 10_000);
  });

  it("builds a receipt-ready portfolio without allocating to stopped leaders", () => {
    const portfolio = buildProtectedPortfolio({
      latestDecision,
      riskProfile: "conservative",
      amountUsd: 100,
      sessionId: "judge-session",
      wallet: "0x1111111111111111111111111111111111111111",
      nowIso: "2026-05-17T20:01:00.000Z",
    });

    assert.equal(portfolio.riskProfile, "conservative");
    assert.equal(portfolio.amountUsd, 100);
    assert.equal(portfolio.copyAllocations.length, 1);
    assert.equal(portfolio.copyAllocations[0]?.leaderId, "alpha");
    assert.equal(portfolio.copyAllocations[0]?.notionalUsd, 17);
    assert.equal(portfolio.riskOff.notionalUsd, 83);
    assert.equal(portfolio.blockedLeaders[0]?.name, "Low-Liq Sprinter");
    assert.ok(portfolio.portfolioId.startsWith("pf_arc_"));
    assert.ok(portfolio.requestHash.startsWith("0x"));
    assert.equal(portfolio.requestHash.length, 66);
  });

  it("simulates a read-only portfolio with selected leader, stop threshold, fees, and summary", () => {
    const simulation = buildPortfolioSimulation({
      latestDecision,
      riskProfile: "balanced",
      amountUsd: 200,
      sessionId: "judge-session",
      selectedLeaderId: "alpha",
      maxDrawdownPct: 12,
      nowIso: "2026-05-17T20:02:00.000Z",
    });

    assert.equal(simulation.readOnly, true);
    assert.equal(simulation.selectedLeader?.name, "HL Whale Alpha");
    assert.equal(simulation.expectedStopThresholdPct, 12);
    assert.equal(simulation.estimatedFeesUsd, 0.01);
    assert.equal(simulation.portfolio.copyAllocations[0]?.notionalUsd, 34);
    assert.match(simulation.summary, /COPY HL Whale Alpha/);
    assert.match(simulation.summary, /166 USYC/);
  });
});
