const ARC_EXPLORER = "https://testnet.arcscan.app";

type AnyRecord = Record<string, unknown>;

export type ArcAuditItem = {
  id: string;
  kind: "agent_registered" | "decision_recorded" | "portfolio_receipt" | "trace_unlock";
  title: string;
  detail: string;
  ts?: string;
  txHash?: string;
  explorerUrl?: string;
  status: "verified" | "paid" | "paper";
};

export type ArcAlert = {
  id: string;
  type: "leader_stop" | "degradation_threshold" | "risk_off" | "arc_tx_recorded";
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  ts?: string;
};

export type ArcDecisionReplayEvent = {
  id: string;
  step: "signal_observed" | "leaders_scored" | "risk_checked" | "action_chosen" | "arc_proof";
  title: string;
  detail: string;
  ts?: string;
  status: "observed" | "scored" | "checked" | "chosen" | "verified" | "paper";
  txHash?: string;
  explorerUrl?: string;
};

export type ArcDecisionReplay = {
  decisionHash?: string;
  ts?: string;
  mode?: string;
  events: ArcDecisionReplayEvent[];
};

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function asNumber(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function txUrl(txHash?: string): string | undefined {
  return txHash ? `${ARC_EXPLORER}/tx/${txHash}` : undefined;
}

function compactMoney(v: unknown): string {
  const n = asNumber(v);
  if (n == null) return "n/a";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function leaderNameList(leaders: AnyRecord[], action?: string): string {
  const selected = action ? leaders.filter((leader) => asString(leader["action"]) === action) : leaders;
  return selected.map((leader) => asString(leader["name"]) ?? "Unknown leader").slice(0, 3).join(", ") || "none";
}

export function buildArcDecisionReplay(decision: AnyRecord | null | undefined): ArcDecisionReplay | null {
  if (!decision) return null;
  const ts = asString(decision["ts"]);
  const decisionHash = asString(decision["decisionHash"]);
  const mode = asString(decision["mode"]);
  const leaders = Array.isArray(decision["leaderScores"]) ? decision["leaderScores"] as AnyRecord[] : [];
  const allocation = Array.isArray(decision["allocation"]) ? decision["allocation"] as AnyRecord[] : [];
  const signals = typeof decision["signals"] === "object" && decision["signals"] ? decision["signals"] as AnyRecord : decision;
  const ethPrice = asNumber(signals["ethPrice"]) ?? asNumber(decision["ethPrice"]);
  const fundingRate = asString(decision["fundingRate"]) ?? (asNumber(signals["fundingRate"]) != null ? String(asNumber(signals["fundingRate"])) : undefined);
  const openInterest = asString(decision["oiValue"]) ?? compactMoney(signals["openInterestUsd"]);
  const stopped = leaders.filter((leader) => asString(leader["action"]) === "STOP");
  const topCopy = leaders.find((leader) => asString(leader["action"]) === "COPY");
  const maxDecay = leaders.reduce((max, leader) => Math.max(max, asNumber(leader["degradationScore"]) ?? 0), 0);
  const primaryAction = asString(decision["primaryAction"]) ?? asString(decision["decision"]) ?? "HOLD";
  const txHash = asString(decision["txHash"]);

  const events: ArcDecisionReplayEvent[] = [
    {
      id: "signal_observed",
      step: "signal_observed",
      title: "Signal observed",
      detail: `ETH ${ethPrice != null ? `$${ethPrice.toLocaleString("en-US")}` : "n/a"}, OI ${openInterest}, funding ${fundingRate ?? "n/a"}.`,
      ts,
      status: "observed",
    },
    {
      id: "leaders_scored",
      step: "leaders_scored",
      title: "Leaders scored",
      detail: leaders.length
        ? `${leaders.length} leaders scored. Top copy: ${asString(topCopy?.["name"]) ?? "none"}. Stopped: ${leaderNameList(leaders, "STOP")}.`
        : "No leader scores were available for this decision.",
      ts,
      status: "scored",
    },
    {
      id: "risk_checked",
      step: "risk_checked",
      title: "Risk checked",
      detail: `Max decay ${maxDecay.toFixed(1)}. Blocked leaders: ${stopped.length ? leaderNameList(stopped) : "none"}.`,
      ts,
      status: "checked",
    },
    {
      id: "action_chosen",
      step: "action_chosen",
      title: "Action chosen",
      detail: allocation.length
        ? `${primaryAction}: ${allocation.map((row) => `${asString(row["name"]) ?? "leader"} ${asNumber(row["weightPct"]) ?? 0}%`).join(", ")}.`
        : `${primaryAction}: allocation pending.`,
      ts,
      status: "chosen",
    },
    {
      id: "arc_proof",
      step: "arc_proof",
      title: txHash ? "Arc proof recorded" : "Arc proof pending",
      detail: txHash
        ? `Decision hash ${decisionHash?.slice(0, 14) ?? "pending"}... was recorded on Arc.`
        : `Decision hash ${decisionHash?.slice(0, 14) ?? "pending"}... is available, but no Arc tx is attached yet.`,
      ts,
      status: txHash ? "verified" : "paper",
      txHash,
      explorerUrl: txUrl(txHash),
    },
  ];

  return { decisionHash, ts, mode, events };
}

export function buildArcAuditTrail(input: {
  registrationTxHash?: string;
  decisions: AnyRecord[];
  receipts: AnyRecord[];
}): ArcAuditItem[] {
  const items: ArcAuditItem[] = [];
  if (input.registrationTxHash) {
    items.push({
      id: `agent:${input.registrationTxHash}`,
      kind: "agent_registered",
      title: "Agent registered",
      detail: "ArcMind CopyGuard identity was registered in ArcMindRegistry.",
      txHash: input.registrationTxHash,
      explorerUrl: txUrl(input.registrationTxHash),
      status: "verified",
    });
  }

  for (const decision of input.decisions.slice(0, 8)) {
    const txHash = asString(decision["txHash"]);
    const decisionHash = asString(decision["decisionHash"]);
    items.push({
      id: `decision:${decisionHash ?? asString(decision["ts"]) ?? items.length}`,
      kind: "decision_recorded",
      title: txHash ? "Decision recorded on Arc" : "Decision recorded locally",
      detail: decisionHash ? `Decision hash ${decisionHash.slice(0, 14)}...` : "CopyGuard decision hash pending.",
      ts: asString(decision["ts"]),
      txHash,
      explorerUrl: txUrl(txHash),
      status: txHash ? "verified" : "paper",
    });
  }

  for (const receipt of input.receipts.slice(0, 8)) {
    const serviceId = asString(receipt["serviceId"]);
    if (serviceId !== "svc_arc_copytrade" && serviceId !== "svc_arc_reasoning") continue;
    const amount = asNumber(receipt["amount"]);
    const currency = asString(receipt["currency"]) ?? "USDC";
    items.push({
      id: `receipt:${asString(receipt["id"]) ?? items.length}`,
      kind: serviceId === "svc_arc_reasoning" ? "trace_unlock" : "portfolio_receipt",
      title: serviceId === "svc_arc_reasoning" ? "Reasoning trace unlocked" : "Protected portfolio receipt",
      detail: amount != null ? `${amount} ${currency} ${serviceId === "svc_arc_reasoning" ? "trace" : "portfolio"} receipt.` : "Agora receipt.",
      ts: asString(receipt["createdAt"]),
      txHash: asString(receipt["txHash"]),
      explorerUrl: txUrl(asString(receipt["txHash"])),
      status: asString(receipt["status"]) === "verified" ? "verified" : "paid",
    });
  }

  return items;
}

export function buildArcAlerts(decisions: AnyRecord[], degradationThreshold = 50): ArcAlert[] {
  const latest = decisions[0];
  if (!latest) return [];
  const ts = asString(latest["ts"]);
  const alerts: ArcAlert[] = [];
  const leaderScores = Array.isArray(latest["leaderScores"]) ? latest["leaderScores"] as AnyRecord[] : [];

  for (const leader of leaderScores) {
    const action = asString(leader["action"]);
    const name = asString(leader["name"]) ?? "Unknown leader";
    const degradation = asNumber(leader["degradationScore"]) ?? 0;
    if (action === "STOP") {
      alerts.push({
        id: `stop:${name}:${ts ?? ""}`,
        type: "leader_stop",
        severity: "critical",
        title: `${name} stopped`,
        detail: `CopyGuard blocked allocation because degradation reached ${degradation.toFixed(1)}.`,
        ts,
      });
    } else if (degradation >= degradationThreshold) {
      alerts.push({
        id: `degradation:${name}:${ts ?? ""}`,
        type: "degradation_threshold",
        severity: "warning",
        title: `${name} degradation rising`,
        detail: `Degradation is ${degradation.toFixed(1)}, above the ${degradationThreshold} alert threshold.`,
        ts,
      });
    }
  }

  const txHash = asString(latest["txHash"]);
  if (txHash) {
    alerts.push({
      id: `tx:${txHash}`,
      type: "arc_tx_recorded",
      severity: "info",
      title: "Arc decision recorded",
      detail: `Latest decision is verifiable on Arc: ${txHash.slice(0, 14)}...`,
      ts,
    });
  }

  return alerts.slice(0, 8);
}

export function evaluateArcDecisionVerification(
  latestDecision: AnyRecord | null | undefined,
  txReceipt: { found: boolean; status?: number | null },
): { ok: boolean; reason: string; txHash?: string; decisionHash?: string } {
  const txHash = latestDecision ? asString(latestDecision["txHash"]) : undefined;
  const decisionHash = latestDecision ? asString(latestDecision["decisionHash"]) : undefined;
  if (!latestDecision) return { ok: false, reason: "no_decision" };
  if (!txHash) return { ok: false, reason: "no_arc_tx", decisionHash };
  if (!txReceipt.found) return { ok: false, reason: "tx_not_found", txHash, decisionHash };
  if (txReceipt.status !== 1) return { ok: false, reason: "tx_not_successful", txHash, decisionHash };
  return { ok: true, reason: "verified_on_arc", txHash, decisionHash };
}
