import {
  Cable,
  ChartNoAxesCombined,
  DatabaseZap,
  Globe2,
  type LucideIcon,
} from "lucide-react";
import { ZeroGLogo, MantleLogo, ArbitrumLogo, SuiLogo, QieLogo } from "./components/logos/ProjectLogos";
import type { Agent, Receipt, ReceiptStatus, Service, Workspace, WorkspaceId } from "./types";

export const workspaces: Workspace[] = [
  {
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
  },
  {
    id: "mantle",
    shortName: "Mantle",
    name: "Mantle Agent Wallet Economy",
    route: "/mantle",
    hackathon: "DoraHacks × Mantle Turing Test",
    pitch: "Agent wallets with spend policy buy Mantle alpha, mETH/USDY yield signals and RWA risk reports per call.",
    tracks: ["Agentic Wallets & Economy", "AI Trading & Strategy", "AI Alpha & Data", "AI × RWA", "AI DevTools"],
    networks: ["mantle-sepolia"],
    tabs: ["Overview", "Agent Economy", "Alpha Data", "Yield Optimizer", "RWA Data", "Trading Strategies", "AI DevTools", "Agent Credit Score"],
    accent: "#0FBF7A",
    darkAccent: "#2BE39C",
    Icon: MantleLogo,
  },
  {
    id: "arbitrum",
    shortName: "Arbitrum",
    name: "Arbitrum Agent Services",
    route: "/arbitrum",
    hackathon: "Arbitrum Open House London",
    pitch: "Agents pay USDC for API/services on Arbitrum with spend limits, receipts and optional escrowed delivery.",
    tracks: ["Best Agentic Project", "Overall Prize", "Stylus / Rust", "DeFi / Payments", "Grants"],
    networks: ["arbitrum-sepolia"],
    tabs: ["Overview", "Agent Marketplace", "USDC Payments", "Stylus Contracts", "Escrow", "Wallet Protection"],
    accent: "#1B4ADD",
    darkAccent: "#5C7CFF",
    Icon: ArbitrumLogo,
  },
  {
    id: "sui",
    shortName: "Sui",
    name: "Sui Agent Economy",
    route: "/sui",
    hackathon: "Sui Overflow 2026",
    pitch: "Agents pay per tool call and per Walrus storage write on Sui; Move contracts govern identity, escrow and NFT-gated access.",
    tracks: ["Agentic Web", "Walrus Storage", "Move DeFi"],
    networks: ["sui-mainnet", "sui-testnet"],
    tabs: ["Overview", "Agent Wallet", "Walrus Storage", "Move Contracts", "NFT Market", "Receipts"],
    accent: "#4DA2FF",
    darkAccent: "#80BFFF",
    Icon: SuiLogo,
  },
  {
    id: "qie",
    shortName: "QIE",
    name: "QIE Agent Payment Gateway",
    route: "/qie",
    hackathon: "QIE Hackathon",
    pitch: "Merchants list paid AI/API services; agents settle through the QIE payment rail with QIE Pass gating.",
    tracks: ["DeFi & Payments", "AI + Web3", "Gaming & Metaverse", "Social & Community", "Infra & Tools"],
    networks: ["qie-testnet"],
    tabs: ["Overview", "Merchant Checkout", "QIE Wallet", "QIE Pass", "Game Store", "Creator Hub"],
    accent: "#00C389",
    darkAccent: "#2EE3A8",
    Icon: QieLogo,
  },
  {
    id: "eazo",
    shortName: "Eazo",
    name: "Eazo AI Subscription OS",
    route: "/eazo",
    hackathon: "Eazo AI Hackathon",
    pitch: "A personal AI companion manages paid tools and subscriptions inside a weekly budget you control.",
    tracks: ["AI Companion", "Life OS", "Wildcard"],
    networks: ["base-sepolia"],
    tabs: ["Overview", "AI Companion", "Subscriptions", "Personal Budget", "Life OS", "Approvals"],
    accent: "#ff6c3b",
    darkAccent: "#ff9d78",
    Icon: Globe2 as LucideIcon,
  },
  {
    id: "berkeley",
    shortName: "Berkeley",
    name: "Berkeley Agent Payment Playground",
    route: "/berkeley",
    hackathon: "Berkeley AI Hackathon",
    pitch: "A sandbox where an AI agent pays for a tool call and you can inspect every step of the 402 / payment flow.",
    tracks: ["Ddoski's Toolbox", "Ddoski's Playground", "Ddoski's World"],
    networks: ["base-sepolia"],
    tabs: ["Overview", "Playground", "Paid Tools", "Agent Debugger", "Transaction Explainer", "Receipts"],
    accent: "#13b5d5",
    darkAccent: "#6ee5ff",
    Icon: Cable as LucideIcon,
  },
  {
    id: "liquify",
    shortName: "Liquify",
    name: "Liquify x402 Data Terminal",
    route: "/liquify",
    hackathon: "DoraHacks × Liquify",
    pitch: "Agents buy wallet analytics, trading signals and tax classification per call over a native x402 handshake.",
    tracks: ["Next-Gen Trading + x402", "Wallet Analysis", "DeFi Tax"],
    networks: ["base-sepolia", "arbitrum-sepolia"],
    tabs: ["Overview", "Trading Data", "Wallet Analysis", "Tax Reports", "x402 Gateway", "Payments"],
    accent: "#F2A60C",
    darkAccent: "#FFC247",
    Icon: ChartNoAxesCombined as LucideIcon,
  },
  {
    id: "deepsurge",
    shortName: "DeepSurge",
    name: "Frontier Intel Market",
    route: "/deepsurge",
    hackathon: "DeepSurge × EVE Frontier",
    pitch: "Players and agents pay for live EVE Frontier intel — resource routes, market data and trade-risk feeds.",
    tracks: ["Utility", "Technical Implementation", "Live Frontier Integration"],
    networks: ["frontier-testnet"],
    tabs: ["Overview", "Intel API", "Resource Data", "Trade Safety", "Alerts", "Payments"],
    accent: "#d8ff2f",
    darkAccent: "#d9ff47",
    Icon: DatabaseZap as LucideIcon,
  },
];

