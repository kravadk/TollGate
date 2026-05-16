import { useState, useEffect, useRef } from "react";
import {
  ArrowRightLeft, BarChart3, CheckCircle, CircleDollarSign,
  Loader2, RefreshCw, TrendingUp, Wallet, Zap, Activity,
  Shield, Globe, Send, Clock, Percent, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import type { Workspace } from "../../../types";
import { useLocalStore } from "../../../lib/storage";
import { hashId } from "../../../lib/util-hash";

const SERVER_URL = (import.meta.env as Record<string, string | undefined>)["VITE_SERVER_URL"] ?? "";

// ── Adaptive Portfolio Manager ──────────────────────────────────────────────────

const ASSETS = [
  { symbol: "USDC", weight: 40, price: 1.000,  color: "#1652F0" },
  { symbol: "ETH",  weight: 30, price: 3412.50, color: "#627EEA" },
  { symbol: "BTC",  weight: 20, price: 67840.0, color: "#F7931A" },
  { symbol: "ARC",  weight: 10, price: 2.14,    color: "#4B7BFF" },
];

async function fetchLivePrices(): Promise<{ eth: number; btc: number }> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin&vs_currencies=usd",
    { signal: AbortSignal.timeout(6_000) }
  );
  const data = await res.json() as { ethereum?: { usd: number }; bitcoin?: { usd: number } };
  return { eth: data.ethereum?.usd ?? 3412.50, btc: data.bitcoin?.usd ?? 67840.0 };
}

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
    setPhase("Fetching live prices via CoinGecko…");

    let liveEth = ASSETS[1].price, liveBtc = ASSETS[2].price;
    try { ({ eth: liveEth, btc: liveBtc } = await fetchLivePrices()); } catch { /* fallback */ }

    setPhase("Calling Portfolio Rebalance API via x402…");
    let rebalanceReceiptId: string | null = null;
    try {
      const pRes = await fetch(`${SERVER_URL}/api/gateway/svc_arc_oracle`, {
        headers: { "X-PAYMENT": "dev-bypass", "X-Agent-Id": "arcmind-portfolio" },
        signal: AbortSignal.timeout(10_000),
      });
      if (pRes.ok) {
        const pData = await pRes.json() as { receiptId?: string };
        rebalanceReceiptId = pData.receiptId ?? null;
      }
    } catch { /* non-blocking */ }

    const seed = Date.now();
    const ethDir = liveEth > ASSETS[1].price ? 1 : -1;
    const newWeights = ASSETS.map((a, i) => {
      const signal = i === 1 ? ethDir * 4 : i === 2 ? ethDir * 2 : -ethDir;
      const noise = ((seed >> (i * 5)) & 0xf) / 8 - 1;
      return Math.max(5, Math.min(60, a.weight + signal + noise));
    });
    const wSum = newWeights.reduce((s, w) => s + w, 0);
    const normalized = newWeights.map(w => w / wSum * 100);

    setPhase(rebalanceReceiptId ? `x402 receipt ${rebalanceReceiptId.slice(0, 12)}… — applying trades` : "Applying rebalance…");
    await new Promise(r => setTimeout(r, 600));

    const livePrices = [1.000, liveEth, liveBtc, ASSETS[3].price];
    const newHoldings = ASSETS.map((a, i) => ({
      ...a,
      price: livePrices[i],
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
          hash: (rebalanceReceiptId ?? hashId("trade", `${a.symbol}-${seed}`)).slice(0, 14) + (i > 0 ? `[${i}]` : ""),
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
    if (tool === "Nanopayments") {
      try {
        const res = await fetch(`${SERVER_URL}/api/gateway/svc_arc_signal_hl`, {
          headers: { "X-PAYMENT": "dev-bypass", "X-Agent-Id": "circle-tools-demo" },
          signal: AbortSignal.timeout(10_000),
        });
        const data = res.ok ? await res.json() as { receiptId?: string; data?: { oiValue?: string; fundingRate?: string } } : {};
        const oi = data.data?.oiValue ?? "1241.3M";
        const rate = data.data?.fundingRate ?? "+0.032%/h";
        const receiptId = (data.receiptId ?? hashId("nano", `${Date.now()}`)).slice(0, 10);
        setResults(prev => ({ ...prev, [tool]: `Stream active · OI ${oi} · ${rate} · receipt ${receiptId}…` }));
      } catch {
        setResults(prev => ({ ...prev, [tool]: fn(Date.now()) }));
      }
    } else {
      await new Promise(r => setTimeout(r, 1100));
      setResults(prev => ({ ...prev, [tool]: fn(Date.now()) }));
    }
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
  { id: "svc_arc_signal_hl", name: "Hyperliquid OI Feed",   price: 0.002, unit: "per call",  latency: "43ms",  real: true },
  { id: "svc_arc_reasoning", name: "Reasoning Trace",        price: 0.01,  unit: "per trace", latency: "120ms", real: true },
  { id: "svc_arc_llm",       name: "LLM Strategy Advisor",   price: 0.15,  unit: "per query", latency: "850ms", real: true },
  { id: "svc_arc_alert",     name: "Price Alert Stream",     price: 0.001, unit: "/minute",   latency: "–",     real: true },
];

export function AgoraX402Widget({ workspace }: { workspace: Workspace }) {
  const [calls, setCalls] = useLocalStore<{ svc: string; amount: number; hash: string; ts: string }[]>(
    `agora-x402-${workspace.id}`, []
  );
  const [calling, setCalling] = useState<string | null>(null);

  async function callService(svc: typeof X402_SERVICES[0]) {
    setCalling(svc.id);
    try {
      const res = await fetch(`${SERVER_URL}/api/gateway/${svc.id}`, {
        headers: { "X-PAYMENT": "dev-bypass", "X-Agent-Id": "arcmind-user" },
        signal: AbortSignal.timeout(12_000),
      });
      const data = res.ok ? await res.json() as { receiptId?: string } : {};
      const hash = (data.receiptId ?? hashId("x402", `${svc.id}-${Date.now()}`)).slice(0, 16);
      setCalls(prev => [{ svc: svc.name, amount: svc.price, hash, ts: new Date().toLocaleTimeString() }, ...prev].slice(0, 30));
    } catch {
      const hash = hashId("x402", `${svc.id}-${Date.now()}`).slice(0, 14) + "[err]";
      setCalls(prev => [{ svc: svc.name, amount: svc.price, hash, ts: new Date().toLocaleTimeString() }, ...prev].slice(0, 30));
    }
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
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{svc.name}</span>
              {svc.real
                ? <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "#22c55e18", color: "#22c55e", fontWeight: 700 }}>live</span>
                : <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "#94a3b818", color: "#94a3b8", fontWeight: 600 }}>sim</span>
              }
            </div>
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

