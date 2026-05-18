type ShareLeader = {
  name: string;
  action: string;
  weightPct: number;
  degradationScore: number;
};

type ShareDecision = {
  ts?: string;
  primaryAction?: string;
  decision?: string;
  txHash?: string | null;
  decisionHash?: string;
  leaderScores?: ShareLeader[];
};

export type ArcShareCard = {
  title: string;
  lines: string[];
  shareText: string;
};

function short(v?: string | null): string {
  if (!v) return "pending";
  return v.length > 18 ? `${v.slice(0, 10)}...${v.slice(-6)}` : v;
}

export function buildArcShareCard(input: {
  latestDecision: ShareDecision | null;
  shareUrl: string;
  payoutAddress?: string | null;
}): ArcShareCard {
  const latest = input.latestDecision;
  const action = latest?.primaryAction ?? latest?.decision ?? "PENDING";
  const topLeader = latest?.leaderScores?.find((leader) => leader.action === "COPY")
    ?? latest?.leaderScores?.find((leader) => leader.action === "REDUCE")
    ?? latest?.leaderScores?.[0];
  const stopped = latest?.leaderScores?.find((leader) => leader.action === "STOP");
  const proof = latest?.txHash ?? latest?.decisionHash;
  const title = `ArcMind ${action} decision`;
  const lines = [
    `Leader: ${topLeader ? `${topLeader.name} (${topLeader.weightPct}%)` : "pending"}`,
    `Risk: ${stopped ? `blocked ${stopped.name} at decay ${stopped.degradationScore}` : "no stopped leader"}`,
    `Proof: ${short(proof)}`,
    `Time: ${latest?.ts ?? "pending"}`,
  ];
  const shareText = [
    "ArcMind CopyGuard",
    title,
    ...lines,
    input.shareUrl,
  ].join("\n");

  return { title, lines, shareText };
}
