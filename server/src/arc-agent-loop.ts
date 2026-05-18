/**
 * ArcMind autonomous decision loop.
 *
 * The loop always creates a local CopyGuard decision for the live demo. When
 * ARC_PRIVATE_KEY and ARC_AGENT_ID are configured, it also records the decision
 * hash on Arc L1 through ArcMindRegistry.recordDecision().
 */

import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { ethers } from "ethers";
import { buildCopyGuardDecision, type CopyGuardLeader, type CopyGuardSignals } from "./arc-copyguard.js";
import { appendReceipt } from "./store.js";

const ARC_RPC = process.env.ARC_RPC_URL ?? "https://rpc.testnet.arc-node.thecanteenapp.com/v1/public";
const ARC_KEY = process.env.ARC_PRIVATE_KEY ?? "";
const AGENT_ID = process.env.ARC_AGENT_ID ?? "";
const REGISTRY = process.env.VITE_ARC_REGISTRY_ADDRESS ?? "0xF4BFd93061B160Fa376c7F66De207a00225B4e70";

const REGISTRY_ABI = [
  "function recordDecision(bytes32 agentId, bytes32 decisionHash) external returns (uint256 index)",
];

const LOG_DIR = join(process.cwd(), "data");
const LOG_FILE = join(LOG_DIR, "arc-decisions.jsonl");
export const ARC_AGENT_INTERVAL_MS = Number(process.env.ARC_AGENT_INTERVAL_MS ?? 30 * 60 * 1000);

let prevEthPrice: number | null = null;
let arcWallet: ethers.Wallet | null = null;
let schedulerStop: (() => void) | null = null;

function sha256Hex(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function toBytes32(hex: string): string {
  const clean = hex.replace(/^0x/, "").padStart(64, "0");
  return "0x" + clean;
}

async function fetchEthPrice(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
      { signal: AbortSignal.timeout(8_000) },
    );
    if (!res.ok) return null;
    const data = await res.json() as { ethereum?: { usd?: number } };
    return data?.ethereum?.usd ?? null;
  } catch {
    return null;
  }
}

async function fetchHyperliquidOI(): Promise<{ oiValue: string; oiUsd: number; fundingRate: string } | null> {
  try {
    const res = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "metaAndAssetCtxs" }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const data = await res.json() as [{ universe: { name: string }[] }, { openInterest: string; funding: string }[]];
    const ethIdx = data[0].universe.findIndex((u) => u.name === "ETH");
    const ctx = ethIdx >= 0 ? data[1][ethIdx] : undefined;
    if (!ctx) return null;
    const oiNum = parseFloat(ctx.openInterest);
    return {
      oiValue: Number.isFinite(oiNum) ? `${(oiNum / 1e6).toFixed(1)}M` : ctx.openInterest,
      oiUsd: Number.isFinite(oiNum) ? oiNum : 0,
      fundingRate: ctx.funding,
    };
  } catch {
    return null;
  }
}

function makeDecision(ethPrice: number, oi: { fundingRate: string } | null): "BUY" | "SELL" | "HOLD" {
  const ethUp = prevEthPrice !== null && ethPrice > prevEthPrice * 1.001;
  const ethDown = prevEthPrice !== null && ethPrice < prevEthPrice * 0.999;
  const fr = oi ? parseFloat(oi.fundingRate) : NaN;
  const oiBullish = !Number.isNaN(fr) && fr > 0.0001;
  const oiBearish = !Number.isNaN(fr) && fr < -0.0001;
  if (ethUp && oiBullish) return "BUY";
  if (ethDown && oiBearish) return "SELL";
  return "HOLD";
}

function defaultCopyLeaders(ethPrice: number, fundingRate: number): CopyGuardLeader[] {
  const crowdingPenalty = Math.abs(fundingRate) > 0.00018 ? 1 : 0;
  const priceBias = prevEthPrice !== null ? ((ethPrice - prevEthPrice) / prevEthPrice) * 100 : 0;
  return [
    {
      id: "hl_whale_alpha",
      name: "HL Whale Alpha",
      winRatePct: 68,
      sharpe: 2.1,
      maxDrawdownPct: priceBias < -1 ? 14 : 9,
      recentPnlPct: priceBias > 0 ? 5.8 : 1.6,
      liquidityUsd: 2_500_000,
      recentLosses: priceBias < -1 ? 2 : 1,
    },
    {
      id: "hl_crowded_momentum",
      name: "Crowded Momentum",
      winRatePct: 61,
      sharpe: 1.4,
      maxDrawdownPct: 18 + crowdingPenalty * 13,
      recentPnlPct: priceBias < 0 ? -6.4 : 2.2,
      liquidityUsd: 1_200_000,
      recentLosses: 2 + crowdingPenalty * 3,
    },
    {
      id: "hl_low_liq_sprinter",
      name: "Low-Liq Sprinter",
      winRatePct: 74,
      sharpe: 0.9,
      maxDrawdownPct: 32,
      recentPnlPct: -9.5,
      liquidityUsd: 90_000,
      recentLosses: 5,
    },
  ];
}

function getArcWallet(): ethers.Wallet | null {
  if (!ARC_KEY) return null;
  if (!arcWallet) {
    arcWallet = new ethers.Wallet(ARC_KEY, new ethers.JsonRpcProvider(ARC_RPC));
  }
  return arcWallet;
}

function appendLog(entry: Record<string, unknown>): void {
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    appendFileSync(LOG_FILE, JSON.stringify(entry) + "\n", "utf8");
  } catch {
    // Logging is best effort; the API should not crash if local disk is unavailable.
  }
}

