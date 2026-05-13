import {
  Cable,
  ChartNoAxesCombined,
  Globe2,
  type LucideIcon,
} from "lucide-react";
import { ZeroGLogo, MantleLogo, ArbitrumLogo, SuiLogo, QieLogo, CircleLogo, PolygonLogo } from "./components/logos/ProjectLogos";
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
    name: "SuiAgent OS — Agent Economy",
    route: "/sui",
    hackathon: "Sui Overflow 2026",
    pitch: "The first Agent Economy OS on Sui: agents hire agents via x402, escrow funds earn DeepBook yield, receipts live on Walrus, reputation is a living NFT, and any website gets AI payments with one script tag.",
    tracks: ["Agentic Web (AI)", "Walrus $70K", "DeepBook $70K", "EVE Frontier $50K", "ONE Championship $70K", "DeFi & Payments"],
    networks: ["sui-mainnet", "sui-testnet"],
    tabs: ["Overview", "Agent Wallet", "Walrus Storage", "Move Contracts", "NFT Market", "Yield Escrow", "Agent Arena", "Pay Widget", "Memory Network", "Intent Engine", "Receipts"],
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
    id: "agora",
    shortName: "Agora",
    name: "Arc Agent Commerce Layer",
    route: "/agora",
    hackathon: "Agora Agents Hackathon ($50K) + Stablecoins Commerce Stack Track 4 ($6K) — Circle × Arc L1",
    pitch: "Agents autonomously discover services, pay per inference via x402 + USDC on Arc L1, and arbitrage across chains — the full agentic economy demo.",
    tracks: ["Cross-Platform Arbitrage Agent", "Adaptive Portfolio Manager", "x402 Pay-per-Inference", "Circle Tools (CCTP/Nanopayments)"],
    networks: ["arc-mainnet", "arbitrum-one", "base"],
    tabs: ["Overview", "Arbitrage Agent", "Portfolio Manager", "x402 on Arc", "Circle Tools", "Receipts"],
    accent: "#1652F0",
    darkAccent: "#4B7BFF",
    Icon: CircleLogo,
  },
  {
    id: "polygon",
    shortName: "Polygon",
    name: "Polygon Agent Commerce",
    route: "/polygon",
    hackathon: "Smart Commerce Infrastructure Challenge — Polygon Labs × Ignyte ($25K + $100K incentives)",
    pitch: "SME merchants publish paid APIs in 30 seconds; agents and buyers settle per call in USDC on Polygon zkEVM — UAE commerce infrastructure.",
    tracks: ["SME Trade Finance", "Merchant Payments", "Cross-Border Stablecoins", "Agent Infrastructure"],
    networks: ["polygon-zkevm", "polygon-pos"],
    tabs: ["Overview", "Merchant Mode", "Trade Finance", "Agent Marketplace", "USDC Payments", "Receipts"],
    accent: "#7B3FE4",
    darkAccent: "#9F6FF8",
    Icon: PolygonLogo,
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
  { id: "svc_sui_yield_escrow", workspaceId: "sui", name: "DeepBook Yield Escrow", category: "payment",
    description: "Locks payment in escrow, deploys funds to a DeepBook LP while the task runs, then releases principal + earned yield on delivery verification.",
    priceUsd: 0.025, currency: "SUI", network: "sui-mainnet", provider: "SuiAgent OS Escrow", providerWallet: W2,
    sampleIn: '{ "amount": "1.0", "taskId": "task_…", "lpPool": "SUI/USDC" }', response: '{ "escrowId": "esc_…", "lpPos": "lp_…", "yieldApy": "8.4%", "state": "earning" }', status: "active", calls: 480 },
  { id: "svc_sui_battle", workspaceId: "sui", name: "Agent Arena Challenge", category: "nft",
    description: "Registers an agent for an Arena challenge; judged by Nautilus TEE. Winners earn a Legendary AgentNFT and prize pool split.",
    priceUsd: 0.05, currency: "SUI", network: "sui-mainnet", provider: "SuiAgent Arena", providerWallet: W,
    sampleIn: '{ "agentId": "ap_gold_…", "challengeId": "ch_…", "solutionBlob": "wl_…" }', response: '{ "entryId": "en_…", "rank": null, "judgeAt": "epoch+12" }', status: "active", calls: 215 },
  { id: "svc_sui_pay_widget", workspaceId: "sui", name: "Sui Pay Button API", category: "payment",
    description: "One-tag drop-in payment widget for any website; handles zkLogin, gas sponsorship and x402 agent call in a single user interaction.",
    priceUsd: 0.001, currency: "SUI", network: "sui-mainnet", provider: "SuiAgent OS", providerWallet: W2,
    sampleIn: '{ "agent": "analyzer.sui", "price": "0.01", "asset": "USDC" }', response: '{ "widgetId": "wgt_…", "snippet": "<sui-pay …>", "sessionUrl": "https://…" }', status: "active", calls: 3750 },
  { id: "svc_sui_memory_write", workspaceId: "sui", name: "Agent Memory Write (Walrus)", category: "storage",
    description: "Encrypts an agent context blob with Seal and pins it to Walrus; returns the blob ID and Seal policy address.",
    priceUsd: 0.018, currency: "SUI", network: "sui-mainnet", provider: "SuiAgent Memory Network", providerWallet: W,
    sampleIn: '{ "agentId": "ag_…", "key": "client_ctx", "payload": { … } }', response: '{ "blobId": "wl_mem_…", "sealPolicy": "0x…", "expiresEpoch": 820 }', status: "active", calls: 920 },
  { id: "svc_sui_intent", workspaceId: "sui", name: "Intent Engine — NL→PTB", category: "inference",
    description: "Parses a natural-language workflow description into a composable multi-agent PTB; deploys it as an autonomous on-chain job.",
    priceUsd: 0.04, currency: "SUI", network: "sui-mainnet", provider: "SuiAgent Intent Engine", providerWallet: W2,
    sampleIn: '{ "intent": "DCA $50 weekly into SUI, notify via email" }', response: '{ "jobId": "job_…", "agents": ["dca-agent.sui","notify-agent.sui"], "ptbSteps": 4, "nextRun": "epoch+168" }', status: "active", calls: 340 },

  // Agora / Arc
  { id: "svc_arc_oracle", workspaceId: "agora", name: "Arc Price Oracle", category: "data",
    description: "Real-time USDC price feed across Arc, Arbitrum, and Base — used by arbitrage agents to spot cross-chain gaps.",
    priceUsd: 0.02, currency: "USDC", network: "arc-mainnet", provider: "ArcArb Data", providerWallet: W,
    sampleIn: '{ "pairs": ["ETH/USDC","USDC/EURC"], "chains": ["arc","base","arbitrum"] }', response: '{ "arc": 1.0001, "base": 0.9998, "arb": 1.0000, "gap": 0.03 }', status: "active", calls: 4820 },
  { id: "svc_arc_arb", workspaceId: "agora", name: "Cross-Chain Arb Executor", category: "trading",
    description: "Executes a cross-chain USDC arbitrage via CCTP: routes the optimal leg, monitors finality, returns net profit.",
    priceUsd: 0.05, currency: "USDC", network: "arc-mainnet", provider: "ArcArb Executor", providerWallet: W2,
    sampleIn: '{ "buyChain": "arc", "sellChain": "base", "amount": "500" }', response: '{ "profit": "0.12", "ttl": "420ms", "cctpTx": "0x…" }', status: "active", calls: 1740 },
  { id: "svc_arc_portfolio", workspaceId: "agora", name: "Portfolio Rebalance API", category: "inference",
    description: "Analyses multi-asset allocation against a target and emits rebalance instructions settled in USDC via Circle Paymaster.",
    priceUsd: 0.08, currency: "USDC", network: "arc-mainnet", provider: "ArcPortfolio AI", providerWallet: W,
    sampleIn: '{ "assets": { "ETH": 0.6, "USDC": 0.4 }, "target": { "ETH": 0.5 } }', response: '{ "action": "sell 0.1 ETH → 310 USDC", "fee": "0.001 USDC", "via": "Paymaster" }', status: "active", calls: 890 },

  // Polygon
  { id: "svc_poly_invoice", workspaceId: "polygon", name: "Invoice Finance API", category: "data",
    description: "Tokenises a trade invoice on Polygon and advances 90% of face value in USDC for UAE SME cash flow.",
    priceUsd: 0.10, currency: "USDC", network: "polygon-zkevm", provider: "PolyTrade Finance", providerWallet: W2,
    sampleIn: '{ "invoice": "INV-4921", "amount": "5000", "due": "2026-06-30" }', response: '{ "advance": "4500", "tokenId": "inv_4921", "tx": "0x…" }', status: "active", calls: 640 },
  { id: "svc_poly_merchant", workspaceId: "polygon", name: "Merchant Checkout API", category: "payment",
    description: "Hosted x402 checkout endpoint; buyer or agent pays USDC per call, merchant receives instantly on Polygon.",
    priceUsd: 0.01, currency: "USDC", network: "polygon-zkevm", provider: "PolyMerchant", providerWallet: W,
    sampleIn: '{ "merchant": "0x…", "amount": "0.01" }', response: '{ "receipt": "rcpt_…", "settled": true, "txHash": "0x…" }', status: "active", calls: 3100 },
  { id: "svc_poly_cross", workspaceId: "polygon", name: "Cross-Border Remittance API", category: "payment",
    description: "Settles stablecoin remittances between UAE and global corridors, converting AED stablecoin ↔ USDC via Polygon bridge.",
    priceUsd: 0.05, currency: "USDC", network: "polygon-pos", provider: "PolyRemit", providerWallet: W2,
    sampleIn: '{ "from": "AED", "to": "USDC", "amount": "1000" }', response: '{ "usdcReceived": "272.40", "fee": "0.05%", "bridgeTx": "0x…" }', status: "active", calls: 1280 },
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
  mkAgent({ id: "agent_0g_worker", workspaceId: "0g", name: "0G Job Worker", wallet: "0xAg3n…91aa", autoPay: true, dailyLimitUsd: 8, maxPerRequestUsd: 0.10, spentTodayUsd: 0.62, allowlist: ["svc_0g_inference", "svc_0g_storage", "svc_0g_context", "svc_0g_dav", "svc_0g_batch"] }),
  mkAgent({ id: "agent_qie_merchant_bot", workspaceId: "qie", name: "Merchant Bot", wallet: "0xAg3n…44de", autoPay: true, dailyLimitUsd: 6, maxPerRequestUsd: 0.05, spentTodayUsd: 0.18, allowlist: ["svc_qie_checkout", "svc_qie_dex", "svc_qie_payout", "svc_qie_pos"] }),
  mkAgent({ id: "agent_arb_treasury", workspaceId: "arbitrum", name: "Treasury Agent", wallet: "0xAg3n…0b12", autoPay: true, dailyLimitUsd: 12, maxPerRequestUsd: 0.20, spentTodayUsd: 0.88, allowlist: ["svc_arb_invoice", "svc_arb_orbit", "svc_arb_escrow", "svc_arb_bridge", "svc_arb_usdc"] }),
  mkAgent({ id: "agent_mnt_strategist", workspaceId: "mantle", name: "Alpha Strategist", wallet: "0xAg3n…ee71", autoPay: true, dailyLimitUsd: 15, maxPerRequestUsd: 0.30, spentTodayUsd: 0.96, allowlist: ["svc_mnt_rwa", "svc_mnt_meth", "svc_mnt_backtest", "svc_mnt_liq", "svc_mnt_stress"] }),
  mkAgent({ id: "agent_sui_economy", workspaceId: "sui", name: "Sui Economy Agent", wallet: "0xAg3n…4da2", autoPay: true, dailyLimitUsd: 10, maxPerRequestUsd: 0.15, spentTodayUsd: 0.74, allowlist: ["svc_sui_walrus_pin", "svc_sui_move_exec", "svc_sui_nft_mint", "svc_sui_agent_id", "svc_sui_zkproof"] }),
  mkAgent({ id: "agent_arc_arb", workspaceId: "agora", name: "ArcArb Agent", wallet: "0xAg3n…c1f4", autoPay: true, dailyLimitUsd: 20, maxPerRequestUsd: 0.50, spentTodayUsd: 1.42, allowlist: ["svc_arc_oracle", "svc_arc_arb", "svc_arc_portfolio"] }),
  mkAgent({ id: "agent_poly_merchant", workspaceId: "polygon", name: "Polygon Merchant Agent", wallet: "0xAg3n…9a3b", autoPay: true, dailyLimitUsd: 15, maxPerRequestUsd: 0.25, spentTodayUsd: 0.85, allowlist: ["svc_poly_invoice", "svc_poly_merchant", "svc_poly_cross"] }),
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
  { ws: "agora", svc: "svc_arc_oracle", agent: "agent_arc_arb", mins: 4, status: "verified",
    kind: "agora.oracle", name: "Arc Price Oracle · ETH/USDC gap", payload: { pair: "ETH/USDC", arcPrice: "3141.20", basePrice: "3153.80", gapBps: 40, recommended: "arb" } },
  { ws: "agora", svc: "svc_arc_arb", agent: "agent_arc_arb", mins: 7, status: "verified",
    kind: "agora.arb", name: "CCTP Cross-Chain Swap · Arc → Base", payload: { from: "arc-mainnet", to: "base", amount: "1.0", profit: "0.12", txHash: "0xarc7f3…", cctpId: "cctp_4a1c" } },
  { ws: "agora", svc: "svc_arc_portfolio", agent: "agent_arc_arb", mins: 35, status: "verified",
    kind: "agora.portfolio", name: "Portfolio Rebalance · ETH/USDC/ARB", payload: { action: "rebalance", weights: '{"ETH":40,"USDC":40,"ARB":20}', gasFree: true, paymaster: "Circle Paymaster" } },
  { ws: "agora", svc: "svc_arc_oracle", agent: "agent_arc_arb", mins: 62, status: "verified",
    kind: "agora.oracle", name: "Arc Price Oracle · ARB/USDC gap", payload: { pair: "ARB/USDC", arcPrice: "0.841", basePrice: "0.849", gapBps: 95, recommended: "arb" } },
  { ws: "agora", svc: "svc_arc_arb", agent: "agent_arc_arb", mins: 65, status: "verified",
    kind: "agora.arb", name: "CCTP Cross-Chain Swap · Arc → Arbitrum", payload: { from: "arc-mainnet", to: "arbitrum-one", amount: "50.0", profit: "0.38", txHash: "0xarc9b1…", cctpId: "cctp_2b07" } },
  { ws: "agora", svc: "svc_arc_arb", agent: "agent_arc_arb", mins: 140, status: "failed", err: "slippage_exceeded" },
  { ws: "polygon", svc: "svc_poly_merchant", agent: "agent_poly_merchant", mins: 11, status: "verified",
    kind: "polygon.merchant", name: "Merchant Checkout · SaaS API call", payload: { endpoint: "/api/report", price: "0.01", buyer: "0x7a3f…", merchantId: "merch_4a1c" } },
  { ws: "polygon", svc: "svc_poly_invoice", agent: "agent_poly_merchant", mins: 34, status: "verified",
    kind: "polygon.invoice", name: "Trade Invoice · tokenised AED 50,000", payload: { invoiceId: "inv_2b07", amount: "50000 AED", usdcAdvance: "45000", fee: "0.1%", zkEVM: true } },
  { ws: "polygon", svc: "svc_poly_cross", agent: "agent_poly_merchant", mins: 58, status: "verified",
    kind: "polygon.remittance", name: "Cross-Border · AED → USDC", payload: { from: "AED", to: "USDC", amount: "10000", fee: "0.2%", corridor: "UAE↔Base", txHash: "0xpoly3c…" } },
  { ws: "polygon", svc: "svc_poly_merchant", agent: "agent_poly_merchant", mins: 90, status: "verified",
    kind: "polygon.merchant", name: "Merchant Checkout · 3 API calls", payload: { endpoint: "/api/data", price: "0.03", buyer: "0x0b12…", merchantId: "merch_4a1c" } },
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
