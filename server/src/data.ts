// Minimal server-side seed of services + agent policies, mirroring the shape of
// the richer src/data.ts on the frontend. Enough to drive the x402 gateway, the
// /x402-spec discovery endpoint, and the MCP tools. Keep IDs in sync with the
// frontend if you wire the two together.

import type { AgentPolicy, Service, WorkspaceId } from "./types.js";
import { env } from "./env.js";

const PAYOUT = env.x402PayoutAddress;

function svc(p: Partial<Service> & Pick<Service, "id" | "workspaceIds" | "name" | "category" | "priceUsd" | "description" | "sampleResponse">): Service {
  return {
    provider: p.provider ?? "TollGate Demo Provider",
    providerWallet: p.providerWallet ?? PAYOUT,
    currency: p.currency ?? env.x402Asset,
    network: p.network ?? env.x402Network,
    status: p.status ?? "active",
    ...p,
  } as Service;
}

export const services: Service[] = [
  // 0G
  svc({ id: "svc_0g_inference", workspaceIds: ["0g"], name: "0G Compute · Inference", category: "inference", priceUsd: 0.03,
    description: "Run an AI inference job on 0G Compute; receipt links to verifiable job metadata.",
    sampleResponse: { jobId: "job_…", model: "qwen2.5-7b", tokensIn: 412, tokensOut: 188, summary: "…" } }),
  svc({ id: "svc_0g_storage", workspaceIds: ["0g"], name: "0G Storage · Pin", category: "storage", priceUsd: 0.02,
    description: "Pin a content blob to 0G Storage; returns a SHA-256 content hash + metadata link.",
    sampleResponse: { ref: "0g://<sha256>", size: 2048, name: "agent-snapshot.md" } }),
  svc({ id: "svc_0g_private", workspaceIds: ["0g"], name: "0G · Private Agent Context", category: "storage", priceUsd: 0.04,
    description: "Sealed read/write of private agent memory; only the agent's keypair can decrypt.",
    sampleResponse: { ref: "0g-sealed://<hash>", accessRule: "agent-key-only" } }),

  // Liquify
  svc({ id: "svc_liq_wallet_risk", workspaceIds: ["liquify"], name: "Liquify · Wallet Risk", category: "analytics", priceUsd: 0.05,
    description: "Risk score + labels + approval exposure for an EVM address, powered by the Liquify indexer.",
    sampleResponse: { riskScore: 82, labels: ["DeFi veteran", "2 unlimited approvals"], summary: "…" } }),
  svc({ id: "svc_liq_signal", workspaceIds: ["liquify"], name: "Liquify · Trading Signal", category: "trading", priceUsd: 0.1,
    description: "Indexed buy/sell/hold signal with confidence for a pair.",
    sampleResponse: { pair: "ETH/USDC", signal: "hold", confidence: 0.61 } }),
  svc({ id: "svc_liq_tax", workspaceIds: ["liquify"], name: "Liquify · Tax Classifier", category: "tax", priceUsd: 0.08,
    description: "Categorize a wallet's taxable events (swaps, LP, bridges, staking) into a draft report.",
    sampleResponse: { taxableEvents: 14, realizedPnlUsd: 1234.5, jurisdictionTags: ["US"] } }),

  // QIE
  svc({ id: "svc_qie_checkout", workspaceIds: ["qie"], name: "QIE · Merchant Checkout", category: "payment", priceUsd: 0.01,
    description: "Hosted checkout link on the QIE rail; returns a pay URL + invoice id.",
    sampleResponse: { payUrl: "https://pay.qie.demo/inv_…", invoiceId: "inv_…", settle: { USDT: "70%", QIE: "30%" } } }),
  svc({ id: "svc_qie_pass", workspaceIds: ["qie"], name: "QIE Pass · Gated API", category: "analytics", priceUsd: 0.02,
    description: "Identity / access check combining QIE Pass status + wallet history risk.",
    sampleResponse: { passId: "pass_…", verified: true, riskScore: 12 } }),
  svc({ id: "svc_qie_dex", workspaceIds: ["qie"], name: "QIEDEX · Data", category: "data", priceUsd: 0.03,
    description: "Paid swap quotes, liquidity depth, pair stats from QIEDEX.",
    sampleResponse: { pair: "QIE/USDT", tvlUsd: 412000, depth: "…" } }),

  // Arbitrum
  svc({ id: "svc_arb_invoice", workspaceIds: ["arbitrum"], name: "Arbitrum · Stablecoin Invoice", category: "payment", priceUsd: 0.02, network: "arbitrum-sepolia",
    description: "Create a USDC invoice on Arbitrum; returns invoice id + pay-to + amount.",
    sampleResponse: { invoiceId: "inv_…", payTo: "0x…", amountUsdc: "25.00" } }),
  svc({ id: "svc_arb_escrow", workspaceIds: ["arbitrum"], name: "Arbitrum · Agent Escrow", category: "payment", priceUsd: 0.03, network: "arbitrum-sepolia",
    description: "Open an escrow that holds payment until delivery confirms, then release or refund.",
    sampleResponse: { escrowId: "esc_…", state: "held", amountUsdc: "25.00" } }),
  svc({ id: "svc_arb_orbit", workspaceIds: ["arbitrum"], name: "Arbitrum · Orbit Monitor", category: "data", priceUsd: 0.01,
    description: "Per-request read of an Orbit chain: block height, settlement status, bridge health.",
    sampleResponse: { block: 1284412, settlement: "ok", bridgeHealth: "green" } }),

  // Mantle
  svc({ id: "svc_mnt_alpha", workspaceIds: ["mantle"], name: "Mantle · Alpha Data", category: "data", priceUsd: 0.04,
    description: "Paid trading / RWA / yield alpha drops, pulled per call inside wallet policy.",
    sampleResponse: { drops: [{ ts: "…", asset: "mETH", note: "…", confidence: 0.7 }] } }),
  svc({ id: "svc_mnt_yield", workspaceIds: ["mantle"], name: "Mantle · mETH/USDY Yield", category: "data", priceUsd: 0.03,
    description: "Yield/risk reads for Mantle-native assets, billed per query.",
    sampleResponse: { mETH: { apyPct: 4.2, tvlUsd: 182_000_000 }, USDY: { apyPct: 5.1, tvlUsd: 74_000_000 } } }),
  svc({ id: "svc_mnt_backtest", workspaceIds: ["mantle"], name: "Mantle · Strategy Backtest", category: "inference", priceUsd: 0.05,
    description: "Agent pays per backtest run; returns return / drawdown / Sharpe + a receipt.",
    sampleResponse: { pair: "mETH/USDY", retPct: 12.4, maxDdPct: 6.1, sharpe: 1.3, trades: 42 } }),

  // Eazo
  svc({ id: "svc_eazo_subopt", workspaceIds: ["eazo"], name: "Eazo · Subscription Optimizer", category: "analytics", priceUsd: 0.02,
    description: "Reviews recurring spend and proposes pause/cancel actions within a weekly budget.",
    sampleResponse: { suggestions: [{ name: "Spotify", action: "cancel", reason: "3 months unused" }] } }),
  svc({ id: "svc_eazo_brief", workspaceIds: ["eazo"], name: "Eazo · Personal Finance Brief", category: "data", priceUsd: 0.03,
    description: "Daily brief: what the AI spent, risky approvals, upcoming renewals.",
    sampleResponse: { spentTodayUsd: 1.42, riskyApprovals: 0, renewals: ["Claude Pro · tomorrow"] } }),

  // Berkeley
  svc({ id: "svc_bk_tx_explainer", workspaceIds: ["berkeley"], name: "Berkeley · Tx Explainer", category: "inference", priceUsd: 0.03,
    description: "Decode a pending wallet action: what it does, what it touches, safe/caution/danger.",
    sampleResponse: { action: "approve", token: "USDC", risk: "danger", reason: "infinite approval to new contract" } }),
  svc({ id: "svc_bk_debug", workspaceIds: ["berkeley"], name: "Berkeley · Debug Tool", category: "inference", priceUsd: 0.02,
    description: "Replay an agent's last run step by step: request → 402 → proof → settled receipt.",
    sampleResponse: { steps: ["request", "402", "pay", "verified"], receiptId: "rcpt_…" } }),

  // DeepSurge
  svc({ id: "svc_ds_intel", workspaceIds: ["deepsurge"], name: "DeepSurge · Resource Intel", category: "game-intel", priceUsd: 0.04,
    description: "Live EVE Frontier intel per call — resources, routes, market, trade-risk.",
    sampleResponse: { region: "Jita", hostilesSpotted: 3, gateCampRisk: "high", recommendedRoute: "via Perimeter" } }),
  svc({ id: "svc_ds_trade_risk", workspaceIds: ["deepsurge"], name: "DeepSurge · Trade Risk", category: "game-intel", priceUsd: 0.04,
    description: "Per-call risk read on a Frontier trade/route — gank prob, spread, escort advice.",
    sampleResponse: { from: "Jita", to: "Amarr", gankProbPct: 18, spreadPct: 4.2, escort: "recommended", jumps: 9 } }),
];

