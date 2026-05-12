import { useEffect, useRef, useState } from "react";
import {
  Activity, BarChart3, Bell, BellOff, ExternalLink, Loader2, Pause, Play, TrendingUp, Zap,
} from "lucide-react";
import type { Workspace } from "../../../types";
import { useAppState } from "../../../app-state";
import { useLocalStore } from "../../../lib/storage";
import { deterministicScore, hashId, sha256Hex } from "../../../lib/util-hash";
import { vaultRecordDecision, isMantleVaultConfigured } from "../../../lib/mantle";

const hid = (s: string) => hashId("mnt", s);
const now = () => new Date().toLocaleTimeString();

// mETH on Mantle mainnet — used for whale feed Transfer logs
const METH_ADDRESS = "0xcDA86A272531e8640cD7F1a92c01839911B90bb0";
const MANTLE_RPC = "https://rpc.mantle.xyz";

// ── 1. Live Strategy Deployer ────────────────────────────────────────────────

const ASSET_PAIRS = [
  { label: "mETH / MNT", apy: 3.9 },
  { label: "USDY / USDC", apy: 5.1 },
  { label: "RWA-T / MNT", apy: 4.2 },
  { label: "wETH / mETH", apy: 2.8 },
];

type DeployedStrategy = {
  id: string;
  name: string;
  asset: string;
  status: "active" | "paused";
  ticks: number;
  lastSignal: string;
  pnl: number;
  pnlHistory: number[];
  ts: string;
  anchorTx?: string;
  anchorExplorer?: string;
};

// Build an SVG line + fill path for a PnL series. The y-axis is anchored at 0.
function pnlChartPaths(history: number[], w: number, h: number, pad = 4) {
  const series = history.length >= 2 ? history : [0, 0];
  const lo = Math.min(0, ...series);
  const hi = Math.max(0, ...series);
  const range = hi - lo || 1;
  const innerH = h - pad * 2;
  const yFor = (v: number) => pad + (1 - (v - lo) / range) * innerH;
  const xFor = (i: number) => (series.length === 1 ? w / 2 : (i / (series.length - 1)) * w);
  const pts = series.map((v, i) => [xFor(i), yFor(v)] as const);
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const lastX = pts[pts.length - 1]![0];
  const area = `${line} L${lastX.toFixed(1)},${h} L0,${h} Z`;
  return { line, area, zeroY: yFor(0), lastY: pts[pts.length - 1]![1], lastX };
}

