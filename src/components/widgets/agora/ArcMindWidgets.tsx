import { useState, useEffect, useRef } from "react";
import { safeAmt } from "../../../lib/validate";
import {
  Copy, Eye, Lock, Play, Pause, Shield, Zap, Brain,
  ArrowUpRight, ArrowDownRight, AlertTriangle, CheckCheck, ExternalLink,
} from "lucide-react";
import type { Workspace } from "../../../types";
import { useLocalStore } from "../../../lib/storage";
import { useAppState } from "../../../app-state";
import { deterministicScore, hashId } from "../../../lib/util-hash";
import {
  isAgoraEscrowConfigured, isAgoraRegistryConfigured,
  stakeToEscrow, registerArcAgent, recordArcDecision,
  arcExplorerTxUrl,
} from "../../../lib/agora";

/* ─── Copy Trading ─────────────────────────────────────────────── */

interface CopyPosition {
  asset: string;
  side: "LONG" | "SHORT";
  entry: number;
  size: number;
  pnl: number;
  ts: number;
}

const ARCMIND_POSITIONS: Omit<CopyPosition, "pnl" | "ts">[] = [
  { asset: "BTC/USDC", side: "LONG",  entry: 67_420, size: 0.05 },
  { asset: "ETH/USDC", side: "SHORT", entry: 3_190,  size: 0.8  },
  { asset: "SUI/USDC", side: "LONG",  entry: 1.38,   size: 420  },
  { asset: "ARC/USDC", side: "LONG",  entry: 2.11,   size: 200  },
];