export const agents: AgentPolicy[] = [
  { id: "agent_yield_researcher", workspaceId: "mantle", name: "Yield Researcher", wallet: "0x0E43...3F71", status: "active", autoPay: true, dailyLimitUsd: 10, maxPerRequestUsd: 0.25, spentTodayUsd: 0.27, allowlist: ["svc_mnt_alpha", "svc_mnt_yield", "svc_mnt_backtest", "svc_liq_signal"] },
  { id: "agent_wallet_analyst", workspaceId: "liquify", name: "Wallet Analyst", wallet: "0x9aC2...1bE0", status: "active", autoPay: true, dailyLimitUsd: 5, maxPerRequestUsd: 0.1, spentTodayUsd: 0.13, allowlist: ["svc_liq_wallet_risk", "svc_liq_tax"] },
  { id: "agent_life_companion", workspaceId: "eazo", name: "Life Companion", wallet: "0x4f1D...77aa", status: "active", autoPay: true, dailyLimitUsd: 3, maxPerRequestUsd: 0.05, spentTodayUsd: 0.04, allowlist: ["svc_eazo_subopt", "svc_eazo_brief"] },
  { id: "agent_0g_runner", workspaceId: "0g", name: "0G Job Runner", wallet: "0x2bA9...c011", status: "active", autoPay: true, dailyLimitUsd: 8, maxPerRequestUsd: 0.2, spentTodayUsd: 0.11, allowlist: ["svc_0g_inference", "svc_0g_storage", "svc_0g_private"] },
];

export function serviceById(id: string): Service | undefined {
  return services.find((s) => s.id === id);
}

export function servicesForWorkspace(ws: WorkspaceId): Service[] {
  return services.filter((s) => s.workspaceIds.includes(ws));
}

export function agentById(id: string): AgentPolicy | undefined {
  return agents.find((a) => a.id === id);
}
