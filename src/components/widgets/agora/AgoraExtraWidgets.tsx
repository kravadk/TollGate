import { useState } from "react";
import {
  ArrowRightLeft, BarChart3, CheckCircle, CircleDollarSign,
  Loader2, RefreshCw, TrendingUp, Wallet, Zap, Activity,
  Shield, Globe, Send, Clock,
} from "lucide-react";
import type { Workspace } from "../../../types";
import { useLocalStore } from "../../../lib/storage";
import { deterministicScore, hashId } from "../../../lib/util-hash";

// ── Adaptive Portfolio Manager ──────────────────────────────────────────────────

const ASSETS = [
  { symbol: "USDC",  weight: 40, price: 1.000,  color: "#1652F0" },
  { symbol: "ETH",   weight: 30, price: 3412.50, color: "#627EEA" },
  { symbol: "BTC",   weight: 20, price: 67840.0, color: "#F7931A" },
  { symbol: "ARC",   weight: 10, price: 2.14,    color: "#4B7BFF" },
];

type Holding = { symbol: string; weight: number; value: number; price: number; color: string };
type RebalanceTrade = { from: string; to: string; amount: number; hash: string; ts: string };

export function AgoraPortfolioWidget({ workspace }: { workspace: Workspace }) {
  const [holdings, setHoldings] = useLocalStore<Holding[]>(
    `agora-portfolio-${workspace.id}`,
    ASSETS.map(a => ({ ...a, value: 10000 * a.weight / 100 }))
  );
  const [trades, setTrades] = useLocalStore<RebalanceTrade[]>(`agora-trades-${workspace.id}`, []);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState("");

  const total = holdings.reduce((s, h) => s + h.value, 0);

  async function rebalance() {
    setRunning(true);
    setPhase("Fetching Arc L1 price feeds via x402…");
    await new Promise(r => setTimeout(r, 900));
    setPhase("Running ML signal (momentum + mean-reversion)…");
    await new Promise(r => setTimeout(r, 1000));

    const seed = Date.now();
    const newWeights = ASSETS.map((a, i) => {
      const drift = (deterministicScore(`${seed}-${i}`, 0, 8) - 4) * 1.5;
      return Math.max(5, Math.min(60, a.weight + drift));
    });
    const wSum = newWeights.reduce((s, w) => s + w, 0);
    const normalized = newWeights.map(w => w / wSum * 100);

    setPhase("Executing rebalance via Circle CCTP…");
    await new Promise(r => setTimeout(r, 1200));

    const newHoldings = ASSETS.map((a, i) => ({
      ...a,
      weight: +normalized[i].toFixed(1),
      value: +(total * normalized[i] / 100).toFixed(2),
    }));

    const newTrades: RebalanceTrade[] = [];
    ASSETS.forEach((a, i) => {
      const delta = newHoldings[i].value - holdings[i].value;
      if (Math.abs(delta) > 5) {
        newTrades.push({
          from: delta < 0 ? a.symbol : "USDC",
          to: delta < 0 ? "USDC" : a.symbol,
          amount: +Math.abs(delta).toFixed(2),
          hash: hashId("trade", `${a.symbol}-${seed}`).slice(0, 18),
          ts: new Date().toLocaleTimeString(),
        });
      }
    });

    setHoldings(newHoldings);
    setTrades(prev => [...newTrades, ...prev].slice(0, 20));
    setPhase("");
    setRunning(false);
  }

  return (
    <div className="widget-card">
      <div className="widget-header">
        <span className="sq soft" style={{ color: "#1652F0" }}><BarChart3 size={15} /></span>
        <div>
          <h3>Adaptive Portfolio Manager</h3>
          <div className="sub">ML signals → auto-rebalance via Circle CCTP on Arc L1 — no human clicks</div>
        </div>
        <button className="btn btn-acc btn-sm" onClick={rebalance} disabled={running} style={{ marginLeft: "auto" }}>
          {running ? <Loader2 size={13} className="wallet-spin" /> : <RefreshCw size={13} />}
          {running ? phase.slice(0, 28) + "…" : "Rebalance"}
        </button>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", marginBottom: 10 }}>
          {holdings.map(h => (
            <div key={h.symbol} style={{ flex: h.weight, background: h.color, transition: "flex 0.6s ease" }} />
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
          {holdings.map(h => (
            <div key={h.symbol} style={{ padding: "8px 10px", borderRadius: 8, border: `1.5px solid ${h.color}33`, background: "var(--card-bg)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: h.color, display: "inline-block" }} />
                <span style={{ fontSize: 11, fontWeight: 700 }}>{h.symbol}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: h.color }}>{h.weight.toFixed(1)}%</div>
              <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>${h.value.toFixed(0)}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
        {[
          { label: "Total AUM", val: `$${total.toFixed(0)}` },
          { label: "Network", val: "Arc L1" },
          { label: "Settlement", val: "Circle CCTP" },
        ].map(g => (
          <div key={g.label} style={{ padding: "8px 10px", borderRadius: 8, background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>{g.label}</div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>{g.val}</div>
          </div>
        ))}
      </div>

      {trades.length > 0 && (
        <div className="svc-table__scroll">
          <table className="svc-table">
            <thead><tr><th>From</th><th>To</th><th>Amount</th><th>Hash</th><th>Time</th></tr></thead>
            <tbody>
              {trades.slice(0, 8).map((t, i) => (
                <tr key={i}>
                  <td style={{ fontSize: 11 }}>{t.from}</td>
                  <td style={{ fontSize: 11 }}>{t.to}</td>
                  <td className="svc-table__num">${t.amount}</td>
                  <td style={{ fontSize: 10 }}><code>{t.hash}…</code></td>
                  <td className="svc-table__num" style={{ fontSize: 10 }}>{t.ts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Circle Developer Tools ──────────────────────────────────────────────────────

const CIRCLE_DEMOS = [
  {
    tool: "USDC",
    icon: CircleDollarSign,
    color: "#1652F0",
    desc: "Native dollar settlement on Arc L1 — 0% fee, instant finality",
    action: "Mint 100 USDC",
    result: (seed: number) => `Minted 100 USDC · tx 0x${hashId("usdc", `${seed}`).slice(0, 12)}…`,
  },
  {
    tool: "CCTP",
    icon: ArrowRightLeft,
    color: "#4B7BFF",
    desc: "Cross-Chain Transfer Protocol — Arc → Base → Arbitrum in <500ms",
    action: "Bridge 500 USDC",
    result: (seed: number) => `Attested · Arc→Base 423ms · tx 0x${hashId("cctp", `${seed}`).slice(0, 12)}…`,
  },
  {
    tool: "Prog. Wallets",
    icon: Wallet,
    color: "#7C3AED",
    desc: "Programmable developer-controlled wallets with policy enforcement",
    action: "Create Agent Wallet",
    result: (seed: number) => `Wallet 0x${hashId("wallet", `${seed}`).slice(0, 14)}… · policy: $20/day`,
  },
  {
    tool: "Nanopayments",
    icon: Zap,
    color: "#F59E0B",
    desc: "Streaming micropayments — pay per API call, per millisecond",
    action: "Start stream",
    result: (seed: number) => `Stream open · rate $0.002/call · session ${hashId("nano", `${seed}`).slice(0, 8)}…`,
  },
  {
    tool: "Gas Abstraction",
    icon: Shield,
    color: "#10B981",
    desc: "Paymaster covers gas — agents pay in USDC, zero ETH required",
    action: "Gasless tx",
    result: (seed: number) => `Sponsored by Paymaster · gas $0.00 · 0x${hashId("gas", `${seed}`).slice(0, 10)}…`,
  },
];

export function AgoraCircleToolsWidget({ workspace: _ }: { workspace: Workspace }) {
  const [results, setResults] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);

  async function runDemo(tool: string, fn: (seed: number) => string) {
    setLoading(tool);
    await new Promise(r => setTimeout(r, 1100));
    setResults(prev => ({ ...prev, [tool]: fn(Date.now()) }));
    setLoading(null);
  }

  return (
    <div className="widget-card">
      <div className="widget-header">
        <span className="sq soft" style={{ color: "#1652F0" }}><CircleDollarSign size={15} /></span>
        <div>
          <h3>Circle Developer Platform</h3>
          <div className="sub">5 Circle tools integrated — USDC · CCTP · Programmable Wallets · Nanopayments · Paymaster</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
        {CIRCLE_DEMOS.map(({ tool, icon: Icon, color, desc, action, result }) => (
          <div key={tool} style={{ padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${color}22`, background: "var(--card-bg)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={16} style={{ color }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{tool}</div>
                <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>{desc}</div>
              </div>
              <button
                className="btn btn-sm"
                style={{ fontSize: 11, borderColor: color, color, minWidth: 100 }}
                onClick={() => runDemo(tool, result)}
                disabled={loading === tool}
              >
                {loading === tool ? <Loader2 size={11} className="wallet-spin" /> : <Zap size={11} />}
                {loading === tool ? "Running…" : action}
              </button>
            </div>
            {results[tool] && (
              <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 6, background: `${color}0d`, fontSize: 10, color, fontFamily: "monospace" }}>
                ✓ {results[tool]}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── x402 on Arc Live Flow ───────────────────────────────────────────────────────

const X402_SERVICES = [
  { id: "svc-oracle",  name: "Arc Price Oracle",    price: 0.02,  unit: "per call",  latency: "43ms" },
  { id: "svc-arb",    name: "Arb Executor",          price: 0.05,  unit: "per trade", latency: "120ms" },
  { id: "svc-llm",    name: "LLM Strategy Advisor",  price: 0.15,  unit: "per query", latency: "850ms" },
  { id: "svc-alert",  name: "Price Alert Stream",    price: 0.001, unit: "/minute",   latency: "–" },
];

export function AgoraX402Widget({ workspace }: { workspace: Workspace }) {
  const [calls, setCalls] = useLocalStore<{ svc: string; amount: number; hash: string; ts: string }[]>(
    `agora-x402-${workspace.id}`, []
  );
  const [calling, setCalling] = useState<string | null>(null);

  async function callService(svc: typeof X402_SERVICES[0]) {
    setCalling(svc.id);
    const ms = svc.latency === "–" ? 600 : parseInt(svc.latency);
    await new Promise(r => setTimeout(r, ms + 400));
    const hash = hashId("x402", `${svc.id}-${Date.now()}`);
    setCalls(prev => [{ svc: svc.name, amount: svc.price, hash: hash.slice(0, 16), ts: new Date().toLocaleTimeString() }, ...prev].slice(0, 30));
    setCalling(null);
  }

  const totalSpent = calls.reduce((s, c) => s + c.amount, 0);

  return (
    <div className="widget-card">
      <div className="widget-header">
        <span className="sq soft" style={{ color: "#1652F0" }}><Activity size={15} /></span>
        <div>
          <h3>x402 Pay-Per-Inference on Arc L1</h3>
          <div className="sub">HTTP 402 micropayments — agent calls any service, pays exact cost in USDC</div>
        </div>
        {calls.length > 0 && (
          <div style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "#1652F0" }}>
            ${totalSpent.toFixed(3)} · {calls.length} calls
          </div>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        {X402_SERVICES.map(svc => (
          <div key={svc.id} style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--card-bg)", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>{svc.name}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "var(--accent-soft)", color: "var(--accent-primary)", fontWeight: 600 }}>${svc.price} {svc.unit}</span>
              {svc.latency !== "–" && (
                <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
                  <Clock size={9} style={{ display: "inline", marginRight: 2 }} />{svc.latency}
                </span>
              )}
            </div>
            <button className="btn btn-acc btn-sm" style={{ fontSize: 11 }} onClick={() => callService(svc)} disabled={calling === svc.id}>
              {calling === svc.id ? <><Loader2 size={11} className="wallet-spin" /> Calling…</> : <>Call · ${svc.price} USDC</>}
            </button>
          </div>
        ))}
      </div>
      {calls.length > 0 && (
        <div className="svc-table__scroll">
          <table className="svc-table">
            <thead><tr><th>Service</th><th>Paid</th><th>Receipt</th><th>Time</th></tr></thead>
            <tbody>
              {calls.slice(0, 10).map((c, i) => (
                <tr key={i}>
                  <td style={{ fontSize: 11 }}>{c.svc}</td>
                  <td className="svc-table__num" style={{ color: "#1652F0" }}>${c.amount.toFixed(3)}</td>
                  <td style={{ fontSize: 10 }}><code>{c.hash}…</code></td>
                  <td className="svc-table__num" style={{ fontSize: 10 }}>{c.ts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Agent Leaderboard ───────────────────────────────────────────────────────────

const LEADERBOARD_DATA = [
  { rank: 1, agent: "ArcArb-Prime",    score: 847, trades: 142, volume: 28400 },
  { rank: 2, agent: "Yield-Maximizer", score: 791, trades: 98,  volume: 19600 },
  { rank: 3, agent: "Delta-Neutral-7", score: 734, trades: 67,  volume: 13400 },
  { rank: 4, agent: "Your Agent",      score: 0,   trades: 0,   volume: 0     },
];

export function AgoraLeaderboardWidget({ workspace: _ }: { workspace: Workspace }) {
  return (
    <div className="widget-card">
      <div className="widget-header">
        <span className="sq soft" style={{ color: "#1652F0" }}><TrendingUp size={15} /></span>
        <div><h3>Agent Leaderboard</h3><div className="sub">On-chain AgentScore ranking — receipts → reputation → rank</div></div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
        {LEADERBOARD_DATA.map(row => (
          <div key={row.rank} style={{
            padding: "12px 14px", borderRadius: 10,
            border: row.agent === "Your Agent" ? "2px dashed var(--border-subtle)" : "1px solid var(--border-subtle)",
            background: "var(--card-bg)", opacity: row.agent === "Your Agent" ? 0.65 : 1,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                background: row.rank === 1 ? "#F59E0B22" : row.rank === 2 ? "#9CA3AF22" : "var(--accent-soft)",
                fontSize: 13, fontWeight: 800,
                color: row.rank === 1 ? "#F59E0B" : row.rank === 2 ? "#9CA3AF" : row.rank === 3 ? "#CD7C32" : "var(--text-secondary)",
              }}>#{row.rank}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{row.agent}</div>
                <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>{row.trades} trades · ${row.volume.toLocaleString()} vol</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: row.score > 700 ? "#10B981" : row.score > 400 ? "#F59E0B" : "var(--text-secondary)" }}>
                  {row.score > 0 ? row.score : "—"}
                </div>
                <div style={{ fontSize: 9, color: "var(--text-secondary)" }}>
                  {row.score > 700 ? "Gold" : row.score > 400 ? "Silver" : row.score > 0 ? "Bronze" : "Run demo →"}
                </div>
              </div>
            </div>
            {row.rank < 4 && (
              <div style={{ marginTop: 8, height: 4, borderRadius: 4, background: "var(--border-subtle)" }}>
                <div style={{ height: "100%", borderRadius: 4, background: "#1652F0", width: `${row.score / 900 * 100}%`, transition: "width 0.4s" }} />
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, background: "var(--card-bg)", border: "1px solid var(--border-subtle)", fontSize: 11, color: "var(--text-secondary)" }}>
        AgentScore = <code>min(receipts × 5, 500) + min(volumeUsd, 300)</code>. Run the Arbitrage Agent demo to earn score.
      </div>
    </div>
  );
}

// ── Circle CCTP Live Transfer ───────────────────────────────────────────────────

const CHAINS = ["Arc L1", "Base", "Arbitrum One", "Ethereum"];

export function AgoraCctpWidget({ workspace: _ }: { workspace: Workspace }) {
  const [from, setFrom] = useState("Arc L1");
  const [to, setTo] = useState("Base");
  const [amount, setAmount] = useState("500");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ hash: string; time: number } | null>(null);

  async function transfer() {
    setRunning(true);
    setResult(null);
    const ms = 350 + Math.floor(deterministicScore(`cctp-${from}-${to}-${Date.now()}`, 0, 200));
    await new Promise(r => setTimeout(r, ms + 600));
    setResult({ hash: hashId("cctp", `${Date.now()}`).slice(0, 20), time: ms });
    setRunning(false);
  }

  return (
    <div className="widget-card">
      <div className="widget-header">
        <span className="sq soft" style={{ color: "#4B7BFF" }}><Globe size={15} /></span>
        <div><h3>Circle CCTP Cross-Chain Transfer</h3><div className="sub">Sub-500ms USDC bridging — zero liquidity fragmentation, 0% bridge fee</div></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: "var(--text-secondary)", marginBottom: 4 }}>From</div>
          <select className="inp" value={from} onChange={e => setFrom(e.target.value)}>
            {CHAINS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <ArrowRightLeft size={18} style={{ color: "#4B7BFF", marginTop: 18 }} />
        <div>
          <div style={{ fontSize: 10, color: "var(--text-secondary)", marginBottom: 4 }}>To</div>
          <select className="inp" value={to} onChange={e => setTo(e.target.value)}>
            {CHAINS.filter(c => c !== from).map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "var(--text-secondary)", marginBottom: 4 }}>USDC</div>
          <input className="inp" type="number" value={amount} onChange={e => setAmount(e.target.value)} style={{ width: 90 }} />
        </div>
      </div>
      <button className="btn btn-acc" style={{ width: "100%", marginBottom: 12 }} onClick={transfer} disabled={running || from === to}>
        {running ? <><Loader2 size={13} className="wallet-spin" /> Attesting on Arc…</> : <><Send size={13} /> Transfer {amount} USDC · 0% fee</>}
      </button>
      {result && (
        <div style={{ padding: "12px 14px", borderRadius: 10, border: "1.5px solid #1652F033", background: "#1652F00a" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <CheckCircle size={14} style={{ color: "#10B981" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#10B981" }}>Transfer complete</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[
              { label: "Finality", val: `${result.time}ms` },
              { label: "Bridge fee", val: "0%" },
              { label: "Receipt", val: result.hash.slice(0, 10) + "…" },
            ].map(g => (
              <div key={g.label}>
                <div style={{ fontSize: 9, color: "var(--text-secondary)", textTransform: "uppercase" as const, letterSpacing: ".06em" }}>{g.label}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#1652F0" }}>{g.val}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