export const wsBySlug = (slug: string) => workspaces.find((w) => w.route === `/${slug}`);

const W = "0xProv…a91c";
const W2 = "0xProv…77be";
const LAT: Record<string, string> = {
  data: "380ms",
  inference: "820ms",
  storage: "290ms",
  analytics: "410ms",
  payment: "210ms",
  trading: "540ms",
  tax: "760ms",
  "game-intel": "470ms",
};
const priceStr = (n: number, cur: string) => `${n.toFixed(2)} ${cur}`;

type SRaw = Omit<Service, "workspaceIds" | "price" | "latency"> & { workspaceId: WorkspaceId };

const RAW_SERVICES: SRaw[] = [
  // 0G
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

  // Liquify
  { id: "svc_wallet_risk", workspaceId: "liquify", name: "Wallet Risk API", category: "analytics",
    description: "Scores a wallet on approvals exposure, contract age, mixer proximity and label reputation.",
    priceUsd: 0.05, currency: "USDC", network: "base-sepolia", provider: "Studio Sphere Labs", providerWallet: W,
    sampleIn: '{ "address": "0x91…", "chain": "arbitrum" }', response: '{ "riskScore": 82, "summary": "High exposure to new contracts, 2 unlimited approvals." }', status: "active", calls: 3920 },
  { id: "svc_yield_signal", workspaceId: "liquify", name: "Trading Signal API", category: "trading",
    description: "Returns a directional signal with confidence + risk band for a given asset and venue.",
    priceUsd: 0.10, currency: "USDC", network: "base-sepolia", provider: "Studio Sphere Labs", providerWallet: W,
    sampleIn: '{ "asset": "USDC", "venue": "uni-v3" }', response: '{ "signal": "accumulate", "confidence": 0.71, "riskBand": "mid" }', status: "active", calls: 1740 },
  { id: "svc_tax_classifier", workspaceId: "liquify", name: "Tax Classification API", category: "tax",
    description: "Classifies wallet transactions into tax categories (income, swap, transfer, fee) with cost-basis hints.",
    priceUsd: 0.08, currency: "USDC", network: "base-sepolia", provider: "Dip Inc. Tax", providerWallet: W2,
    sampleIn: '{ "address": "0x91…", "year": 2025 }', response: '{ "categorized": 412, "income": 31, "swaps": 188, "needsReview": 7 }', status: "active", calls: 980 },

  // QIE
  { id: "svc_qie_checkout", workspaceId: "qie", name: "QIE Merchant Checkout API", category: "payment",
    description: "Creates a paid checkout intent for a merchant resource; agents settle through the QIE rail.",
    priceUsd: 0.01, currency: "native", network: "qie-testnet", provider: "QIE Merchant Tools", providerWallet: W,
    sampleIn: '{ "sku": "report-pro", "qty": 1 }', response: '{ "intent": "ci_…", "payTo": "0x…", "amount": "1.00" }', status: "active", calls: 2210 },
  { id: "svc_qie_dex", workspaceId: "qie", name: "QIEDEX Data API", category: "data",
    description: "Live QIEDEX pool data: depth, fees, recent trades, TWAP — billed per query.",
    priceUsd: 0.02, currency: "native", network: "qie-testnet", provider: "QIEDEX", providerWallet: W2,
    sampleIn: '{ "pair": "QIE/USDT" }', response: '{ "twap": "0.0421", "depth1pct": "84,200", "fee": "0.30%" }', status: "active", calls: 1502 },
  { id: "svc_qie_pass", workspaceId: "qie", name: "QIE Pass-Gated API", category: "data",
    description: "A premium endpoint that requires a valid QIE Pass to identify the merchant/user before serving data.",
    priceUsd: 0.03, currency: "native", network: "qie-testnet", provider: "QIE Pass", providerWallet: W,
    sampleIn: '{ "pass": "qp_…", "resource": "vip-feed" }', response: '{ "tier": "gold", "data": { … } }', status: "paused", calls: 210 },

  // Arbitrum
  { id: "svc_arb_invoice", workspaceId: "arbitrum", name: "Stablecoin Invoice API", category: "payment",
    description: "Issues a USDC invoice on Arbitrum and returns a payable challenge; provider receives stablecoin directly.",
    priceUsd: 0.02, currency: "USDC", network: "arbitrum-sepolia", provider: "Arbitrum Agent Services", providerWallet: W,
    sampleIn: '{ "memo": "API access", "amount": "0.02" }', response: '{ "invoiceId": "inv_…", "payTo": "0x…", "network": "arbitrum-sepolia" }', status: "active", calls: 870 },
  { id: "svc_arb_orbit", workspaceId: "arbitrum", name: "Orbit Chain Monitor", category: "data",
    description: "Health + risk metrics for an Orbit chain: sequencer status, batch lag, bridge flow. Billed per poll.",
    priceUsd: 0.05, currency: "USDC", network: "arbitrum-sepolia", provider: "Orbit Watchtower", providerWallet: W2,
    sampleIn: '{ "chainId": 421614 }', response: '{ "sequencer": "ok", "batchLagS": 4, "bridgeNet1h": "+12.4 ETH" }', status: "active", calls: 540 },
  { id: "svc_arb_escrow", workspaceId: "arbitrum", name: "Agent Escrow API", category: "payment",
    description: "Holds payment in escrow until the service delivery proof is posted; releases or refunds automatically.",
    priceUsd: 0.04, currency: "USDC", network: "arbitrum-sepolia", provider: "Arbitrum Agent Services", providerWallet: W,
    sampleIn: '{ "deal": "deal_…", "amount": "0.04" }', response: '{ "escrowId": "esc_…", "state": "held", "releaseOn": "deliveryProof" }', status: "active", calls: 290 },

  // Mantle
  { id: "svc_mnt_rwa", workspaceId: "mantle", name: "Mantle RWA Risk API", category: "data",
    description: "Risk and yield metrics for tokenised RWA baskets on Mantle, with collateral and duration breakdown.",
    priceUsd: 0.06, currency: "USDC", network: "mantle-sepolia", provider: "Mantle Alpha Desk", providerWallet: W,
    sampleIn: '{ "basket": "T-BILL-90D" }', response: '{ "apy": "4.83%", "durationD": 84, "riskGrade": "A-" }', status: "active", calls: 660 },
  { id: "svc_mnt_meth", workspaceId: "mantle", name: "mETH / USDY Yield Signal", category: "trading",
    description: "Yield + rotation signal across mETH and USDY positions with a suggested rebalance band.",
    priceUsd: 0.10, currency: "USDC", network: "mantle-sepolia", provider: "Mantle Alpha Desk", providerWallet: W,
    sampleIn: '{ "size": "100k" }', response: '{ "rotate": "30% → USDY", "expEdge": "+0.7%", "horizonD": 14 }', status: "active", calls: 415 },
  { id: "svc_mnt_backtest", workspaceId: "mantle", name: "Strategy Backtest API", category: "inference",
    description: "Runs a backtest of a supplied strategy spec on Mantle market data. Billed per backtest run.",
    priceUsd: 0.15, currency: "USDC", network: "mantle-sepolia", provider: "Strategy Sandbox", providerWallet: W2,
    sampleIn: '{ "spec": { "rule": "…" } }', response: '{ "sharpe": 1.4, "maxDD": "-9.2%", "trades": 184 }', status: "active", calls: 122 },

  // Eazo
  { id: "svc_eazo_subs", workspaceId: "eazo", name: "Subscription Optimizer API", category: "analytics",
    description: "Audits the user's recurring tool spend and proposes pauses, downgrades and bundle swaps.",
    priceUsd: 0.02, currency: "USDC", network: "base-sepolia", provider: "Eazo Companion", providerWallet: W,
    sampleIn: '{ "userId": "u_…" }', response: '{ "saveMonthlyUsd": 14.5, "actions": 3 }', status: "active", calls: 980 },
  { id: "svc_eazo_brief", workspaceId: "eazo", name: "Personal Finance Brief", category: "data",
    description: "A daily plain-language brief of balances, upcoming charges and budget status for the companion.",
    priceUsd: 0.01, currency: "USDC", network: "base-sepolia", provider: "Eazo Companion", providerWallet: W,
    sampleIn: '{ "userId": "u_…" }', response: '{ "summary": "On track. $42 in subs due Fri.", "alerts": 0 }', status: "active", calls: 2400 },
  { id: "svc_eazo_toolbuy", workspaceId: "eazo", name: "Tool Purchase API", category: "payment",
    description: "Lets the companion buy a one-off paid tool call within the weekly budget, with an approval hook.",
    priceUsd: 0.05, currency: "USDC", network: "base-sepolia", provider: "Eazo Companion", providerWallet: W2,
    sampleIn: '{ "tool": "pdf-extract", "args": { … } }', response: '{ "result": "…", "chargedUsd": 0.05 }', status: "active", calls: 510 },

  // Berkeley
  { id: "svc_bk_tx", workspaceId: "berkeley", name: "Transaction Explainer Tool", category: "inference",
    description: "Explains what a transaction did in plain English, with token flow, contracts touched and risk notes.",
    priceUsd: 0.02, currency: "USDC", network: "base-sepolia", provider: "Ddoski's Toolbox", providerWallet: W,
    sampleIn: '{ "txHash": "0xabc…" }', response: '{ "summary": "Swapped 1.2 ETH → 3,140 USDC on Uniswap v3.", "risk": "low" }', status: "active", calls: 1320 },
  { id: "svc_bk_debug", workspaceId: "berkeley", name: "Agent Debug Tool", category: "inference",
    description: "Replays an agent run step-by-step and flags where a tool call or payment policy check failed.",
    priceUsd: 0.03, currency: "USDC", network: "base-sepolia", provider: "Ddoski's Playground", providerWallet: W,
    sampleIn: '{ "runId": "run_…" }', response: '{ "failedAt": "step 4", "reason": "maxPerRequestUsd exceeded" }', status: "active", calls: 460 },
  { id: "svc_bk_research", workspaceId: "berkeley", name: "Research Agent Tool", category: "data",
    description: "A paid research sub-agent that returns a sourced answer to a question. Billed per question.",
    priceUsd: 0.04, currency: "USDC", network: "base-sepolia", provider: "Ddoski's World", providerWallet: W2,
    sampleIn: '{ "q": "What is x402?" }', response: '{ "answer": "…", "sources": 4 }', status: "active", calls: 880 },

  // DeepSurge
  { id: "svc_ds_resource", workspaceId: "deepsurge", name: "Resource Intel API", category: "game-intel",
    description: "Live resource node yields and contested-zone status for a region of EVE Frontier. Billed per query.",
    priceUsd: 0.04, currency: "mock", network: "frontier-testnet", provider: "Frontier Intel Co.", providerWallet: W,
    sampleIn: '{ "region": "Q-OP4" }', response: '{ "topNode": "Veldspar +18%", "contested": true, "hostiles": 3 }', status: "active", calls: 740 },
  { id: "svc_ds_traderisk", workspaceId: "deepsurge", name: "Trade Risk API", category: "game-intel",
    description: "Risk score for a trade route: gank probability, market spread, escort recommendation.",
    priceUsd: 0.05, currency: "mock", network: "frontier-testnet", provider: "Frontier Intel Co.", providerWallet: W,
    sampleIn: '{ "from": "Hub-A", "to": "Rim-7" }', response: '{ "riskScore": 64, "spread": "7.1%", "escort": "recommended" }', status: "active", calls: 510 },
  { id: "svc_ds_alert", workspaceId: "deepsurge", name: "Live Alert Feed", category: "game-intel",
    description: "A streaming alert feed for fleet movement and market shocks in a watched region. Billed per session.",
    priceUsd: 0.03, currency: "mock", network: "frontier-testnet", provider: "Frontier Watch", providerWallet: W2,
    sampleIn: '{ "region": "Q-OP4", "ttlMin": 30 }', response: '{ "session": "al_…", "first": "Fleet +12 entering grid" }', status: "active", calls: 330 },

  // --- extra services (denser endpoint tables) ---
  // 0G
  { id: "svc_0g_dav", workspaceId: "0g", name: "0G DA Verify", category: "storage",
    description: "Verifies a 0G data-availability commitment and returns the inclusion proof + segment metadata.",
    priceUsd: 0.015, currency: "USDC", network: "0g-testnet", provider: "0G DA Layer", providerWallet: W,
    sampleIn: '{ "commitment": "0x…", "segment": 12 }', response: '{ "ok": true, "proof": "0x…", "root": "0x…" }', status: "active", calls: 471 },
  { id: "svc_0g_batch", workspaceId: "0g", name: "0G Compute Batch Job", category: "inference",
    description: "Queues a batch of inference prompts on a 0G Compute node; one receipt covers the whole batch.",
    priceUsd: 0.09, currency: "USDC", network: "0g-testnet", provider: "0G Compute Node", providerWallet: W2,
    sampleIn: '{ "model": "risk-scorer-v2", "prompts": 24 }', response: '{ "batchId": "batch_0g_31a", "done": 24, "avgMs": 612 }', status: "active", calls: 188 },

  // Liquify
  { id: "svc_liq_cluster", workspaceId: "liquify", name: "Address Cluster API", category: "analytics",
    description: "Clusters an address with its likely siblings using funding-graph heuristics and shared-counterparty signals.",
    priceUsd: 0.06, currency: "USDC", network: "base-sepolia", provider: "Studio Sphere Labs", providerWallet: W2,
    sampleIn: '{ "address": "0x91…", "depth": 2 }', response: '{ "cluster": "cl_4a1", "members": 7, "confidence": 0.78 }', status: "active", calls: 1240 },
  { id: "svc_liq_orderflow", workspaceId: "liquify", name: "Orderflow Snapshot API", category: "trading",
    description: "A point-in-time orderflow snapshot for a venue/pair: aggressor split, sweep depth, recent prints.",
    priceUsd: 0.07, currency: "USDC", network: "base-sepolia", provider: "Studio Sphere Labs", providerWallet: W,
    sampleIn: '{ "pair": "ETH/USDC", "venue": "uni-v3" }', response: '{ "buyPct": 58, "sweepDepthUsd": 142000, "prints": 31 }', status: "active", calls: 980 },

  // QIE
  { id: "svc_qie_payout", workspaceId: "qie", name: "QIE Merchant Payout API", category: "payment",
    description: "Settles accumulated checkout balances to a merchant wallet on the QIE rail; one receipt per payout run.",
    priceUsd: 0.005, currency: "native", network: "qie-testnet", provider: "QIE Merchant Tools", providerWallet: W2,
    sampleIn: '{ "merchant": "0x…", "min": "5.00" }', response: '{ "payoutId": "po_…", "amount": "42.10", "nextRun": "Fri 18:00" }', status: "active", calls: 612 },
  { id: "svc_qie_pos", workspaceId: "qie", name: "QIE POS Plugin Feed", category: "data",
    description: "Inventory + price feed the QIE POS plugin polls so storefronts stay in sync. Billed per poll.",
    priceUsd: 0.002, currency: "native", network: "qie-testnet", provider: "QIE Merchant Tools", providerWallet: W,
    sampleIn: '{ "store": "st_91" }', response: '{ "items": 142, "rev": "v8821", "updatedAt": "…" }', status: "active", calls: 3100 },

  // Arbitrum
  { id: "svc_arb_bridge", workspaceId: "arbitrum", name: "Orbit Bridge Status API", category: "data",
    description: "Per-bridge health for Orbit chains: pending withdrawals, claim delay, net flow over the last hour.",
    priceUsd: 0.02, currency: "USDC", network: "arbitrum-sepolia", provider: "Orbit Watchtower", providerWallet: W,
    sampleIn: '{ "bridge": "0x…" }', response: '{ "pending": 4, "claimDelayMin": 12, "net1hEth": "+12.4" }', status: "active", calls: 760 },
  { id: "svc_arb_usdc", workspaceId: "arbitrum", name: "USDC Settlement API", category: "payment",
    description: "Builds and tracks a USDC settlement transfer on Arbitrum; returns the calldata and a settlement receipt.",
    priceUsd: 0.01, currency: "USDC", network: "arbitrum-sepolia", provider: "Arbitrum Agent Services", providerWallet: W2,
    sampleIn: '{ "to": "0x…", "amount": "5.00" }', response: '{ "settleId": "st_…", "txHash": "0x…", "state": "confirmed" }', status: "active", calls: 1040 },

  // Mantle
  { id: "svc_mnt_liq", workspaceId: "mantle", name: "Mantle Liquidity Map", category: "data",
    description: "Liquidity depth and concentration across Mantle DEX pools, with a routing suggestion for a given size.",
    priceUsd: 0.04, currency: "USDC", network: "mantle-sepolia", provider: "Mantle Alpha Desk", providerWallet: W2,
    sampleIn: '{ "asset": "mETH", "size": "50k" }', response: '{ "topPool": "mETH/USDC", "depth1pctUsd": 880000, "route": "split 2" }', status: "active", calls: 540 },
  { id: "svc_mnt_stress", workspaceId: "mantle", name: "RWA Stress Test API", category: "inference",
    description: "Runs a rate / liquidity stress scenario on a tokenised RWA basket and returns the projected drawdown.",
    priceUsd: 0.12, currency: "USDC", network: "mantle-sepolia", provider: "Mantle Alpha Desk", providerWallet: W,
    sampleIn: '{ "basket": "T-BILL-90D", "scenario": "+200bps" }', response: '{ "navDrawdown": "-1.8%", "breachProb": 0.04 }', status: "active", calls: 96 },

  // Eazo
  { id: "svc_eazo_cal", workspaceId: "eazo", name: "Calendar Digest API", category: "data",
    description: "A daily digest of the user's calendar the companion uses to schedule and pre-pay for tools.",
    priceUsd: 0.005, currency: "USDC", network: "base-sepolia", provider: "Eazo Companion", providerWallet: W,
    sampleIn: '{ "userId": "u_…", "day": "today" }', response: '{ "events": 4, "firstAt": "09:30", "needsPrep": 1 }', status: "active", calls: 1800 },
  { id: "svc_eazo_anom", workspaceId: "eazo", name: "Spend Anomaly API", category: "analytics",
    description: "Flags unusual charges against the user's recent pattern so the companion can ask before paying.",
    priceUsd: 0.01, currency: "USDC", network: "base-sepolia", provider: "Eazo Companion", providerWallet: W2,
    sampleIn: '{ "userId": "u_…", "charge": "12.00" }', response: '{ "anomaly": false, "z": 0.7, "askUser": false }', status: "active", calls: 920 },

  // Berkeley
  { id: "svc_bk_docs", workspaceId: "berkeley", name: "Docs Search Tool", category: "data",
    description: "A paid documentation search sub-agent — returns the passage that answers a question, with the source link.",
    priceUsd: 0.015, currency: "USDC", network: "base-sepolia", provider: "Ddoski's Toolbox", providerWallet: W2,
    sampleIn: '{ "q": "how does the 402 challenge expire?" }', response: '{ "answer": "…", "source": "/docs/x402#expiry" }', status: "active", calls: 760 },
  { id: "svc_bk_review", workspaceId: "berkeley", name: "Code Reviewer Tool", category: "inference",
    description: "Reviews a code diff for bugs and risk, returns inline notes and a verdict. Billed per review.",
    priceUsd: 0.05, currency: "USDC", network: "base-sepolia", provider: "Ddoski's Playground", providerWallet: W,
    sampleIn: '{ "diff": "…", "lang": "ts" }', response: '{ "notes": 3, "verdict": "request-changes", "risk": "medium" }', status: "active", calls: 410 },

  // DeepSurge
  { id: "svc_ds_oracle", workspaceId: "deepsurge", name: "Market Oracle API", category: "game-intel",
    description: "Aggregated market price + spread for a Frontier commodity across the major hubs. Billed per query.",
    priceUsd: 0.03, currency: "mock", network: "frontier-testnet", provider: "Frontier Intel Co.", providerWallet: W2,
    sampleIn: '{ "item": "Tritanium" }', response: '{ "mid": 5.21, "spread": "4.0%", "bestHub": "Hub-A" }', status: "active", calls: 880 },
  { id: "svc_ds_route", workspaceId: "deepsurge", name: "Route Planner API", category: "game-intel",
    description: "Plans the lowest-risk haul route between two systems given current hostiles and gate status.",
    priceUsd: 0.04, currency: "mock", network: "frontier-testnet", provider: "Frontier Intel Co.", providerWallet: W,
    sampleIn: '{ "from": "Hub-A", "to": "Rim-7" }', response: '{ "jumps": 6, "riskScore": 38, "avoid": ["Q-OP4"] }', status: "active", calls: 520 },

  // Sui
  { id: "svc_sui_walrus_pin", workspaceId: "sui", name: "Walrus Storage Pin", category: "storage",
    description: "Pins a blob to Walrus decentralised storage on Sui; returns the blob ID and storage epoch receipt.",
    priceUsd: 0.02, currency: "SUI", network: "sui-mainnet", provider: "Walrus Protocol", providerWallet: W,
    sampleIn: '{ "data": "base64…", "epochs": 3 }', response: '{ "blobId": "wl_4a1c2b07", "storageTx": "0x…", "expiresEpoch": 412 }', status: "active", calls: 1840 },
  { id: "svc_sui_move_exec", workspaceId: "sui", name: "Move Contract Executor", category: "inference",
    description: "Builds and dry-runs a Move PTB (programmable transaction block) on Sui mainnet, returns the effects without committing.",
    priceUsd: 0.015, currency: "SUI", network: "sui-mainnet", provider: "Sui Agent Economy", providerWallet: W2,
    sampleIn: '{ "module": "escrow", "fn": "open", "args": ["0x…","100"] }', response: '{ "status": "success", "gasCost": "1250000 MIST", "effects": "…" }', status: "active", calls: 970 },
  { id: "svc_sui_nft_mint", workspaceId: "sui", name: "NFT Mint API", category: "nft",
    description: "Mints a Sui Kiosk-compatible NFT for an agent identity or access-pass. One receipt per mint.",
    priceUsd: 0.03, currency: "SUI", network: "sui-mainnet", provider: "Sui Agent Economy", providerWallet: W,
    sampleIn: '{ "collection": "AgentPass", "meta": { "tier": "gold" } }', response: '{ "nftId": "0x91aa…", "kiosk": "0xee71…", "txDigest": "DkP…" }', status: "active", calls: 620 },
  { id: "svc_sui_agent_id", workspaceId: "sui", name: "Agent Identity Resolver", category: "data",
    description: "Resolves a Sui agent wallet address to its on-chain identity NFT, reputation score, and allowlist.",
    priceUsd: 0.005, currency: "SUI", network: "sui-mainnet", provider: "Sui Agent Economy", providerWallet: W2,
    sampleIn: '{ "address": "0x4da2…" }', response: '{ "agentId": "ap_gold_4da2", "tier": "gold", "rep": 92, "allowlist": ["svc_sui_walrus_pin"] }', status: "active", calls: 2300 },
  { id: "svc_sui_zkproof", workspaceId: "sui", name: "zkLogin Proof API", category: "inference",
    description: "Generates a zkLogin proof bundle for a Google/Apple OAuth token so agents can authenticate without a seed phrase.",
    priceUsd: 0.01, currency: "SUI", network: "sui-mainnet", provider: "Sui zkLogin Labs", providerWallet: W,
    sampleIn: '{ "jwt": "eyJ…", "salt": "0x…" }', response: '{ "proof": "…", "address": "0x4da2…", "maxEpoch": 420 }', status: "active", calls: 1100 },
];

