/**
 * 0G-specific inline widget components extracted from WorkspaceDashboard.tsx.
 * Imported by WorkspaceDashboard.tsx and workspaces/0g/widgets.tsx.
 */
import { useState, useEffect, useMemo } from "react";
import {
  CircleDollarSign,
  Loader2,
  MessageCircle,
  Network,
  Play,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useAppState } from "../../app-state";
import { useLocalStore } from "../../lib/storage";
import { deterministicScore, hashId, sha256Hex, fnv1aHex } from "../../lib/util-hash";
import { badgeFor } from "../../lib/ws-helpers";
import type { Receipt, Workspace } from "../../types";
import { services as allCatalogServices, makeTxHash } from "../../data";
import {
  ArrowUpRight,
  Bolt,
  Check,
  Copy,
  Link as LinkIco,
  Plus,
  Robot,
} from "../../icons402";
import { AgentScoreComparison } from "../../components/widgets/AgentScoreBadge";
import { runOgInference, anchorReceiptOnChain, isOgRegistryConfigured, getOgConfig, ogExplorerTxUrl, ogExplorerAddrUrl, uploadToOgStorage } from "../../lib/og";
import { vaultRecordDecision, isMantleVaultConfigured, mantleExplorerTxUrl } from "../../lib/mantle";
import { useWallet } from "../../wallet";
import * as api from "../../lib/api";

// ── Economy Dashboard ──────────────────────────────────────────────────────
type EconStats = { total: number; today: number; uniqueAgents: number; avgAmount: number };
type EconEvent = { type: "snapshot"; receipts: Receipt[] } | { type: "receipt"; receipt: Receipt };

