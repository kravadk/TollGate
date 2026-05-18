import { describe, expect, it } from "vitest";
import { buildArcTraceProduct } from "../lib/arcTrace";

const latestDecision = {
  ts: "2026-05-17T22:10:00.000Z",
  primaryAction: "COPY",
  ethPrice: 2191.5,
  oiValue: "0.6M",
  fundingRate: "-0.0000038",
  decisionHash: "0xdecision",
  copyGuardHash: "0xcopyguard",
  reasoningTrace: "Verified Leader Alpha: COPY 17.11% - Copy with low decay.\nVerified Decay Leader: STOP 0% - Drawdown risk.",
  allocation: [
    { leaderId: "alpha", name: "Verified Leader Alpha", weightPct: 17.11, action: "COPY" },
    { leaderId: "sprinter", name: "Verified Decay Leader", weightPct: 0, action: "STOP" },
  ],
  leaderScores: [
    { name: "Verified Leader Alpha", action: "COPY", weightPct: 17.11, degradationScore: 15.4 },
    { name: "Verified Decay Leader", action: "STOP", weightPct: 0, degradationScore: 57.2 },
  ],
};

describe("Arc trace product", () => {
  it("keeps full trace JSON hidden while locked", () => {
    const product = buildArcTraceProduct({ latestDecision, unlocked: false });

    expect(product.lockedPreview.expectedContents).toContain("risk sizing");
    expect(product.lockedPreview.signalSummary).toContain("ETH $2,191.5");
    expect(product.fullTraceJson).toBeNull();
    expect(product.sections).toHaveLength(0);
  });

  it("includes trace sections, receipt proof, and copyable JSON after unlock", () => {
    const product = buildArcTraceProduct({
      latestDecision,
      unlocked: true,
      receipt: {
        id: "rcpt_trace",
        amount: 0.01,
        currency: "USDC",
        network: "arc-testnet",
        status: "verified",
        txHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      },
    });

    expect(product.sections.map((section) => section.title)).toEqual(["Inputs", "Reasoning", "Risk sizing", "Outcome", "Receipt"]);
    expect(product.receiptExplorerUrl).toContain("testnet.arcscan.app/tx/");
    expect(product.fullTraceJson).toContain("0xcopyguard");
  });
});
