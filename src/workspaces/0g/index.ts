import { ZeroGLogo } from "../../components/logos/ProjectLogos";
import type { Workspace } from "../../types";
import type { AgentRaw, SeedRow, SRaw } from "../_types";

const W = "0xProv…a91c";
const W2 = "0xProv…77be";

export const workspace: Workspace = {
  id: "0g",
  shortName: "0G",
  name: "0G Agent Payment Router",
  route: "/0g",
  hackathon: "0G APAC Hackathon",
  pitch: "Agents pay per inference job and per storage write; receipts link to verifiable job metadata in 0G Storage.",
  tracks: ["Agentic Economy", "Agentic Infra", "Agentic Trading Arena", "Privacy & TEE", "Web 4.0"],
  networks: ["0g-testnet", "base-sepolia"],
  tabs: ["Overview", "Agent Identity", "Compute", "Trading Arena", "Storage & Memory", "TEE & Privacy", "Receipts"],
  accent: "#7C5CF8",
  darkAccent: "#9D85FF",
  Icon: ZeroGLogo,
};

export const rawServices: SRaw[] = [
  { id: "svc_0g_inference", workspaceId: "0g", name: "0G Inference Risk Report", category: "inference",
    description: "Runs a risk-assessment model on a wallet/contract and returns a scored report. Billed per inference job.",
    priceUsd: 0.03, currency: "USDC", network: "0g-testnet", provider: "0G Compute Node", providerWallet: W,
    sampleIn: '{ "target": "0x91…", "depth": 2 }', response: '{ "riskScore": 73, "summary": "…", "jobId": "job_0g_8821" }', status: "active", calls: 1284 },
  { id: "svc_0g_storage", workspaceId: "0g", name: "0G Storage Memory Write", category: "storage",
    description: "Persists an agent memory blob to 0G Storage and returns a verifiable storage reference + metadata link.",
    priceUsd: 0.02, currency: "USDC", network: "0g-testnet", provider: "0G Storage", providerWallet: W2,
    sampleIn: '{ "agentId": "agent_…", "blob": "…" }', response: '{ "ref": "0g://Qm…", "size": 4096, "metaUrl": "…" }', status: "active", calls: 642 },
  { id: "svc_0g_context", workspaceId: "0g", name: "Private Agent Context API", category: "data",
    description: "Returns the agent's private working context; metadata is sealed and only the receipt holder can read it.",
    priceUsd: 0.04, currency: "USDC", network: "0g-testnet", provider: "0G Privacy Layer", providerWallet: W,
    sampleIn: '{ "agentId": "agent_…", "scope": "trading" }', response: '{ "context": "🔒 sealed", "unsealedFor": "rcpt_…" }', status: "active", calls: 318 },
  { id: "svc_0g_dav", workspaceId: "0g", name: "0G DA Verify", category: "storage",
    description: "Verifies a 0G data-availability commitment and returns the inclusion proof + segment metadata.",
    priceUsd: 0.015, currency: "USDC", network: "0g-testnet", provider: "0G DA Layer", providerWallet: W,
    sampleIn: '{ "commitment": "0x…", "segment": 12 }', response: '{ "ok": true, "proof": "0x…", "root": "0x…" }', status: "active", calls: 471 },
  { id: "svc_0g_batch", workspaceId: "0g", name: "0G Compute Batch Job", category: "inference",
    description: "Queues a batch of inference prompts on a 0G Compute node; one receipt covers the whole batch.",
    priceUsd: 0.09, currency: "USDC", network: "0g-testnet", provider: "0G Compute Node", providerWallet: W2,
    sampleIn: '{ "model": "risk-scorer-v2", "prompts": 24 }', response: '{ "batchId": "batch_0g_31a", "done": 24, "avgMs": 612 }', status: "active", calls: 188 },
];

export const agentRaw: AgentRaw = {
  id: "agent_0g_worker", workspaceId: "0g", name: "0G Job Worker", wallet: "0xAg3n…91aa",
  autoPay: true, dailyLimitUsd: 8, maxPerRequestUsd: 0.10, spentTodayUsd: 0.62,
  allowlist: ["svc_0g_inference", "svc_0g_storage", "svc_0g_context", "svc_0g_dav", "svc_0g_batch"],
};