export const services: Service[] = RAW_SERVICES.map((s) => ({
  ...s,
  workspaceIds: [s.workspaceId],
  price: priceStr(s.priceUsd, s.currency),
  latency: LAT[s.category] ?? "400ms",
}));

export const servicesFor = (wsId: WorkspaceId) => services.filter((s) => s.workspaceIds.includes(wsId));
export const serviceById = (id: string) => services.find((s) => s.id === id);

const mkAgent = (a: Omit<Agent, "budget" | "spent" | "maxPerRequest" | "status">): Agent => ({
  ...a,
  budget: `$${a.dailyLimitUsd.toFixed(2)}`,
  spent: `$${a.spentTodayUsd.toFixed(2)}`,
  maxPerRequest: `$${a.maxPerRequestUsd.toFixed(2)}`,
  status: a.autoPay ? "Ready" : "Paused",
});

export const agents: Agent[] = [
  mkAgent({ id: "agent_yield_researcher", workspaceId: "liquify", name: "Yield Researcher", wallet: "0xA3f9…7c2D", autoPay: true, dailyLimitUsd: 10, maxPerRequestUsd: 0.25, spentTodayUsd: 1.85, allowlist: ["svc_wallet_risk", "svc_yield_signal", "svc_tax_classifier", "svc_liq_cluster", "svc_liq_orderflow"] }),
  mkAgent({ id: "agent_0g_worker", workspaceId: "0g", name: "0G Job Worker", wallet: "0xAg3n…91aa", autoPay: true, dailyLimitUsd: 8, maxPerRequestUsd: 0.10, spentTodayUsd: 0.62, allowlist: ["svc_0g_inference", "svc_0g_storage", "svc_0g_context", "svc_0g_dav", "svc_0g_batch"] }),
  mkAgent({ id: "agent_qie_merchant_bot", workspaceId: "qie", name: "Merchant Bot", wallet: "0xAg3n…44de", autoPay: true, dailyLimitUsd: 6, maxPerRequestUsd: 0.05, spentTodayUsd: 0.18, allowlist: ["svc_qie_checkout", "svc_qie_dex", "svc_qie_payout", "svc_qie_pos"] }),
  mkAgent({ id: "agent_arb_treasury", workspaceId: "arbitrum", name: "Treasury Agent", wallet: "0xAg3n…0b12", autoPay: true, dailyLimitUsd: 12, maxPerRequestUsd: 0.20, spentTodayUsd: 0.88, allowlist: ["svc_arb_invoice", "svc_arb_orbit", "svc_arb_escrow", "svc_arb_bridge", "svc_arb_usdc"] }),
  mkAgent({ id: "agent_mnt_strategist", workspaceId: "mantle", name: "Alpha Strategist", wallet: "0xAg3n…ee71", autoPay: true, dailyLimitUsd: 15, maxPerRequestUsd: 0.30, spentTodayUsd: 0.96, allowlist: ["svc_mnt_rwa", "svc_mnt_meth", "svc_mnt_backtest", "svc_mnt_liq", "svc_mnt_stress"] }),
  mkAgent({ id: "agent_life_companion", workspaceId: "eazo", name: "Life Companion", wallet: "0xAg3n…2a55", autoPay: true, dailyLimitUsd: 3, maxPerRequestUsd: 0.05, spentTodayUsd: 0.27, allowlist: ["svc_eazo_subs", "svc_eazo_brief", "svc_eazo_toolbuy", "svc_eazo_cal", "svc_eazo_anom"] }),
  mkAgent({ id: "agent_bk_sandbox", workspaceId: "berkeley", name: "Sandbox Agent", wallet: "0xAg3n…f0c3", autoPay: true, dailyLimitUsd: 4, maxPerRequestUsd: 0.10, spentTodayUsd: 0.13, allowlist: ["svc_bk_tx", "svc_bk_debug", "svc_bk_research", "svc_bk_docs", "svc_bk_review"] }),
  mkAgent({ id: "agent_ds_scout", workspaceId: "deepsurge", name: "Frontier Scout", wallet: "0xAg3n…77b9", autoPay: true, dailyLimitUsd: 5, maxPerRequestUsd: 0.10, spentTodayUsd: 0.32, allowlist: ["svc_ds_resource", "svc_ds_traderisk", "svc_ds_alert", "svc_ds_oracle", "svc_ds_route"] }),
  mkAgent({ id: "agent_sui_economy", workspaceId: "sui", name: "Sui Economy Agent", wallet: "0xAg3n…4da2", autoPay: true, dailyLimitUsd: 10, maxPerRequestUsd: 0.15, spentTodayUsd: 0.74, allowlist: ["svc_sui_walrus_pin", "svc_sui_move_exec", "svc_sui_nft_mint", "svc_sui_agent_id", "svc_sui_zkproof"] }),
];