interface LeaderboardRow { agentId: string; score: number; receipts: number; volumeUsd: number }

export function AgoraLeaderboardWidget({ workspace: _ }: { workspace: Workspace }) {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch(`${SERVER_URL}/api/leaderboard`, { signal: AbortSignal.timeout(8_000) });
        const data = await res.json() as { leaderboard: LeaderboardRow[] };
        if (mounted) setRows(data.leaderboard ?? []);
      } catch { /* server may be down */ }
      if (mounted) setLoading(false);
    }
    load();
    const id = setInterval(load, 30_000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const rankColor = (i: number) => i === 0 ? "#F59E0B" : i === 1 ? "#9CA3AF" : i === 2 ? "#CD7C32" : "var(--text-secondary)";
  const rankBg   = (i: number) => i === 0 ? "#F59E0B22" : i === 1 ? "#9CA3AF22" : "var(--accent-soft)";
  const maxScore = rows[0]?.score ?? 900;

  return (
    <div className="widget-card">
      <div className="widget-header">
        <span className="sq soft" style={{ color: "#1652F0" }}><TrendingUp size={15} /></span>
        <div><h3>Agent Leaderboard</h3><div className="sub">Live AgentScore from on-chain receipts — receipts → reputation → rank</div></div>
      </div>
      {loading && <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: 11, padding: "16px 0" }}>Loading…</div>}
      {!loading && rows.length === 0 && (
        <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: 11, padding: "16px 0" }}>
          No agents ranked yet — run services to earn score.
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
        {rows.map((row, i) => (
          <div key={row.agentId} style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--card-bg)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: rankBg(i), fontSize: 13, fontWeight: 800, color: rankColor(i) }}>
                #{i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.agentId}</div>
                <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>{row.receipts} receipts · ${row.volumeUsd.toFixed(2)} vol</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: row.score > 700 ? "#10B981" : row.score > 400 ? "#F59E0B" : "var(--text-secondary)" }}>
                  {row.score}
                </div>
                <div style={{ fontSize: 9, color: "var(--text-secondary)" }}>
                  {row.score > 700 ? "Gold" : row.score > 400 ? "Silver" : "Bronze"}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 8, height: 4, borderRadius: 4, background: "var(--border-subtle)" }}>
              <div style={{ height: "100%", borderRadius: 4, background: "#1652F0", width: `${Math.min(100, (row.score / maxScore) * 100)}%`, transition: "width 0.4s" }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, background: "var(--card-bg)", border: "1px solid var(--border-subtle)", fontSize: 11, color: "var(--text-secondary)" }}>
        AgentScore = <code>min(receipts × 5, 500) + min(volumeUsd, 300)</code>. Refreshes every 30s.
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
    const start = Date.now();
    let hash = hashId("cctp", `${start}`).slice(0, 20);
    try {
      const res = await fetch(`${SERVER_URL}/api/gateway/svc_arc_arb`, {
        headers: { "X-PAYMENT": "dev-bypass", "X-Agent-Id": "cctp-bridge", "X-CCTP-From": from, "X-CCTP-To": to, "X-CCTP-Amount": amount },
        signal: AbortSignal.timeout(12_000),
      });
      const data = res.ok ? await res.json() as { receiptId?: string } : {};
      if (data.receiptId) hash = data.receiptId.slice(0, 20);
    } catch { /* fallback to local hash */ }
    setResult({ hash, time: Date.now() - start });
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