export function ArcMindCopyTradingWidget({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [positions, setPositions] = useLocalStore<CopyPosition[]>(
    `arcmind-copy-${workspace.id}`,
    []
  );
  const [stake, setStake] = useState("10");
  const [following, setFollowing] = useState(false);
  const [totalPnl, setTotalPnl] = useState(0);
  const [stakeErr, setStakeErr] = useState<string | null>(null);
  const [staking, setStaking] = useState(false);
  const [stakeTxHash, setStakeTxHash] = useLocalStore<string | null>(`arcmind-stake-tx-${workspace.id}`, null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!following) return;
    tickRef.current = setInterval(() => {
      setPositions((prev: CopyPosition[]) =>
        prev.map((p: CopyPosition) => ({
          ...p,
          pnl: p.pnl + (Math.random() - 0.46) * p.size * p.entry * 0.001,
        }))
      );
    }, 4000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [following]);

  useEffect(() => {
    setTotalPnl(positions.reduce((s: number, p: CopyPosition) => s + p.pnl, 0));
  }, [positions]);

  async function startCopying() {
    const amt = safeAmt(stake, 10_000) ?? 10;
    const now = Date.now();
    setStakeErr(null);

    if (isAgoraEscrowConfigured()) {
      setStaking(true);
      try {
        const { txHash } = await stakeToEscrow(amt);
        setStakeTxHash(txHash);
        emitReceipt({
          workspaceId: workspace.id,
          serviceName: `Stake to CopyTradeEscrow — $${amt} USDC`,
          amount: amt,
          currency: "USDC",
          network: "arc-l1",
          kind: "arcmind.copy.stake",
          payload: { txHash },
        });
      } catch (e: unknown) {
        setStakeErr((e as { message?: string }).message ?? "Stake failed or rejected.");
        setStaking(false);
        return;
      }
      setStaking(false);
    }

    const pos: CopyPosition[] = ARCMIND_POSITIONS.map((p, i) => ({
      ...p,
      pnl: 0,
      size: (amt * 0.25) / p.entry,
      ts: now + i,
    }));
    setPositions(pos);
    setFollowing(true);
    emitReceipt({
      workspaceId: workspace.id,
      serviceName: `Copy ArcMind — $${amt} USDC`,
      amount: amt,
      currency: "USDC",
      network: "arc-l1",
      kind: "arcmind.copy.start",
      payload: { txHash: hashId("copy", `${workspace.id}-${now}`) },
    });
  }

  function stopCopying() {
    setFollowing(false);
    if (tickRef.current) clearInterval(tickRef.current);
  }

  const ret30d = deterministicScore(workspace.id, 12, 42);
  const sharpe = deterministicScore(workspace.id + "sharpe", 1.2, 3.2);
  const winRate = deterministicScore(workspace.id + "wr", 60, 80);

  return (
    <div className="rounded-xl border border-purple-500/20 bg-purple-950/20 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Copy className="w-5 h-5 text-purple-400" />
        <h3 className="font-semibold text-white">Copy ArcMind</h3>
        {following && (
          <span className="ml-auto text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full animate-pulse">
            LIVE
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-white/5 p-3 text-center">
          <div className="text-xs text-gray-400">30d Return</div>
          <div className="text-lg font-bold text-green-400">+{ret30d.toFixed(1)}%</div>
        </div>
        <div className="rounded-lg bg-white/5 p-3 text-center">
          <div className="text-xs text-gray-400">Sharpe</div>
          <div className="text-lg font-bold text-blue-400">{sharpe.toFixed(1)}</div>
        </div>
        <div className="rounded-lg bg-white/5 p-3 text-center">
          <div className="text-xs text-gray-400">Win Rate</div>
          <div className="text-lg font-bold text-purple-400">{winRate.toFixed(0)}%</div>
        </div>
      </div>

      {!following ? (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400">Stake (USDC) — min $1</label>
            <input
              type="number" min="1" value={stake}
              onChange={e => setStake(e.target.value)}
              className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
            />
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            <div className="flex justify-between"><span>Performance fee</span><span>5%</span></div>
            <div className="flex justify-between"><span>Auto-exit on drawdown</span><span className="text-yellow-400">&gt;15%</span></div>
            <div className="flex justify-between"><span>Settlement</span><span>USDC · Arc L1 (ERC-8183)</span></div>
          </div>
          {stakeErr && <div className="text-xs text-red-400">{stakeErr}</div>}
          <button
            onClick={startCopying}
            disabled={staking}
            className="w-full rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-semibold py-2.5 transition-colors"
          >
            {staking ? "Approving USDC + staking…" : isAgoraEscrowConfigured() ? "Stake & Start Copy Trading" : "Start Copy Trading"}
          </button>
          {isAgoraEscrowConfigured() && !staking && (
            <p className="text-[10.5px] text-gray-600 text-center">
              Real USDC stake via CopyTradeEscrow on Arc L1 (MetaMask)
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg bg-white/5 p-3 flex justify-between items-center">
            <span className="text-sm text-gray-400">Unrealised PnL</span>
            <span className={`text-lg font-bold ${totalPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
              {totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(4)} USDC
            </span>
          </div>
          <div className="space-y-2">
            {positions.map((p: CopyPosition, i: number) => (
              <div key={i} className="rounded-lg bg-white/5 p-3 flex items-center gap-3 text-sm">
                {p.side === "LONG"
                  ? <ArrowUpRight className="w-4 h-4 text-green-400 shrink-0" />
                  : <ArrowDownRight className="w-4 h-4 text-red-400 shrink-0" />
                }
                <span className="text-gray-300 flex-1">{p.asset}</span>
                <span className={`font-mono text-xs ${p.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {p.pnl >= 0 ? "+" : ""}{p.pnl.toFixed(4)}
                </span>
              </div>
            ))}
          </div>
          {stakeTxHash && (
            <a
              href={arcExplorerTxUrl(stakeTxHash)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300"
            >
              <ExternalLink className="w-3 h-3" />
              Stake tx on Arc testnet
            </a>
          )}
          <button
            onClick={stopCopying}
            className="w-full rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 text-sm font-semibold py-2.5 transition-colors"
          >
            Stop &amp; Settle
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Reasoning Traces Marketplace ─────────────────────────────── */

interface Trace {
  id: string;
  title: string;
  signal: string;
  decision: string;
  rationale: string;
  outcome: string;
  price: number;
}

const SAMPLE_TRACES: Trace[] = [
  {
    id: "trace-001",
    title: "BTC LONG — Kelly 18%",
    signal: "RSI(14)=28 on 4h | OI spike +$420M | Fear&Greed=22",
    decision: "LONG BTC/USDC @ $67,420 | size=18% of book",
    rationale: "Extreme fear + OI flush = capitulation. Kelly: edge=0.62, b=2.1 → f*=18%. Risk/reward: 1:3.2 targeting $71k.",
    outcome: "+14.3% in 38h. Stop never hit.",
    price: 0.01,
  },
  {
    id: "trace-002",
    title: "Polymarket arb — YES misprint",
    signal: "Polymarket YES@0.31 | Manifold YES@0.48 | resolved +72h",
    decision: "BUY YES on Polymarket, HEDGE on Manifold",
    rationale: "Cross-venue probability gap 17pp with resolution <72h. Expected value +$0.17 per share at max position.",
    outcome: "+$1,840 net. Settled on-chain.",
    price: 0.01,
  },
  {
    id: "trace-003",
    title: "Kill Switch trigger — ETH crash",
    signal: "Drawdown -12.4% in 3h | Sharpe 30d → 0.3 | VIX equiv spike",
    decision: "CLOSE ALL ETH positions | pause trading 6h",
    rationale: "Kill Switch threshold breached. ERC-8183 job paused. 6h cooldown before re-entry evaluation.",
    outcome: "Avoided additional -8% drop. Resumed at better entry.",
    price: 0.005,
  },
  {
    id: "trace-004",
    title: "ARC/USDC liquidity capture",
    signal: "ARC pool depth: $2.1M | 24h vol: $890k | funding rate: +0.04%/h",
    decision: "LP into ARC/USDC concentrated range [1.95, 2.35]",
    rationale: "High vol/TVL ratio → fee capture outweighs IL. ERC-8004 credit line used to leverage 2x LP position.",
    outcome: "+22% APY realised over 72h period.",
    price: 0.01,
  },
];

export function ArcMindReasoningWidget({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [purchased, setPurchased] = useLocalStore<string[]>(`arcmind-traces-${workspace.id}`, []);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [revenue, setRevenue] = useLocalStore<number>(`arcmind-revenue-${workspace.id}`, 0);
  const [agentId, setAgentId] = useLocalStore<string | null>(`arcmind-agent-id-${workspace.id}`, null);
  const [regTxHash, setRegTxHash] = useLocalStore<string | null>(`arcmind-reg-tx-${workspace.id}`, null);
  const [decTxHash, setDecTxHash] = useLocalStore<string | null>(`arcmind-dec-tx-${workspace.id}`, null);
  const [onchainErr, setOnchainErr] = useState<string | null>(null);
  const [onchainLoading, setOnchainLoading] = useState<"register" | "record" | null>(null);

  async function registerAgent() {
    setOnchainErr(null);
    setOnchainLoading("register");
    try {
      const { agentId: id, txHash } = await registerArcAgent("arcmind-v1", JSON.stringify({ name: "ArcMind", version: "1.0", workspace: workspace.id }));
      setAgentId(id);
      setRegTxHash(txHash);
    } catch (e: unknown) {
      setOnchainErr((e as { message?: string }).message ?? "Register failed.");
    } finally {
      setOnchainLoading(null);
    }
  }

  async function recordDecision() {
    if (!agentId) return;
    setOnchainErr(null);
    setOnchainLoading("record");
    try {
      const payload = JSON.stringify({ agentId, traces: purchased, ts: Date.now() });
      const { txHash } = await recordArcDecision(agentId, payload);
      setDecTxHash(txHash);
    } catch (e: unknown) {
      setOnchainErr((e as { message?: string }).message ?? "Record failed.");
    } finally {
      setOnchainLoading(null);
    }
  }

  function buyTrace(trace: Trace) {
    if (purchased.includes(trace.id)) return;
    setPurchased((prev: string[]) => [...prev, trace.id]);
    setRevenue((r: number) => r + trace.price);
    emitReceipt({
      workspaceId: workspace.id,
      serviceName: `Reasoning Trace: ${trace.title}`,
      amount: trace.price,
      currency: "USDC",
      network: "arc-l1",
      kind: "arcmind.trace.purchase",
      payload: { traceId: trace.id, txHash: hashId("trace", `${trace.id}-${workspace.id}`) },
    });
  }

  function copyJson(trace: Trace) {
    const json = JSON.stringify({ ...trace }, null, 2);
    navigator.clipboard.writeText(json).catch(() => {});
    setCopied(trace.id);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="w-5 h-5 text-indigo-400" />
        <h3 className="font-semibold text-white">Reasoning Traces</h3>
        <span className="ml-auto text-xs text-gray-400">
          Revenue: <span className="text-green-400 font-mono">${revenue.toFixed(3)}</span>
        </span>
      </div>
      <p className="text-xs text-gray-400">
        Buy ArcMind's step-by-step decision logs for $0.01 each via Arc Nanopayments.
        Each trace is an x402 HTTP receipt — verifiable on-chain.
      </p>

      <div className="space-y-3">
        {SAMPLE_TRACES.map(trace => {
          const owned = purchased.includes(trace.id);
          const isOpen = expanded === trace.id;
          return (
            <div key={trace.id} className="rounded-lg bg-white/5 border border-white/10 overflow-hidden">
              <div
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setExpanded(isOpen ? null : trace.id)}
              >
                {owned
                  ? <Eye className="w-4 h-4 text-indigo-400 shrink-0" />
                  : <Lock className="w-4 h-4 text-gray-500 shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{trace.title}</div>
                  <div className="text-xs text-gray-500 truncate">{trace.signal}</div>
                </div>
                <span className="text-xs text-indigo-400 font-mono shrink-0">${trace.price}</span>
              </div>

              {isOpen && (
                <div className="border-t border-white/10 p-3 space-y-2">
                  {owned ? (
                    <>
                      <div className="text-xs space-y-1.5">
                        <div><span className="text-gray-500">Decision: </span><span className="text-white">{trace.decision}</span></div>
                        <div><span className="text-gray-500">Rationale: </span><span className="text-gray-300">{trace.rationale}</span></div>
                        <div><span className="text-gray-500">Outcome: </span><span className="text-green-400">{trace.outcome}</span></div>
                      </div>
                      <button
                        onClick={() => copyJson(trace)}
                        className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300"
                      >
                        {copied === trace.id ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied === trace.id ? "Copied!" : "Copy JSON"}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => buyTrace(trace)}
                      className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold py-2 transition-colors"
                    >
                      Unlock for ${trace.price} USDC
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isAgoraRegistryConfigured() && (
        <div className="border-t border-white/10 pt-4 space-y-3">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">On-chain Registry</div>
          {onchainErr && <div className="text-xs text-red-400">{onchainErr}</div>}
          <div className="flex gap-2">
            <button
              onClick={registerAgent}
              disabled={!!agentId || onchainLoading !== null}
              className="flex-1 rounded-lg bg-indigo-600/60 hover:bg-indigo-600 disabled:opacity-40 text-white text-xs font-semibold py-2 transition-colors"
            >
              {onchainLoading === "register" ? "Registering…" : agentId ? "Registered ✓" : "Register Agent"}
            </button>
            <button
              onClick={recordDecision}
              disabled={!agentId || purchased.length === 0 || onchainLoading !== null}
              className="flex-1 rounded-lg bg-indigo-800/60 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold py-2 transition-colors"
            >
              {onchainLoading === "record" ? "Recording…" : "Record Decision"}
            </button>
          </div>
          {regTxHash && (
            <a href={arcExplorerTxUrl(regTxHash)} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300">
              <ExternalLink className="w-3 h-3" /> registerAgent tx ↗
            </a>
          )}
          {decTxHash && (
            <a href={arcExplorerTxUrl(decTxHash)} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300">
              <ExternalLink className="w-3 h-3" /> recordDecision tx ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Signal Hub ────────────────────────────────────────────────── */

interface SignalSource {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: string;
  unit: string;
  range: [number, number];
}

const SIGNAL_SOURCES: SignalSource[] = [
  { id: "hyperliquid", name: "Hyperliquid OI Feed",   description: "Open interest delta + funding rate", price: 0.002, icon: "📈", unit: "M OI",  range: [800, 1400] },
  { id: "polymarket",  name: "Polymarket Sentiment",  description: "YES probability for macro events",   price: 0.001, icon: "🎯", unit: "% YES", range: [20,  80]   },
  { id: "news",        name: "News Oracle",            description: "Sentiment score from 200 sources",   price: 0.005, icon: "📰", unit: "score", range: [-1,  1]    },
  { id: "onchain",     name: "On-chain Whale Tracker", description: "Wallet flows >$100k last 1h",        price: 0.003, icon: "🐋", unit: "M net", range: [-50, 50]   },
];

interface FetchedSignal {
  id: string;
  value: string;
  ts: number;
}

export function ArcMindSignalHubWidget({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [signals, setSignals] = useLocalStore<FetchedSignal[]>(`arcmind-signals-${workspace.id}`, []);
  const [loading, setLoading] = useState<string | null>(null);
  const [decision, setDecision] = useState<string | null>(null);

  function generateValue(src: SignalSource): string {
    const v = deterministicScore(workspace.id + src.id, src.range[0], src.range[1]);
    if (src.unit === "score") return v.toFixed(2);
    if (src.unit === "% YES") return v.toFixed(0) + "%";
    return v.toFixed(1) + " " + src.unit;
  }

  async function fetchSignal(src: SignalSource) {
    setLoading(src.id);
    let value = generateValue(src);
    if (src.id === "hyperliquid") {
      try {
        const res = await fetch("https://api.hyperliquid.xyz/info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "metaAndAssetCtxs" }),
          signal: AbortSignal.timeout(8_000),
        });
        const data = await res.json() as [{ universe: { name: string }[] }, { openInterest: string; funding: string }[]];
        const ethIdx = data[0].universe.findIndex((u) => u.name === "ETH");
        if (ethIdx >= 0 && data[1][ethIdx]) {
          const ctx = data[1][ethIdx];
          const oiNum = parseFloat(ctx.openInterest);
          const oiStr = isNaN(oiNum) ? ctx.openInterest : `${(oiNum / 1e6).toFixed(1)}M`;
          const fr = parseFloat(ctx.funding);
          value = `${oiStr} OI · ${isNaN(fr) ? ctx.funding : (fr * 100).toFixed(4)}% funding`;
        }
      } catch { /* fall back to deterministic */ }
    } else {
      await new Promise(r => setTimeout(r, 800));
    }
    setSignals((prev: FetchedSignal[]) => {
      const filtered = prev.filter((s: FetchedSignal) => s.id !== src.id);
      return [...filtered, { id: src.id, value, ts: Date.now() }];
    });
    setLoading(null);
    emitReceipt({
      workspaceId: workspace.id,
      serviceName: `Signal: ${src.name}`,
      amount: src.price,
      currency: "USDC",
      network: "arc-l1",
      kind: "arcmind.signal.fetch",
      payload: { signalId: src.id, value, txHash: hashId("sig", `${src.id}-${workspace.id}`) },
    });
  }

  function composeDecision() {
    if (signals.length < 2) return;
    const bias = deterministicScore(workspace.id + "bias", 0, 2) >= 1 ? "BULLISH" : "BEARISH";
    setDecision(`ArcMind synthesised ${signals.length} signals → ${bias} conviction 74%. Recommended: ${bias === "BULLISH" ? "Add to LONG, tighten stop" : "Reduce exposure, hedge with PUT"}. ERC-8183 job #${hashId("job", workspace.id)} queued.`);
  }

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-cyan-400" />
        <h3 className="font-semibold text-white">Signal Hub</h3>
        <span className="ml-auto text-xs text-gray-500">{signals.length}/4 fetched</span>
      </div>
      <p className="text-xs text-gray-400">
        Buy individual data feeds via x402 micropayments. Compose into a unified ArcMind signal.
      </p>

      <div className="space-y-2">
        {SIGNAL_SOURCES.map(src => {
          const fetched = signals.find((s: FetchedSignal) => s.id === src.id);
          const isLoading = loading === src.id;
          return (
            <div key={src.id} className="rounded-lg bg-white/5 border border-white/10 p-3 flex items-center gap-3">
              <span className="text-xl">{src.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white">{src.name}</div>
                <div className="text-xs text-gray-500">{src.description}</div>
                {fetched && (
                  <div className="mt-1 text-xs font-mono text-cyan-400">{fetched.value}</div>
                )}
              </div>
              <div className="shrink-0 text-right">
                <div className="text-xs text-gray-500 mb-1">${src.price}</div>
                <button
                  onClick={() => fetchSignal(src)}
                  disabled={isLoading}
                  className="text-xs px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white transition-colors"
                >
                  {isLoading ? "..." : fetched ? "Refresh" : "Fetch"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {signals.length >= 2 && (
        <button
          onClick={composeDecision}
          className="w-full rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-sm font-semibold py-2.5 transition-all"
        >
          Compose ArcMind Decision
        </button>
      )}

      {decision && (
        <div className="rounded-lg bg-white/5 border border-cyan-500/30 p-3 text-xs text-gray-300 leading-relaxed">
          <span className="text-cyan-400 font-semibold">Decision: </span>{decision}
        </div>
      )}
    </div>
  );
}

/* ─── Kill Switch / Risk Manager ────────────────────────────────── */

export function ArcMindKillSwitchWidget({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [drawdown, setDrawdown] = useState(0);
  const [sharpe, setSharpe] = useState(1.8);
  const [maxDrawdown, setMaxDrawdown] = useLocalStore<number>(`arcmind-ks-threshold-${workspace.id}`, 15);
  const [killed, setKilled] = useLocalStore<boolean>(`arcmind-ks-killed-${workspace.id}`, false);
  const [running, setRunning] = useState(false);
  const [killSig, setKillSig] = useLocalStore<string | null>(`arcmind-ks-sig-${workspace.id}`, null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const killedRef = useRef(killed);
  killedRef.current = killed;

  useEffect(() => {
    if (!running || killed) return;
    tickRef.current = setInterval(() => {
      setDrawdown((d: number) => {
        const next = Math.min(d + Math.random() * 1.5, 30);
        if (next >= maxDrawdown && !killedRef.current) triggerKillSwitch(next);
        return next;
      });
      setSharpe((s: number) => Math.max(0, s - Math.random() * 0.05));
    }, 2000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [running, killed, maxDrawdown]);

  async function triggerKillSwitch(dd: number) {
    if (tickRef.current) clearInterval(tickRef.current);
    setRunning(false);
    setKilled(true);
    const msg = `killswitch:${workspace.id}:drawdown=${dd.toFixed(2)}%:ts=${Date.now()}`;
    let sig: string | null = null;
    try {
      const eth = (window as unknown as { ethereum?: { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
      if (eth) {
        const accounts = await eth.request({ method: "eth_requestAccounts" }) as string[];
        sig = await eth.request({ method: "personal_sign", params: [msg, accounts[0]] }) as string;
        setKillSig(sig);
      }
    } catch { /* user rejected — proceed without sig */ }
    emitReceipt({
      workspaceId: workspace.id,
      serviceName: `Kill Switch triggered — drawdown ${dd.toFixed(1)}%`,
      amount: 0,
      currency: "USDC",
      network: "arc-l1",
      kind: "arcmind.killswitch.trigger",
      payload: { drawdown: dd, sig: sig ?? "demo", txHash: hashId("ks", `${workspace.id}-${Date.now()}`) },
    });
  }

  function simulateCrash() {
    setDrawdown(maxDrawdown + 0.1);
    triggerKillSwitch(maxDrawdown + 0.1);
  }

  function reset() {
    setKilled(false);
    setDrawdown(0);
    setSharpe(1.8);
    setRunning(false);
  }

  const pct = Math.min((drawdown / maxDrawdown) * 100, 100);
  const barColor = pct < 60 ? "bg-green-500" : pct < 85 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="rounded-xl border border-red-500/20 bg-red-950/20 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-red-400" />
        <h3 className="font-semibold text-white">Kill Switch</h3>
        {killed && (
          <span className="ml-auto text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">TRIGGERED</span>
        )}
        {running && !killed && (
          <span className="ml-auto text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full animate-pulse">MONITORING</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-white/5 p-3">
          <div className="text-xs text-gray-400">Current Drawdown</div>
          <div className={`text-xl font-bold mt-1 ${pct >= 85 ? "text-red-400" : pct >= 60 ? "text-yellow-400" : "text-green-400"}`}>
            -{drawdown.toFixed(1)}%
          </div>
        </div>
        <div className="rounded-lg bg-white/5 p-3">
          <div className="text-xs text-gray-400">Sharpe (30d)</div>
          <div className={`text-xl font-bold mt-1 ${sharpe < 0.5 ? "text-red-400" : sharpe < 1 ? "text-yellow-400" : "text-green-400"}`}>
            {sharpe.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-gray-400">
          <span>Drawdown vs threshold</span>
          <span>{drawdown.toFixed(1)}% / {maxDrawdown}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-gray-400">Kill threshold (%)</label>
        <input
          type="range" min="5" max="30" step="1"
          value={maxDrawdown}
          onChange={e => setMaxDrawdown(Math.min(30, Math.max(5, Number(e.target.value) || 15)))}
          className="w-full accent-red-500"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>5% (tight)</span>
          <span className="text-red-400 font-mono">{maxDrawdown}%</span>
          <span>30% (loose)</span>
        </div>
      </div>

      <div className="text-xs text-gray-500 space-y-0.5">
        <div className="flex justify-between"><span>Protocol</span><span>ERC-8183 Job Contract</span></div>
        <div className="flex justify-between"><span>On trigger</span><span>Close all · pause 6h · refund remaining</span></div>
        <div className="flex justify-between"><span>Settlement</span><span>USDC · Arc L1</span></div>
      </div>

      {killed ? (
        <div className="space-y-3">
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-300">
            <AlertTriangle className="w-3.5 h-3.5 inline mr-1.5" />
            Kill Switch triggered. All positions closed. ERC-8183 job paused. Remaining USDC refunded.
          </div>
          {killSig && (
            <div className="rounded-lg bg-white/5 p-2.5 text-[10px] font-mono text-gray-500 break-all leading-relaxed">
              <span className="text-gray-400 font-sans font-semibold">EIP-191 kill order: </span>
              {killSig.slice(0, 32)}…{killSig.slice(-8)}
            </div>
          )}
          <button onClick={reset} className="w-full rounded-lg border border-white/20 text-gray-400 hover:bg-white/5 text-sm py-2 transition-colors">
            Reset &amp; Re-arm
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => setRunning((r: boolean) => !r)}
            className={`flex-1 rounded-lg text-sm font-semibold py-2.5 transition-colors flex items-center justify-center gap-2 ${
              running
                ? "border border-gray-500/40 text-gray-400 hover:bg-white/5"
                : "bg-green-600 hover:bg-green-500 text-white"
            }`}
          >
            {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {running ? "Pause" : "Arm Monitor"}
          </button>
          <button
            onClick={simulateCrash}
            className="rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 text-sm px-4 py-2.5 transition-colors"
          >
            Simulate Crash
          </button>
        </div>
      )}
    </div>
  );
}