export const agentFor = (wsId: WorkspaceId) => agents.find((a) => a.workspaceId === wsId) ?? agents[0];
export const agent = agents[0];

// ---------------------------------------------------------------------------

const now = Date.now();
const iso = (mins: number) => new Date(now - mins * 60000).toISOString();
let rc = 4000;
let sc = 7000;
export const makeReceiptId = () => `rcpt_${(rc++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
export const makeServiceId = () => `svc_usr_${(sc++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;
export const makeTxHash = () =>
  `0x${Math.random().toString(16).slice(2, 10)}…${Math.random().toString(16).slice(2, 6)}`;

type SeedRow = {
  ws: WorkspaceId; svc: string; agent: string; mins: number; status: ReceiptStatus; err?: string;
  kind?: string; payload?: Record<string, unknown>; name?: string;
};
const SEED_ROWS: SeedRow[] = [
  { ws: "liquify", svc: "svc_wallet_risk", agent: "agent_yield_researcher", mins: 3, status: "verified" },
  { ws: "liquify", svc: "svc_yield_signal", agent: "agent_yield_researcher", mins: 11, status: "verified" },
  { ws: "liquify", svc: "svc_tax_classifier", agent: "agent_yield_researcher", mins: 26, status: "paid" },
  { ws: "liquify", svc: "svc_liq_cluster", agent: "agent_yield_researcher", mins: 33, status: "verified" },
  { ws: "liquify", svc: "svc_wallet_risk", agent: "agent_yield_researcher", mins: 41, status: "failed", err: "insufficient_funds" },
  { ws: "liquify", svc: "svc_liq_orderflow", agent: "agent_yield_researcher", mins: 64, status: "verified" },
  { ws: "liquify", svc: "svc_yield_signal", agent: "agent_yield_researcher", mins: 95, status: "verified" },
  { ws: "liquify", svc: "svc_wallet_risk", agent: "agent_yield_researcher", mins: 140, status: "replayed", err: "challenge_reused" },
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
  { ws: "qie", svc: "svc_qie_checkout", agent: "agent_qie_merchant_bot", mins: 8, status: "verified",
    kind: "qie.checkout", name: "QIE Checkout · report-pro", payload: { sku: "report-pro", qty: 1, amount: "1.00", intent: "ci_8f21a", payTo: "0x44de…91" } },
  { ws: "qie", svc: "svc_qie_dex", agent: "agent_qie_merchant_bot", mins: 33, status: "verified" },
  { ws: "qie", svc: "svc_qie_checkout", agent: "agent_qie_merchant_bot", mins: 51, status: "verified",
    kind: "qie.checkout", name: "QIE Checkout · swap-bundle", payload: { sku: "swap-bundle", qty: 3, amount: "0.30", intent: "ci_3b07c", payTo: "0x44de…91" } },
  { ws: "qie", svc: "svc_qie_pass", agent: "agent_qie_merchant_bot", mins: 70, status: "verified",
    kind: "qie.pass", name: "QIE Pass · vip-feed", payload: { pass: "qp_gold_44de", resource: "vip-feed", tier: "gold" } },
  { ws: "qie", svc: "svc_qie_pos", agent: "agent_qie_merchant_bot", mins: 88, status: "verified" },
  { ws: "qie", svc: "svc_qie_checkout", agent: "agent_qie_merchant_bot", mins: 130, status: "verified",
    kind: "qie.checkout", name: "QIE Checkout · inference-job", payload: { sku: "inference-job", qty: 1, amount: "0.05", intent: "ci_1d4e9", payTo: "0x44de…91" } },
  { ws: "arbitrum", svc: "svc_arb_invoice", agent: "agent_arb_treasury", mins: 14, status: "verified" },
  { ws: "arbitrum", svc: "svc_arb_usdc", agent: "agent_arb_treasury", mins: 27, status: "verified",
    kind: "arb.usdc.transfer", name: "USDC Settlement · 5.00 USDC", payload: { to: "0x7a3f…D2f", amount: "5.00", settleId: "st_27a1c", txHash: "0x3f8c…91" } },
  { ws: "arbitrum", svc: "svc_arb_orbit", agent: "agent_arb_treasury", mins: 52, status: "verified" },
  { ws: "arbitrum", svc: "svc_arb_usdc", agent: "agent_arb_treasury", mins: 73, status: "verified",
    kind: "arb.usdc.transfer", name: "USDC Settlement · 12.50 USDC", payload: { to: "0x0b12…ee71", amount: "12.50", settleId: "st_73b07", txHash: "0x9d3a…0f" } },
  { ws: "arbitrum", svc: "svc_arb_bridge", agent: "agent_arb_treasury", mins: 99, status: "verified" },
  { ws: "arbitrum", svc: "svc_arb_escrow", agent: "agent_arb_treasury", mins: 121, status: "paid",
    kind: "arb.escrow.release", name: "Agent Escrow · released", payload: { escrowId: "esc_4a1c2", amount: "0.12", state: "released", deal: "deal_91" } },
  { ws: "mantle", svc: "svc_mnt_rwa", agent: "agent_mnt_strategist", mins: 120, status: "verified" },
  { ws: "mantle", svc: "svc_mnt_backtest", agent: "agent_mnt_strategist", mins: 180, status: "verified",
    kind: "mantle.backtest", name: "Strategy Backtest · mETH-USDY 90d", payload: { asset: "mETH/USDY", window: "90d", ret: "+12.4%", maxDD: "-6.1%", sharpe: 1.4, runId: "sim_4a1c" } },
  { ws: "mantle", svc: "svc_mnt_meth", agent: "agent_mnt_strategist", mins: 240, status: "verified" },
  { ws: "mantle", svc: "svc_mnt_backtest", agent: "agent_mnt_strategist", mins: 300, status: "verified",
    kind: "mantle.backtest", name: "Strategy Backtest · RWA-rotate 180d", payload: { asset: "T-BILL / USDY", window: "180d", ret: "+27.9%", maxDD: "-14.2%", sharpe: 1.1, runId: "sim_2b07" } },
  { ws: "mantle", svc: "svc_mnt_liq", agent: "agent_mnt_strategist", mins: 360, status: "verified" },
  { ws: "eazo", svc: "svc_eazo_brief", agent: "agent_life_companion", mins: 22, status: "verified" },
  { ws: "eazo", svc: "svc_eazo_cal", agent: "agent_life_companion", mins: 48, status: "verified" },
  { ws: "eazo", svc: "svc_eazo_subs", agent: "agent_life_companion", mins: 90, status: "verified" },
  { ws: "eazo", svc: "svc_eazo_toolbuy", agent: "agent_life_companion", mins: 150, status: "verified" },
  { ws: "eazo", svc: "svc_eazo_anom", agent: "agent_life_companion", mins: 210, status: "verified" },
  { ws: "berkeley", svc: "svc_bk_tx", agent: "agent_bk_sandbox", mins: 5, status: "verified" },
  { ws: "berkeley", svc: "svc_bk_docs", agent: "agent_bk_sandbox", mins: 18, status: "verified" },
  { ws: "berkeley", svc: "svc_bk_research", agent: "agent_bk_sandbox", mins: 40, status: "verified" },
  { ws: "berkeley", svc: "svc_bk_review", agent: "agent_bk_sandbox", mins: 72, status: "verified" },
  { ws: "deepsurge", svc: "svc_ds_resource", agent: "agent_ds_scout", mins: 9, status: "verified" },
  { ws: "deepsurge", svc: "svc_ds_oracle", agent: "agent_ds_scout", mins: 31, status: "verified" },
  { ws: "deepsurge", svc: "svc_ds_traderisk", agent: "agent_ds_scout", mins: 60, status: "verified" },
  { ws: "deepsurge", svc: "svc_ds_route", agent: "agent_ds_scout", mins: 95, status: "verified" },
  { ws: "sui", svc: "svc_sui_walrus_pin", agent: "agent_sui_economy", mins: 7, status: "verified",
    kind: "sui.walrus.pin", name: "Walrus Storage · agent-snapshot.json", payload: { blobId: "wl_4a1c2b07d93f", name: "agent-snapshot.json", size: 184, epochs: 3, tx: "DkPxyz1234567890abcde" } },
  { ws: "sui", svc: "svc_sui_move_exec", agent: "agent_sui_economy", mins: 24, status: "verified",
    kind: "sui.move.exec", name: "Move PTB · escrow::open", payload: { module: "escrow", fn: "open", args: '["0x7a3f…D2f","100000000"]', gas: "1250000 MIST", effects: '{"status":"success"}' } },
  { ws: "sui", svc: "svc_sui_nft_mint", agent: "agent_sui_economy", mins: 48, status: "verified",
    kind: "sui.nft.mint", name: "NFT Mint · Silver Agent Pass", payload: { nftId: "0xee7191aa4da2", tier: "silver", collection: "AgentPass", to: "0xAg3n…4da2" } },
  { ws: "sui", svc: "svc_sui_zkproof", agent: "agent_sui_economy", mins: 75, status: "verified",
    kind: "sui.zklogin", name: "zkLogin Proof · Google", payload: { provider: "Google", address: "0x4da2f91a3b7c…", maxEpoch: 428 } },
  { ws: "sui", svc: "svc_sui_agent_id", agent: "agent_sui_economy", mins: 130, status: "verified" },
  { ws: "sui", svc: "svc_sui_walrus_pin", agent: "agent_sui_economy", mins: 200, status: "expired", err: "challenge_expired" },
];

function seedReceipts(): Receipt[] {
  return SEED_ROWS.map((p, i) => {
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

/** Demo blobs the 0G Storage widget starts with so the "Pinned blobs" table isn't empty. */
export type SeededPin = { id: string; name: string; hash: string; size: number; content: string; receiptId?: string; createdAt: string };
export const SEEDED_PINS: SeededPin[] = [
  { id: "pin_9f2c1a7be4", name: "agent-snapshot.md", size: 184,
    hash: "9f2c1a7be4d03f5a8c1b6e2d9047a3f1c8b5e0d2a6f7b1c4e9d3a0f8b2c6e1d4",
    content: "# memory-segment\nagent_yield_researcher.snapshot\nbalance: 1.23 ETH\nstrategy: mETH-USDY pair\nlast_trade: 2026-05-12T11:42:08Z",
    receiptId: "rcpt_seed11", createdAt: iso(110) },
  { id: "pin_2b07d4e1a9", name: "trade-log-2026-05.json", size: 4096,
    hash: "2b07d4e1a9c63f08b15e7c2d4a6093f8c1b5e0d2a6f7b1c4e9d3a0f8b2c6e1a3",
    content: '{ "trades": 184, "month": "2026-05", "pnlUsd": 312.44, "winRate": 0.61 }',
    receiptId: "rcpt_seed13", createdAt: iso(220) },
  { id: "pin_5e1d4a0f8b", name: "policy.json", size: 256,
    hash: "5e1d4a0f8b2c6e1d49f2c1a7be4d03f5a8c1b6e2d9047a3f1c8b5e0d2a6f7b1c",
    content: '{ "maxPerRequestUsd": 0.10, "dailyLimitUsd": 8, "allowlist": ["svc_0g_inference","svc_0g_storage"] }',
    createdAt: iso(540) },
];

export function workspaceMetrics(wsId: WorkspaceId, receipts: Receipt[]) {
  const rs = receipts.filter((r) => r.workspaceId === wsId);
  const verified = rs.filter((r) => r.status === "verified" || r.status === "paid");
  const failed = rs.filter((r) => r.status === "failed" || r.status === "replayed" || r.status === "expired");
  const revenue = verified.reduce((s, r) => s + r.amount, 0);
  const svcCount = servicesFor(wsId).filter((s) => s.status === "active").length;
  const agCount = agents.filter((a) => a.workspaceId === wsId && a.status === "Ready").length;
  return { requests: rs.length, paid: verified.length, failed: failed.length, revenue, svcCount, agCount };
}