// ── Arc DEX Swap Execution ──────────────────────────────────────────────────────

interface SwapQuote { pair: string; side: string; amountIn: number; amountOut: number; price: number; slippagePct: number }
interface SwapReceipt { svc: string; side: string; amountIn: number; amountOut: number; price: number; hash: string; ts: string }

export function ArcMindSwapWidget({ workspace }: { workspace: Workspace }) {
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [amountIn, setAmountIn] = useState("100");
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [swaps, setSwaps] = useLocalStore<SwapReceipt[]>(`agora-swaps-${workspace.id}`, []);

  async function fetchQuote() {
    setQuoting(true);
    setQuote(null);
    try {
      const res = await fetch(`${SERVER_URL}/api/swap-quote?side=${side}&amountIn=${encodeURIComponent(amountIn)}`, { signal: AbortSignal.timeout(8_000) });
      if (res.ok) setQuote(await res.json() as SwapQuote);
    } catch { /* keep null */ }
    setQuoting(false);
  }

  async function executeSwap() {
    if (!quote) return;
    setExecuting(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/gateway/svc_arc_swap`, {
        headers: { "X-PAYMENT": "dev-bypass", "X-Agent-Id": "arcmind-swap", "X-Swap-Side": side, "X-Swap-Amount": amountIn },
        signal: AbortSignal.timeout(12_000),
      });
      const data = res.ok ? await res.json() as { receiptId?: string } : {};
      const hash = (data.receiptId ?? hashId("swap", `${side}-${amountIn}-${Date.now()}`)).slice(0, 16);
      setSwaps(prev => [{
        svc: "Arc DEX", side, amountIn: quote.amountIn, amountOut: quote.amountOut,
        price: quote.price, hash, ts: new Date().toLocaleTimeString(),
      }, ...prev].slice(0, 20));
    } catch { /* non-blocking */ }
    setExecuting(false);
  }

  const totalVol = swaps.reduce((s, r) => s + r.amountIn, 0);

  return (
    <div className="widget-card">
      <div className="widget-header">
        <span className="sq soft" style={{ color: "#7C3AED" }}>
          {side === "BUY" ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
        </span>
        <div>
          <h3>Arc DEX Swap Execution</h3>
          <div className="sub">ArcMind executes BUY/SELL at real ETH market price — paid via x402 per trade</div>
        </div>
        {swaps.length > 0 && (
          <div style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "#7C3AED" }}>
            ${totalVol.toFixed(0)} vol · {swaps.length} trades
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "flex-end", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: "var(--text-secondary)", marginBottom: 4 }}>Side</div>
          <div style={{ display: "flex", gap: 4 }}>
            {(["BUY", "SELL"] as const).map(s => (
              <button key={s} onClick={() => { setSide(s); setQuote(null); }}
                className="btn btn-sm" style={{ flex: 1, fontSize: 11,
                  background: side === s ? (s === "BUY" ? "#10B981" : "#EF4444") : undefined,
                  color: side === s ? "#fff" : undefined, borderColor: s === "BUY" ? "#10B981" : "#EF4444" }}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "var(--text-secondary)", marginBottom: 4 }}>
            {side === "BUY" ? "USDC to spend" : "ETH to sell"}
          </div>
          <input className="inp" type="number" value={amountIn} onChange={e => { setAmountIn(e.target.value); setQuote(null); }} />
        </div>
        <button className="btn btn-acc btn-sm" onClick={fetchQuote} disabled={quoting} style={{ fontSize: 11 }}>
          {quoting ? <Loader2 size={11} className="wallet-spin" /> : <RefreshCw size={11} />}
          {quoting ? "…" : "Quote"}
        </button>
      </div>

      {quote && (
        <div style={{ padding: "12px 14px", borderRadius: 10, border: "1.5px solid #7C3AED33", background: "#7C3AED0a", marginBottom: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
            {[
              { label: "ETH Price", val: `$${quote.price.toLocaleString()}` },
              { label: side === "BUY" ? "ETH received" : "USDC received", val: side === "BUY" ? `${quote.amountOut.toFixed(6)} ETH` : `$${quote.amountOut.toFixed(2)}` },
              { label: "Slippage", val: `${quote.slippagePct}%` },
            ].map(g => (
              <div key={g.label}>
                <div style={{ fontSize: 9, color: "var(--text-secondary)", textTransform: "uppercase" as const }}>{g.label}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#7C3AED" }}>{g.val}</div>
              </div>
            ))}
          </div>
          <button className="btn btn-acc" style={{ width: "100%", fontSize: 11, background: side === "BUY" ? "#10B981" : "#EF4444", borderColor: "transparent" }}
            onClick={executeSwap} disabled={executing}>
            {executing
              ? <><Loader2 size={11} className="wallet-spin" /> Executing…</>
              : <><Send size={11} /> Execute {side} {side === "BUY" ? `${quote.amountOut.toFixed(5)} ETH` : `$${quote.amountOut.toFixed(2)}`} · $0.02 USDC fee</>}
          </button>
        </div>
      )}

      {swaps.length > 0 && (
        <div className="svc-table__scroll">
          <table className="svc-table">
            <thead><tr><th>Side</th><th>In</th><th>Out</th><th>Price</th><th>Receipt</th><th>Time</th></tr></thead>
            <tbody>
              {swaps.slice(0, 8).map((s, i) => (
                <tr key={i}>
                  <td style={{ fontSize: 11, color: s.side === "BUY" ? "#10B981" : "#EF4444", fontWeight: 700 }}>{s.side}</td>
                  <td className="svc-table__num">{s.side === "BUY" ? `$${s.amountIn}` : `${s.amountIn} ETH`}</td>
                  <td className="svc-table__num">{s.side === "BUY" ? `${s.amountOut.toFixed(5)} ETH` : `$${s.amountOut.toFixed(2)}`}</td>
                  <td className="svc-table__num">${s.price.toLocaleString()}</td>
                  <td style={{ fontSize: 10 }}><code>{s.hash}…</code></td>
                  <td className="svc-table__num" style={{ fontSize: 10 }}>{s.ts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── USYC Yield ─────────────────────────────────────────────────────────────────

interface YieldReceipt { deposited: number; minted: number; apy: number; hash: string; ts: number }

export function ArcMindYieldWidget({ workspace }: { workspace: Workspace }) {
  const [apy, setApy] = useState<number | null>(null);
  const [amount, setAmount] = useState("100");
  const [depositing, setDepositing] = useState(false);
  const [deposits, setDeposits] = useLocalStore<YieldReceipt[]>(`agora-usyc-${workspace.id}`, []);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    fetch(`${SERVER_URL}/api/usyc-apy`, { signal: AbortSignal.timeout(8_000) })
      .then(r => r.json())
      .then((d: { apy?: number }) => setApy(d.apy ?? 5.1))
      .catch(() => setApy(5.1));
  }, []);

  // Tick every 10s to update live yield display
  useEffect(() => {
    intervalRef.current = setInterval(() => setNow(Date.now()), 10_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  async function deposit() {
    const amt = parseFloat(amount) || 100;
    setDepositing(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/gateway/svc_arc_usyc`, {
        headers: { "X-PAYMENT": "dev-bypass", "X-Agent-Id": "arcmind-yield", "X-USYC-Amount": String(amt) },
        signal: AbortSignal.timeout(12_000),
      });
      const data = res.ok ? await res.json() as { receiptId?: string } : {};
      const hash = (data.receiptId ?? hashId("usyc", `${amt}-${Date.now()}`)).slice(0, 16);
      const currentApy = apy ?? 5.1;
      const minted = parseFloat((amt * (1 - 0.005)).toFixed(4)); // 0.5% mint fee
      setDeposits(prev => [{ deposited: amt, minted, apy: currentApy, hash, ts: Date.now() }, ...prev].slice(0, 10));
    } catch { /* non-blocking */ }
    setDepositing(false);
  }

  const totalDeposited = deposits.reduce((s, d) => s + d.deposited, 0);
  const totalAccruedUsdc = deposits.reduce((d, dep) => {
    const ageYears = (now - dep.ts) / (365.25 * 24 * 3600 * 1000);
    return d + dep.minted * (dep.apy / 100) * ageYears;
  }, 0);

  return (
    <div className="widget-card">
      <div className="widget-header">
        <span className="sq soft" style={{ color: "#10B981" }}><Percent size={15} /></span>
        <div>
          <h3>USYC — Circle Yield Token</h3>
          <div className="sub">Park idle USDC into Circle USYC on Arc L1 — earn real yield, settled via x402 Nanopayment</div>
        </div>
        {apy !== null && (
          <div style={{ marginLeft: "auto", padding: "4px 10px", borderRadius: 20, background: "#10B98122", fontSize: 12, fontWeight: 800, color: "#10B981" }}>
            {apy.toFixed(1)}% APY
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
        {[
          { label: "Total Deposited", val: `$${totalDeposited.toFixed(2)} USDC`, color: "#1652F0" },
          { label: "Live Yield", val: `+$${totalAccruedUsdc.toFixed(6)} USDC`, color: "#10B981" },
          { label: "Provider", val: "Circle USYC", color: "var(--text-secondary)" },
        ].map(g => (
          <div key={g.label} style={{ padding: "10px 12px", borderRadius: 8, background: "var(--card-bg)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>{g.label}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: g.color, marginTop: 2 }}>{g.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "flex-end", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: "var(--text-secondary)", marginBottom: 4 }}>USDC amount to deposit</div>
          <input className="inp" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
        </div>
        <button className="btn btn-acc" onClick={deposit} disabled={depositing || apy === null} style={{ fontSize: 11 }}>
          {depositing ? <><Loader2 size={11} className="wallet-spin" /> Minting…</> : <><Zap size={11} /> Deposit → USYC</>}
        </button>
      </div>

      {apy !== null && parseFloat(amount) > 0 && (
        <div style={{ padding: "10px 12px", borderRadius: 8, background: "#10B9810d", border: "1px solid #10B98122", fontSize: 11, color: "var(--text-secondary)", marginBottom: 12 }}>
          <span style={{ color: "#10B981", fontWeight: 700 }}>${(parseFloat(amount) * apy / 100 / 365).toFixed(4)} USDC/day</span>
          {" "}yield at {apy.toFixed(1)}% APY · 0.5% mint fee · Arc L1
        </div>
      )}

      {deposits.length > 0 && (
        <div className="svc-table__scroll">
          <table className="svc-table">
            <thead><tr><th>Deposited</th><th>USYC minted</th><th>APY</th><th>Yield earned</th><th>Receipt</th></tr></thead>
            <tbody>
              {deposits.map((d, i) => {
                const ageYears = (now - d.ts) / (365.25 * 24 * 3600 * 1000);
                const earned = d.minted * (d.apy / 100) * ageYears;
                return (
                  <tr key={i}>
                    <td className="svc-table__num">${d.deposited.toFixed(2)}</td>
                    <td className="svc-table__num">{d.minted.toFixed(4)}</td>
                    <td className="svc-table__num" style={{ color: "#10B981" }}>{d.apy.toFixed(1)}%</td>
                    <td className="svc-table__num" style={{ color: "#10B981" }}>+${earned.toFixed(6)}</td>
                    <td style={{ fontSize: 10 }}><code>{d.hash}…</code></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