export const seedRows: SeedRow[] = [
  { ws: "0g", svc: "svc_0g_inference", agent: "agent_0g_worker", mins: 6, status: "verified",
    kind: "0g.inference", name: "0G Compute · Risk Scorer v2", payload: { model: "risk-scorer-v2", modelName: "Risk Scorer v2", tokens: 2400, prompt: "Score wallet 0x9f3c…ba1 for mixer adjacency over the last 30 days.", response: '{ "riskScore": 73, "labels": ["mixer-adjacent","high-velocity"], "confidence": "0.88" }' } },
  { ws: "0g", svc: "svc_0g_inference", agent: "agent_0g_worker", mins: 28, status: "verified",
    kind: "0g.inference", name: "0G Compute · Wallet Labeler", payload: { model: "wallet-labeler", modelName: "Wallet Labeler", tokens: 1200, prompt: "Label 0x44de… by on-chain behaviour.", response: '{ "labels": ["agent-wallet","defi-power-user"], "confidence": 0.91 }' } },
  { ws: "0g", svc: "svc_0g_storage", agent: "agent_0g_worker", mins: 19, status: "verified",
    kind: "0g.pin", name: "0G Storage · Pin", payload: { hash: "9f2c1a7be4d03f5a8c1b6e2d9047a3f1c8b5e0d2a6f7b1c4e9d3a0f8b2c6e1d4", name: "agent-snapshot.md", size: 184, blobId: "pin_9f2c1a7be4" } },
  { ws: "0g", svc: "svc_0g_inference", agent: "agent_0g_worker", mins: 47, status: "verified",
    kind: "0g.inference", name: "0G Compute · Anomaly Detect", payload: { model: "anomaly-detect", modelName: "Anomaly Detect", tokens: 3000, prompt: "Is 0x91a2… an outlier vs its cohort?", response: '{ "anomalyScore": "0.412", "cluster": "c_4a1c", "notes": "Within normal cohort range" }' } },
  { ws: "0g", svc: "svc_0g_storage", agent: "agent_0g_worker", mins: 110, status: "verified",
    kind: "0g.pin", name: "0G Storage · Pin", payload: { hash: "2b07d4e1a9c63f08b15e7c2d4a6093f8c1b5e0d2a6f7b1c4e9d3a0f8b2c6e1a3", name: "trade-log-2026-05.json", size: 4096, blobId: "pin_2b07d4e1a9" } },
  { ws: "0g", svc: "svc_0g_storage", agent: "agent_0g_worker", mins: 200, status: "expired", err: "challenge_expired" },
];

export type SeededPin = { id: string; name: string; hash: string; size: number; content: string; receiptId?: string; createdAt: string };

const _now = Date.now();
const _iso = (mins: number) => new Date(_now - mins * 60000).toISOString();

export const SEEDED_PINS: SeededPin[] = [
  { id: "pin_9f2c1a7be4", name: "agent-snapshot.md", size: 184,
    hash: "9f2c1a7be4d03f5a8c1b6e2d9047a3f1c8b5e0d2a6f7b1c4e9d3a0f8b2c6e1d4",
    content: "# memory-segment\nagent_yield_researcher.snapshot\nbalance: 1.23 ETH\nstrategy: mETH-USDY pair\nlast_trade: 2026-05-12T11:42:08Z",
    receiptId: "rcpt_seed11", createdAt: _iso(110) },
  { id: "pin_2b07d4e1a9", name: "trade-log-2026-05.json", size: 4096,
    hash: "2b07d4e1a9c63f08b15e7c2d4a6093f8c1b5e0d2a6f7b1c4e9d3a0f8b2c6e1a3",
    content: '{ "trades": 184, "month": "2026-05", "pnlUsd": 312.44, "winRate": 0.61 }',
    receiptId: "rcpt_seed13", createdAt: _iso(220) },
  { id: "pin_5e1d4a0f8b", name: "policy.json", size: 256,
    hash: "5e1d4a0f8b2c6e1d49f2c1a7be4d03f5a8c1b6e2d9047a3f1c8b5e0d2a6f7b1c",
    content: '{ "maxPerRequestUsd": 0.10, "dailyLimitUsd": 8, "allowlist": ["svc_0g_inference","svc_0g_storage"] }',
    createdAt: _iso(540) },
];