export function StrategyDeployPanel({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [strategies, setStrategies] = useLocalStore<DeployedStrategy[]>("mantle.strategy.deployed", []);
  const [pairIdx, setPairIdx] = useState(0);
  const [name, setName] = useState("RSI-Momentum-v1");
  const [busy, setBusy] = useState(false);
  const [deployErr, setDeployErr] = useState<string | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const tickRef = useRef(0);

  const vaultConfigured = isMantleVaultConfigured();

  useEffect(() => {
    const id = setInterval(() => {
      tickRef.current += 1;
      const tick = tickRef.current;
      setStrategies((prev) =>
        prev.map((s) => {
          if (s.status !== "active") return s;
          const seed = s.id + String(tick);
          const delta = deterministicScore(seed, -1.2, 2.1);
          const sigs = ["BUY +0.15", "HOLD", "SELL -0.08", "BUY +0.22", "HOLD"];
          const sig = sigs[Math.floor(deterministicScore(seed + "sig", 0, sigs.length - 0.01))];
          const pnl = Math.round((s.pnl + delta) * 100) / 100;
          return { ...s, ticks: s.ticks + 1, lastSignal: sig, pnl, pnlHistory: [...(s.pnlHistory ?? [0]), pnl].slice(-48) };
        })
      );
    }, 3000);
    return () => clearInterval(id);
  }, [setStrategies]);

  const selected = strategies.find((s) => s.id === selId) ?? strategies[0] ?? null;

  async function deploy() {
    setBusy(true);
    setDeployErr(null);
    await new Promise((r) => setTimeout(r, 600));
    const pair = ASSET_PAIRS[pairIdx];
    const id = "strat_" + hid(name + pair.label + String(Date.now()));
    const strategyObj = { id, name, pair: pair.label, deployedAt: new Date().toISOString() };

    let anchorTx: string | undefined;
    let anchorExplorer: string | undefined;
    if (vaultConfigured) {
      try {
        const decisionHashHex = await sha256Hex(JSON.stringify(strategyObj));
        const res = await vaultRecordDecision({ decisionHashHex });
        anchorTx = res.txHash;
        anchorExplorer = res.explorerUrl;
      } catch (e) {
        setDeployErr("Vault anchor failed: " + ((e as { message?: string }).message ?? "unknown"));
      }
    }

    setStrategies((prev) => [
      { id, name, asset: pair.label, status: "active", ticks: 0, lastSignal: "HOLD", pnl: 0, pnlHistory: [0], ts: now(), anchorTx, anchorExplorer },
      ...prev.slice(0, 7),
    ]);
    setSelId(id);
    emitReceipt({
      workspaceId: workspace.id,
      serviceId: "svc_mantle_alpha",
      serviceName: `Strategy Deploy · ${name}`,
      agentName: "Mantle Strategy Agent",
      payerWallet: "0xMntAg…aa1",
      providerWallet: "0xMntGW…1b2c",
      amount: 0.15,
      currency: "MNT",
      network: "mantle-mainnet",
      status: "verified",
      kind: "mantle.strategy.deploy",
      payload: { strategyId: id, name, pair: pair.label, anchorTx },
    });
    setBusy(false);
  }

  function toggleStatus(id: string) {
    setStrategies((prev) =>
      prev.map((s) => s.id === id ? { ...s, status: s.status === "active" ? "paused" : "active" } : s)
    );
  }

  const CW = 560, CH = 150;
  const chart = selected ? pnlChartPaths(selected.pnlHistory ?? [0], CW, CH) : null;
  const up = (selected?.pnl ?? 0) >= 0;
  const chartColor = up ? "#0FBF7A" : "#e05";

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl">
          <span className="sq soft" style={{ color: "var(--accent-primary)" }}><Activity size={15} /></span>
          <div>
            <h3>Strategy sandbox</h3>
            <div className="sub">
              Deploy a strategy as a live agent and watch its PnL curve tick in real time · 0.15 MNT to activate
              {vaultConfigured ? " · anchors on Mantle vault" : ""}
            </div>
          </div>
        </div>
        {selected && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", lineHeight: 1.1 }}>
            <span style={{ fontSize: "1.4rem", fontWeight: 800, color: chartColor }}>{up ? "+" : ""}{selected.pnl.toFixed(2)}%</span>
            <span style={{ fontSize: ".62rem", color: "var(--text-secondary)" }}>{selected.name} · {selected.ticks} ticks</span>
          </div>
        )}
      </div>

      {/* Chart-first: big PnL curve for the selected strategy */}
      {selected && chart ? (
        <div style={{ padding: "0 16px 12px" }}>
          <svg width="100%" viewBox={`0 0 ${CW} ${CH}`} preserveAspectRatio="none" style={{ display: "block", borderRadius: 12, background: "var(--bg-2)", border: "1px solid var(--line-2)" }}>
            <defs>
              <linearGradient id="pnlfill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColor} stopOpacity="0.28" />
                <stop offset="100%" stopColor={chartColor} stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* zero line */}
            <line x1="0" y1={chart.zeroY} x2={CW} y2={chart.zeroY} stroke="var(--line-2)" strokeWidth="1" strokeDasharray="4 4" />
            <path d={chart.area} fill="url(#pnlfill)" />
            <path d={chart.line} fill="none" stroke={chartColor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={chart.lastX} cy={chart.lastY} r="3.5" fill={chartColor} />
          </svg>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 6, fontSize: ".72rem", color: "var(--text-secondary)" }}>
            <span>Pair <b style={{ color: "var(--ink)" }}>{selected.asset}</b></span>
            <span>Last signal <b style={{ color: "var(--ink)" }}>{selected.lastSignal}</b></span>
            <span>Peak <b style={{ color: "#0FBF7A" }}>+{Math.max(0, ...(selected.pnlHistory ?? [0])).toFixed(2)}%</b></span>
            <span>Trough <b style={{ color: "#e05" }}>{Math.min(0, ...(selected.pnlHistory ?? [0])).toFixed(2)}%</b></span>
            {selected.anchorTx && <a href={selected.anchorExplorer ?? ""} target="_blank" rel="noreferrer" style={{ color: "var(--accent-primary)", display: "inline-flex", alignItems: "center", gap: 3 }}>anchored {selected.anchorTx.slice(0, 10)}… <ExternalLink size={10} /></a>}
          </div>
        </div>
      ) : (
        <div className="muted sm" style={{ padding: "0 16px 12px" }}>No live strategy yet — deploy one below to start the PnL curve.</div>
      )}

      {/* Compact strategy cards (not a table) */}
      {strategies.length > 0 && (
        <div style={{ padding: "0 16px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          {strategies.map((s) => {
            const sUp = s.pnl >= 0;
            const isSel = selected?.id === s.id;
            return (
              <div key={s.id} onClick={() => setSelId(s.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 11px", borderRadius: 10, border: `1px solid ${isSel ? "var(--accent-primary)" : "var(--line-2)"}`, background: isSel ? "color-mix(in srgb, var(--accent-primary) 7%, transparent)" : "var(--bg-2)", cursor: "pointer" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.status === "active" ? "#0FBF7A" : "var(--text-secondary)", flex: "none" }} />
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: ".82rem", fontWeight: 700 }}>{s.name}</div><div style={{ fontSize: ".68rem", color: "var(--text-secondary)" }}>{s.asset} · {s.ticks} ticks · {s.lastSignal}</div></div>
                <span style={{ flex: "none", fontWeight: 800, fontSize: ".88rem", color: sUp ? "#0FBF7A" : "#e05" }}>{sUp ? "+" : ""}{s.pnl.toFixed(2)}%</span>
                <button className="pill click" style={{ fontSize: 10, flex: "none" }} type="button" onClick={(e) => { e.stopPropagation(); toggleStatus(s.id); }}>
                  {s.status === "active" ? <><Pause size={10} /> Pause</> : <><Play size={10} /> Resume</>}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Deploy form */}
      <div style={{ padding: "0 16px 14px", borderTop: "1px solid var(--line-2)", paddingTop: 12 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {ASSET_PAIRS.map((p, i) => (
            <button key={p.label} className={"pill click" + (pairIdx === i ? " on" : "")} type="button" onClick={() => setPairIdx(i)}>{p.label}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
          <label className="field-label" style={{ flex: 1, minWidth: 180 }}>Strategy name<input className="field" value={name} onChange={(e) => setName(e.currentTarget.value)} /></label>
          <button className="btn btn-acc btn-sm" type="button" onClick={deploy} disabled={busy}>
            {busy ? <Loader2 size={13} className="wallet-spin" /> : <Zap size={13} />}
            {busy ? "Deploying…" : "Deploy live (0.15 MNT)"}
          </button>
        </div>
        {!vaultConfigured && (
          <div className="muted sm" style={{ marginTop: 8 }}>Set <code>VITE_MANTLE_VAULT_ADDRESS</code> to anchor strategy decisions on-chain.</div>
        )}
        {deployErr && <div style={{ marginTop: 8, fontSize: 11, color: "#e05" }}>{deployErr}</div>}
      </div>
    </div>
  );
}

// ── 2. Yield Projection Calculator ───────────────────────────────────────────

const YIELD_ASSETS = [
  { label: "mETH", apy: 3.9, color: "#0FBF7A" },
  { label: "USDY", apy: 5.1, color: "#4DA2FF" },
  { label: "T-BILL RWA", apy: 4.83, color: "#F5A623" },
  { label: "RWA Basket", apy: 6.2, color: "#9D85FF" },
];

const WINDOWS = [30, 90, 180, 365];

type YieldProj = {
  id: string;
  asset: string;
  amount: number;
  windowDays: number;
  apy: number;
  projectedUsd: number;
  ts: string;
};

export function YieldProjectionCalc({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [projections, setProjections] = useLocalStore<YieldProj[]>("mantle.yield.projections", []);
  const [assetIdx, setAssetIdx] = useState(0);
  const [windowIdx, setWindowIdx] = useState(1);
  const [amount, setAmount] = useState(1000);
  const [busy, setBusy] = useState(false);

  const asset = YIELD_ASSETS[assetIdx];
  const days = WINDOWS[windowIdx];

  const points = Array.from({ length: 7 }, (_, i) => {
    const d = (days / 6) * i;
    return amount * (1 + (asset.apy / 100) * (d / 365));
  });
  const maxPt = Math.max(...points);

  async function project() {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 500));
    const projected = Math.round(amount * (1 + (asset.apy / 100) * (days / 365)) * 100) / 100;
    const p: YieldProj = {
      id: hid(asset.label + String(amount) + String(days) + String(Date.now())),
      asset: asset.label, amount, windowDays: days, apy: asset.apy, projectedUsd: projected, ts: now(),
    };
    setProjections((prev) => [p, ...prev.slice(0, 7)]);
    emitReceipt({
      workspaceId: workspace.id,
      serviceId: "svc_mantle_yield",
      serviceName: `Yield Projection · ${asset.label}`,
      agentName: "Mantle Yield Agent",
      payerWallet: "0xMntAg…aa1",
      providerWallet: "0xMntGW…1b2c",
      amount: 0.02,
      currency: "MNT",
      network: "mantle-mainnet",
      status: "verified",
      kind: "mantle.yield.projection",
      payload: { asset: asset.label, principal: amount, days, apy: asset.apy, projected },
    });
    setBusy(false);
  }

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl">
          <span className="sq soft" style={{ color: "var(--accent-primary)" }}><TrendingUp size={15} /></span>
          <div>
            <h3>Yield Projection Calculator</h3>
            <div className="sub">Project mETH · USDY · T-BILL RWA · RWA Basket returns · 0.02 MNT / calc</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {YIELD_ASSETS.map((a, i) => (
          <button
            key={a.label}
            className={"pill click" + (assetIdx === i ? " on" : "")}
            type="button"
            onClick={() => setAssetIdx(i)}
            style={assetIdx === i ? { background: a.color + "33", color: a.color } : {}}
          >
            {a.label} {a.apy}%
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <label className="field-label">
          Principal (USD)
          <input className="field" type="number" min={100} step={100} value={amount} onChange={(e) => setAmount(Number(e.currentTarget.value))} />
        </label>
        <label className="field-label">
          Window
          <select className="field" value={windowIdx} onChange={(e) => setWindowIdx(Number(e.currentTarget.value))}>
            {WINDOWS.map((d, i) => <option key={d} value={i}>{d}d</option>)}
          </select>
        </label>
      </div>

      {/* Sparkline bar chart */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 52, marginBottom: 10 }}>
        {points.map((v, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <div style={{
              width: "100%", height: Math.max(4, (v / maxPt) * 44),
              background: asset.color, borderRadius: 3, opacity: 0.7 + i * 0.04,
            }} />
            <span style={{ fontSize: 8, color: "var(--text-secondary)" }}>
              {i === 0 ? "now" : `${Math.round((days / 6) * i)}d`}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 12 }}>
        <span>APY <b style={{ color: asset.color }}>{asset.apy}%</b></span>
        <span>Projected <b>${(amount * (1 + (asset.apy / 100) * (days / 365))).toFixed(2)}</b></span>
        <span>Gain <b style={{ color: "var(--green)" }}>+${(amount * (asset.apy / 100) * (days / 365)).toFixed(2)}</b></span>
      </div>

      <button className="btn btn-acc btn-sm" type="button" onClick={project} disabled={busy}>
        {busy ? <Loader2 size={13} className="wallet-spin" /> : <BarChart3 size={13} />}
        {busy ? "Projecting…" : "Save projection (0.02 MNT)"}
      </button>

      {projections.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="svc-table__scroll">
            <table className="svc-table">
              <thead><tr><th>Asset</th><th>Principal</th><th>Window</th><th>APY</th><th>Projected</th><th>Time</th></tr></thead>
              <tbody>
                {projections.map((p) => (
                  <tr key={p.id}>
                    <td>{p.asset}</td>
                    <td className="svc-table__num">${p.amount.toLocaleString()}</td>
                    <td className="svc-table__num">{p.windowDays}d</td>
                    <td className="svc-table__num">{p.apy}%</td>
                    <td className="svc-table__num" style={{ color: "var(--green)" }}>${p.projectedUsd.toFixed(2)}</td>
                    <td style={{ fontSize: 10 }}>{p.ts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 3. Whale Alert Feed — real Mantle RPC ───────────────────────────────────

type WhaleAlert = {
  id: string;
  asset: string;
  amount: string;
  wallet: string;
  action: string;
  usdValue: number;
  blockNumber: number;
  txHash: string;
  ts: string;
};

// ERC-20 Transfer topic
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

async function mantleRpc(method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(MANTLE_RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const j = (await res.json()) as { result?: unknown; error?: { message: string } };
  if (j.error) throw new Error(j.error.message);
  return j.result;
}

async function fetchWhaleTransfers(fromBlock: string, toBlock: string, minUsd: number): Promise<WhaleAlert[]> {
  // eth_getLogs for mETH ERC-20 Transfer events
  const logs = (await mantleRpc("eth_getLogs", [{
    address: METH_ADDRESS,
    topics: [TRANSFER_TOPIC],
    fromBlock,
    toBlock,
  }])) as Array<{
    blockNumber: string;
    transactionHash: string;
    topics: string[];
    data: string;
  }>;

  const alerts: WhaleAlert[] = [];
  for (const log of logs) {
    if (!log.data || log.data === "0x") continue;
    // mETH has 18 decimals; 1 mETH ≈ $3500 rough estimate for threshold
    const rawAmount = BigInt(log.data);
    const amountEth = Number(rawAmount) / 1e18;
    const usdValue = Math.round(amountEth * 3500);
    if (usdValue < minUsd) continue;

    const from = "0x" + (log.topics[1] ?? "").slice(26);
    const to = "0x" + (log.topics[2] ?? "").slice(26);
    const blockNum = parseInt(log.blockNumber, 16);
    alerts.push({
      id: "whale_" + log.transactionHash.slice(0, 16),
      asset: "mETH",
      amount: amountEth.toFixed(4),
      wallet: `${from.slice(0, 6)}…${from.slice(-4)}`,
      action: "Transfer",
      usdValue,
      blockNumber: blockNum,
      txHash: log.transactionHash,
      ts: now(),
    });
    if (alerts.length >= 10) break;
  }
  return alerts;
}

export function WhaleAlertFeed({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [alerts, setAlerts] = useLocalStore<WhaleAlert[]>("mantle.whale.alerts", []);
  const [running, setRunning] = useState(false);
  const [minUsd, setMinUsd] = useState(100000);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const minUsdRef = useRef(minUsd);
  const latestBlockRef = useRef<number | null>(null);
  useEffect(() => { minUsdRef.current = minUsd; }, [minUsd]);

  async function pollOnce() {
    setFetchErr(null);
    try {
      const tipHex = (await mantleRpc("eth_blockNumber", [])) as string;
      const tip = parseInt(tipHex, 16);
      // Look back 1 block; on first run look back 5
      const from = latestBlockRef.current != null
        ? latestBlockRef.current + 1
        : tip - 5;
      if (from > tip) return; // no new blocks yet
      const fromHex = "0x" + from.toString(16);
      const toHex = "0x" + tip.toString(16);
      const newAlerts = await fetchWhaleTransfers(fromHex, toHex, minUsdRef.current);
      latestBlockRef.current = tip;
      if (newAlerts.length > 0) {
        setAlerts((prev) => [...newAlerts, ...prev].slice(0, 50));
      }
    } catch (e) {
      setFetchErr((e as { message?: string }).message ?? "RPC error");
    }
  }

  function start() {
    setRunning(true);
    latestBlockRef.current = null;
    emitReceipt({
      workspaceId: workspace.id,
      serviceId: "svc_mantle_alpha",
      serviceName: "Whale Alert Subscription",
      agentName: "Mantle Alpha Agent",
      payerWallet: "0xMntAg…aa1",
      providerWallet: "0xMntGW…1b2c",
      amount: 0.25,
      currency: "MNT",
      network: "mantle-mainnet",
      status: "verified",
      kind: "mantle.whale.subscribe",
      payload: { minUsd },
    });
    void pollOnce();
    intervalRef.current = setInterval(() => { void pollOnce(); }, 12000); // ~1 Mantle block
  }

  function stop() {
    setRunning(false);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl">
          <span className="sq soft" style={{ color: "var(--accent-primary)" }}><Bell size={15} /></span>
          <div>
            <h3>Whale Alert Feed</h3>
            <div className="sub">Stream large mETH transfers from Mantle mainnet RPC · real eth_getLogs · subscribe for 0.25 MNT</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {running
            ? <button className="btn btn-ghost btn-sm" type="button" onClick={stop}><BellOff size={13} /> Stop</button>
            : <button className="btn btn-acc btn-sm" type="button" onClick={start}><Bell size={13} /> Subscribe</button>
          }
          {running && (
            <span className="chip" style={{ background: "var(--green-soft)", color: "var(--green)", fontSize: 10 }}>LIVE</span>
          )}
        </div>
      </div>

      <label className="field-label" style={{ marginBottom: 12 }}>
        Min USD value
        <input className="field" type="number" step={10000} value={minUsd} onChange={(e) => setMinUsd(Number(e.currentTarget.value))} disabled={running} />
      </label>

      {fetchErr && (
        <div style={{ marginBottom: 8, fontSize: 11, color: "#e05", padding: "6px 10px", background: "#e0500a11", borderRadius: 6 }}>
          RPC error: {fetchErr}
        </div>
      )}

      {alerts.length === 0 && !running && (
        <div className="muted sm" style={{ padding: "10px 0" }}>Subscribe to stream real whale mETH transfers from Mantle mainnet.</div>
      )}

      {alerts.length > 0 && (
        <div className="svc-table__scroll">
          <table className="svc-table">
            <thead><tr><th>Action</th><th>Asset</th><th>Amount</th><th>USD Value</th><th>Block</th><th>Wallet</th><th>Tx</th><th>Time</th></tr></thead>
            <tbody>
              {alerts.slice(0, 20).map((a) => (
                <tr key={a.id}>
                  <td>
                    <span className="chip" style={{ background: "var(--accent-primary)22", color: "var(--accent-primary)", fontSize: 10 }}>
                      {a.action}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, fontSize: 11 }}>{a.asset}</td>
                  <td className="svc-table__num">{a.amount}</td>
                  <td className="svc-table__num" style={{ color: "var(--accent-primary)" }}>
                    ${(a.usdValue / 1000).toFixed(0)}K
                  </td>
                  <td style={{ fontSize: 10, fontFamily: "monospace" }}>#{a.blockNumber.toLocaleString()}</td>
                  <td style={{ fontSize: 10, color: "var(--text-secondary)" }}>{a.wallet}</td>
                  <td>
                    <a href={`https://explorer.mantle.xyz/tx/${a.txHash}`} target="_blank" rel="noreferrer"
                      style={{ fontSize: 10, color: "var(--accent-primary)", display: "flex", alignItems: "center", gap: 3 }}>
                      {a.txHash.slice(0, 10)}… <ExternalLink size={10} />
                    </a>
                  </td>
                  <td style={{ fontSize: 10 }}>{a.ts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
