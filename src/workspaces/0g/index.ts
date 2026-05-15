import { ZeroGLogo } from "../../components/logos/ProjectLogos";
import type { Workspace } from "../../types";
import type { AgentRaw, SeedRow, SRaw } from "../_types";

const W = "0xF4BFd93061B160Fa376c7F66De207a00225B4e70";
const W2 = "0x0E437c109A4C1e15172c4dA557E77724D7243F71";

export const workspace: Workspace = {
  id: "0g",
  shortName: "0G",
  name: "0G Agent Payment Router",
  route: "/0g",
  pitch: "Agents pay per inference job and per storage write; receipts link to verifiable job metadata in 0G Storage.",
  tags: ["x402 Gateway", "0G Compute", "0G Storage", "TEE & Privacy", "MCP Server"],
  networks: ["0g-mainnet", "0g-testnet"],
  tabs: ["Overview", "Agent Identity", "Compute", "Trading Arena", "Storage & Memory", "TEE & Privacy", "Receipts"],
  accent: "#7C5CF8",
  darkAccent: "#9D85FF",
  Icon: ZeroGLogo,
};

export const rawServices: SRaw[] = [
  { id: "svc_0g_inference", workspaceId: "0g", name: "0G Inference Risk Report", category: "inference",
    description: "Runs a risk-assessment model on a wallet/contract and returns a scored report. Billed per inference job.",
    priceUsd: 0.03, currency: "USDC", network: "0g-testnet", provider: "0G Compute Node", providerWallet: W,
    sampleIn: '{ "target": "0x91...", "depth": 2 }', response: '{ "riskScore": 73, "summary": "...", "jobId": "job_0g_8821" }', status: "active", calls: 0 },
  { id: "svc_0g_storage", workspaceId: "0g", name: "0G Storage Memory Write", category: "storage",
    description: "Persists an agent memory blob to 0G Storage and returns a verifiable storage reference + metadata link.",
    priceUsd: 0.02, currency: "USDC", network: "0g-testnet", provider: "0G Storage", providerWallet: W2,
    sampleIn: '{ "agentId": "agent_...", "blob": "..." }', response: '{ "ref": "0g://Qm...", "size": 4096, "metaUrl": "..." }', status: "active", calls: 0 },
  { id: "svc_0g_context", workspaceId: "0g", name: "Private Agent Context API", category: "data",
    description: "Returns the agent's private working context; metadata is sealed and only the receipt holder can read it.",
    priceUsd: 0.04, currency: "USDC", network: "0g-testnet", provider: "0G Privacy Layer", providerWallet: W,
    sampleIn: '{ "agentId": "agent_...", "scope": "trading" }', response: '{ "context": "sealed", "unsealedFor": "rcpt_..." }', status: "active", calls: 0 },
  { id: "svc_0g_dav", workspaceId: "0g", name: "0G DA Verify", category: "storage",
    description: "Verifies a 0G data-availability commitment and returns the inclusion proof + segment metadata.",
    priceUsd: 0.015, currency: "USDC", network: "0g-testnet", provider: "0G DA Layer", providerWallet: W,
    sampleIn: '{ "commitment": "0x...", "segment": 12 }', response: '{ "ok": true, "proof": "0x...", "root": "0x..." }', status: "active", calls: 0 },
  { id: "svc_0g_batch", workspaceId: "0g", name: "0G Compute Batch Job", category: "inference",
    description: "Queues a batch of inference prompts on a 0G Compute node; one receipt covers the whole batch.",
    priceUsd: 0.09, currency: "USDC", network: "0g-testnet", provider: "0G Compute Node", providerWallet: W2,
    sampleIn: '{ "model": "risk-scorer-v2", "prompts": 24 }', response: '{ "batchId": "batch_0g_31a", "done": 24, "avgMs": 612 }', status: "active", calls: 0 },
];

export const agentRaw: AgentRaw = {
  id: "agent_0g_worker", workspaceId: "0g", name: "0G Compute Agent", wallet: "0x0E437c109A4C1e15172c4dA557E77724D7243F71",
  autoPay: true, dailyLimitUsd: 8, maxPerRequestUsd: 0.10, spentTodayUsd: 0,
  allowlist: ["svc_0g_inference", "svc_0g_storage", "svc_0g_context", "svc_0g_dav", "svc_0g_batch"],
};

export const seedRows: SeedRow[] = [];

export type SeededPin = { id: string; name: string; hash: string; size: number; content: string; receiptId?: string; createdAt: string };

export const SEEDED_PINS: SeededPin[] = [];
