import { describe, expect, it } from "vitest";
import { buildArcShareCard } from "../lib/arcShare";

describe("Arc share card", () => {
  it("builds public share text without private wallet or payout data", () => {
    const card = buildArcShareCard({
      latestDecision: {
        ts: "2026-05-17T22:20:00.000Z",
        primaryAction: "COPY",
        txHash: "0xabc123",
        decisionHash: "0xdecision",
        leaderScores: [
          { name: "Verified Leader Alpha", action: "COPY", weightPct: 17.1, degradationScore: 15.4 },
          { name: "Verified Decay Leader", action: "STOP", weightPct: 0, degradationScore: 57.2 },
        ],
      },
      shareUrl: "https://example.com/live?profile=balanced&stake=100",
      payoutAddress: "0x1111111111111111111111111111111111111111",
    });

    expect(card.title).toContain("COPY");
    expect(card.lines.join("\n")).toContain("Verified Leader Alpha");
    expect(card.shareText).toContain("ArcMind CopyGuard");
    expect(card.shareText).toContain("https://example.com/live");
    expect(card.shareText).not.toContain("0x1111111111111111111111111111111111111111");
  });
});
