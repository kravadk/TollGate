const ARC_EXPLORER_TX = "https://testnet.arcscan.app/tx/";

type TraceDecision = {
  ts?: string;
  primaryAction?: string;
  decision?: string;
  ethPrice?: number;
  oiValue?: string;
  fundingRate?: string;
  decisionHash?: string;
  copyGuardHash?: string;
  reasoningTrace?: string;
  allocation?: Array<{ name: string; weightPct: number; action: string }>;
  leaderScores?: Array<{ name: string; action: string; weightPct: number; degradationScore: number }>;
};

type TraceReceipt = {
  id: string;
  amount: number;
  currency: string;
  network: string;
  status: string;
  txHash?: string | null;
};

export type ArcTraceSection = {
  title: "Inputs" | "Reasoning" | "Risk sizing" | "Outcome" | "Receipt";
  body: string;
};

export type ArcTraceProduct = {
  lockedPreview: {
    signalSummary: string;
    decisionType: string;
    timestamp: string;
    expectedContents: string;
  };
  sections: ArcTraceSection[];
  fullTraceJson: string | null;
  receiptExplorerUrl: string | null;
};

function formatUsd(n?: number): string {
  return typeof n === "number" && Number.isFinite(n) ? `$${n.toLocaleString("en-US")}` : "n/a";
}

export function buildArcTraceProduct(input: {
  latestDecision: TraceDecision | null;
  unlocked: boolean;
  receipt?: TraceReceipt | null;
}): ArcTraceProduct {
  const latest = input.latestDecision;
  const decisionType = latest?.primaryAction ?? latest?.decision ?? "pending";
  const signalSummary = `ETH ${formatUsd(latest?.ethPrice)}, OI ${latest?.oiValue ?? "n/a"}, funding ${latest?.fundingRate ?? "n/a"}`;
  const timestamp = latest?.ts ?? "pending";
  const lockedPreview = {
    signalSummary,
    decisionType,
    timestamp,
    expectedContents: "Full unlock includes signal inputs, reasoning trace, risk sizing, outcome, and Arc receipt proof.",
  };

  if (!latest || !input.unlocked) {
    return { lockedPreview, sections: [], fullTraceJson: null, receiptExplorerUrl: null };
  }

  const allocation = latest.allocation ?? [];
  const leaders = latest.leaderScores ?? [];
  const receipt = input.receipt ?? null;
  const receiptExplorerUrl = receipt?.txHash ? `${ARC_EXPLORER_TX}${receipt.txHash}` : null;
  const tracePayload = {
    decisionHash: latest.decisionHash,
    copyGuardHash: latest.copyGuardHash,
    ts: latest.ts,
    signals: {
      ethPrice: latest.ethPrice,
      oiValue: latest.oiValue,
      fundingRate: latest.fundingRate,
    },
    reasoningTrace: latest.reasoningTrace,
    allocation,
    leaderScores: leaders,
    receipt,
  };

  return {
    lockedPreview,
    receiptExplorerUrl,
    fullTraceJson: JSON.stringify(tracePayload, null, 2),
    sections: [
      { title: "Inputs", body: signalSummary },
      { title: "Reasoning", body: latest.reasoningTrace ?? "Reasoning trace pending." },
      { title: "Risk sizing", body: allocation.length ? allocation.map((row) => `${row.name}: ${row.weightPct}% ${row.action}`).join("\n") : "Allocation pending." },
      { title: "Outcome", body: leaders.length ? leaders.map((leader) => `${leader.name}: ${leader.action}, decay ${leader.degradationScore}`).join("\n") : `${decisionType} chosen.` },
      { title: "Receipt", body: receipt ? `${receipt.amount} ${receipt.currency} on ${receipt.network}: ${receipt.status}` : "Receipt pending." },
    ],
  };
}
