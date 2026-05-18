import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildArcAlerts, buildArcAuditTrail, buildArcDecisionReplay, evaluateArcDecisionVerification } from "./arc-audit.js";

const latestDecision = {
  ts: "2026-05-17T20:21:43.076Z",
  mode: "arc",
  txHash: "0x5354003168fb680b4fee10d03b73d90470ed81f3148170ed1e799f77ed17d520",
  decisionHash: "0x80409e52644cf141c2ea6c2dcdc81aaa6c02233e5ee7005ce1960241b3652a9a",
  leaderSource: { status: "configured", provider: "test-feed" },
  leaderScores: [
    { id: "alpha", name: "Verified Leader Alpha", action: "COPY", degradationScore: 16.2, weightPct: 16.99 },
    { id: "sprinter", name: "Verified Decay Leader", action: "STOP", degradationScore: 51.9, weightPct: 0 },
  ],
};

const legacyDecision = {
  ...latestDecision,
  leaderSource: undefined,
};

describe("Arc audit and alerts", () => {
  it("builds a judge-readable audit trail from registration, decisions, and receipts", () => {
    const trail = buildArcAuditTrail({
      registrationTxHash: "0x4c8ef2deb318168ab5759607cf9144db0344a3e3158970395d1a1f7b277cadcb",
      decisions: [latestDecision],
      receipts: [{ id: "rcpt_1", serviceId: "svc_arc_copytrade", createdAt: "2026-05-17T20:22:00.000Z", amount: 100, currency: "USDC", status: "verified" }],
    });

    assert.equal(trail[0]?.kind, "agent_registered");
    assert.equal(trail[1]?.kind, "decision_recorded");
    assert.equal(trail[2]?.kind, "portfolio_receipt");
    assert.ok(trail[1]?.explorerUrl?.includes("testnet.arcscan.app/tx/"));
  });

  it("creates high-signal alerts for stopped leaders and on-chain decisions", () => {
    const alerts = buildArcAlerts([latestDecision], 55);

    assert.ok(alerts.some((alert) => alert.type === "leader_stop" && alert.severity === "critical"));
    assert.ok(alerts.some((alert) => alert.type === "arc_tx_recorded"));
  });

  it("evaluates latest decision verification without leaking secrets", () => {
    assert.deepEqual(
      evaluateArcDecisionVerification(latestDecision, { found: true, status: 1 }),
      {
        ok: true,
        reason: "verified_on_arc",
        txHash: latestDecision.txHash,
        decisionHash: latestDecision.decisionHash,
      },
    );
  });

  it("builds a step-by-step replay for the latest agent decision", () => {
    const replay = buildArcDecisionReplay(latestDecision);

    assert.equal(replay?.decisionHash, latestDecision.decisionHash);
    assert.deepEqual(
      replay?.events.map((event) => event.step),
      ["signal_observed", "leaders_scored", "risk_checked", "action_chosen", "arc_proof"],
    );
    assert.ok(replay?.events.some((event) => event.detail.includes("Verified Decay Leader")));
    assert.ok(replay?.events.some((event) => event.explorerUrl?.includes("testnet.arcscan.app/tx/")));
  });

  it("does not build leader alerts from legacy decisions without source metadata", () => {
    const alerts = buildArcAlerts([legacyDecision], 55);
    const replay = buildArcDecisionReplay(legacyDecision);

    assert.equal(alerts.some((alert) => alert.type === "leader_stop"), false);
    assert.ok(replay?.events.some((event) => event.detail.includes("No verified leader feed")));
  });
});