export async function arcAgentLoop(): Promise<void> {
  const tag = "[arc-loop]";
  const [ethPrice, hlOI] = await Promise.all([fetchEthPrice(), fetchHyperliquidOI()]);
  if (!ethPrice) {
    console.warn(`${tag} Could not fetch ETH price; skipping tick`);
    return;
  }

  const previousEthPrice = prevEthPrice;
  const decision = makeDecision(ethPrice, hlOI);
  prevEthPrice = ethPrice;

  const fundingRateNum = hlOI ? parseFloat(hlOI.fundingRate) : 0;
  const fundingRate = Number.isFinite(fundingRateNum) ? fundingRateNum : 0;
  const ethPriceChangePct = previousEthPrice
    ? Number((((ethPrice - previousEthPrice) / previousEthPrice) * 100).toFixed(3))
    : 0;
  const copyGuardSignals: CopyGuardSignals = {
    ethPrice,
    ethPriceChangePct,
    openInterestUsd: hlOI?.oiUsd ?? 0,
    fundingRate,
    volatilityPct: previousEthPrice ? Math.min(12, Math.abs(ethPriceChangePct) * 3 + 2) : 2.5,
    polymarketYesPct: decision === "BUY" ? 58 : decision === "SELL" ? 42 : 50,
  };
  const copyGuard = buildCopyGuardDecision({
    signals: copyGuardSignals,
    leaders: defaultCopyLeaders(ethPrice, fundingRate),
    riskProfile: "balanced",
  });

  const payload = {
    ts: copyGuard.ts,
    decision,
    primaryAction: copyGuard.primaryAction,
    ethPrice,
    oiValue: hlOI?.oiValue ?? "n/a",
    fundingRate: hlOI?.fundingRate ?? "n/a",
    agentId: AGENT_ID,
    leaderScores: copyGuard.leaderScores,
    allocation: copyGuard.allocation,
    reasoningTrace: copyGuard.reasoningTrace,
    copyGuardHash: copyGuard.decisionHash,
  };
  const decisionHash = "0x" + sha256Hex(JSON.stringify(payload));

  console.log(`${tag} ${decision}/${copyGuard.primaryAction} | ETH $${ethPrice} | OI ${hlOI?.oiValue ?? "n/a"} | hash ${decisionHash.slice(0, 14)}...`);

  const wallet = getArcWallet();
  if (!wallet || !AGENT_ID) {
    appendLog({ ...payload, decisionHash, txHash: null, mode: "paper", note: "ARC_PRIVATE_KEY or ARC_AGENT_ID not set" });
    console.log(`${tag} Paper decision recorded locally; set ARC_PRIVATE_KEY + ARC_AGENT_ID for Arc registry writes`);
    return;
  }

  try {
    const registry = new ethers.Contract(REGISTRY, REGISTRY_ABI, wallet);
    const agentId32 = toBytes32(AGENT_ID);
    const r = registry as unknown as {
      recordDecision: (agentId: string, hash: string) => Promise<{ hash?: string; wait: () => Promise<{ hash?: string }> }>;
    };
    const tx = await r.recordDecision(agentId32, decisionHash);
    const receipt = await tx.wait();
    const txHash = receipt.hash ?? tx.hash ?? "unknown";

    console.log(`${tag} Recorded -> ${txHash} | https://testnet.arcscan.app/tx/${txHash}`);
    appendLog({ ...payload, decisionHash, txHash, mode: "arc" });

    if (decision !== "HOLD") {
      const side = decision === "BUY" ? "BUY" : "SELL";
      const amountIn = 100;
      appendReceipt({
        challengeId: "ch_arc_auto_" + txHash.slice(2, 14),
        workspaceId: "agora",
        serviceId: "svc_arc_swap",
        serviceName: "ArcMind CopyGuard Auto Action",
        agentId: AGENT_ID,
        payerWallet: wallet.address,
        providerWallet: "0x24Cb6d1bE131006e8CB2cb7fBa5675725f9E6Da8",
        amount: 0.02,
        currency: "USDC",
        network: "arc-testnet",
        txHash,
        requestHash: decisionHash,
        status: "verified",
        paidAt: new Date().toISOString(),
        verifiedAt: new Date().toISOString(),
      });
      console.log(`${tag} Auto-action receipt recorded | ${side} ${amountIn} USDC notional`);
    }
  } catch (err) {
    console.error(`${tag} recordDecision failed:`, (err as Error).message ?? err);
    appendLog({ ...payload, decisionHash, txHash: null, mode: "paper", error: (err as Error).message });
  }
}

export function startArcAgentScheduler(options: {
  intervalMs?: number;
  run?: () => Promise<void>;
  onError?: (err: unknown) => void;
} = {}): () => void {
  if (schedulerStop && !options.run) return schedulerStop;
  const intervalMs = Math.max(10, options.intervalMs ?? ARC_AGENT_INTERVAL_MS);
  const run = options.run ?? arcAgentLoop;
  const onError = options.onError ?? ((err: unknown) => console.error("[arc-loop] scheduler error:", (err as Error).message ?? err));
  let running = false;

  const tick = () => {
    if (running) return;
    running = true;
    void run().catch(onError).finally(() => {
      running = false;
    });
  };

  tick();
  const timer = setInterval(tick, intervalMs);
  const stop = () => clearInterval(timer);
  if (!options.run) schedulerStop = stop;
  return stop;
}
