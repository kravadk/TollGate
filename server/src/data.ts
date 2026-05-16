// Minimal server-side seed of services + agent policies, mirroring the shape of
// the richer src/data.ts on the frontend. Enough to drive the x402 gateway, the
// /x402-spec discovery endpoint, and the MCP tools. Keep IDs in sync with the
// frontend if you wire the two together.

import type { AgentPolicy, Service, WorkspaceId } from "./types.js";
import { env } from "./env.js";

const PAYOUT = env.x402PayoutAddress;

function svc(p: Partial<Service> & Pick<Service, "id" | "workspaceIds" | "name" | "category" | "priceUsd" | "description" | "sampleResponse">): Service {
  return {
    provider: p.provider ?? "AgentPay Router",
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
  svc({ id: "svc_mnt_meth", workspaceIds: ["mantle"], name: "mETH/USDY Yield Signal", category: "data", priceUsd: 0.10,
    description: "Rotation signal across mETH and USDY based on live yield spreads, protocol TVL, and on-chain flows.",
    sampleResponse: { signal: "rotate_to_meth", mETH: { apy: 4.2, tvlUsd: 182_000_000 }, USDY: { apy: 5.1, tvlUsd: 74_000_000 }, confidence: 0.74, ts: "…" } }),
  svc({ id: "svc_mnt_rwa", workspaceIds: ["mantle"], name: "Mantle RWA Risk API", category: "analytics", priceUsd: 0.06,
    description: "Risk metrics for tokenised RWA baskets on Mantle — concentration, liquidity, depegging risk.",
    sampleResponse: { basket: "USDY+FBTC+FETH", concentration: 0.41, liquidityScore: 88, depegRisk: "low" } }),
  svc({ id: "svc_mnt_liq", workspaceIds: ["mantle"], name: "Mantle Liquidity Map", category: "data", priceUsd: 0.04,
    description: "Liquidity depth across Mantle DEX pools (Agni Finance, Merchant Moe) — spread, TVL, slippage estimate.",
    sampleResponse: { pool: "MNT/USDC", tvlUsd: 8_400_000, bid: 0.3088, ask: 0.3096, spread_bps: 2.6 } }),
  svc({ id: "svc_mnt_alpha", workspaceIds: ["mantle"], name: "Mantle · Alpha Data", category: "data", priceUsd: 0.04,
    description: "Paid trading / RWA / yield alpha drops, pulled per call inside wallet policy.",
    sampleResponse: { drops: [{ ts: "…", asset: "mETH", note: "…", confidence: 0.7 }] } }),
  svc({ id: "svc_mnt_yield", workspaceIds: ["mantle"], name: "Mantle · mETH/USDY Yield", category: "data", priceUsd: 0.03,
    description: "Yield/risk reads for Mantle-native assets, billed per query.",
    sampleResponse: { mETH: { apyPct: 4.2, tvlUsd: 182_000_000 }, USDY: { apyPct: 5.1, tvlUsd: 74_000_000 } } }),
  svc({ id: "svc_mnt_backtest", workspaceIds: ["mantle"], name: "Mantle · Strategy Backtest", category: "inference", priceUsd: 0.05,
    description: "Agent pays per backtest run; returns return / drawdown / Sharpe + a receipt.",
    sampleResponse: { pair: "mETH/USDY", retPct: 12.4, maxDdPct: 6.1, sharpe: 1.3, trades: 42 } }),

  // Agora / ArcMind
  svc({ id: "svc_arc_oracle", workspaceIds: ["agora"], name: "Arc Price Oracle", category: "data", priceUsd: 0.02,
    network: "arc-testnet",
    description: "Real-time USDC price feed across Arc, Arbitrum, and Base — used by arbitrage agents to spot cross-chain gaps.",
    sampleResponse: { arc: 1.0001, base: 0.9998, arb: 1.0000, gapBps: 30, recommended: "arb" } }),
  svc({ id: "svc_arc_arb", workspaceIds: ["agora"], name: "Cross-Chain Arb Executor", category: "trading", priceUsd: 0.05,
    network: "arc-testnet",
    description: "Executes a cross-chain USDC arbitrage via CCTP: routes the optimal leg, monitors finality, returns net profit.",
    sampleResponse: { profit: "0.12", ttl: "420ms", cctpTx: "0xabc7f3e2d1c5b4a9..." } }),
  svc({ id: "svc_arc_reasoning", workspaceIds: ["agora"], name: "ArcMind Reasoning Trace", category: "inference", priceUsd: 0.01,
    network: "arc-testnet",
    description: "Buy one ArcMind step-by-step decision log via Circle Gateway Nanopayments. Includes signal inputs, Kelly sizing, and outcome hash.",
    sampleResponse: { traceId: "trace-001", signal: "RSI(14)=28, OI spike +$420M", decision: "LONG BTC 18%", rationale: "Kelly f*=0.18, edge=0.62", outcome: "+14.3%", outcomeHash: "0x…" } }),
  svc({ id: "svc_arc_signal_hl", workspaceIds: ["agora"], name: "ArcMind · Hyperliquid OI Feed", category: "data", priceUsd: 0.002,
    network: "arc-testnet",
    description: "Real-time ETH open interest delta and funding rate from Hyperliquid — sub-cent Nanopayment.",
    sampleResponse: { asset: "ETH", oiValue: "1241.3M", fundingRate: "+0.032%/h", trend: "expanding" } }),
  svc({ id: "svc_arc_llm", workspaceIds: ["agora"], name: "LLM Strategy Advisor", category: "inference", priceUsd: 0.15,
    network: "arc-testnet",
    description: "GPT-4o strategy query scoped to ArcMind context — returns trade rationale + position sizing.",
    sampleResponse: { advice: "Reduce ETH exposure by 10%. Funding rate elevated, OI expanding past ATH — risk of long squeeze.", confidence: 0.71, model: "gpt-4o-mini", tokensIn: 312, tokensOut: 94 } }),
  svc({ id: "svc_arc_alert", workspaceIds: ["agora"], name: "Price Alert Stream", category: "data", priceUsd: 0.001,
    network: "arc-testnet",
    description: "Subscribe to ETH price alerts at custom thresholds — billed $0.001 per minute of streaming.",
    sampleResponse: { streamId: "alrt_arc_001", asset: "ETH", threshold: 3000, direction: "below", activatedAt: new Date().toISOString() } }),
  svc({ id: "svc_arc_copytrade", workspaceIds: ["agora"], name: "ArcMind · CopyTrade Stake Receipt", category: "trading", priceUsd: 1.00,
    network: "arc-testnet",
    description: "Receipt for staking USDC alongside ArcMind in CopyTradeEscrow.sol. Slash-bonded: drawdown >15% triggers automatic settlement.",
    sampleResponse: { positionId: "pos_…", escrow: "0x24Cb6d1bE131006e8CB2cb7fBa5675725f9E6Da8", killThreshold: "15%", performanceFee: "5%" } }),
  svc({ id: "svc_arc_usyc", workspaceIds: ["agora"], name: "USYC Yield Deposit", category: "payment", priceUsd: 0.01,
    network: "arc-testnet",
    description: "Park idle USDC into Circle USYC yield token on Arc L1. Earns ~5% APY. Minting and yield accrual settled via x402 Nanopayment.",
    sampleResponse: { deposited: "100 USDC", minted: "99.52 USYC", apy: "5.1%", yieldPerDay: "0.014 USDC", receiptId: "rcpt_…" } }),
  svc({ id: "svc_arc_swap", workspaceIds: ["agora"], name: "Arc DEX Swap Execution", category: "trading", priceUsd: 0.02,
    network: "arc-testnet",
    description: "Agent-executed ETH/USDC swap on Arc L1 at real market price. ArcMind autonomously executes after BUY/SELL decision. Paid per execution via x402.",
    sampleResponse: { pair: "ETH/USDC", side: "BUY", amountIn: "100 USDC", amountOut: "0.0293 ETH", price: 3412.5, slippage: "0.1%", receiptId: "rcpt_…" } }),

];

export const agents: AgentPolicy[] = [
  { id: "agent_yield_researcher", workspaceId: "mantle", name: "Yield Researcher", wallet: "0x0E43...3F71", status: "active", autoPay: true, dailyLimitUsd: 10, maxPerRequestUsd: 0.25, spentTodayUsd: 0.27, allowlist: ["svc_mnt_alpha", "svc_mnt_yield", "svc_mnt_backtest"] },
  { id: "agent_0g_runner", workspaceId: "0g", name: "0G Job Runner", wallet: "0x2bA9...c011", status: "active", autoPay: true, dailyLimitUsd: 8, maxPerRequestUsd: 0.2, spentTodayUsd: 0.11, allowlist: ["svc_0g_inference", "svc_0g_storage", "svc_0g_private"] },
];

// User-created services (added via tollgate_create_service MCP tool at runtime).
export const userServices: Service[] = [];

export function addUserService(s: Service): void {
  userServices.push(s);
}

function allServices(): Service[] {
  return [...services, ...userServices];
}

export function serviceById(id: string): Service | undefined {
  return allServices().find((s) => s.id === id);
}

export function servicesForWorkspace(ws: WorkspaceId): Service[] {
  return allServices().filter((s) => s.workspaceIds.includes(ws));
}

export function agentById(id: string): AgentPolicy | undefined {
  return agents.find((a) => a.id === id);
}
