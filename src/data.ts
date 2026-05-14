// Collector — imports per-workspace modules and assembles the shared arrays.
// To add a new workspace: create src/workspaces/<id>/index.ts and add one import line here.
import type { Agent, Receipt, Service } from "./types";
import type { WorkspaceId } from "./types";
import type { AgentRaw, SeedRow, SRaw } from "./workspaces/_types";

import {
  workspace as og,
  rawServices as ogSvcs,
  agentRaw as ogAgent,
  seedRows as ogRows,
  SEEDED_PINS,
} from "./workspaces/0g";
export type { SeededPin } from "./workspaces/0g";

import { workspace as mantle, rawServices as mantleSvcs, agentRaw as mantleAgent, seedRows as mantleRows } from "./workspaces/mantle";
import { workspace as arbitrum, rawServices as arbSvcs, agentRaw as arbAgent, seedRows as arbRows } from "./workspaces/arbitrum";
import { workspace as sui, rawServices as suiSvcs, agentRaw as suiAgent, seedRows as suiRows } from "./workspaces/sui";
import { workspace as qie, rawServices as qieSvcs, agentRaw as qieAgent, seedRows as qieRows } from "./workspaces/qie";
import { workspace as agora, rawServices as agoraSvcs, agentRaw as agoraAgent, seedRows as agoraRows } from "./workspaces/agora";
import { workspace as polygon, rawServices as polySvcs, agentRaw as polyAgent, seedRows as polyRows } from "./workspaces/polygon";

export { SEEDED_PINS };

// ── Workspaces ──────────────────────────────────────────────────────────────

export const workspaces = [og, mantle, arbitrum, sui, qie, agora, polygon];

export const wsBySlug = (slug: string) => workspaces.find((w) => w.route === `/${slug}`);

// ── Services ────────────────────────────────────────────────────────────────

const LAT: Record<string, string> = {
  data: "380ms", inference: "820ms", storage: "290ms", analytics: "410ms",
  payment: "210ms", trading: "540ms", tax: "760ms", "game-intel": "470ms",
};
const priceStr = (n: number, cur: string) => `${n.toFixed(2)} ${cur}`;

const ALL_RAW: SRaw[] = [
  ...ogSvcs, ...mantleSvcs, ...arbSvcs, ...suiSvcs, ...qieSvcs, ...agoraSvcs, ...polySvcs,
];

export const services: Service[] = ALL_RAW.map((s) => ({
  ...s,
  workspaceIds: [s.workspaceId],
  price: priceStr(s.priceUsd, s.currency),
  latency: LAT[s.category] ?? "400ms",
}));

export const servicesFor = (wsId: WorkspaceId) => services.filter((s) => s.workspaceIds.includes(wsId));
export const serviceById = (id: string) => services.find((s) => s.id === id);

// ── Agents ──────────────────────────────────────────────────────────────────

const mkAgent = (a: AgentRaw): Agent => ({
  ...a,
  budget: `$${a.dailyLimitUsd.toFixed(2)}`,
  spent: `$${a.spentTodayUsd.toFixed(2)}`,
  maxPerRequest: `$${a.maxPerRequestUsd.toFixed(2)}`,
  status: a.autoPay ? "Ready" : "Paused",
});

export const agents: Agent[] = [
  mkAgent(ogAgent), mkAgent(qieAgent), mkAgent(arbAgent), mkAgent(mantleAgent),
  mkAgent(suiAgent), mkAgent(agoraAgent), mkAgent(polyAgent),
];

export const agentFor = (wsId: WorkspaceId) => agents.find((a) => a.workspaceId === wsId) ?? agents[0];
export const agent = agents[0];

// ── Receipts ─────────────────────────────────────────────────────────────────

const now = Date.now();
const iso = (mins: number) => new Date(now - mins * 60000).toISOString();

let rc = 4000;
let sc = 7000;
export const makeReceiptId = () => `rcpt_${(rc++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
export const makeServiceId = () => `svc_usr_${(sc++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;
export const makeTxHash = () =>
  `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

const ALL_SEED_ROWS: SeedRow[] = [
  ...ogRows, ...qieRows, ...arbRows, ...mantleRows, ...suiRows, ...agoraRows, ...polyRows,
];

function seedReceipts(): Receipt[] {
  return ALL_SEED_ROWS.map((p, i) => {
    const svc = serviceById(p.svc)!;
    const ag = agents.find((a) => a.id === p.agent)!;
    const settled = p.status === "verified" || p.status === "paid";
    return {
      id: `rcpt_seed${i.toString().padStart(2, "0")}`,
      workspaceId: p.ws,
      serviceId: svc.id,
      serviceName: p.name ?? svc.name,
      agentName: ag.name,
      payerWallet: ag.wallet,
      providerWallet: svc.providerWallet,
      amount: svc.priceUsd,
      currency: svc.currency,
      network: svc.network,
      txHash: settled ? makeTxHash() : undefined,
      status: p.status,
      createdAt: iso(p.mins),
      errorCode: p.err,
      kind: p.kind,
      payload: p.payload,
    };
  });
}

export const initialReceipts: Receipt[] = seedReceipts();

// ── Metrics ──────────────────────────────────────────────────────────────────

export function workspaceMetrics(wsId: WorkspaceId, receipts: Receipt[]) {
  const rs = receipts.filter((r) => r.workspaceId === wsId);
  const verified = rs.filter((r) => r.status === "verified" || r.status === "paid");
  const failed = rs.filter((r) => r.status === "failed" || r.status === "replayed" || r.status === "expired");
  const revenue = verified.reduce((s, r) => s + r.amount, 0);
  const svcCount = servicesFor(wsId).filter((s) => s.status === "active").length;
  const agCount = agents.filter((a) => a.workspaceId === wsId && a.status === "Ready").length;
  return { requests: rs.length, paid: verified.length, failed: failed.length, revenue, svcCount, agCount };
}
