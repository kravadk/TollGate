import { chromium } from "@playwright/test";

const frontendUrl = (process.env.AGORA_FRONTEND_URL ?? process.env.FRONTEND_URL ?? "http://127.0.0.1:5173").replace(/\/+$/, "");
const backendUrl = (process.env.AGORA_BACKEND_URL ?? process.env.BACKEND_URL ?? "http://127.0.0.1:8787").replace(/\/+$/, "");
const expectedMinScore = Number(process.env.AGORA_MIN_READINESS_SCORE ?? 70);

const agoraTabs = [
  "overview",
  "signal-hub",
  "reasoning-traces",
  "copy-trading",
  "kill-switch",
  "usyc-yield-swap",
  "app-kit",
  "arbitrage-agent",
  "portfolio-manager",
  "receipts",
];

const failures = [];
const notes = [];

function fail(label, detail) {
  failures.push(`${label}: ${detail}`);
}

function note(label, detail) {
  notes.push(`${label}: ${detail}`);
}

async function getJson(path) {
  const res = await fetch(`${backendUrl}${path}`, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${path} returned HTTP ${res.status}`);
  return res.json();
}

async function checkApi() {
  const readiness = await getJson("/api/arc-readiness");
  if (typeof readiness.score !== "number") fail("readiness", "score is missing");
  if (!["ready_onchain", "ready_paper", "needs_decisions"].includes(readiness.status)) fail("readiness", `unknown status ${readiness.status}`);
  if ((readiness.score ?? 0) < expectedMinScore) fail("readiness", `score ${readiness.score} below ${expectedMinScore}`);
  note("readiness", `${readiness.status} ${readiness.score}/100 missing=${(readiness.missing ?? []).join(",") || "none"}`);

  const live = await getJson("/api/arc-live");
  if (!live.status?.server) fail("arc-live", "status.server missing");
  if (!Array.isArray(live.decisions)) fail("arc-live", "decisions array missing");
  if (!live.decisionReplay?.events?.length) fail("arc-live", "decision replay events missing");
  note("arc-live", `${live.status?.mode ?? "unknown"} mode, ${live.decisions?.length ?? 0} decisions`);

  const alerts = await getJson("/api/arc-alerts");
  if (!Array.isArray(alerts.alerts)) fail("arc-alerts", "alerts array missing");

  const replay = await getJson("/api/arc-decision-replay/latest");
  if (!Array.isArray(replay.replay?.events)) fail("arc-decision-replay", "events array missing");

  const sourceRadar = await getJson("/api/arc-signal-sources");
  if (!Array.isArray(sourceRadar.sources) || sourceRadar.sources.length === 0) fail("arc-signal-sources", "source catalog missing");
  if (!sourceRadar.summary || typeof sourceRadar.summary.total !== "number") fail("arc-signal-sources", "summary missing");
  note("signal sources", `${sourceRadar.summary?.configured ?? 0}/${sourceRadar.summary?.total ?? 0} configured, mode=${sourceRadar.mode ?? "unknown"}`);

  const services = await getJson("/api/services?workspace=agora");
  if (!Array.isArray(services.services) || services.services.length === 0) fail("agora services", "no Agora services exposed");
  note("services", `${services.services?.length ?? 0} Agora services`);
}

async function checkViewport(browser, viewport, label) {
  const page = await browser.newPage({ viewport });
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(err.message));

  await page.goto(`${frontendUrl}/live`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByText("Judge Walkthrough").click();
  await page.waitForSelector(".am-readiness-card", { timeout: 15_000 });

  const liveMetrics = await page.evaluate(() => ({
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    title: document.querySelector(".am-readiness-card b")?.textContent ?? "",
    score: document.querySelector(".am-readiness-score > span")?.textContent ?? "",
    checks: document.querySelectorAll(".am-readiness-checks > div").length,
    hasTrace: document.body.textContent?.includes("Paid Reasoning Trace") ?? false,
    hasReplay: document.body.textContent?.includes("Decision Replay") ?? false,
    hasSimulator: document.body.textContent?.includes("What-If Simulator") ?? false,
    hasTraction: document.body.textContent?.includes("Live Traction") ?? false,
    hasSignalRadar: document.body.textContent?.includes("Signal Source Radar") ?? false,
  }));

  if (liveMetrics.overflowX) fail(`${label} /live`, "horizontal overflow");
  if (!liveMetrics.title || liveMetrics.score === "--") fail(`${label} /live`, "readiness card did not load");
  if (liveMetrics.checks < 6) fail(`${label} /live`, `only ${liveMetrics.checks} readiness checks rendered`);
  if (!liveMetrics.hasTrace) fail(`${label} /live`, "trace block missing");
  if (!liveMetrics.hasReplay) fail(`${label} /live`, "decision replay block missing");
  if (!liveMetrics.hasSimulator) fail(`${label} /live`, "simulator block missing");
  if (!liveMetrics.hasTraction) fail(`${label} /live`, "traction block missing");
  if (!liveMetrics.hasSignalRadar) fail(`${label} /live`, "signal source radar block missing");

  for (const tab of agoraTabs) {
    await page.goto(`${frontendUrl}/app/agora/${tab}`, { waitUntil: "networkidle", timeout: 60_000 });
    const tabMetrics = await page.evaluate(() => ({
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      textLength: document.body.innerText.trim().length,
    }));
    if (tabMetrics.overflowX) fail(`${label} /app/agora/${tab}`, "horizontal overflow");
    if (tabMetrics.textLength < 200) fail(`${label} /app/agora/${tab}`, "page appears empty or under-rendered");
  }

  if (consoleErrors.length) fail(`${label} console`, consoleErrors.slice(0, 5).join(" | "));
  await page.close();
  note(`${label} browser`, `checked /live and ${agoraTabs.length} Agora tabs`);
}

async function main() {
  console.log(`Agora live smoke\nfrontend=${frontendUrl}\nbackend=${backendUrl}\nminScore=${expectedMinScore}`);
  await checkApi();

  const browser = await chromium.launch({ headless: true });
  try {
    await checkViewport(browser, { width: 1280, height: 900 }, "desktop");
    await checkViewport(browser, { width: 390, height: 844 }, "mobile");
  } finally {
    await browser.close();
  }

  for (const item of notes) console.log(`ok  ${item}`);
  if (failures.length) {
    console.error("\nFailures:");
    for (const item of failures) console.error(`- ${item}`);
    process.exit(1);
  }
  console.log("\nAgora live smoke passed.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
