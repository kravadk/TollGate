/**
 * ArcMind Autonomous Decision Loop — runs every 30 minutes.
 *
 * Fetches real market data (Hyperliquid OI + CoinGecko ETH price),
 * makes a BUY / SELL / HOLD decision, and records it on Arc L1 via
 * ArcMindRegistry.recordDecision(). Each tx is visible on arcscan —
 * proving both autonomous agent behaviour and real on-chain traction.
 *
 * Env vars (all optional — loop skips gracefully if unset):
 *   ARC_PRIVATE_KEY  — deployer private key (same as contracts/.env)
 *   ARC_AGENT_ID     — bytes32 agentId from registerAgent() tx
 *   ARC_RPC_URL      — defaults to Arc testnet public RPC
 */

import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { ethers } from "ethers";

const ARC_RPC  = process.env.ARC_RPC_URL ?? "https://rpc.testnet.arc-node.thecanteenapp.com/v1/public";
const ARC_KEY  = process.env.ARC_PRIVATE_KEY ?? "";
const AGENT_ID = process.env.ARC_AGENT_ID ?? "";
const REGISTRY = process.env.VITE_ARC_REGISTRY_ADDRESS ?? "0xF4BFd93061B160Fa376c7F66De207a00225B4e70";

const REGISTRY_ABI = [
  "function recordDecision(bytes32 agentId, bytes32 decisionHash) external returns (uint256 index)",
];

const LOG_DIR  = join(process.cwd(), "data");
const LOG_FILE = join(LOG_DIR, "arc-decisions.jsonl");

let prevEthPrice: number | null = null;

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
      { signal: AbortSignal.timeout(8_000) }
    );
    if (!res.ok) return null;
    const data = await res.json() as { ethereum?: { usd?: number } };
    return data?.ethereum?.usd ?? null;
  } catch {
    return null;
  }
}

async function fetchHyperliquidOI(): Promise<{ oiValue: string; fundingRate: string } | null> {
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
    if (ethIdx < 0 || !data[1][ethIdx]) return null;
    const ctx = data[1][ethIdx];
    const oiNum = parseFloat(ctx.openInterest);
    return {
      oiValue: isNaN(oiNum) ? ctx.openInterest : `${(oiNum / 1e6).toFixed(1)}M`,
      fundingRate: ctx.funding,
    };
  } catch {
    return null;
  }
}

function makeDecision(ethPrice: number, oi: { fundingRate: string } | null): "BUY" | "SELL" | "HOLD" {
  const ethUp   = prevEthPrice !== null && ethPrice > prevEthPrice * 1.001;
  const ethDown = prevEthPrice !== null && ethPrice < prevEthPrice * 0.999;
  const fr = oi ? parseFloat(oi.fundingRate) : NaN;
  const oiBullish = !isNaN(fr) && fr > 0.0001;
  const oiBearish = !isNaN(fr) && fr < -0.0001;
  if (ethUp && oiBullish) return "BUY";
  if (ethDown && oiBearish) return "SELL";
  return "HOLD";
}

let arcWallet: ethers.Wallet | null = null;

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
  } catch { /* non-fatal */ }
}

export async function arcAgentLoop(): Promise<void> {
  const tag = "[arc-loop]";
  if (!ARC_KEY || !AGENT_ID) {
    console.log(`${tag} ARC_PRIVATE_KEY or ARC_AGENT_ID not set — skipping`);
    return;
  }

  const [ethPrice, hlOI] = await Promise.all([fetchEthPrice(), fetchHyperliquidOI()]);
  if (!ethPrice) {
    console.warn(`${tag} Could not fetch ETH price — skipping tick`);
    return;
  }

  const decision = makeDecision(ethPrice, hlOI);
  prevEthPrice = ethPrice;

  const payload = {
    ts: new Date().toISOString(),
    decision,
    ethPrice,
    oiValue: hlOI?.oiValue ?? "n/a",
    fundingRate: hlOI?.fundingRate ?? "n/a",
    agentId: AGENT_ID,
  };
  const decisionHash = "0x" + sha256Hex(JSON.stringify(payload));

  console.log(`${tag} ${decision} | ETH $${ethPrice} | OI ${hlOI?.oiValue ?? "n/a"} | hash ${decisionHash.slice(0, 14)}…`);

  const wallet = getArcWallet();
  if (!wallet) return;

  try {
    const registry = new ethers.Contract(REGISTRY, REGISTRY_ABI, wallet);
    const agentId32 = toBytes32(AGENT_ID);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = registry as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx = await (r.recordDecision(agentId32, decisionHash) as Promise<any>);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const receipt = await (tx.wait() as Promise<any>);
    const txHash: string = (receipt?.hash ?? tx?.hash ?? "unknown") as string;

    console.log(`${tag} Recorded → ${txHash} | https://testnet.arcscan.app/tx/${txHash}`);
    appendLog({ ...payload, decisionHash, txHash });
  } catch (err) {
    console.error(`${tag} recordDecision failed:`, (err as Error).message ?? err);
    appendLog({ ...payload, decisionHash, txHash: null, error: (err as Error).message });
  }
}
