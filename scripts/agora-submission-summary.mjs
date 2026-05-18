import { writeFile } from "node:fs/promises";

const frontendUrl = (process.env.AGORA_FRONTEND_URL ?? process.env.FRONTEND_URL ?? "http://127.0.0.1:5173").replace(/\/+$/, "");
const backendUrl = (process.env.AGORA_BACKEND_URL ?? process.env.BACKEND_URL ?? "http://127.0.0.1:8787").replace(/\/+$/, "");
const outputPath = process.env.AGORA_SUBMISSION_OUTPUT;

async function getJson(path) {
  const res = await fetch(`${backendUrl}${path}`, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${path} returned HTTP ${res.status}`);
  return res.json();
}

function short(value, head = 10, tail = 8) {
  if (!value || typeof value !== "string") return "n/a";
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

function money(value) {
  const num = Number(value ?? 0);
  return `$${(Number.isFinite(num) ? num : 0).toFixed(2)}`;
}

function statusLabel(status) {
  if (status === "ready_onchain") return "Onchain ready";
  if (status === "ready_paper") return "Paper ready";
  return "Needs setup";
}

function buildMarkdown({ readiness, live, traction, receipts }) {
  const stats = traction.stats ?? live.stats ?? {};
  const latest = live.latestDecision ?? null;
  const txHash = latest?.txHash ?? "";
  const latestAction = latest ? `${latest.primaryAction ?? latest.decision} at ETH ${money(latest.ethPrice)}` : "waiting for agent loop";
  const missing = Array.isArray(readiness.missing) && readiness.missing.length ? readiness.missing.join(", ") : "none";
  const actions = Array.isArray(readiness.recommendedActions) && readiness.recommendedActions.length
    ? readiness.recommendedActions.map((action) => `- ${action}`).join("\n")
    : "- No readiness blockers detected.";
  const quotes = Array.isArray(stats.validationHighlights) && stats.validationHighlights.length
    ? stats.validationHighlights.slice(0, 3).map((item) => `- ${item.label}: "${item.quote}"`).join("\n")
    : Array.isArray(stats.feedbackQuotes) && stats.feedbackQuotes.length
      ? stats.feedbackQuotes.slice(0, 3).map((quote) => `- "${quote}"`).join("\n")
      : "- No structured validation notes recorded yet.";

  return `# ArcMind CopyGuard Live Submission Summary

Generated: ${new Date().toISOString()}

## Links

- Live product: ${frontendUrl}/live
- Agora console: ${frontendUrl}/app/agora
- Readiness endpoint: ${backendUrl}/api/arc-readiness
- Latest Arc transaction: ${txHash ? `https://testnet.arcscan.app/tx/${txHash}` : "n/a"}

## One-Liner

ArcMind CopyGuard is an AI risk layer for copy-traders: it detects leader strategy decay, decides COPY/REDUCE/STOP/HOLD_USDC/MOVE_TO_USYC, and exposes paid reasoning traces plus protected USDC portfolio receipts on Arc.

## RFB Fit

- Primary: RFB 06 Social Trading Intelligence.
- Secondary: RFB 04 Adaptive Portfolio Manager.
- Secondary: RFB 02 Prediction/Trader Intelligence.

## Live Readiness

- Status: ${statusLabel(readiness.status)} (${readiness.status})
- Score: ${readiness.score}/100
- Missing: ${missing}
- Latest decision: ${latestAction}
- Agent mode: ${live.status?.mode ?? "unknown"}
- Agent id: ${short(live.status?.agentId)}
- Payout wallet: ${short(live.status?.payoutAddress)}

## Recommended Actions

${actions}

## Traction Metrics

- Testers: ${stats.testers ?? 0}
- Connected wallets: ${stats.connectedWallets ?? 0}
- Feedback count: ${stats.feedbackCount ?? 0}
- Trace unlocks: ${stats.traceUnlocks ?? 0}
- Protected portfolios: ${stats.protectedPortfolios ?? 0}
- Decision count: ${stats.decisionCount ?? 0}
- Verified testnet USDC volume: ${money(stats.testnetUsdcVolume)}
- Agora receipts visible: ${receipts.count ?? receipts.receipts?.length ?? 0}

## Validation Notes

${quotes}

## Suggested Traction Answer

During the hackathon window, ArcMind CopyGuard recorded ${stats.testers ?? 0} tester sessions, ${stats.connectedWallets ?? 0} connected wallets, ${stats.feedbackCount ?? 0} structured feedback notes, ${stats.traceUnlocks ?? 0} reasoning trace unlocks, and ${stats.protectedPortfolios ?? 0} protected portfolio starts with ${money(stats.testnetUsdcVolume)} in verified testnet USDC volume. The product asks users whether a leader should be copied, reduced, or stopped based on strategy decay rather than raw leaderboard rank.

## Honest Demo Boundary

Read-only walkthrough never creates fake local receipts. Paid reasoning trace unlocks and protected portfolio starts require an Arc wallet payment and backend verification before any receipt appears.
`;
}

async function main() {
  const [readiness, live, traction, receipts] = await Promise.all([
    getJson("/api/arc-readiness"),
    getJson("/api/arc-live"),
    getJson("/api/arc-traction/stats"),
    getJson("/api/receipts?workspace=agora"),
  ]);

  const markdown = buildMarkdown({ readiness, live, traction, receipts });
  if (outputPath) {
    await writeFile(outputPath, markdown, "utf8");
    console.log(`Wrote Agora submission summary to ${outputPath}`);
  } else {
    process.stdout.write(markdown);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
