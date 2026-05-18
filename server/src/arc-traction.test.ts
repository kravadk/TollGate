import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildArcTractionStats, makeArcTractionEvent, type ArcTractionEvent } from "./arc-traction.js";

describe("Arc traction stats", () => {
  it("counts unique testers, wallets, trace unlocks, portfolios, feedback, and volume", () => {
    const events: ArcTractionEvent[] = [
      { type: "page_open", sessionId: "s1", ts: "2026-05-17T20:00:00.000Z" },
      { type: "page_open", sessionId: "s1", ts: "2026-05-17T20:01:00.000Z" },
      { type: "wallet_connect", sessionId: "s1", wallet: "0x1111111111111111111111111111111111111111", ts: "2026-05-17T20:02:00.000Z" },
      { type: "trace_unlock", sessionId: "s1", amountUsd: 0.01, ts: "2026-05-17T20:03:00.000Z" },
      { type: "portfolio_start", sessionId: "s2", wallet: "0x2222222222222222222222222222222222222222", amountUsd: 10, ts: "2026-05-17T20:04:00.000Z" },
      { type: "feedback_submit", sessionId: "s2", feedback: "I would use this before copying a whale.", ts: "2026-05-17T20:05:00.000Z" },
    ];

    const stats = buildArcTractionStats(events, 7);

    assert.equal(stats.testers, 2);
    assert.equal(stats.connectedWallets, 2);
    assert.equal(stats.traceUnlocks, 1);
    assert.equal(stats.protectedPortfolios, 1);
    assert.equal(stats.feedbackCount, 1);
    assert.equal(stats.decisionCount, 7);
    assert.equal(stats.testnetUsdcVolume, 10.01);
    assert.deepEqual(stats.feedbackQuotes, ["I would use this before copying a whale."]);
  });

  it("keeps structured feedback prompts for validation highlights", () => {
    const events: ArcTractionEvent[] = [
      { type: "feedback_submit", sessionId: "s1", feedbackPrompt: "clarity", feedback: "The stop-copy reason is clear.", ts: "2026-05-17T20:05:00.000Z" },
      { type: "feedback_submit", sessionId: "s2", feedbackPrompt: "trust", feedback: "I trust it more with the Arc proof.", ts: "2026-05-17T20:06:00.000Z" },
      { type: "feedback_submit", sessionId: "s3", feedbackPrompt: "willingness", feedback: "I would copy after one more week of history.", ts: "2026-05-17T20:07:00.000Z" },
      { type: "feedback_submit", sessionId: "s4", feedbackPrompt: "confusion", feedback: "I need clearer wallet funding steps.", ts: "2026-05-17T20:08:00.000Z" },
    ];

    const stats = buildArcTractionStats(events, 3);

    assert.deepEqual(stats.feedbackPrompts, { clarity: 1, trust: 1, willingness: 1, confusion: 1 });
    assert.deepEqual(
      stats.validationHighlights.map((item) => item.label),
      ["Confusion point", "Willingness to copy", "Trust signal", "Clarity signal"],
    );
    assert.equal(stats.validationHighlights[0]?.quote, "I need clearer wallet funding steps.");
  });

  it("sanitizes feedback prompt values when building traction events", () => {
    const event = makeArcTractionEvent({
      type: "feedback_submit",
      sessionId: "s1",
      feedbackPrompt: "trust",
      feedback: "Arc tx links make this credible.",
    });

    assert.equal(event?.feedbackPrompt, "trust");
    assert.equal(event?.feedback, "Arc tx links make this credible.");

    const invalid = makeArcTractionEvent({
      type: "feedback_submit",
      sessionId: "s1",
      feedbackPrompt: "subscribe-me",
      feedback: "ignore invalid prompt",
    });

    assert.equal(invalid?.feedbackPrompt, undefined);
  });
});
