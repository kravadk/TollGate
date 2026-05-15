#!/usr/bin/env node
/**
 * TollGate integration / flow test
 *
 * Tests the complete x402 payment cycle against a running server.
 * All credentials are loaded from environment variables — no hardcoded secrets.
 *
 * Usage:
 *   node scripts/test-flow.js                      # server at http://localhost:8787
 *   SERVER_URL=https://tollgate-1.onrender.com node scripts/test-flow.js
 *
 * Requires: server running with NODE_ENV=development (enables dev-bypass)
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load server/.env if present (no hardcoded secrets) ───────────────────────
const envPath = resolve(__dirname, "../server/.env");
if (existsSync(envPath)) {
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

const BASE = (process.env.SERVER_URL || "http://localhost:8787").replace(/\/$/, "");
const AGENT_ID = process.env.TEST_AGENT_ID || "test-agent-flow";

// ── Helpers ───────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

async function get(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "X-Agent-Id": AGENT_ID },
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function getGateway(serviceId) {
  const res = await fetch(`${BASE}/api/gateway/${serviceId}`, {
    headers: { "X-Agent-Id": AGENT_ID },
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function payGateway(serviceId) {
  const res = await fetch(`${BASE}/api/gateway/${serviceId}`, {
    headers: {
      "X-Agent-Id": AGENT_ID,
      "X-Payment": "dev-bypass",
    },
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

function assert(label, condition, detail = "") {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

// ── Test suites ───────────────────────────────────────────────────────────────

async function testHealth() {
  console.log("\n[1] Server health");
  const { status, body } = await get("/api/status/health");
  assert("responds 200", status === 200, `got ${status}`);
  assert("status ok", body.status === "ok", JSON.stringify(body));
  assert("has version info", typeof body.version === "string" || typeof body.commit === "string");
}

async function testServiceDiscovery() {
  console.log("\n[2] Service discovery");
  const { status, body } = await get("/api/services");
  assert("responds 200", status === 200, `got ${status}`);
  assert("returns array", Array.isArray(body), typeof body);
  assert("has services", body.length > 0, `count: ${body.length}`);

  const svc = body[0];
  assert("service has id", typeof svc?.id === "string");
  assert("service has price", typeof svc?.priceUsd === "number");
  assert("service has workspace", typeof svc?.workspace === "string");

  const { status: s2, body: b2 } = await get("/api/services?workspace=0g");
  assert("workspace filter works", s2 === 200 && Array.isArray(b2), `status ${s2}`);
  if (Array.isArray(b2) && b2.length > 0) {
    assert("filtered to 0g only", b2.every((s) => s.workspace === "0g"));
  }
}

async function testServiceById() {
  console.log("\n[3] Service by ID");
  const { body: all } = await get("/api/services");
  const svcId = Array.isArray(all) && all[0]?.id;
  if (!svcId) { console.log("  – skipped (no services)"); return; }

  const { status, body } = await get(`/api/services/${svcId}`);
  assert("responds 200", status === 200, `got ${status}`);
  assert("id matches", body.id === svcId);
  assert("price is positive number", typeof body.priceUsd === "number" && body.priceUsd > 0);
}

async function testX402Discovery() {
  console.log("\n[4] x402 discovery spec");
  const { status, body } = await get("/api/v1/x402-spec");
  assert("responds 200", status === 200, `got ${status}`);
  assert("body is object", typeof body === "object" && body !== null);
}

async function testGateway402() {
  console.log("\n[5] Gateway — 402 challenge issued");
  const { status, body } = await getGateway("svc_0g_inference");
  assert("returns 402", status === 402, `got ${status}`);
  assert("has challengeId", typeof body?.challengeId === "string", JSON.stringify(body).slice(0, 120));
  assert("has payTo address", typeof body?.payTo === "string");
  assert("has amount", body?.amount !== undefined);
  assert("has expiresAt", body?.expiresAt !== undefined);
  if (body?.payTo) {
    assert("payTo is valid EVM address", /^0x[0-9a-fA-F]{40}$/.test(body.payTo), body.payTo);
  }
}

async function testGatewayDevBypass() {
  console.log("\n[6] Gateway — dev-bypass payment");
  const { status, body } = await payGateway("svc_0g_inference");
  if (status === 403) {
    console.log("  – dev-bypass disabled in production (expected on live server)");
    return undefined;
  }
  assert("returns 200", status === 200, `got ${status} — ${JSON.stringify(body).slice(0, 120)}`);
  assert("has receiptId", typeof body?.receiptId === "string", JSON.stringify(body));
  assert("has data payload", body?.data !== undefined);
  console.log(`  receipt: ${body?.receiptId}`);
  return body?.receiptId;
}

async function testReceipts(receiptId) {
  console.log("\n[7] Receipt ledger");
  const { status, body } = await get("/api/receipts");
  assert("responds 200", status === 200, `got ${status}`);
  assert("returns array", Array.isArray(body), typeof body);

  if (receiptId) {
    const { status: s2, body: b2 } = await get(`/api/receipts/${receiptId}`);
    assert("fetch by id — 200", s2 === 200, `got ${s2}`);
    const foundId = b2?.id ?? b2?.receiptId;
    assert("id matches", foundId === receiptId, `got ${foundId}`);
    assert("has serviceId", typeof b2?.serviceId === "string");
    assert("has agentId", typeof b2?.agentId === "string");
  }
}

async function testReceiptStats() {
  console.log("\n[8] Receipt stats");
  const { status, body } = await get("/api/receipts/stats");
  assert("responds 200", status === 200, `got ${status}`);
  assert("has total field", body?.total !== undefined, JSON.stringify(body));
}

async function testAgentScore() {
  console.log("\n[9] Agent credit score");
  const { status, body } = await get(`/api/agent-score/${AGENT_ID}`);
  assert("responds 200", status === 200, `got ${status}`);
  assert("has score", body?.score !== undefined, JSON.stringify(body));
  assert("has tier", typeof body?.tier === "string" || body?.tier !== undefined);
}

async function testAgents() {
  console.log("\n[10] Agents list");
  const { status, body } = await get("/api/agents");
  assert("responds 200", status === 200, `got ${status}`);
  assert("returns array or object", Array.isArray(body) || typeof body === "object");
}

async function testUnknownService() {
  console.log("\n[11] Unknown service — 404 error handling");
  const { status } = await getGateway("svc_does_not_exist_xyz_abc_999");
  assert("returns 404", status === 404, `got ${status}`);
}

async function testAllServices() {
  console.log("\n[12] All services respond with 402");
  const { body: all } = await get("/api/services");
  if (!Array.isArray(all) || all.length === 0) {
    console.log("  – skipped (no services)");
    return;
  }
  let checked = 0;
  for (const svc of all.slice(0, 5)) {
    const { status } = await getGateway(svc.id);
    if (status === 402 || status === 200) checked++;
    else {
      console.error(`  ✗ ${svc.id} returned ${status}`);
      failed++;
      continue;
    }
  }
  if (checked > 0) {
    console.log(`  ✓ ${checked}/${Math.min(5, all.length)} services returned 402/200`);
    passed++;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nTollGate flow test — ${BASE}`);
  console.log("=".repeat(54));

  try {
    await testHealth();
    await testServiceDiscovery();
    await testServiceById();
    await testX402Discovery();
    await testGateway402();
    const receiptId = await testGatewayDevBypass();
    await testReceipts(receiptId);
    await testReceiptStats();
    await testAgentScore();
    await testAgents();
    await testUnknownService();
    await testAllServices();
  } catch (err) {
    console.error("\nFatal:", err.message);
    console.error("Is the server running?  cd server && npm run dev");
    process.exit(1);
  }

  console.log("\n" + "=".repeat(54));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