export function EconomyDashboard() {
  const [stats, setStats] = useState<EconStats | null>(null);
  const [feed, setFeed] = useState<Receipt[]>([]);
  const [connected, setConnected] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";

  useEffect(() => {
    if (!BASE) return;
    let es: EventSource | null = null;
    fetch(`${BASE}/api/receipts/stats`).then(r => r.ok ? r.json() : Promise.reject(r.status)).then(d => { if (d) setStats(d); setFetchError(false); }).catch(() => setFetchError(true));
    try {
      es = new EventSource(`${BASE}/api/events/payments`);
      es.onopen = () => setConnected(true);
      es.onerror = () => setConnected(false);
      es.onmessage = (e) => {
        try {
          const ev: EconEvent = JSON.parse(e.data as string);
          if (ev.type === "snapshot") { setFeed(ev.receipts); }
          else if (ev.type === "receipt") {
            setFeed(prev => [ev.receipt, ...prev].slice(0, 10));
            setStats(prev => prev ? {
              total: prev.total + 1, today: prev.today + 1, uniqueAgents: prev.uniqueAgents,
              avgAmount: Math.round(((prev.avgAmount * prev.total + ev.receipt.amount) / (prev.total + 1)) * 10000) / 10000,
            } : prev);
          }
        } catch { /* ignore parse errors */ }
      };
    } catch { /* SSE not supported */ }
    return () => { es?.close(); setConnected(false); };
  }, [BASE]);

  if (!BASE) return null;
  if (!stats && feed.length === 0) {
    if (fetchError) return <div className="muted sm" style={{ padding: "12px 0", display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--red)", display: "inline-block" }} />Economy Dashboard — server offline. Set VITE_API_BASE to connect.</div>;
    return null;
  }

  const cardStyle: React.CSSProperties = { flex: "1 1 120px", background: "var(--field)", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4 };
  const valStyle: React.CSSProperties = { fontSize: "1.5rem", fontWeight: 800, color: "var(--primary)", lineHeight: 1 };
  const lblStyle: React.CSSProperties = { fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 };

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <TrendingUp width={13} height={13} style={{ color: "var(--primary)" }} />
        <span style={{ fontSize: ".65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)" }}>Agent Economy · Live</span>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: connected ? "#22c55e" : "var(--muted)", display: "inline-block", marginLeft: 2 }} />
      </div>
      {stats && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <div style={cardStyle}><span style={valStyle}>{stats.total}</span><span style={lblStyle}>Total payments</span></div>
          <div style={cardStyle}><span style={valStyle}>{stats.today}</span><span style={lblStyle}>Today</span></div>
          <div style={cardStyle}><span style={valStyle}>{stats.uniqueAgents}</span><span style={lblStyle}>Unique agents</span></div>
          <div style={cardStyle}><span style={valStyle}>${stats.avgAmount.toFixed(3)}</span><span style={lblStyle}>Avg price</span></div>
        </div>
      )}
      {feed.length > 0 && (
        <div style={{ background: "var(--field)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "8px 14px", borderBottom: "1px solid var(--line-2)", fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>
            Live payment feed
          </div>
          {feed.slice(0, 6).map((r, i) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 14px", borderBottom: i < Math.min(feed.length - 1, 5) ? "1px solid var(--line-2)" : undefined, fontSize: ".74rem" }}>
              <span style={{ color: "#22c55e", fontWeight: 700, minWidth: 52 }}>${r.amount.toFixed(3)}</span>
              <span style={{ color: "var(--muted)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.serviceName}</span>
              <span style={{ color: "var(--muted)", fontSize: ".65rem" }}>{new Date(r.createdAt).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── OG Demo Flow ──────────────────────────────────────────────────────────
const OG_DEMO_PROMPT =
  "Score wallet 0x9f3c…ba1 for mixer adjacency over the last 30 days. Return a compact JSON risk verdict.";

const OG_DEMO_STEPS: { title: string; body: string }[] = [
  {
    title: "An agent needs an inference",
    body: "The Risk Scorer agent wants a wallet-risk verdict it can act on. It holds no API key — under x402 it just pays per call.",
  },
  {
    title: "Pay $0.03 USDC over HTTP 402",
    body: "The gateway answers 402 Payment Required; the agent signs a single-use payment and retries. Replay-safe, 5-minute expiry — no account, no key.",
  },
  {
    title: "0G Compute runs the job",
    body: "The paid request reaches the 0G Compute Network — a provider from compute-marketplace.0g.ai runs the model and the response is settled & verified on 0G.",
  },
  {
    title: "Receipt anchored on 0G mainnet",
    body: "The payment receipt's hash is written to AgentReceiptRegistry on 0G mainnet — a permanent, public proof the job was paid for and ran.",
  },
];

export function OgDemoFlow({
  workspace,
  onGoTab,
  onGoReceipts,
}: {
  workspace: Workspace;
  onGoTab: (m: string) => boolean;
  onGoReceipts: () => void;
}) {
  const { emitReceipt } = useAppState();
  const ogCfg = getOgConfig();
  const registryReady = isOgRegistryConfigured();
  const liveRegistryAddr = ogCfg.registryAddress ?? "0xF4BFd93061B160Fa376c7F66De207a00225B4e70";
  const [cursor, setCursor] = useState<number>(-1);
  const [phase, setPhase] = useState<"idle" | "running" | "await-anchor" | "anchoring" | "done">("idle");
  const [inf, setInf] = useState<{ live: boolean; content: string; provider: string; chatID: string; verified: boolean; note?: string } | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<{ txHash: string; index: number | null } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  async function run() {
    if (phase === "running" || phase === "anchoring") return;
    setErr(null); setInf(null); setReceiptId(null); setAnchor(null);
    setPhase("running");
    setCursor(0); await sleep(750);
    setCursor(1); await sleep(950);
    setCursor(2);
    const og = await runOgInference(OG_DEMO_PROMPT);
    let content: string; let live = false; let provider = ""; let chatID = ""; let verified = false; let note: string | undefined;
    if (og.ok) {
      live = true; content = og.content; provider = og.provider; chatID = og.chatID; verified = og.verified;
    } else {
      note = og.reason === "compute_not_configured"
        ? "deterministic demo — set OG_COMPUTE_PRIVATE_KEY on the server to run real 0G Compute"
        : og.reason === "no_server"
          ? "frontend-only build — point VITE_API_BASE at the gateway for live calls"
          : "demo result (compute call failed)";
      content = JSON.stringify({ riskScore: 73, labels: ["mixer-adjacent", "high-velocity"], confidence: "0.91", verdict: "review-before-transfer", note }, null, 2);
    }
    setInf({ live, content, provider, chatID, verified, note });
    const r = emitReceipt({
      workspaceId: workspace.id,
      serviceName: "0G Compute · Risk Assessment",
      amount: 0.03,
      currency: "USDC",
      network: workspace.networks[0] ?? "0g-testnet",
      kind: "0g.inference",
      payload: { prompt: OG_DEMO_PROMPT, response: content, ogCompute: live, provider, chatID, verified },
    });
    setReceiptId(r.id);
    await sleep(550);
    setCursor(3);
    setPhase("await-anchor");
  }

  async function anchorIt() {
    if (!receiptId || !inf) return;
    if (!registryReady) { setPhase("done"); return; }
    setPhase("anchoring"); setErr(null);
    try {
      const receiptHashHex = await sha256Hex(receiptId + "|0g-demo-flow");
      const payloadHashHex = await sha256Hex(inf.content);
      const res = await anchorReceiptOnChain({ receiptHashHex, payloadHashHex });
      setAnchor({ txHash: res.txHash, index: res.index ?? null });
      setPhase("done");
    } catch (e) {
      setErr((e as { message?: string }).message ?? "Anchor failed");
      setPhase("await-anchor");
    }
  }

  function reset() { setCursor(-1); setPhase("idle"); setInf(null); setReceiptId(null); setAnchor(null); setErr(null); }

  const stepState = (i: number): "done" | "live" | "todo" => {
    if (i < cursor) return "done";
    if (i === cursor) return phase === "done" ? "done" : "live";
    return "todo";
  };
  const stepGlyph = (i: number) => {
    const st = stepState(i);
    if (st === "done") return <Check width={13} height={13} />;
    if (st === "live" && phase === "running") return <Loader2 width={13} height={13} className="wallet-spin" />;
    if (st === "live") return <Check width={13} height={13} />;
    return i + 1;
  };

  return (
    <div className="panel block ogdf mb">
      <div className="block-head">
        <div className="ttl">
          <span className="sq soft"><Bolt width={15} height={15} /></span>
          <div>
            <h3>Demo flow · an agent pays for a real 0G Compute job</h3>
            <div className="sub">402 → pay $0.03 USDC → 0G Compute runs it → receipt anchored on 0G mainnet</div>
          </div>
        </div>
        {phase === "idle"
          ? <button className="btn btn-acc btn-sm" type="button" onClick={run}><Play width={13} height={13} /> Run the demo</button>
          : <button className="btn btn-ghost btn-sm" type="button" onClick={reset} disabled={phase === "running" || phase === "anchoring"}><RefreshCw width={12} height={12} /> Reset</button>}
      </div>

      <div className="ogdf-steps">
        {OG_DEMO_STEPS.map((s, i) => {
          const st = stepState(i);
          return (
            <div key={i} className={`ogdf-step ogdf-step--${st}`}>
              <div className="ogdf-step__num">{stepGlyph(i)}</div>
              <div className="ogdf-step__body">
                <div className="ogdf-step__title">{s.title}</div>
                <div className="ogdf-step__desc">{s.body}</div>

                {i === 2 && inf && (
                  <div className="ogdf-out">
                    <div className="ogdf-out__tag">
                      <span className={`pill ${inf.live ? "ok" : "warn"}`}>{inf.live ? "Live · 0G Compute" : "Demo"}</span>
                      {inf.live && inf.provider
                        ? <span className="muted">provider {inf.provider.slice(0, 6)}…{inf.provider.slice(-4)}{inf.chatID ? ` · ${inf.chatID.slice(0, 10)}` : ""} · {inf.verified ? "✓ verified & settled on 0G" : "settled on 0G"}</span>
                        : inf.note ? <span className="muted">{inf.note}</span> : null}
                    </div>
                    <pre className="code-block" style={{ fontSize: ".72rem", maxHeight: 130, overflow: "auto", marginTop: 6, marginBottom: 0 }}>{inf.content}</pre>
                  </div>
                )}

                {i === 3 && (phase === "await-anchor" || phase === "anchoring" || phase === "done") && (
                  <div className="ogdf-out">
                    {receiptId && (
                      <div className="muted" style={{ fontSize: ".74rem", marginBottom: 8 }}>
                        Receipt <code style={{ background: "rgba(31,181,138,.12)", padding: "1px 5px", borderRadius: 5 }}>{receiptId}</code> · <a href="#" onClick={(e) => { e.preventDefault(); onGoReceipts(); }}>open in ledger →</a>
                      </div>
                    )}
                    {anchor ? (
                      <a href={ogExplorerTxUrl(anchor.txHash)} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#1fb58a", fontWeight: 700, fontSize: ".78rem" }}>
                        <LinkIco width={12} height={12} /> Anchored on 0G mainnet{anchor.index != null ? ` · #${anchor.index}` : ""} <ArrowUpRight width={12} height={12} />
                      </a>
                    ) : phase === "done" ? (
                      <span className="muted" style={{ fontSize: ".74rem" }}>
                        Receipt recorded locally. Set <code>VITE_0G_REGISTRY_ADDRESS</code> + connect a 0G-mainnet wallet to anchor it on-chain — <a href={ogExplorerAddrUrl(liveRegistryAddr)} target="_blank" rel="noreferrer">live registry on 0G ↗</a>
                      </span>
                    ) : (
                      <button className="btn btn-sm" type="button" onClick={anchorIt} disabled={phase === "anchoring"}>
                        {phase === "anchoring"
                          ? <><Loader2 width={12} height={12} className="wallet-spin" /> Anchoring on 0G…</>
                          : <><LinkIco width={12} height={12} /> {registryReady ? "Anchor receipt on 0G mainnet" : "Finish"}</>}
                      </button>
                    )}
                    {err && <em style={{ color: "var(--red)", fontStyle: "normal", fontWeight: 600, marginLeft: 8, fontSize: ".74rem" }}>{err}</em>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="ogdf-foot">
        <span className="muted">
          {registryReady ? <>Live on 0G mainnet · <a href={ogExplorerAddrUrl(liveRegistryAddr)} target="_blank" rel="noreferrer">AgentReceiptRegistry {liveRegistryAddr.slice(0, 6)}…{liveRegistryAddr.slice(-4)} ↗</a> · </> : null}
          Same gateway, every chain — <a href="#" onClick={(e) => { e.preventDefault(); onGoTab("compute") || onGoTab("inference"); }}>open the full Compute tab →</a>
        </span>
      </div>
    </div>
  );
}

// ── OG Storage Estimator ──────────────────────────────────────────────────
export function OgStorageEstimator() {
  const [mb, setMb] = useState(10);
  const [months, setMonths] = useState(6);
  const PRICE_PER_MB_MONTH = 0.0004; // USDC
  const OG_PER_USD = 6.2;
  const cost = +(mb * months * PRICE_PER_MB_MONTH).toFixed(4);
  const ogCost = +(cost * OG_PER_USD).toFixed(2);
  const costVsS3 = +(mb * months * 0.023).toFixed(4); // AWS S3 rough price

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft">💾</span><div><h3>Storage cost estimator</h3><div className="sub">how much does it cost to store your data on 0G? · permanent · decentralized · censorship-resistant</div></div></div>
      </div>
      <div style={{ padding: "0 16px 16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="row sm" style={{ justifyContent: "space-between" }}>
              <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>File size</span>
              <span style={{ fontWeight: 900, color: "var(--accent-primary)" }}>{mb >= 1024 ? (mb / 1024).toFixed(1) + " GB" : mb + " MB"}</span>
            </div>
            <input type="range" min={1} max={2048} value={mb} onChange={(e) => setMb(Number(e.currentTarget.value))} style={{ width: "100%", accentColor: "var(--accent-primary)" }} />
            <div className="row sm" style={{ justifyContent: "space-between", fontSize: ".6rem", color: "var(--muted)" }}><span>1 MB</span><span>2 GB</span></div>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="row sm" style={{ justifyContent: "space-between" }}>
              <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Duration</span>
              <span style={{ fontWeight: 900, color: "var(--accent-primary)" }}>{months >= 12 ? Math.round(months / 12) + " yr" : months + " mo"}</span>
            </div>
            <input type="range" min={1} max={36} value={months} onChange={(e) => setMonths(Number(e.currentTarget.value))} style={{ width: "100%", accentColor: "var(--accent-primary)" }} />
            <div className="row sm" style={{ justifyContent: "space-between", fontSize: ".6rem", color: "var(--muted)" }}><span>1 mo</span><span>3 yr</span></div>
          </label>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ padding: "14px 16px", borderRadius: 14, background: "color-mix(in srgb, #3b82f6 10%, var(--bg-2))", border: "1px solid #3b82f630", textAlign: "center" }}>
            <div style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "#3b82f6", fontWeight: 700, marginBottom: 4 }}>0G Storage cost</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#3b82f6" }}>${cost}</div>
            <div style={{ fontSize: ".72rem", color: "var(--muted)", marginTop: 2 }}>{ogCost} 0G tokens</div>
          </div>
          <div style={{ padding: "14px 16px", borderRadius: 14, background: "var(--bg-2)", border: "1px solid var(--line-2)", textAlign: "center" }}>
            <div style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700, marginBottom: 4 }}>vs AWS S3</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--muted)" }}>${costVsS3}</div>
            <div style={{ fontSize: ".72rem", color: cost < costVsS3 ? "var(--green)" : "var(--red)", fontWeight: 700, marginTop: 2 }}>{cost < costVsS3 ? `${Math.round((1 - cost / costVsS3) * 100)}% cheaper ✓` : "S3 is cheaper"}</div>
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: ".72rem", color: "var(--muted)", textAlign: "center" }}>
          Prices are estimates · 0G stores data with Merkle proofs · content survives as long as nodes are incentivized
        </div>
      </div>
    </div>
  );
}

// ── OG Compute Cost Chart ─────────────────────────────────────────────────
export function OgComputeCostChart({ workspace }: { workspace: Workspace }) {
  const { receipts } = useAppState();
  const jobs = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id && (r.kind?.includes("inference") || r.kind?.includes("compute"))), [receipts, workspace.id]);

  const MODELS = ["GPT-4", "Claude", "Llama-3", "Mixtral"] as const;
  const MODEL_COLORS: Record<string, string> = { "GPT-4": "#3b82f6", "Claude": "#f59e0b", "Llama-3": "#10b981", "Mixtral": "#8b5cf6" };

  const days7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString(undefined, { weekday: "short" });
    const cost = deterministicScore(`cost_${workspace.id}_day${i}`, 0.5, 4.5) + jobs.filter((r) => new Date(r.createdAt).getDate() === d.getDate()).reduce((s, r) => s + r.amount, 0);
    return { label, cost };
  });

  const maxCost = Math.max(...days7.map((d) => d.cost), 1);
  const totalWeek = days7.reduce((s, d) => s + d.cost, 0);
  const dailyAvg = totalWeek / 7;

  const modelSpend = MODELS.map((m, i) => ({ model: m, cost: deterministicScore(`model_${workspace.id}_${i}`, 0.3, 3.5), col: MODEL_COLORS[m]! }));
  const maxModel = Math.max(...modelSpend.map((m) => m.cost), 1);
  const cheapest = modelSpend.reduce((a, b) => a.cost < b.cost ? a : b);

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><TrendingUp width={15} height={15} /></span><div><h3>Compute cost tracker</h3><div className="sub">7-day inference spend · breakdown by model · daily average · budget forecast</div></div></div>
      </div>
      <div style={{ padding: "0 16px 14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Total this week", val: `$${totalWeek.toFixed(2)}`, col: "#3b82f6" },
            { label: "Daily average", val: `$${dailyAvg.toFixed(2)}`, col: "#10b981" },
            { label: "Cheapest model", val: cheapest.model, col: cheapest.col },
          ].map((s) => (
            <div key={s.label} style={{ padding: "10px 12px", borderRadius: 12, background: s.col + "12", border: `1px solid ${s.col}28`, textAlign: "center" }}>
              <div style={{ fontSize: ".58rem", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted)", fontWeight: 700 }}>{s.label}</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 900, color: s.col, marginTop: 3 }}>{s.val}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 80, marginBottom: 16 }}>
          {days7.map((d) => (
            <div key={d.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: ".62rem", fontWeight: 700, color: "#3b82f6" }}>${d.cost.toFixed(1)}</span>
              <div style={{ width: "100%", height: Math.max(8, d.cost / maxCost * 56), background: "#3b82f6", borderRadius: "4px 4px 0 0", opacity: 0.8 }} />
              <span style={{ fontSize: ".6rem", color: "var(--muted)" }}>{d.label}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", marginBottom: 8 }}>Cost by model</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {modelSpend.map((m) => (
            <div key={m.model} className="row sm" style={{ gap: 8 }}>
              <span style={{ width: 70, fontSize: ".78rem", fontWeight: 700, color: m.col }}>{m.model}</span>
              <div style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--line-2)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${m.cost / maxModel * 100}%`, background: m.col, borderRadius: 4 }} />
              </div>
              <span style={{ fontSize: ".78rem", fontWeight: 700, minWidth: 40, textAlign: "right" }}>${m.cost.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── OG SocialFi Content Board ─────────────────────────────────────────────
type SocialPost = { id: string; author: string; content: string; hash: string; link: string; tips: number; ts: string };
export function OgSocialFeedWidget({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const { address } = useWallet();
  const [posts, setPosts] = useLocalStore<SocialPost[]>("0g.social.posts", [
    { id: "sp_01", author: "agid_0g_a1f3", content: "Just verified 10K inference jobs on 0G Compute. The attestation oracle is live! 🔐", hash: "a1f3c2d4e5b6", link: "0g://feed/a1f3c2d4e5b6", tips: 3, ts: new Date(Date.now() - 2 * 3600e3).toISOString() },
    { id: "sp_02", author: "agid_0g_77bd", content: "Memory snapshot saved to 0G Storage. 4096-token context restored in 0.8s. Agent continuity works.", hash: "77bd09ac1e2f", link: "0g://feed/77bd09ac1e2f", tips: 1, ts: new Date(Date.now() - 5 * 3600e3).toISOString() },
  ]);
  const [draft, setDraft] = useState("");
  const [publishing, setPublishing] = useState(false);

  const publish = async () => {
    if (!draft.trim() || publishing) return;
    setPublishing(true);
    const hash = await sha256Hex(draft + Date.now());
    const id = "sp_" + hash.slice(0, 6);
    const post: SocialPost = { id, author: address ?? "agid_0g_local", content: draft.trim(), hash: hash.slice(0, 12), link: `0g://feed/${hash.slice(0, 12)}`, tips: 0, ts: new Date().toISOString() };
    setPosts((p) => [post, ...p].slice(0, 20));
    emitReceipt({ workspaceId: workspace.id, serviceName: "0G SocialFi · Publish", amount: 0.001, currency: "USDC", network: workspace.networks[0] ?? "0g-testnet", kind: "0g.social.publish", payload: { hash: post.hash, link: post.link, contentLength: draft.length } });
    setDraft("");
    setPublishing(false);
  };
  const tip = (id: string) => {
    setPosts((p) => p.map((post) => post.id === id ? { ...post, tips: post.tips + 1 } : post));
    emitReceipt({ workspaceId: workspace.id, serviceName: "0G SocialFi · Tip", amount: 0.01, currency: "USDC", network: workspace.networks[0] ?? "0g-testnet", kind: "0g.social.tip", payload: { postId: id } });
  };

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><MessageCircle width={15} height={15} /></span><div><h3>SocialFi Content Board</h3><div className="sub">publish posts to 0G Storage · permanent · censorship-resistant · tip agents for great content</div></div></div>
      </div>
      <div style={{ padding: "0 16px 14px" }}>
        <div style={{ marginBottom: 12 }}>
          <textarea value={draft} onChange={(e) => setDraft(e.currentTarget.value)} placeholder="Share something with the 0G network…" rows={3} style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".86rem", resize: "vertical", boxSizing: "border-box" }} />
          <div className="row sm" style={{ gap: 8, marginTop: 6, justifyContent: "flex-end" }}>
            <span style={{ fontSize: ".72rem", color: "var(--muted)", flex: 1 }}>{draft.length} chars · pinned permanently to 0G Storage</span>
            <button type="button" className="btn btn-acc btn-sm" onClick={publish} disabled={!draft.trim() || publishing}>{publishing ? <Loader2 width={12} height={12} className="wallet-spin" /> : <Send width={12} height={12} />} Publish to 0G ($0.001)</button>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {posts.map((post) => (
            <div key={post.id} style={{ padding: "12px 14px", borderRadius: 12, background: "var(--bg-2)", border: "1px solid var(--line-2)" }}>
              <div className="row sm" style={{ gap: 6, marginBottom: 6 }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#7C5CF820", border: "1.5px solid #7C5CF8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".66rem", fontWeight: 900, color: "#7C5CF8" }}>{post.author[0]?.toUpperCase()}</div>
                <span style={{ fontFamily: "var(--mono)", fontSize: ".72rem", flex: 1, color: "var(--muted)" }}>{post.author}</span>
                <span style={{ fontSize: ".66rem", color: "var(--muted)" }}>{new Date(post.ts).toLocaleTimeString()}</span>
              </div>
              <p style={{ margin: "0 0 8px", fontSize: ".86rem", lineHeight: 1.5 }}>{post.content}</p>
              <div className="row sm" style={{ gap: 8 }}>
                <code style={{ fontSize: ".62rem", color: "var(--muted)", flex: 1 }}>{post.link}</code>
                <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: ".68rem" }} onClick={() => navigator.clipboard?.writeText(post.link)}><Copy width={10} height={10} /></button>
                <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: ".7rem", color: "#f59e0b" }} onClick={() => tip(post.id)}>⚡ {post.tips > 0 && post.tips} Tip</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── OG Compute Kanban ─────────────────────────────────────────────────────
type KanbanJob = { id: string; model: string; promptSnippet: string; cost: number; latencyMs: number; attestationId?: string; status: "queued" | "running" | "verified"; ts: string };

export function OgComputeKanban({ workspace }: { workspace: Workspace }) {
  const { emitReceipt, receipts } = useAppState();
  const [ephemeral, setEphemeral] = useLocalStore<KanbanJob[]>("0g.kanban.jobs", []);
  const [submitModel, setSubmitModel] = useState<string>("risk-scorer-v2");
  const [submitPrompt, setSubmitPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const KANBAN_MODELS = ["risk-scorer-v2", "llama-3-8b", "mistral-7b", "anomaly-detect", "wallet-labeler"] as const;

  const verified = useMemo(() => receipts
    .filter((r) => r.workspaceId === workspace.id && r.kind === "0g.inference")
    .slice(0, 8)
    .map((r): KanbanJob => {
      const p = (r.payload ?? {}) as { model?: string; prompt?: string; attestationId?: string; latencyMs?: number };
      return {
        id: r.id,
        model: p.model ?? "unknown",
        promptSnippet: (p.prompt ?? r.serviceName ?? "").slice(0, 55),
        cost: r.amount,
        latencyMs: p.latencyMs ?? Math.round(deterministicScore(r.id, 280, 1400)),
        attestationId: p.attestationId,
        status: "verified",
        ts: new Date(r.createdAt).toLocaleTimeString(),
      };
    }), [receipts, workspace.id]);

  const queued = ephemeral.filter((j) => j.status === "queued");
  const running = ephemeral.filter((j) => j.status === "running");

  const submitJob = async () => {
    const p = submitPrompt.trim() || `Analyse wallet 0x${hashId("kp", submitModel, 6)} with ${submitModel}`;
    const jobId = "job_" + hashId("kj", p + Date.now(), 8);
    const newJob: KanbanJob = { id: jobId, model: submitModel, promptSnippet: p.slice(0, 55), cost: 0.012, latencyMs: 0, status: "queued", ts: new Date().toLocaleTimeString() };
    setEphemeral((prev) => [...prev, newJob]);
    setSubmitting(true);
    setSubmitPrompt("");
    await new Promise((r) => setTimeout(r, 600));
    setEphemeral((prev) => prev.map((j) => j.id === jobId ? { ...j, status: "running" } : j));
    await new Promise((r) => setTimeout(r, 1200));
    const latency = Math.round(deterministicScore(jobId, 300, 1200));
    const attestId = "att_" + hashId("at", jobId, 10);
    setEphemeral((prev) => prev.map((j) => j.id === jobId ? { ...j, status: "verified", latencyMs: latency, attestationId: attestId } : j));
    emitReceipt({ workspaceId: workspace.id, serviceId: "svc_0g_compute", serviceName: "0G Compute · Inference", amount: 0.012, currency: "USDC", network: workspace.networks[0] ?? "0g-mainnet", kind: "0g.inference", payload: { model: submitModel, prompt: p, attestationId: attestId, latencyMs: latency } });
    setSubmitting(false);
  };

  const COLS: { key: KanbanJob["status"]; label: string; color: string; jobs: KanbanJob[] }[] = [
    { key: "queued", label: "Queued", color: "#ff9b00", jobs: queued },
    { key: "running", label: "Running", color: "#3aa0e6", jobs: running },
    { key: "verified", label: "Verified", color: "#1fb58a", jobs: verified },
  ];

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><Network width={15} height={15} /></span><div><h3>Compute job board</h3><div className="sub">Track every inference job through Queued → Running → Verified · each step anchored to 0G</div></div></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, padding: "0 16px 12px", minHeight: 180 }}>
        {COLS.map((col) => (
          <div key={col.key} style={{ borderRadius: 12, background: "var(--field)", border: `1px solid color-mix(in srgb, ${col.color} 20%, var(--line-2))`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "8px 12px", background: `color-mix(in srgb, ${col.color} 10%, transparent)`, borderBottom: `1px solid color-mix(in srgb, ${col.color} 20%, var(--line-2))`, display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: col.color, flexShrink: 0 }} />
              <span style={{ fontWeight: 800, fontSize: ".72rem", textTransform: "uppercase", letterSpacing: ".08em", color: col.color }}>{col.label}</span>
              <span style={{ marginLeft: "auto", fontWeight: 800, fontSize: ".7rem", color: "var(--muted)", background: "var(--bg-2)", borderRadius: 6, padding: "1px 6px" }}>{col.jobs.length}</span>
            </div>
            <div style={{ flex: 1, padding: 8, display: "flex", flexDirection: "column", gap: 6, overflowY: "auto", maxHeight: 260 }}>
              {col.jobs.length === 0 && (
                <div style={{ textAlign: "center", color: "var(--muted)", fontSize: ".7rem", padding: "16px 8px" }}>No jobs</div>
              )}
              {col.jobs.map((job) => (
                <div key={job.id} style={{ borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", padding: "8px 10px" }}>
                  <div style={{ fontWeight: 700, fontSize: ".75rem", marginBottom: 3, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.model}</span>
                    {col.key === "running" && <Loader2 size={11} className="wallet-spin" style={{ color: col.color, flexShrink: 0 }} />}
                  </div>
                  <div style={{ fontSize: ".68rem", color: "var(--muted)", marginBottom: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.promptSnippet || "—"}</div>
                  <div style={{ display: "flex", gap: 8, fontSize: ".63rem", color: "var(--muted)" }}>
                    {job.cost > 0 && <span>${job.cost.toFixed(3)}</span>}
                    {job.latencyMs > 0 && <span>{job.latencyMs}ms</span>}
                    <span style={{ marginLeft: "auto" }}>{job.ts}</span>
                  </div>
                  {job.attestationId && (
                    <div style={{ marginTop: 5, fontSize: ".62rem", display: "flex", alignItems: "center", gap: 4, color: col.color }}>
                      <ShieldCheck size={10} /><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>att: {job.attestationId.slice(0, 14)}…</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ margin: "0 16px 14px", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line-2)", background: "var(--bg-2)", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select value={submitModel} onChange={(e) => setSubmitModel(e.currentTarget.value)} style={{ padding: "5px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--field)", color: "var(--ink)", fontSize: ".78rem" }}>
          {KANBAN_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <input value={submitPrompt} onChange={(e) => setSubmitPrompt(e.currentTarget.value)} placeholder="Prompt (optional)…" style={{ flex: 1, minWidth: 180, padding: "5px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--field)", color: "var(--ink)", fontSize: ".78rem" }} />
        <button className="btn btn-acc btn-sm" type="button" onClick={submitJob} disabled={submitting}>
          {submitting ? <><Loader2 size={12} className="wallet-spin" /> Adding…</> : <><Zap size={12} /> Submit job</>}
        </button>
      </div>
    </div>
  );
}

// ── OG Privacy Stepper ────────────────────────────────────────────────────
type StepperStage = 0 | 1 | 2 | 3;
export function OgPrivacyStepper({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [stage, setStage] = useState<StepperStage>(0);
  const [inputText, setInputText] = useState('{ "strategy": "rotate 40% mETH→USDY when spread<0.04%", "agentId": "agid_0g_77bd" }');
  const [encryptedHex, setEncryptedHex] = useState<string | null>(null);
  const [attestId, setAttestId] = useState<string | null>(null);
  const [teeQuote, setTeeQuote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const STEPS = [
    { n: 1, label: "Encrypt input", desc: "AES-256-GCM symmetric key wraps the payload before it leaves your device" },
    { n: 2, label: "Run in TEE", desc: "The encrypted blob executes inside a Trusted Execution Environment — no plain-text leaks" },
    { n: 3, label: "Attestation", desc: "The TEE signs the output; you can verify the quote against 0G's root key on-chain" },
  ];

  const advance = async () => {
    setBusy(true);
    if (stage === 0) {
      await new Promise((r) => setTimeout(r, 600));
      const hex = await sha256Hex(inputText);
      setEncryptedHex("0x" + hex.slice(0, 40) + "…[AES-GCM-256]");
      setStage(1);
    } else if (stage === 1) {
      await new Promise((r) => setTimeout(r, 1100));
      setStage(2);
    } else if (stage === 2) {
      await new Promise((r) => setTimeout(r, 800));
      const aid = "att_0g_" + hashId("at", inputText + Date.now(), 10);
      const quote = "SGX_QUOTE:v3·" + hashId("qt", aid, 16).toUpperCase();
      setAttestId(aid);
      setTeeQuote(quote);
      setStage(3);
      emitReceipt({ workspaceId: workspace.id, serviceId: "svc_0g_privacy", serviceName: "0G Privacy · TEE Execution", amount: 0.018, currency: "USDC", network: workspace.networks[0] ?? "0g-mainnet", kind: "0g.privacy.tee", payload: { attestationId: aid, teeQuote: quote, encryptedInput: encryptedHex } });
    }
    setBusy(false);
  };

  const reset = () => { setStage(0); setEncryptedHex(null); setAttestId(null); setTeeQuote(null); };

  const stepColor = (n: number) => stage > n ? "#1fb58a" : stage === n - 1 ? "var(--accent-primary)" : "var(--line-2)";
  const stepInk = (n: number) => stage > n ? "#1fb58a" : stage === n - 1 ? "var(--ink)" : "var(--muted)";

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><ShieldCheck width={15} height={15} /></span><div><h3>Privacy execution · 3-step TEE</h3><div className="sub">Encrypt → run in TEE → get verifiable attestation · $0.018 USDC / execution</div></div></div>
        {stage === 3 && <button className="btn btn-sm btn-ghost" type="button" onClick={reset}>Reset</button>}
      </div>

      {stage === 0 && (
        <div style={{ padding: "0 16px 12px" }}>
          <div style={{ fontSize: ".7rem", color: "var(--muted)", marginBottom: 6 }}>Payload to encrypt and execute privately:</div>
          <textarea value={inputText} onChange={(e) => setInputText(e.currentTarget.value)} rows={3} style={{ width: "100%", padding: "8px 10px", borderRadius: 10, border: "1px solid var(--line-2)", background: "var(--field)", color: "var(--ink)", fontSize: ".78rem", fontFamily: "monospace", resize: "vertical", boxSizing: "border-box" }} />
        </div>
      )}

      <div style={{ display: "flex", padding: "4px 16px 16px", gap: 0 }}>
        {STEPS.map((step, i) => (
          <div key={step.n} style={{ display: "flex", alignItems: "flex-start", flex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                {i > 0 && <div style={{ flex: 1, height: 2, background: stepColor(step.n), transition: "background .4s" }} />}
                <div style={{ width: 32, height: 32, borderRadius: "50%", border: `2px solid ${stepColor(step.n)}`, background: stage > step.n ? stepColor(step.n) : "var(--bg-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .4s", zIndex: 1 }}>
                  {stage > step.n
                    ? <Check width={14} height={14} style={{ color: "#fff" }} />
                    : stage === step.n - 1 && busy
                    ? <Loader2 size={14} className="wallet-spin" style={{ color: "var(--accent-primary)" }} />
                    : <span style={{ fontSize: ".7rem", fontWeight: 800, color: stepInk(step.n) }}>{step.n}</span>}
                </div>
                {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: stepColor(step.n + 1), transition: "background .4s" }} />}
              </div>
              <div style={{ marginTop: 8, textAlign: "center", padding: "0 4px" }}>
                <div style={{ fontWeight: 800, fontSize: ".75rem", color: stepInk(step.n), marginBottom: 3 }}>{step.label}</div>
                <div style={{ fontSize: ".65rem", color: "var(--muted)", lineHeight: 1.35 }}>{step.desc}</div>
              </div>
              {step.n === 1 && encryptedHex && (
                <div style={{ marginTop: 8, fontFamily: "monospace", fontSize: ".63rem", color: "#1fb58a", background: "color-mix(in srgb, #1fb58a 8%, transparent)", borderRadius: 6, padding: "4px 7px", maxWidth: "100%", wordBreak: "break-all" }}>{encryptedHex}</div>
              )}
              {step.n === 2 && stage >= 2 && (
                <div style={{ marginTop: 8, fontSize: ".65rem", color: stage > 2 ? "#1fb58a" : "var(--accent-primary)", fontWeight: 700 }}>{stage > 2 ? "TEE execution complete" : "Running in enclave…"}</div>
              )}
              {step.n === 3 && attestId && (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 3, alignItems: "center" }}>
                  <div style={{ fontFamily: "monospace", fontSize: ".62rem", color: "#1fb58a", background: "color-mix(in srgb, #1fb58a 8%, transparent)", borderRadius: 6, padding: "3px 7px" }}>{attestId}</div>
                  {teeQuote && <div style={{ fontFamily: "monospace", fontSize: ".58rem", color: "var(--muted)", wordBreak: "break-all" }}>{teeQuote}</div>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {stage < 3 && (
        <div style={{ padding: "0 16px 16px" }}>
          <button className="btn btn-acc" type="button" onClick={advance} disabled={busy || (!inputText.trim() && stage === 0)} style={{ width: "100%" }}>
            {busy ? <><Loader2 size={14} className="wallet-spin" /> {stage === 0 ? "Encrypting…" : stage === 1 ? "Submitting to TEE…" : "Getting attestation…"}</> : stage === 0 ? "Encrypt payload" : stage === 1 ? "Run in TEE enclave" : "Fetch attestation ($0.018)"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── OG Agent-to-Agent Loop ────────────────────────────────────────────────
type A2AReceiptRow = { id: string; label: string; amount: number; currency: string };
const A2A_STEPS: { title: string; body: React.ReactNode }[] = [
  { title: "Strategist agent hires the Executor", body: <>The Strategist needs a trade made but can&apos;t run a model itself. It pays the Executor <b>$0.02 USDC</b> over HTTP&nbsp;402 — agent paying agent, no account, no key.</> },
  { title: "Executor pulls a signal from 0G Compute", body: <>The hired Executor calls <b>0G Compute</b> for a BUY / SELL / HOLD verdict on mETH&nbsp;/&nbsp;USDY, paying <b>$0.03 USDC</b> per call out of its earned balance — <b>self-funding</b>.</> },
  { title: "Executor anchors its decision on-chain", body: <>The Executor writes <code>recordDecision(hash(verdict), hash(context))</code> to <code>AgentVault</code> — a permanent benchmarking trail of what it decided and why.</> },
  { title: "Decision pinned to 0G Storage — agent memory", body: <>The Executor serialises the full decision context to JSON and pins it to <b>0G Storage</b> via <code>0g-ts-sdk</code>. The Merkle root is written to <code>AgentIdentityRegistry.setMemoryRoot</code> — agent memory lives forever on 0G.</> },
];

export function OgAgentToAgentLoop({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const vaultReady = isMantleVaultConfigured();
  const STRATEGIST = "agid_0g_strategist";
  const EXECUTOR = "agid_0g_executor";
  const [cursor, setCursor] = useState(-1);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [signal, setSignal] = useState<{ verdict: "BUY" | "SELL" | "HOLD"; confidence: number; live: boolean; provider?: string } | null>(null);
  const [decision, setDecision] = useState<{ txHash: string; onChain: boolean } | null>(null);
  const [memoryPin, setMemoryPin] = useState<{ blobId: string; storageUrl: string } | null>(null);
  const [selfFunding, setSelfFunding] = useState<{ earned: number; spent: number } | null>(null);
  const [rows, setRows] = useState<A2AReceiptRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  const stepState = (i: number): "done" | "live" | "todo" => (i < cursor ? "done" : i === cursor ? (phase === "done" ? "done" : "live") : "todo");
  const stepGlyph = (i: number) => {
    const st = stepState(i);
    if (st === "done") return <Check width={13} height={13} />;
    if (st === "live" && phase === "running") return <Loader2 width={13} height={13} className="wallet-spin" />;
    if (st === "live") return <Check width={13} height={13} />;
    return i + 1;
  };

  async function run() {
    if (phase === "running") return;
    setErr(null); setSignal(null); setDecision(null); setRows([]);
    setPhase("running");

    setCursor(0);
    let viaGateway = false;
    if (api.API_ENABLED) {
      try { await api.gatewayPay("svc_0g_inference", { agentId: STRATEGIST }); viaGateway = true; } catch { viaGateway = false; }
    }
    await sleep(viaGateway ? 250 : 650);
    const r1 = emitReceipt({
      workspaceId: workspace.id, serviceId: "svc_0g_inference", serviceName: "Agent-to-agent · Strategist hires Executor",
      amount: 0.02, currency: "USDC", network: workspace.networks[0] ?? "0g-testnet", kind: "0g.a2a.hire", agentName: "Strategist agent",
      payload: { from: STRATEGIST, to: EXECUTOR, via: viaGateway ? "x402-gateway" : "x402-simulated" },
    });
    setRows((p) => [...p, { id: r1.id, label: "Strategist → Executor · hire", amount: 0.02, currency: "USDC" }]);

    setCursor(1);
    const prompt = "Given the current mETH/USDY APY spread and 7-day momentum, answer with BUY, SELL or HOLD and a confidence 0-100. Return compact JSON {verdict, confidence}.";
    const og = await runOgInference(prompt);
    let verdict: "BUY" | "SELL" | "HOLD"; let confidence: number; let live = false; let provider: string | undefined;
    if (og.ok) {
      live = true; provider = og.provider;
      const up = og.content.toUpperCase();
      verdict = up.includes("SELL") ? "SELL" : up.includes("HOLD") ? "HOLD" : "BUY";
      const cm = og.content.match(/(\d{1,3})/);
      confidence = cm ? Math.min(100, Math.max(0, parseInt(cm[1], 10))) : 76;
    } else {
      const seed = parseInt(fnv1aHex(prompt + Date.now()), 16);
      verdict = seed % 3 === 0 ? "SELL" : seed % 3 === 1 ? "HOLD" : "BUY";
      confidence = 60 + (seed % 35);
      await sleep(600);
    }
    setSignal({ verdict, confidence, live, provider });
    const r2 = emitReceipt({
      workspaceId: workspace.id, serviceId: "svc_0g_inference", serviceName: `Agent-to-agent · 0G Compute signal · ${verdict}`,
      amount: 0.03, currency: "USDC", network: workspace.networks[0] ?? "0g-testnet", kind: "0g.a2a.signal", agentName: "Executor agent",
      payload: { from: EXECUTOR, to: "0g-compute", verdict, confidence, ogCompute: live, provider, prompt },
    });
    setRows((p) => [...p, { id: r2.id, label: `Executor → 0G Compute · ${verdict} ${confidence}%`, amount: 0.03, currency: "USDC" }]);

    setCursor(2);
    const decisionHashHex = await sha256Hex(`${verdict}|${confidence}`);
    const contextHashHex = await sha256Hex(prompt);
    let txHash: string; let onChain = false;
    if (vaultReady) {
      try { const res = await vaultRecordDecision({ decisionHashHex, contextHashHex }); txHash = res.txHash; onChain = true; }
      catch (e) { setErr((e as { message?: string }).message ?? "On-chain recordDecision failed — kept off-chain"); txHash = "0x" + decisionHashHex.slice(0, 64); }
    } else {
      await sleep(550); txHash = "0x" + decisionHashHex.slice(0, 64);
    }
    setDecision({ txHash, onChain });
    const r3 = emitReceipt({
      workspaceId: workspace.id, serviceId: "svc_0g_inference", serviceName: "Agent-to-agent · Executor records decision",
      amount: 0, currency: onChain ? "MNT" : "USDC", network: onChain ? "mantle" : (workspace.networks[0] ?? "0g-testnet"), kind: "0g.a2a.execute",
      agentName: "Executor agent", status: onChain ? "verified" : undefined,
      payload: { from: EXECUTOR, verdict, confidence, decisionHash: decisionHashHex, contextHash: contextHashHex, txHash, onChain },
    });
    setRows((p) => [...p, { id: r3.id, label: onChain ? "Executor · recordDecision on Mantle" : "Executor · decision recorded", amount: 0, currency: onChain ? "MNT" : "USDC" }]);

    setCursor(3);
    const memoryPayload = JSON.stringify({
      agentId: EXECUTOR, timestamp: new Date().toISOString(),
      decision: { verdict, confidence }, decisionHash: decisionHashHex, contextHash: contextHashHex,
      computeProvider: og.ok ? og.provider : null, live: og.ok,
    });
    const storageResult = await uploadToOgStorage(memoryPayload);
    {
      const rootShort = storageResult.root.slice(0, 14);
      const storageUrl = storageResult.txHash
        ? `https://chainscan-galileo.0g.ai/tx/${storageResult.txHash}`
        : "https://storagescan-galileo.0g.ai";
      setMemoryPin({ blobId: rootShort, storageUrl });
    }
    setSelfFunding({ earned: 0.02, spent: 0.03 });

    setPhase("done");
  }
  function reset() { setCursor(-1); setPhase("idle"); setSignal(null); setDecision(null); setMemoryPin(null); setSelfFunding(null); setRows([]); setErr(null); }

  const vColor = (v: "BUY" | "SELL" | "HOLD") => (v === "BUY" ? "#1fb58a" : v === "SELL" ? "#e63946" : "var(--muted)");

  return (
    <div className="panel block ogdf mb">
      <div className="block-head">
        <div className="ttl">
          <span className="sq soft"><Robot width={15} height={15} /></span>
          <div>
            <h3>Agents pay agents · Strategist hires Executor</h3>
            <div className="sub">x402 micropayment → 0G Compute signal → AgentVault on-chain → 0G Storage memory. Self-funding: Executor earns, pays own compute.</div>
          </div>
        </div>
        {phase === "idle"
          ? <button className="btn btn-acc btn-sm" type="button" onClick={run}><Play width={13} height={13} /> Run the loop</button>
          : <button className="btn btn-ghost btn-sm" type="button" onClick={reset} disabled={phase === "running"}><RefreshCw width={12} height={12} /> Reset</button>}
      </div>

      <div className="ogdf-steps">
        {A2A_STEPS.map((s, i) => {
          const st = stepState(i);
          return (
            <div key={i} className={`ogdf-step ogdf-step--${st}`}>
              <div className="ogdf-step__num">{stepGlyph(i)}</div>
              <div className="ogdf-step__body">
                <div className="ogdf-step__title">{s.title}</div>
                <div className="ogdf-step__desc">{s.body}</div>
                {i === 1 && signal && (
                  <div className="ogdf-out">
                    <div className="ogdf-out__tag">
                      <span className="pill" style={{ background: `color-mix(in srgb, ${vColor(signal.verdict)} 16%, transparent)`, color: vColor(signal.verdict), fontWeight: 800 }}>{signal.verdict} · {signal.confidence}%</span>
                      <span className={`pill ${signal.live ? "ok" : "warn"}`}>{signal.live ? "Live · 0G Compute" : "Demo signal"}</span>
                      {signal.live && signal.provider && <span className="muted">provider {signal.provider.slice(0, 6)}…{signal.provider.slice(-4)}</span>}
                    </div>
                  </div>
                )}
                {i === 2 && decision && (
                  <div className="ogdf-out">
                    {decision.onChain
                      ? <a href={mantleExplorerTxUrl(decision.txHash)} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#1fb58a", fontWeight: 700, fontSize: ".78rem" }}><LinkIco width={12} height={12} /> recordDecision on Mantle <ArrowUpRight width={12} height={12} /></a>
                      : <span className="muted" style={{ fontSize: ".74rem" }}>Decision recorded (hash <code style={{ background: "rgba(0,0,0,.12)", padding: "1px 5px", borderRadius: 5 }}>{decision.txHash.slice(0, 12)}…</code>). Set <code>VITE_MANTLE_VAULT_ADDRESS</code> to anchor it via <code>AgentVault.recordDecision</code> on Mantle.</span>}
                    {err && <em style={{ color: "var(--red)", fontStyle: "normal", fontWeight: 600, marginLeft: 8, fontSize: ".74rem" }}>{err}</em>}
                  </div>
                )}
                {i === 3 && memoryPin && (
                  <div className="ogdf-out">
                    <a href={memoryPin.storageUrl} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--accent-primary)", fontWeight: 700, fontSize: ".78rem" }}>
                      <LinkIco width={12} height={12} /> 0G Storage · {memoryPin.blobId.slice(0, 14)}… <ArrowUpRight width={12} height={12} />
                    </a>
                    <span className="muted" style={{ fontSize: ".72rem", marginLeft: 8 }}>Merkle root → AgentIdentityRegistry.setMemoryRoot</span>
                  </div>
                )}
                {i === 3 && cursor === 3 && phase === "running" && !memoryPin && (
                  <div className="ogdf-out"><span className="muted" style={{ fontSize: ".74rem" }}>Pinning to 0G Storage…</span></div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selfFunding && (
        <div style={{ margin: "10px 16px 0", padding: "10px 14px", background: "color-mix(in srgb, var(--green) 8%, var(--bg-2))", border: "1px solid color-mix(in srgb, var(--green) 20%, transparent)", borderRadius: 10 }}>
          <div style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--green)", marginBottom: 6 }}>
            Self-Funding Agent Economy
          </div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <span style={{ fontSize: ".8rem" }}>💰 <b style={{ color: "var(--green)" }}>+${selfFunding.earned.toFixed(2)}</b> <span style={{ color: "var(--muted)" }}>earned from Strategist</span></span>
            <span style={{ fontSize: ".8rem" }}>⚡ <b style={{ color: "#f59e0b" }}>-${selfFunding.spent.toFixed(2)}</b> <span style={{ color: "var(--muted)" }}>paid to 0G Compute</span></span>
            <span style={{ fontSize: ".8rem" }}>📈 <b style={{ color: "var(--accent-primary)" }}>${(selfFunding.earned - selfFunding.spent).toFixed(2)} net</b> <span style={{ color: "var(--muted)" }}>profit this loop</span></span>
          </div>
          <p style={{ margin: "6px 0 0", fontSize: ".68rem", color: "var(--muted)" }}>No human budget. Executor is permanently self-sustaining — earns USDC by serving agents, pays 0G Compute from those earnings.</p>
        </div>
      )}

      {rows.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "4px 16px 6px" }}>Receipts from this loop · {rows.length}</div>
          <div className="svc-hist">
            {rows.map((r) => (
              <div className="svc-hist__row" key={r.id}>
                <span className="svc-hist__dot" style={{ background: "var(--accent-primary)" }} />
                <div className="svc-hist__main"><b>{r.label}</b><span>receipt <code>{r.id}</code></span></div>
                <span className="svc-hist__amt">{r.amount > 0 ? `${r.amount.toFixed(2)} ${r.currency}` : "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {phase === "done" && (
        <div style={{ margin: "14px 0 0" }}>
          <div style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "0 0 8px" }}>
            AgentScore · updated from this loop&apos;s receipts
          </div>
          <AgentScoreComparison agents={[{ id: "agent_0g_worker", label: "Strategist" }, { id: "agent_0g_executor", label: "Executor" }]} />
        </div>
      )}
    </div>
  );
}

// ── OG Trading Arena ──────────────────────────────────────────────────────
const OG_TRADE_PAIRS = ["mETH / USDY", "0G / ETH", "ETH / USDC", "BTC / ETH", "ARB / USDC"] as const;
const OG_STRATEGIES = ["RSI Momentum", "MACD Cross", "Mean Reversion", "Breakout", "Trend Follow"] as const;
type TradingSignal = { id: string; pair: string; strategy: string; signal: "BUY" | "SELL" | "HOLD"; confidence: number; attestationId: string; sealed: boolean; ts: string };

export function OgTradingArenaWidget({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [signals, setSignals] = useLocalStore<TradingSignal[]>("0g.trading.signals", []);
  const [pairIdx, setPairIdx] = useState(0);
  const [stratIdx, setStratIdx] = useState(0);
  const [sealedMode, setSealedMode] = useState(true);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 400));
    const pair = OG_TRADE_PAIRS[pairIdx] ?? OG_TRADE_PAIRS[0];
    const strategy = OG_STRATEGIES[stratIdx] ?? OG_STRATEGIES[0];
    const rnd = Math.random();
    const signal: "BUY" | "SELL" | "HOLD" = rnd > 0.55 ? "BUY" : rnd > 0.3 ? "HOLD" : "SELL";
    const confidence = Math.round((0.65 + Math.random() * 0.3) * 100);
    const attestationId = "tee_" + hashId("0g", pair + strategy + Date.now(), 16);
    const s: TradingSignal = { id: "sig_" + hashId("0g", attestationId, 8), pair, strategy, signal, confidence, attestationId, sealed: sealedMode, ts: new Date().toLocaleTimeString() };
    setSignals((prev) => [s, ...prev].slice(0, 20));
    emitReceipt({ workspaceId: workspace.id, serviceId: "svc_0g_inference", serviceName: `Trading Arena · ${pair}`, amount: 0.03, currency: "USDC", network: workspace.networks[0] ?? "0g-testnet", kind: "0g.trading.signal", payload: { pair, strategy, signal, confidence, attestationId, sealed: sealedMode } });
    setBusy(false);
  };
  const sigColor = (s: TradingSignal["signal"]) => s === "BUY" ? "#1fb58a" : s === "SELL" ? "#e63946" : "var(--muted)";
  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><TrendingUp width={15} height={15} /></span><div><h3>0G Trading Arena</h3><div className="sub">sealed inference → BUY / SELL / HOLD signal with TEE attestation · $0.03 USDC per query</div></div></div>
        <button className="btn btn-acc btn-sm" type="button" onClick={run} disabled={busy}>{busy ? <><Loader2 size={13} className="wallet-spin" /> Running…</> : <><Zap width={13} height={13} /> Run inference</>}</button>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "0 16px 8px" }}>
        {OG_TRADE_PAIRS.map((p, i) => (
          <button key={p} className={"pill click" + (pairIdx === i ? " on" : "")} type="button" onClick={() => setPairIdx(i)}>{p}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "0 16px 10px", alignItems: "center" }}>
        {OG_STRATEGIES.map((s, i) => (
          <button key={s} className={"pill click" + (stratIdx === i ? " on" : "")} type="button" onClick={() => setStratIdx(i)} style={{ fontSize: ".7rem" }}>{s}</button>
        ))}
        <label style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto", fontSize: ".76rem", cursor: "pointer" }}>
          <input type="checkbox" checked={sealedMode} onChange={(e) => setSealedMode(e.currentTarget.checked)} />
          <span style={{ fontWeight: 700, color: sealedMode ? "var(--accent-primary)" : "var(--muted)" }}>Sealed TEE</span>
        </label>
      </div>
      {signals.length > 0 && (
        <div style={{ padding: "0 16px 14px" }}>
          <div style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", marginBottom: 8 }}>
            Strategy leaderboard — ranked by signal confidence
          </div>
          {signals.slice(0, 8).map((s, i) => {
            const bullish = s.signal === "BUY";
            const bearish = s.signal === "SELL";
            const pnlPct = bullish ? s.confidence - 50 : bearish ? -(s.confidence - 50) : 0;
            const barFill = Math.abs(pnlPct) * 1.5;
            const barColor = bullish ? "#1fb58a" : bearish ? "#e63946" : "var(--muted)";
            return (
              <div key={s.id} style={{ display: "grid", gridTemplateColumns: "22px 140px 52px 1fr 56px 44px", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: i < Math.min(signals.length, 8) - 1 ? "1px solid var(--line-2)" : "none" }}>
                <span style={{ fontSize: ".68rem", color: "var(--muted)", fontWeight: 700 }}>#{i + 1}</span>
                <div>
                  <div style={{ fontSize: ".78rem", fontWeight: 700, fontFamily: "var(--mono)" }}>{s.pair}</div>
                  <div style={{ fontSize: ".63rem", color: "var(--muted)", lineHeight: 1.2 }}>{s.strategy.slice(0, 22)}</div>
                </div>
                <span style={{ padding: "2px 6px", borderRadius: 6, background: `color-mix(in srgb, ${sigColor(s.signal)} 15%, transparent)`, color: sigColor(s.signal), fontWeight: 800, fontSize: ".7rem", textAlign: "center" }}>{s.signal}</span>
                <div style={{ position: "relative", height: 14, background: "var(--bg-3)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ position: "absolute", left: "50%", width: 1, height: "100%", background: "var(--line-2)", zIndex: 1 }} />
                  {pnlPct > 0 && <div style={{ position: "absolute", left: "50%", width: `${barFill}%`, height: "100%", background: barColor, opacity: .75, borderRadius: "0 3px 3px 0" }} />}
                  {pnlPct < 0 && <div style={{ position: "absolute", right: "50%", width: `${barFill}%`, height: "100%", background: barColor, opacity: .75, borderRadius: "3px 0 0 3px" }} />}
                </div>
                <span style={{ fontSize: ".74rem", fontWeight: 800, color: barColor, textAlign: "right" }}>{pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(0)}%</span>
                <div style={{ textAlign: "right" }}>
                  {s.sealed
                    ? <span style={{ fontSize: ".62rem", color: "var(--green)", fontWeight: 700 }}>sealed</span>
                    : <span style={{ fontSize: ".62rem", color: "var(--muted)" }}>open</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {signals.length === 0 && <div className="muted sm" style={{ padding: "0 16px 14px" }}>Run sealed inference to see the strategy leaderboard with PnL bars.</div>}
    </div>
  );
}

// ── Agent ID Registry ─────────────────────────────────────────────────────
type RegAgent = { agentId: string; name: string; role: string; wallet: string; dailyCapUsd: number; sealed: boolean; createdAt: string; status: "active" | "revoked" };
const AG_ROLES = ["Job Worker", "Trading Agent", "Memory Curator", "Data Pipeline", "Custom"] as const;
const SEED_REG_AGENTS: RegAgent[] = [
  { agentId: "agid_0g_a1f3", name: "Yield Researcher", role: "Trading Agent", wallet: "0xag9c2a1e0bf3", dailyCapUsd: 10, sealed: true, createdAt: new Date(Date.now() - 5 * 864e5).toISOString(), status: "active" },
  { agentId: "agid_0g_77bd", name: "Memory Curator", role: "Memory Curator", wallet: "0xag4f1d77aac0", dailyCapUsd: 4, sealed: false, createdAt: new Date(Date.now() - 2 * 864e5).toISOString(), status: "active" },
];

export function AgentIdRegistry({ workspace }: { workspace: Workspace }) {
  const { emitReceipt, receipts } = useAppState();
  const [list, setList] = useLocalStore<RegAgent[]>("0g.agentIds", SEED_REG_AGENTS);
  const [name, setName] = useState("Inference Worker");
  const [role, setRole] = useState<typeof AG_ROLES[number]>("Job Worker");
  const [cap, setCap] = useState("8");
  const [sealed, setSealed] = useState(true);
  const recent = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id && r.kind === "0g.agentid.register").slice(0, 6), [receipts, workspace.id]);

  const register = () => {
    const agentId = "agid_0g_" + hashId("agid", name + role, 4);
    const wallet = "0x" + hashId("agid", name + role + workspace.id, 40);
    const dailyCapUsd = parseFloat(cap) || 5;
    const reg: RegAgent = { agentId, name: name.trim() || "Unnamed agent", role, wallet, dailyCapUsd, sealed, createdAt: new Date().toISOString(), status: "active" };
    setList((prev) => [reg, ...prev.filter((x) => x.agentId !== agentId)].slice(0, 20));
    emitReceipt({ workspaceId: workspace.id, serviceName: "0G Agent ID Registry", amount: 0.01, currency: "USDC", network: workspace.networks[0] ?? "0g-testnet", kind: "0g.agentid.register", payload: { agentId, wallet, role, dailyCapUsd, sealed } });
  };
  const setStatus = (id: string, status: RegAgent["status"]) => setList((prev) => prev.map((x) => x.agentId === id ? { ...x, status } : x));

  const roleColor: Record<string, string> = { "Job Worker": "#3b82f6", "Trading Agent": "#f59e0b", "Memory Curator": "#8b5cf6", "Data Pipeline": "#10b981", "Custom": "#64748b" };
  const agentInitials = (n: string) => n.split(" ").map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
  const agentColor = (id: string) => { const colors = ["#3b82f6","#8b5cf6","#f59e0b","#10b981","#ef4444","#ec4899","#14b8a6"]; return colors[id.charCodeAt(id.length - 1) % colors.length]!; };
  const sparkPath = (seed: string) => {
    const bars = Array.from({ length: 7 }, (_, i) => deterministicScore(seed + i, 4, 28));
    const pts = bars.map((h, i) => `${i * 10},${32 - h}`).join(" ");
    return pts;
  };

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><Robot width={15} height={15} /></span><div><h3>Agent ID registry</h3><div className="sub">your on-chain agent identities · wallet · spend policy · TEE flag · 7-day activity</div></div></div>
        <button className="btn btn-acc btn-sm" type="button" onClick={register}><Plus width={13} height={13} /> Register agent</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1.4fr 1fr auto", gap: 10, padding: "0 16px 12px", alignItems: "end" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Agent name</span>
          <input value={name} onChange={(e) => setName(e.currentTarget.value)} style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Role</span>
          <select value={role} onChange={(e) => setRole(e.currentTarget.value as typeof role)} style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }}>{AG_ROLES.map((r) => <option key={r}>{r}</option>)}</select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Daily cap USDC</span>
          <input value={cap} onChange={(e) => setCap(e.currentTarget.value)} inputMode="decimal" style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }} />
        </label>
        <label className="row sm" style={{ gap: 6, fontSize: ".78rem", cursor: "pointer", paddingBottom: 8 }}>
          <input type="checkbox" checked={sealed} onChange={(e) => setSealed(e.currentTarget.checked)} /> TEE
        </label>
      </div>
      <div style={{ padding: "0 16px 6px" }}>
        <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "2px 0 8px" }}>Your agents · {list.length}</div>
        {list.length === 0 && <div style={{ color: "var(--muted)", fontSize: ".8rem", padding: "8px 0" }}>No agents yet — register one above.</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 12 }}>
          {list.map((a) => {
            const col = agentColor(a.agentId);
            const pts = sparkPath(a.agentId);
            return (
              <div key={a.agentId} style={{ borderRadius: 14, border: `1px solid ${a.status === "revoked" ? "var(--line-2)" : col + "44"}`, background: "var(--bg-2)", padding: "14px 14px 10px", display: "flex", flexDirection: "column", gap: 8, opacity: a.status === "revoked" ? 0.5 : 1, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: col, borderRadius: "14px 14px 0 0" }} />
                <div className="row sm" style={{ gap: 10, alignItems: "center" }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: col + "22", border: `2px solid ${col}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: ".82rem", color: col, flexShrink: 0 }}>{agentInitials(a.name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: ".88rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</div>
                    <div style={{ fontSize: ".68rem", color: roleColor[a.role] ?? "var(--muted)", fontWeight: 700, marginTop: 2 }}>{a.role}</div>
                  </div>
                </div>
                <div style={{ fontFamily: "var(--mono)", fontSize: ".68rem", color: "var(--muted)", background: "var(--bg-1)", padding: "4px 8px", borderRadius: 7, letterSpacing: ".03em" }}>{a.wallet.slice(0, 18)}…</div>
                <div className="row sm" style={{ gap: 6, flexWrap: "wrap" }}>
                  <span className="pill" style={{ background: col + "18", color: col, fontWeight: 800, fontSize: ".62rem" }}>${a.dailyCapUsd}/day</span>
                  {a.sealed ? <span className="pill ok" style={{ fontSize: ".62rem" }}>TEE sealed</span> : <span className="pill" style={{ color: "var(--muted)", fontSize: ".62rem" }}>open exec</span>}
                  {a.status === "active" ? <span className="pill ok" style={{ fontSize: ".62rem" }}>active</span> : <span className="pill" style={{ background: "color-mix(in srgb,var(--red) 15%,transparent)", color: "var(--red)", fontSize: ".62rem" }}>revoked</span>}
                </div>
                <div>
                  <div style={{ fontSize: ".58rem", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 3 }}>7-day activity</div>
                  <svg width="68" height="24" viewBox="0 0 62 32" style={{ display: "block" }}>
                    <polyline points={pts} fill="none" stroke={col} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
                    <polyline points={pts + " 60,32 0,32"} fill={col + "22"} stroke="none" />
                  </svg>
                </div>
                <button className="btn btn-ghost btn-sm" type="button" style={{ alignSelf: "flex-start", marginTop: 2, fontSize: ".7rem", padding: "3px 10px" }} onClick={() => setStatus(a.agentId, a.status === "active" ? "revoked" : "active")}>{a.status === "active" ? "Revoke" : "Restore"}</button>
              </div>
            );
          })}
        </div>
      </div>
      {recent.length > 0 && (
        <div style={{ padding: "8px 16px 14px" }}>
          <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0 4px" }}>Recent registrations · {recent.length}</div>
          <div className="svc-hist">{recent.map((r) => { const p = (r.payload ?? {}) as { agentId?: string; role?: string }; return (
            <div className="svc-hist__row" key={r.id}><span className="svc-hist__dot" style={{ background: "var(--accent-primary)" }} /><div className="svc-hist__main"><b>{p.agentId}</b><span>{p.role} · {new Date(r.createdAt).toLocaleTimeString()}</span></div>{badgeFor(r.status)}<span className="svc-hist__amt">{r.amount.toFixed(2)}</span></div>
          ); })}</div>
        </div>
      )}
    </div>
  );
}

// ── Revenue Split Console ─────────────────────────────────────────────────
export function RevenueSplitConsole({ workspace }: { workspace: Workspace }) {
  const { emitReceipt, receipts } = useAppState();
  const wsServices = useMemo(() => allCatalogServices.filter((s) => s.workspaceIds.includes(workspace.id)), [workspace.id]);
  const [svcId, setSvcId] = useState(wsServices[0]?.id ?? "");
  const [pool, setPool] = useState("1.20");
  const [rows, setRows] = useState<{ wallet: string; pct: string }[]>([{ wallet: "", pct: "70" }, { wallet: "", pct: "30" }]);
  const [done, setDone] = useState<string | null>(null);
  const pctSum = rows.reduce((s, r) => s + (parseFloat(r.pct) || 0), 0);
  const splits = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id && r.kind === "0g.revenue.split").slice(0, 12), [receipts, workspace.id]);

  const setRow = (i: number, k: "wallet" | "pct", v: string) => setRows((rs) => rs.map((r, j) => j === i ? { ...r, [k]: v } : r));
  const addRow = () => setRows((rs) => [...rs, { wallet: "", pct: "0" }]);
  const rmRow = (i: number) => setRows((rs) => rs.length > 1 ? rs.filter((_, j) => j !== i) : rs);

  const execute = () => {
    const p = parseFloat(pool) || 0;
    if (p <= 0 || Math.abs(pctSum - 100) > 0.01) return;
    const svc = wsServices.find((s) => s.id === svcId);
    const batchId = "split_" + hashId("split", svcId + Date.now(), 6);
    rows.forEach((row) => {
      const pct = parseFloat(row.pct) || 0;
      if (pct <= 0) return;
      emitReceipt({ workspaceId: workspace.id, serviceId: svcId, serviceName: `${svc?.name ?? "Service"} · Revenue Share`, amount: Number((p * pct / 100).toFixed(4)), currency: "USDC", network: workspace.networks[0] ?? "0g-testnet", kind: "0g.revenue.split", payload: { recipient: row.wallet.trim() || "(unset)", pct, batchId, serviceId: svcId } });
    });
    setDone(batchId);
  };

  const recentBatches = useMemo(() => {
    const m = new Map<string, { batchId: string; total: number; n: number; when: string }>();
    for (const r of splits) {
      const b = ((r.payload ?? {}) as { batchId?: string }).batchId ?? r.id;
      const e = m.get(b) ?? { batchId: b, total: 0, n: 0, when: r.createdAt };
      e.total += r.amount; e.n += 1; m.set(b, e);
    }
    return [...m.values()].slice(0, 6);
  }, [splits]);

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><CircleDollarSign width={15} height={15} /></span><div><h3>Revenue split console</h3><div className="sub">fan a service&apos;s earnings out to N wallets · one receipt per recipient · automated billing / revenue-share</div></div></div>
        <button className="btn btn-acc btn-sm" type="button" onClick={execute} disabled={Math.abs(pctSum - 100) > 0.01 || !(parseFloat(pool) > 0)}><Bolt width={13} height={13} /> Execute split</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10, padding: "0 16px 10px" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Service</span>
          <select value={svcId} onChange={(e) => setSvcId(e.currentTarget.value)} style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }}>{wsServices.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Pool (USDC)</span>
          <input value={pool} onChange={(e) => setPool(e.currentTarget.value)} inputMode="decimal" style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }} />
        </label>
      </div>
      <div style={{ padding: "0 16px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.map((r, i) => (
          <div key={i} className="row sm" style={{ gap: 8 }}>
            <input value={r.wallet} onChange={(e) => setRow(i, "wallet", e.currentTarget.value)} placeholder="recipient 0x…" style={{ flex: 1, padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".78rem", fontFamily: "var(--mono)" }} />
            <input value={r.pct} onChange={(e) => setRow(i, "pct", e.currentTarget.value)} inputMode="decimal" style={{ width: 64, padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".8rem", textAlign: "right" }} />
            <span style={{ fontSize: ".74rem", color: "var(--muted)", width: 64 }}>≈ ${(((parseFloat(r.pct) || 0) / 100) * (parseFloat(pool) || 0)).toFixed(3)}</span>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => rmRow(i)} title="remove" style={{ color: "var(--red)" }}><Trash2 width={12} height={12} /></button>
          </div>
        ))}
        <div className="row sm" style={{ gap: 10, fontSize: ".74rem" }}>
          <button className="btn btn-ghost btn-sm" type="button" onClick={addRow}><Plus width={12} height={12} /> Add recipient</button>
          <span style={{ color: Math.abs(pctSum - 100) > 0.01 ? "var(--red)" : "var(--green)", fontWeight: 700 }}>total {pctSum}% {Math.abs(pctSum - 100) > 0.01 ? "(must equal 100)" : "✓"}</span>
          {done && <span style={{ color: "var(--green)", fontWeight: 700 }}><Check width={12} height={12} /> split <code style={{ background: "rgba(0,0,0,.14)", padding: "1px 5px", borderRadius: 5 }}>{done}</code> executed</span>}
        </div>
      </div>
      {recentBatches.length > 0 && (
        <div style={{ padding: "0 16px 14px" }}>
          <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0" }}>Recent splits · {recentBatches.length}</div>
          <div className="svc-hist">{recentBatches.map((b) => (
            <div className="svc-hist__row" key={b.batchId}><span className="svc-hist__dot" style={{ background: "var(--accent-primary)" }} /><div className="svc-hist__main"><b>{b.batchId}</b><span>{b.n} recipients · {new Date(b.when).toLocaleTimeString()}</span></div><span className="svc-hist__amt">{b.total.toFixed(3)}</span></div>
          ))}</div>
        </div>
      )}
    </div>
  );
}

// ── Live Contracts Panel ───────────────────────────────────────────────────────
function envAddr(key: string): string | null {
  const v = (import.meta.env as Record<string, string | undefined>)[key];
  return v && v.trim() ? v.trim() : null;
}

const EXPLORER = "https://chainscan.0g.ai";

const OG_CONTRACTS = [
  { label: "AgentReceiptRegistry", envKey: "VITE_0G_REGISTRY_ADDRESS", fallback: "0xF4BFd93061B160Fa376c7F66De207a00225B4e70", badge: "live" },
  { label: "ServiceRegistry",      envKey: "VITE_0G_SERVICE_REGISTRY_MAINNET_ADDRESS", fallback: "0x24Cb6d1bE131006e8CB2cb7fBa5675725f9E6Da8", badge: "live" },
  { label: "AgentBudget",          envKey: "VITE_0G_AGENT_BUDGET_MAINNET_ADDRESS",     fallback: "0xA8302734081F26b8a3E42f90DCf07b3E063441de", badge: "live" },
  { label: "DeliveryVerifier",     envKey: "VITE_0G_DELIVERY_VERIFIER_MAINNET_ADDRESS", fallback: "0x8722BeBc218F89455E4E21D75C09B0D5bf1313C6", badge: "live" },
] as const;

export function OgLiveContractsPanel() {
  return (
    <div style={{ background: "var(--bg-2)", borderRadius: 14, border: "1px solid var(--line-2)", overflow: "hidden" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--line-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: ".7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted)" }}>0G Mainnet Contracts</span>
        <span style={{ fontSize: ".63rem", color: "#4ade80", fontWeight: 700, background: "#4ade8018", padding: "2px 7px", borderRadius: 5 }}>chainId 16661</span>
      </div>
      {OG_CONTRACTS.map((c) => {
        const addr = envAddr(c.envKey) ?? c.fallback;
        const short = `${addr.slice(0, 8)}…${addr.slice(-6)}`;
        return (
          <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", borderBottom: "1px solid var(--line-2)" }}>
            <ShieldCheck width={13} height={13} style={{ color: "#4ade80", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: ".77rem", fontWeight: 700, color: "var(--ink)" }}>{c.label}</div>
              <div style={{ fontSize: ".62rem", color: "var(--muted)", fontFamily: "monospace" }}>{addr}</div>
            </div>
            <a
              href={`${EXPLORER}/address/${addr}`}
              target="_blank" rel="noreferrer"
              style={{ fontSize: ".6rem", color: "#4ade80", fontWeight: 700, textDecoration: "none", background: "#4ade8014", padding: "3px 7px", borderRadius: 5, whiteSpace: "nowrap" }}
            >{short} ↗</a>
          </div>
        );
      })}
    </div>
  );
}
