import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CircleDollarSign,
  Code as CodeIcon,
  Code2,
  CreditCard,
  Download,
  FileText,
  Globe,
  HelpCircle,
  LayoutDashboard,
  Lightbulb,
  Loader2,
  MessageCircle,
  Moon,
  Network,
  Pause,
  Play,
  Radio,
  ReceiptText,
  RefreshCw,
  Search,
  Send,
  Settings as SettingsIcon,
  ShieldCheck,
  ShoppingCart,
  Sun,
  Trash2,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { ConnectWalletButton, WalletLiveStrip, useWallet, sendErc20Transfer, parseUnits } from "../wallet";
import { useAppState } from "../app-state";
import { useLocalStore } from "../lib/storage";
import { deterministicScore, hashId, sha256Hex, fnv1aHex } from "../lib/util-hash";
import type { Agent, Receipt, ReceiptStatus, Service, Theme, Workspace, WorkspaceId } from "../types";
import { serviceById, workspaceMetrics, makeServiceId, services as allCatalogServices, agents as allAgents } from "../data";
import { BarSpark, WeekBars } from "../charts402";
import {
  ArrowRight,
  ArrowUpRight,
  Bolt,
  CAT_ICON,
  Check,
  Code,
  Copy,
  Link as LinkIco,
  Plus,
  Receipt as RIco,
  Robot,
  Shield,
  X,
  catColor,
} from "../icons402";
import { InferenceJobRunner } from "./widgets/zero-g/InferenceJobRunner";
import { StoragePinWidget } from "./widgets/zero-g/StoragePinWidget";
import { ProofVerifier } from "./widgets/zero-g/ProofVerifier";
import { MantleAgentIdentity, MantleVaultPanel, MantleBudgetPanel } from "./widgets/mantle/MantleOnchain";
import { ArbitrumEscrowPanel } from "./widgets/arbitrum/ArbitrumEscrowPanel";
import {
  WalrusStorageWidget,
  MoveContractViewer,
  SuiNftMarket,
  ZkLoginPanel,
  SuiAgentWalletPanel,
  SuiAgentEconomyLoop,
} from "./widgets/sui/SuiWidgets";
import { OpenClawSkillConsole, TeeAttestationVerifier, DePinBulkPin } from "./widgets/og-extra/OgExtraWidgets";
import { StrategyDeployPanel, YieldProjectionCalc, WhaleAlertFeed } from "./widgets/mantle-extra/MantleExtraWidgets";
import { BatchPayoutConsole, StylusSnippetViewer, RobinhoodChainPanel } from "./widgets/arbitrum-extra/ArbitrumExtraWidgets";
import { QiePosWidget, GameItemShop, MerchantPayoutsPanel } from "./widgets/qie-extra/QieExtraWidgets";
import * as api from "../lib/api";
import { runOgInference, anchorReceiptOnChain, isOgRegistryConfigured, getOgConfig, ogExplorerTxUrl, ogExplorerAddrUrl } from "../lib/og";
import { vaultRecordDecision, isMantleVaultConfigured, mantleExplorerTxUrl } from "../lib/mantle";

type WorkspaceDashboardProps = {
  agent: Agent;
  paidServiceIds: Record<string, string>;
  receipts: Receipt[];
  services: Service[];
  theme: Theme;
  tweakStyle?: React.CSSProperties;
  usageBump: number;
  workspace: Workspace;
  onAddService: (service: Service) => void;
  onAskAI: () => void;
  onBack: () => void;
  onOpenPayment: (service: Service) => void;
  onToggleTheme: () => void;
};

const FALLBACK_RAIL_ICONS = [LayoutDashboard, ReceiptText, CreditCard, CodeIcon, FileText, CircleDollarSign, SettingsIcon];

export type RailKind = "overview" | "agents" | "receipts" | "gateway" | "catalogue" | "service" | "verify";
export type RailItem = { label: string; kind: RailKind; Icon: typeof LayoutDashboard };

export function buildRail(workspace: Workspace): RailItem[] {
  const tabs = workspace.tabs.length > 0 ? workspace.tabs : ["Overview", "Marketplace", "Agents", "Receipts"];
  return tabs.map((label, index) => ({
    label,
    kind: pageKind(label, index),
    Icon: railIconFor(label, index),
  }));
}

type ProductRailIndex = number;

export function railIconFor(tab: string, index: number) {
  const t = tab.toLowerCase();
  if (index === 0 || t.includes("overview") || t.includes("dashboard")) return LayoutDashboard;
  if (t.includes("receipt") || t.includes("payment") || t.includes("approval") || t.includes("invoice")) return ReceiptText;
  if (t.includes("wallet") || t.includes("agent") || t.includes("budget") || t.includes("spend") || t.includes("companion")) return Wallet;
  if (t.includes("data") || t.includes("api") || t.includes("endpoint") || t.includes("service") || t.includes("catalog") || t.includes("market")) return Globe;
  if (t.includes("gateway") || t.includes("checkout") || t.includes("trading") || t.includes("defi")) return Zap;
  if (t.includes("doc") || t.includes("sdk") || t.includes("guide") || t.includes("learn")) return BookOpen;
  if (t.includes("policy") || t.includes("verify") || t.includes("proof") || t.includes("security") || t.includes("privacy")) return ShieldCheck;
  if (t.includes("compute") || t.includes("inference") || t.includes("network") || t.includes("node") || t.includes("chain")) return Network;
  if (t.includes("storage") || t.includes("vault") || t.includes("bucket")) return FileText;
  if (t.includes("credit") || t.includes("card") || t.includes("finance") || t.includes("fund")) return CreditCard;
  if (t.includes("code") || t.includes("contract") || t.includes("smart")) return CodeIcon;
  if (t.includes("file") || t.includes("report") || t.includes("log")) return FileText;
  return FALLBACK_RAIL_ICONS[index % FALLBACK_RAIL_ICONS.length];
}
const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEK_SHAPE = [0.5, 0.78, 0.6, 1.0, 0.82, 0.46, 0.3];
const fmtUsd = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function hashPct(seed: string, lo = 1.2, hi = 8.4) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return lo + ((h % 1000) / 1000) * (hi - lo);
}

function fnvHex(seed: string, len = 8) {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
  return (h.toString(16) + "0".repeat(len)).slice(0, len);
}

function ago(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const SERVICE_TAB_KW = ["data", "trading", "analysis", "tax", "compute", "storage", "signal", "analytic", "intel", "model", "oracle", "inference", "report", "endpoint", "query", "feed", "checkout"];

export function pageKind(tab: string, index: number): "overview" | "agents" | "receipts" | "gateway" | "catalogue" | "service" | "verify" {
  const t = tab.toLowerCase();
  if (index === 0 || t.includes("overview")) return "overview";
  if (t.includes("gateway") || t.includes("explainer") || t.includes("debugger") || t.includes("playground") || t.includes("sdk")) return "gateway";
  if (t.includes("ai services") || t.includes("agent services")) return "service";
  if (t.includes("approval")) return "agents";
  if (t.includes("merchant dashboard") || t.includes("receipt") || t.includes("payment") || t.includes("invoice") || t.includes("ledger") || t.includes("subscription")) return "receipts";
  if (t.includes("marketplace") || t.includes("catalog") || t.includes("my service") || t.includes("my paid") || t.includes("paid tool")) return "catalogue";
  if (t.includes("privacy") || t.includes("risk rules") || t.includes("compliance") || t.includes("verif") || t.includes("proof") || t.includes("audit")) return "verify";
  if (SERVICE_TAB_KW.some((k) => t.includes(k))) return "service";
  if (t.includes("agent") || t.includes("budget") || t.includes("policy") || t.includes("companion") || t.includes("wallet")) return "agents";
  if (t.includes("service")) return "catalogue";
  return "service";
}

// ---------------------------------------------------------------------------

function LedeHead({
  crumb,
  title,
  children,
  chips,
  withRings,
}: {
  crumb: string;
  title: string;
  children?: React.ReactNode;
  chips?: React.ReactNode;
  withRings?: boolean;
}) {
  return (
    <div className="lede-head">
      {withRings ? (
        <>
          <span className="rings-deco" style={{ width: 360, height: 360, right: -120, top: -160 }} />
          <span className="rings-deco" style={{ width: 220, height: 220, right: -60, top: -90 }} />
        </>
      ) : null}
      <div className="crumb">{crumb}</div>
      <h1>{title}</h1>
      {children ? <p>{children}</p> : null}
      {chips ? <div className="row wrap mt" style={{ gap: 6 }}>{chips}</div> : null}
    </div>
  );
}

function badgeFor(status: ReceiptStatus | "active" | "paused") {
  return <span className={`badge ${status}`}><span className="b-dot" />{status}</span>;
}

// ---------------------------------------------------------------------------
// CREATE SERVICE MODAL
// ---------------------------------------------------------------------------

const CATEGORIES = ["data", "inference", "storage", "analytics", "payment", "trading", "tax", "game-intel"] as const;
const CURRENCIES = ["USDC", "USDT", "native", "mock"] as const;

export function CreateServiceModal({
  workspace,
  onClose,
  onAdd,
}: {
  workspace: Workspace;
  onClose: () => void;
  onAdd: (s: Service) => void;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [price, setPrice] = useState("0.05");
  const [currency, setCurrency] = useState<string>(CURRENCIES[0]);
  const [network, setNetwork] = useState(workspace.networks[0]);
  const [provider, setProvider] = useState("");
  const [wallet, setWallet] = useState("0xProv…");
  const [response, setResponse] = useState('{ "data": "…" }');
  const [done, setDone] = useState(false);

  const submit = () => {
    if (!name.trim()) return;
    const priceUsd = Math.max(0.001, parseFloat(price) || 0.05);
    const service: Service = {
      id: makeServiceId(),
      workspaceIds: [workspace.id],
      name: name.trim(),
      provider: provider.trim() || "Custom Provider",
      providerWallet: wallet.trim() || "0xProv…",
      category,
      price: `${priceUsd.toFixed(2)} ${currency}`,
      priceUsd,
      currency,
      network,
      description: desc.trim() || `A paid ${category} endpoint.`,
      sampleIn: '{ "query": "…" }',
      response: response.trim() || '{ "data": "…" }',
      latency: "320ms",
      calls: 0,
      status: "active",
    };
    onAdd(service);
    setDone(true);
    setTimeout(onClose, 900);
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="create-modal" role="dialog" aria-modal="true" aria-label="Create paid service" onMouseDown={(e) => e.stopPropagation()}>
        <div className="cm-head">
          <div>
            <div className="eyebrow">Provider Dashboard</div>
            <h2>{done ? "Service created!" : "Create Paid API"}</h2>
          </div>
          <button className="round-icon" type="button" onClick={onClose}><X width={17} height={17} /></button>
        </div>

        {done ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "40px 24px" }}>
            <span className="orb-core" style={{ width: 56, height: 56, background: "var(--acc-grad)", borderRadius: "50%", display: "grid", placeItems: "center" }}>
              <Check width={26} height={26} />
            </span>
            <p style={{ color: "var(--muted)", fontSize: 14, textAlign: "center" }}>Your service is live in the catalogue. Unpaid calls return 402; paid calls return the protected response.</p>
          </div>
        ) : (
          <div className="ap402 cm-body">
            <div className="fm-row">
              <div className="fm-group">
                <label className="fm-label">Service name</label>
                <div className="field-box fill"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Wallet Risk API" maxLength={80} /></div>
              </div>
              <div className="fm-group">
                <label className="fm-label">Category</label>
                <div className="field-box fill">
                  <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="fm-group">
              <label className="fm-label">Description</label>
              <div className="field-box fill fm-ta"><textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What this endpoint does…" maxLength={300} /></div>
            </div>

            <div className="fm-row">
              <div className="fm-group">
                <label className="fm-label">Price per request (USD)</label>
                <div className="field-box fill">
                  <input type="number" min="0.001" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
                  <span className="suffix">USD</span>
                </div>
              </div>
              <div className="fm-group">
                <label className="fm-label">Currency</label>
                <div className="field-box fill">
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="fm-group">
                <label className="fm-label">Network</label>
                <div className="field-box fill">
                  <select value={network} onChange={(e) => setNetwork(e.target.value)}>
                    {workspace.networks.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="fm-row">
              <div className="fm-group">
                <label className="fm-label">Provider name</label>
                <div className="field-box fill"><input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Your company / project" maxLength={60} /></div>
              </div>
              <div className="fm-group">
                <label className="fm-label">Settlement wallet</label>
                <div className="field-box fill"><input value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="0x…" maxLength={80} /></div>
              </div>
            </div>

            <div className="fm-group">
              <label className="fm-label">Response preview (sample JSON)</label>
              <div className="field-box fill fm-ta"><textarea rows={2} value={response} onChange={(e) => setResponse(e.target.value)} placeholder='{ "result": "…" }' maxLength={300} /></div>
            </div>

            <div className="cm-note">
              <Shield width={13} height={13} />
              Unpaid calls → <code>402 Payment Required</code>. Gateway enforces price, wallet and network server-side.
            </div>

            <button className="btn btn-acc" style={{ width: "100%", justifyContent: "center" }} type="button" onClick={submit} disabled={!name.trim()}>
              <Bolt width={15} height={15} /> Create Service
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// OVERVIEW
// ---------------------------------------------------------------------------

// The 0G "money shot": a guided 4-step walkthrough an agent goes through to pay
// for a real 0G Compute inference and have the receipt anchored on 0G mainnet.
// Step 3 calls the real `POST /api/og/compute`; if the server has no compute key
// it falls back to a deterministic demo result (clearly labelled). Step 4 sends a
// real AgentReceiptRegistry.record(...) tx when VITE_0G_REGISTRY_ADDRESS is set.
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

// ── Economy Dashboard ──────────────────────────────────────────────────────
type EconStats = { total: number; today: number; uniqueAgents: number; avgAmount: number };
type EconEvent = { type: "snapshot"; receipts: Receipt[] } | { type: "receipt"; receipt: Receipt };

function EconomyDashboard() {
  const [stats, setStats] = useState<EconStats | null>(null);
  const [feed, setFeed] = useState<Receipt[]>([]);
  const [connected, setConnected] = useState(false);
  const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";

  useEffect(() => {
    let es: EventSource | null = null;
    fetch(`${BASE}/api/receipts/stats`).then(r => r.ok ? r.json() : null).then(d => { if (d) setStats(d); }).catch(() => {});
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

  if (!stats && feed.length === 0) return null;

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

function OgDemoFlow({
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
  // cursor = step currently being worked / awaiting action (0..3); -1 before start.
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
      serviceName: live ? "0G Compute · guided demo" : "0G Compute · guided demo (demo)",
      amount: 0.03,
      currency: "USDC",
      network: workspace.networks[0] ?? "0g-testnet",
      kind: "0g.inference",
      payload: { demoFlow: true, prompt: OG_DEMO_PROMPT, response: content, ogCompute: live, provider, chatID, verified },
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

export function OverviewPage({
  agent,
  receipts,
  services,
  workspace,
  onGoTab,
  onOpenPayment,
  onGoReceipts,
}: {
  agent: Agent;
  receipts: Receipt[];
  services: Service[];
  workspace: Workspace;
  onGoTab: (m: string) => boolean;
  onOpenPayment: (s: Service) => void;
  onGoReceipts: () => void;
}) {
  const m = workspaceMetrics(workspace.id, receipts);
  const wsReceipts = receipts.filter((r) => r.workspaceId === workspace.id);
  const recent = wsReceipts.slice(0, 6);
  const def = services.find((s) => s.status === "active") ?? services[0];
  const totalVol = useMemo(() => services.reduce((s, x) => s + x.calls * x.priceUsd, 0), [services]);
  const week = WEEK.map((d, i) => ({ label: d, value: Math.round((totalVol / 7) * WEEK_SHAPE[i] * 60) }));
  const weekAvg = Math.round(week.reduce((s, x) => s + x.value, 0) / week.length);
  const topServices = [...services].sort((a, b) => b.calls - a.calls).slice(0, 4);

  type CardDef = { ico: React.ElementType<{ width?: number; height?: number }>; title: string; sub?: string; light?: boolean; link?: string; onLink?: () => void; onClick: () => void };
  const WS_CARDS: Partial<Record<WorkspaceId, CardDef[]>> = {
    "0g": [
      { light: true, ico: Bolt, title: "Run an inference job", sub: "pay per token · Risk Scorer · Llama 3 · Anomaly", onClick: () => def && onOpenPayment(def) },
      { ico: FileText, title: "Pin a memory blob to 0G Storage", sub: "SHA-256 hash · verifiable reference", onClick: () => onGoTab("storage") },
      { ico: Shield, title: "Verify a receipt proof", sub: "single-use · replay-safe · sealed", onClick: () => onGoTab("privacy") },
      { ico: Robot, title: "Manage agent budgets & allowlist", sub: "0G Job Worker · daily cap $8.00", onClick: () => onGoTab("agent") },
      { ico: Code, title: "0G x402 SDK & gateway docs", sub: "cURL · TypeScript · Python adapters", onClick: () => onGoTab("gateway") || onGoTab("privacy") },
      { ico: RIco, title: "View all receipts", sub: `${wsReceipts.length} paid jobs on record`, onClick: () => onGoReceipts() },
    ],
    liquify: [
      { light: true, ico: Zap, title: "Get a live trading signal", sub: "confidence + risk band · $0.10 USDC", onClick: () => def && onOpenPayment(def) },
      { ico: Shield, title: "Score a wallet for risk", sub: "approvals · mixer proximity · $0.05 USDC", onClick: () => onGoTab("wallet") },
      { ico: Download, title: "Export tax report as CSV", sub: "categorise all txs · $0.08 USDC / export", onClick: () => onGoTab("tax") },
      { ico: Robot, title: "Manage Yield Researcher agent", sub: "daily limit $10 · auto-pay on", onClick: () => onGoTab("wallet") || onGoTab("agent") },
      { ico: Code, title: "x402 Gateway & SDK", sub: "Docs · middleware · adapters", onClick: () => onGoTab("gateway") },
      { ico: RIco, title: "View all receipts", sub: `${wsReceipts.length} paid calls on record`, onClick: () => onGoReceipts() },
    ],
    qie: [
      { light: true, ico: Bolt, title: "Create a payment link", sub: "hosted 402 endpoint agents can pay", onClick: () => onGoTab("checkout") },
      { ico: FileText, title: "Query QIEDEX pool data", sub: "depth · fees · TWAP · per-query pricing", onClick: () => onGoTab("qiedex") || onGoTab("dex") },
      { ico: Shield, title: "Issue & verify QIE Pass", sub: "gated access · gold / silver tiers", onClick: () => onGoTab("pass") },
      { ico: Robot, title: "Manage Merchant Bot agent", sub: "daily limit $6 · auto-pay on", onClick: () => onGoTab("wallet") || onGoTab("agent") },
      { ico: Code, title: "QIE x402 integration docs", sub: "cURL · SDK · rail adapters", onClick: () => onGoTab("gateway") },
      { ico: RIco, title: "Merchant dashboard & payouts", sub: `${wsReceipts.length} receipts · next payout Fri`, onClick: () => onGoTab("merchant") || onGoReceipts() },
    ],
    arbitrum: [
      { light: true, ico: Send, title: "Send USDC on Arbitrum", sub: "live ERC-20 transfer · testnet USDC", onClick: () => onGoTab("stablecoin") || onGoTab("payment") },
      { ico: Shield, title: "Create & manage escrow", sub: "release or refund on delivery proof", onClick: () => onGoTab("escrow") },
      { ico: Network, title: "Monitor Orbit chains", sub: "sequencer · bridge health · batch lag", onClick: () => onGoTab("orbit") },
      { ico: Robot, title: "Treasury Agent budget policy", sub: "daily limit $12 · spend caps", onClick: () => onGoTab("agent") },
      { ico: ShieldCheck, title: "Configure risk rules", sub: "spend caps · allowlists · enforced server-side", onClick: () => onGoTab("risk") },
      { ico: RIco, title: "View all receipts", sub: `${wsReceipts.length} settled payments`, onClick: () => onGoReceipts() },
    ],
    mantle: [
      { light: true, ico: TrendingUp, title: "Run a strategy backtest", sub: "mETH · USDY · T-BILL · $0.15 / run", onClick: () => onGoTab("strategy") || onGoTab("sandbox") },
      { ico: Radio, title: "Browse the alpha feed", sub: "AI-scored signals · confidence 68-91%", onClick: () => onGoTab("alpha") },
      { ico: FileText, title: "Fetch RWA risk data", sub: "basket · grade · duration · APY", onClick: () => onGoTab("rwa") },
      { ico: Robot, title: "Manage Alpha Strategist agent", sub: "daily limit $15 · auto-pay on", onClick: () => onGoTab("wallet") || onGoTab("agent") },
      { ico: Zap, title: "mETH / USDY yield signals", sub: "rotation suggestion · rebalance band", onClick: () => onGoTab("meth") || onGoTab("yield") },
      { ico: RIco, title: "View all receipts", sub: `${wsReceipts.length} paid strategy runs`, onClick: () => onGoReceipts() },
    ],
    eazo: [
      { light: true, ico: Wallet, title: "Manage your subscriptions", sub: "pause · cancel · weekly budget bar", onClick: () => onGoTab("subscription") },
      { ico: Robot, title: "Life Companion agent settings", sub: "daily limit $3 · auto-pay on", onClick: () => onGoTab("companion") || onGoTab("agent") },
      { ico: FileText, title: "Get today's finance brief", sub: "balances · upcoming charges · alerts", onClick: () => def && onOpenPayment(def) },
      { ico: Shield, title: "Review approval rules", sub: "what the agent may buy · spend caps", onClick: () => onGoTab("approval") },
      { ico: Code, title: "Life OS automations", sub: "reminders · daily ops · companion triggers", onClick: () => onGoTab("life") || onGoTab("os") },
      { ico: RIco, title: "View all receipts", sub: `${wsReceipts.length} companion actions`, onClick: () => onGoReceipts() },
    ],
    berkeley: [
      { light: true, ico: Play, title: "Run the 402 playground", sub: "watch request → 402 → pay → unlock live", onClick: () => onGoTab("playground") },
      { ico: Bolt, title: "Try a paid tool", sub: `${services.length} tools available · pay per call`, onClick: () => onGoTab("paid tool") || onGoTab("catalog") },
      { ico: Shield, title: "Decode a pending wallet action", sub: "safe / caution / danger verdict", onClick: () => onGoTab("explainer") },
      { ico: Robot, title: "Replay an agent debug run", sub: "step-by-step · policy check timeline", onClick: () => onGoTab("debugger") },
      { ico: Code, title: "Transaction explainer tool", sub: "plain-English decode + risk notes", onClick: () => onGoTab("explainer") },
      { ico: RIco, title: "View all receipts", sub: `${wsReceipts.length} paid tool calls`, onClick: () => onGoReceipts() },
    ],
    deepsurge: [
      { light: true, ico: TrendingUp, title: "Score a trade route", sub: "gank prob · spread · escort · $0.05", onClick: () => onGoTab("trade") || onGoTab("safety") },
      { ico: FileText, title: "Query resource intel", sub: "node yields · contested zones · hostiles", onClick: () => onGoTab("resource") || onGoTab("intel") },
      { ico: Radio, title: "Subscribe to live alerts", sub: "fleet movement · market shocks · metered", onClick: () => onGoTab("alert") },
      { ico: Robot, title: "Frontier Scout agent settings", sub: "daily limit $5 · auto-pay on", onClick: () => onGoTab("agent") },
      { ico: Zap, title: "Market oracle queries", sub: "commodity prices · hub spread · per-query", onClick: () => onGoTab("intel") || onGoTab("api") },
      { ico: RIco, title: "View all receipts", sub: `${wsReceipts.length} intel calls`, onClick: () => onGoReceipts() },
    ],
    sui: [
      { light: true, ico: Bolt, title: "Pin a blob to Walrus storage", sub: "decentralised · epoch-based · verifiable", onClick: () => onGoTab("walrus") || onGoTab("storage") },
      { ico: Code, title: "Execute a Move PTB", sub: "dry-run or live · programmable tx blocks", onClick: () => onGoTab("move") || onGoTab("contracts") },
      { ico: FileText, title: "Mint an agent NFT pass", sub: "Kiosk-compatible · tier-gated access", onClick: () => onGoTab("nft") || onGoTab("market") },
      { ico: Shield, title: "Generate a zkLogin proof", sub: "OAuth → Sui wallet · no seed phrase", onClick: () => onGoTab("wallet") || onGoTab("agent") },
      { ico: Robot, title: "Sui Economy Agent settings", sub: "daily limit $10 · auto-pay on", onClick: () => onGoTab("agent") },
      { ico: RIco, title: "View all receipts", sub: `${wsReceipts.length} Sui payments`, onClick: () => onGoReceipts() },
    ],
  };
  // "Try the demo agent" — the one-click 402 → pay → unlock action judges look for.
  // Prepended to every workspace's tile set; the per-workspace first card loses its
  // `light` accent so there's a single clear primary CTA.
  const demoAgentCard: CardDef = {
    light: true,
    ico: Bolt,
    title: "▶ Try the demo agent",
    sub: def ? `pays for ${def.name} · 402 → pay → unlock + receipt` : "402 → pay → unlock + receipt",
    link: "x402 Gateway →",
    onLink: () => onGoTab("gateway"),
    onClick: () => def && onOpenPayment(def),
  };
  const wsCards = (WS_CARDS[workspace.id] ?? [
    { ico: Plus, title: "Create a paid API endpoint", sub: `${services.length} services live in this workspace`, onClick: () => onGoTab("data") || onGoTab("checkout") || onGoTab("trading") },
    { ico: RIco, title: "Pay & manage receipts", sub: `${wsReceipts.length} on record`, onClick: () => onGoTab("payment") || onGoTab("receipt") },
    { ico: Robot, title: "Manage agent budgets", sub: `1 agent · daily & per-request caps`, onClick: () => onGoTab("wallet") || onGoTab("agent") },
    { ico: Code, title: "x402 Gateway & SDK", sub: "Docs · middleware · adapters", onClick: () => onGoTab("gateway") || onGoTab("data") },
    { ico: Shield, title: "Verify a payment proof", sub: "Replay-safe · single-use", onClick: () => onGoTab("gateway") || onGoTab("data") },
  ]).map((c, i) => (i === 0 ? { ...c, light: false } : c));
  const cards: CardDef[] = [demoAgentCard, ...wsCards];

  return (
    <>
      <LedeHead
        crumb={`${workspace.id} workspace · ${workspace.hackathon}`}
        title={workspace.name}
        withRings
        chips={
          <>
            {workspace.tracks.map((t) => <span key={t} className="chip grey">{t}</span>)}
            {workspace.networks.map((n) => <span key={n} className="chip acc">{n}</span>)}
          </>
        }
      >
        {workspace.pitch}
      </LedeHead>

      {workspace.id === "0g" && <EconomyDashboard />}
      {workspace.id === "0g" && <OgDemoFlow workspace={workspace} onGoTab={onGoTab} onGoReceipts={onGoReceipts} />}

      <div className="action-grid mb">
        {cards.map((c, i) => {
          const Ico = c.ico;
          return (
            <button key={i} className={"act" + (c.light ? " light" : "")} onClick={c.onClick} type="button">
              <span className="gico"><Ico width={20} height={20} /></span>
              <span className="act-info">i</span>
              <span className="act-title">{c.title}</span>
              {c.sub ? <span className="act-sub">{c.sub}</span> : null}
              {c.link ? (
                <span className="act-link" onClick={(e) => { e.stopPropagation(); c.onLink?.(); }}>
                  {c.link} <ArrowRight width={12} height={12} />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="act-foot mb">
        <a href="#" onClick={(e) => e.preventDefault()}>Privacy</a>
        <a href="#" onClick={(e) => e.preventDefault()}>Terms</a>
        <a href="#" onClick={(e) => { e.preventDefault(); onGoTab("gateway") || onGoTab("data"); }}>Fees &amp; verification</a>
      </div>

      <div className="grid-bento mb">
        <div className="panel block">
          <div className="block-head">
            <div className="ttl"><div><h3>This week · gateway volume</h3><div className="sub">paid calls × price, by day</div></div></div>
            <div className="num" style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.03em" }}>{fmtUsd(week.reduce((s, x) => s + x.value, 0))}</div>
          </div>
          <WeekBars data={week} avgLabel={weekAvg.toLocaleString()} />
        </div>
        <div className="balcard">
          <div className="bc-top"><span className="orb" style={{ width: 22, height: 22, margin: 0 }} /><span style={{ fontWeight: 700, fontSize: 12.5 }}>Provider revenue</span></div>
          <div className="bc-amt">{fmtUsd(m.revenue)}</div>
          <div className="bc-sub">from {m.paid} verified payments · {m.failed} failed</div>
          <div className="curtabs"><span className="on">USDC</span><span>USDT</span><span>native</span></div>
          <div style={{ marginTop: 16 }}><BarSpark seed={workspace.id} color="rgba(255,140,26,.85)" filled={18} count={24} /></div>
        </div>
      </div>

      <div className="kpis mb">
        {topServices.map((s) => {
          const Ico = CAT_ICON[s.category] ?? CAT_ICON.data;
          return (
            <div key={s.id} className="kpi">
              <div className="kt">
                <span className="sq" style={{ background: catColor(s.category) }}><Ico width={16} height={16} /></span>
                <div><div className="nm">{s.name}</div><div className="tk">{s.category}</div></div>
                <ArrowUpRight width={15} height={15} className="ext" />
              </div>
              <div className="kv">{fmtUsd(s.calls * s.priceUsd)}</div>
              <div className="ks"><span className="ch up">+{hashPct(s.id).toFixed(2)}%</span><span className="lbl">vs last month</span></div>
              <BarSpark seed={s.id} color={catColor(s.category)} filled={13} />
            </div>
          );
        })}
      </div>

      <div className="panel block">
        <div className="block-head">
          <div className="ttl"><span className="sq soft"><Bolt width={15} height={15} /></span><div><h3>Last paid calls</h3><div className="sub">Live receipts ledger</div></div></div>
          <button className="btn btn-ghost btn-sm" type="button" onClick={onGoReceipts}>View all</button>
        </div>
        {recent.length === 0 ? <div className="empty">No receipts yet — run the demo.</div> : (
          <div className="log">{recent.slice(0, 4).map((r) => <ReceiptRow key={r.id} r={r} onClick={onGoReceipts} />)}</div>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// MARKETPLACE / CATALOGUE
// ---------------------------------------------------------------------------

function ServiceCard({ s, allowed, paidAt, onPay }: { s: Service; allowed: boolean; paidAt?: string; onPay: () => void }) {
  const [copied, setCopied] = useState(false);
  const Ico = CAT_ICON[s.category] ?? CAT_ICON.data;
  function copy() {
    navigator.clipboard?.writeText(`${location.origin}/api/gateway/${s.id}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }
  return (
    <div className="svc">
      <div className="svc-top">
        <div className="left">
          <span className="sq lg" style={{ background: catColor(s.category) }}><Ico width={18} height={18} /></span>
          <div><h4>{s.name}</h4><div className="svc-cat">{s.category} · {s.network}</div></div>
        </div>
        {badgeFor(s.status)}
      </div>
      <div className="svc-desc">{s.description}</div>
      <div className="io"><span className="k">in </span>{s.sampleIn}</div>
      <div className="io"><span className="k">out</span> {s.response}</div>
      <div className="endpoint-bar">
        <span className="method">GET</span><span className="url">/api/gateway/{s.id}</span>
        <button className="icon-btn sm" onClick={copy} aria-label="Copy gateway URL" style={{ flex: "none" }} type="button">
          {copied ? <Check width={13} height={13} style={{ color: "var(--green)" }} /> : <Copy width={13} height={13} />}
        </button>
      </div>
      <div className="svc-foot">
        <div>
          <div className="price">{s.priceUsd.toFixed(2)} <small>{s.currency} / call</small></div>
          <div className="svc-cat" style={{ marginTop: 3 }}>
            {paidAt ? <span style={{ color: "var(--green)" }}>✓ paid {paidAt}</span> : allowed ? <span style={{ color: "var(--green)" }}>✓ on allowlist</span> : <span style={{ color: "var(--red)" }}>✗ not on allowlist</span>} · {s.calls.toLocaleString()} calls
          </div>
        </div>
        {s.status === "active" ? (
          <button className={`btn btn-sm ${paidAt ? "btn-ghost" : "btn-acc"}`} onClick={onPay} type="button">
            {paidAt ? <><Check width={13} height={13} /> Paid</> : <><Bolt width={14} height={14} /> Try with agent</>}
          </button>
        ) : (
          <button className="btn btn-ghost btn-sm" disabled type="button"><X width={13} height={13} /> Paused</button>
        )}
      </div>
    </div>
  );
}

export function CataloguePage({
  agent,
  paidServiceIds,
  services,
  workspace,
  tabLabel,
  onOpenPayment,
  onCreateOpen,
}: {
  agent: Agent;
  paidServiceIds: Record<string, string>;
  services: Service[];
  workspace: Workspace;
  tabLabel: string;
  onOpenPayment: (s: Service) => void;
  onCreateOpen: () => void;
}) {
  const [cat, setCat] = useState("all");
  const [query, setQuery] = useState("");
  const isProviderView = tabLabel.toLowerCase().includes("my");
  const catalogServices = isProviderView ? services : allCatalogServices;
  const cats = ["all", ...Array.from(new Set(catalogServices.map((s) => s.category)))];
  const list = (cat === "all" ? catalogServices : catalogServices.filter((s) => s.category === cat)).filter((service) =>
    `${service.name} ${service.provider} ${service.category} ${service.network}`.toLowerCase().includes(query.toLowerCase()),
  );
  if (catalogServices.length > 0) {
    return (
      <section className="pay-marketplace-view">
        <div className="pay-market-hero">
          <small>{isProviderView ? "My Services" : "Marketplace"}</small>
          <h2>{isProviderView ? "Services you publish." : "Paid endpoints, on tap."}</h2>
          <p>
            {isProviderView
              ? "Manage paid APIs available to agents. Each endpoint can return a 402 challenge, settle payment and unlock a response."
              : "Browse paid services, trigger 402, pay in stablecoin and unlock a real response."}
          </p>
          <label>
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Search services, providers, networks..."
            />
          </label>
        </div>

        <div className="pay-filter-row">
          <div>
            {cats.map((c) => (
              <button key={c} className={cat === c ? "is-active" : ""} onClick={() => setCat(c)} type="button">
                {c === "all" ? "All" : c}
              </button>
            ))}
          </div>
          <button className="pay-create-service" type="button" onClick={onCreateOpen}>
            <Plus width={14} height={14} /> New paid service
          </button>
        </div>

        <div className="pay-market-grid">
          {list.map((s) => (
            <article className={paidServiceIds[s.id] ? "pay-market-card is-paid" : "pay-market-card"} key={s.id}>
              <div className="pay-market-card__top">
                <span>{s.category}</span>
                <small>{s.network}</small>
              </div>
              <strong>{s.name}</strong>
              <p>by {s.provider}</p>
              <div className="pay-market-card__bottom">
                <span>${s.priceUsd.toFixed(3)} <small>{s.currency} / req</small></span>
                {s.status === "active" ? (
                  <button type="button" onClick={() => onOpenPayment(s)}>
                    {paidServiceIds[s.id] ? "Paid" : "Try with agent"}
                  </button>
                ) : (
                  <button type="button" disabled>Paused</button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }
  if (services.length === 0) {
    return (
      <>
        <LedeHead crumb={`${workspace.id} workspace · ${tabLabel.toLowerCase()}`} title="Paid endpoints" />
        <div className="empty"><div className="ttl">No services yet</div><div>Add a paid service to this workspace to get started.</div></div>
      </>
    );
  }
  return (
    <>
      <LedeHead crumb={`${workspace.id} workspace · ${tabLabel.toLowerCase()}`} title="Paid endpoints">
        A catalogue of services in this workspace. Each one is wrapped by the x402 gateway: an unpaid call returns{" "}
        <b>402 Payment Required</b>; a paid call returns the protected response plus a receipt. Try one with <b>{agent.name}</b>.
      </LedeHead>
      <div className="spread mb" style={{ flexWrap: "wrap", gap: 10 }}>
        <div className="row wrap" style={{ gap: 7 }}>
          {cats.map((c) => (
            <button key={c} className={"pill click" + (cat === c ? " on" : "")} onClick={() => setCat(c)} type="button">{c.toUpperCase()}</button>
          ))}
        </div>
        <button className="btn btn-acc btn-sm" type="button" onClick={onCreateOpen}><Plus width={14} height={14} /> New paid service</button>
      </div>
      <div className="svc-grid">
        {list.map((s) => (
          <ServiceCard key={s.id} s={s} allowed={agent.allowlist.includes(s.id)} paidAt={paidServiceIds[s.id]} onPay={() => onOpenPayment(s)} />
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// SERVICE / DATA / COMPUTE / STORAGE / TRADING / ANALYSIS / TAX / PRIVACY TAB
// ---------------------------------------------------------------------------

const SVC_METHODS = ["GET", "POST", "POST", "GET", "POST"] as const;
const SVC_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function endpointPath(s: Service): string {
  const slug = s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `/v1/${s.category}/${slug || s.id}`;
}

const TAB_COPY: Record<string, [string, string]> = {
  "trading data": ["Trading data feeds", "Per-call market data, signals and orderflow — agents pay only for what they pull."],
  "wallet analysis": ["Wallet analysis", "Risk scoring, clustering and address labels — billed per lookup over the x402 handshake."],
  "tax reports": ["Tax classification", "Cost-basis, realised P&L and jurisdiction tags — generated on demand, paid per report."],
  "signals": ["Purchased signals", "Trading and risk insights you've bought — refresh any of them per call to get the latest read."],
  "compute": ["Compute & inference", "Run inference jobs and pay per token / per job; receipts link to verifiable job metadata."],
  "storage": ["Storage writes", "Pin, store and retrieve blobs — every write settles a micro-payment and returns a content hash."],
  "privacy": ["Privacy & verification", "Confidential request routing and payment-proof verification — replay-safe and single-use."],
  "checkout": ["Checkout & payment links", "Hosted payment endpoints merchants expose to agents — generate a link, get paid in QIE-rail stablecoins."],
  "qie pass": ["QIE Pass — identity & access", "Gate paid endpoints behind verified QIE Pass identity; every access check is recorded as a receipt."],
  "qiedex data": ["QIEDEX market data", "Paid swap quotes, liquidity depth and pair stats from QIEDEX — priced per query."],
  "merchant dashboard": ["Merchant dashboard", "Revenue, invoices and receipts for everything agents have paid you on the QIE rail."],
  "ai services": ["AI services on Arbitrum", "Paid AI / API endpoints settled in USDC on Arbitrum, with spend limits and receipts."],
  "agent services": ["Agent services on Arbitrum", "Paid AI / API endpoints settled in USDC on Arbitrum, with spend limits and receipts."],
  "escrow": ["Escrowed delivery", "Hold an agent's payment in escrow until the service confirms delivery — then release or refund."],
  "orbit monitor": ["Orbit chain monitor", "Live data from Orbit chains feeding the gateway — block height, settlement status and bridge health."],
  "risk rules": ["Risk rules & limits", "Spend caps, allowlists and contract-safety checks the gateway enforces before any payment clears."],
  "alpha data": ["Mantle alpha & data", "Paid trading, RWA and yield intelligence — agents pull it per call inside their wallet policy."],
  "meth / usdy": ["mETH / USDY signals", "Yield and risk reads on Mantle-native assets — billed per query, settled from the agent wallet."],
  "rwa data": ["RWA data & reports", "Paid real-world-asset insights and risk reports — generated on demand for the requesting agent."],
  "strategy sandbox": ["Strategy sandbox", "Agents pay per backtest / simulation run; each run returns metrics plus a receipt you can audit."],
  "ai companion": ["AI companion", "Your companion runs paid tools and subscriptions on your behalf — inside the budget and approvals you set."],
  "subscriptions": ["Subscriptions", "Recurring payments for the AI / API tools your companion keeps active — pause or cancel any of them."],
  "personal budget": ["Personal budget", "How much your AI has spent today and this week, broken down by tool — with the cap it can't cross."],
  "life os": ["Life OS", "Daily tools, reminders and finance automations your companion can trigger — each paid action is logged."],
  "approvals": ["Approvals", "Exactly what your agent is allowed to buy, from whom and for how much — the gateway enforces it server-side."],
  "playground": ["402 playground", "Fire a paid tool call and watch every step of the 402 → pay → unlock flow in real time."],
  "paid tools": ["Paid tools", "The catalogue of tools an agent can call here — each one returns 402 until the micro-payment settles."],
  "agent debugger": ["Agent debugger", "Replay an agent's last run step by step: the request, the 402 challenge, the proof and the settled receipt."],
  "transaction explainer": ["Transaction explainer", "Decode a pending wallet action: what it does, what it touches and whether it's safe, caution or danger."],
  "intel api": ["Frontier intel API", "Live EVE Frontier intel agents and players buy per call — resources, routes, market and trade-risk feeds."],
  "frontier terminal": ["Frontier terminal", "The terminal view over EVE Frontier — resources, market, routes, player activity and trade safety."],
  "resource data": ["Resource data", "Paid resource maps and yield estimates across Frontier systems — priced per query."],
  "market oracle": ["Market oracle", "Paid Frontier market reads — prices, spreads and trade-risk scores for any system or item."],
  "routes & risk": ["Routes & risk", "Paid route planning with trade-safety scoring — avoid hostile space, get the receipt with the answer."],
  "trade safety": ["Trade safety", "Per-call risk reads on Frontier trades and routes — billed before the answer is returned."],
  "alerts": ["Alerts", "Subscriptions to Frontier events — price moves, hostiles, resource spawns — each alert delivery is metered."],
};

// ── Bespoke per-workspace flavor panels ──────────────────────────────────────

function CopyLine({ text, className }: { text: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button className={className ?? "btn btn-ghost btn-sm"} type="button" onClick={() => {
      navigator.clipboard?.writeText(text).catch(() => {});
      setDone(true); setTimeout(() => setDone(false), 1300);
    }}>
      {done ? <><Check width={12} height={12} /> Copied</> : <><Copy width={12} height={12} /> Copy</>}
    </button>
  );
}

// Berkeley · 402 Playground — fire a paid tool call and watch the handshake.
const PLAYGROUND_TOOLS = [
  { id: "wallet-risk", name: "Wallet Risk API", method: "GET", path: "/api/wallet-risk?address=0x9f…ba1", price: 0.05, out: '{\n  "riskScore": 82,\n  "labels": ["mixer-adjacent", "high-velocity"],\n  "lastSeen": "2026-05-10T22:14:03Z"\n}' },
  { id: "yield-signal", name: "Yield Signal API", method: "GET", path: "/api/yield-signal?asset=mETH", price: 0.02, out: '{\n  "apyForecast7d": 4.7,\n  "confidence": 0.81,\n  "trend": "up"\n}' },
  { id: "tx-simulate", name: "Tx Simulate", method: "POST", path: "/api/tx/simulate", price: 0.03, out: '{\n  "ok": true,\n  "gasUsed": 142000,\n  "balanceDelta": "-0.012 ETH"\n}' },
] as const;

const PLAYGROUND_STEPS = [
  { label: "Agent sends the request", note: "no payment attached yet — just the call" },
  { label: "402 Payment Required", note: "gateway returns a signed challenge: serviceId · amount · network · expiry" },
  { label: "Agent signs the payment", note: "wallet authorises ≤ maxPerRequestUsd, inside the daily budget" },
  { label: "Gateway verifies the proof", note: "amount ≥ required · recipient matches · single-use · network matches" },
  { label: "200 OK + receipt", note: "data returned together with a verifiable receipt id and tx hash" },
] as const;

function PlaygroundInspector() {
  const [toolId, setToolId] = useState<string>(PLAYGROUND_TOOLS[0].id);
  const tool = PLAYGROUND_TOOLS.find((t) => t.id === toolId) ?? PLAYGROUND_TOOLS[0];
  const [step, setStep] = useState(0); // 0 idle, 1..5 progress
  const [running, setRunning] = useState(false);
  const timer = useRef<number | null>(null);

  const run = () => {
    if (running) return;
    if (timer.current) window.clearTimeout(timer.current);
    setRunning(true); setStep(1);
    let i = 1;
    const tick = () => {
      i += 1;
      if (i <= PLAYGROUND_STEPS.length) { setStep(i); timer.current = window.setTimeout(tick, 640); }
      else { setRunning(false); }
    };
    timer.current = window.setTimeout(tick, 640);
  };
  const reset = () => { if (timer.current) window.clearTimeout(timer.current); setRunning(false); setStep(0); };

  const done = !running && step >= PLAYGROUND_STEPS.length;
  return (
    <div className="panel block svc-flavor pg">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><Zap width={15} height={15} /></span><div><h3>Run a paid tool call</h3><div className="sub">watch the 402 → pay → verify → unlock cycle in real time</div></div></div>
        <div className="row sm" style={{ gap: 6 }}>
          {step > 0 && <button className="btn btn-sm" type="button" onClick={reset}>Reset</button>}
          <button className="btn btn-acc btn-sm" type="button" onClick={run} disabled={running}>{running ? "Running…" : step > 0 ? "Run again" : "Run call"}</button>
        </div>
      </div>
      <div className="pg-tools">
        {PLAYGROUND_TOOLS.map((t) => (
          <button key={t.id} type="button" className={"pg-tool" + (t.id === toolId ? " on" : "")} onClick={() => { setToolId(t.id); reset(); }}>
            <b>{t.name}</b><span>{t.method} · ${t.price.toFixed(2)} {t.method === "GET" ? "USDC/call" : "USDC/run"}</span>
          </button>
        ))}
      </div>
      <div className="pg-req"><span className={`mth mth--${tool.method.toLowerCase()}`}>{tool.method}</span><code>{tool.path}</code></div>
      <ol className="pg-steps">
        {PLAYGROUND_STEPS.map((s, i) => {
          const n = i + 1;
          const state = step > n ? "done" : step === n ? (running ? "active" : "done") : "pending";
          return (
            <li key={s.label} className={`pg-step pg-step--${state}`}>
              <span className="pg-step__dot">{state === "done" ? <Check width={11} height={11} /> : n}</span>
              <div className="pg-step__body"><b>{s.label}</b><span>{s.note}</span></div>
              {n === 2 && step >= 2 && <span className="pg-tag pg-tag--402">402</span>}
              {n === 5 && step >= 5 && <span className="pg-tag pg-tag--200">200</span>}
            </li>
          );
        })}
      </ol>
      {done && (
        <div className="pg-out">
          <div className="pg-out__head"><Check width={13} height={13} /> Response unlocked · receipt <code>rcpt_{tool.id.replace(/-/g, "")}_{(step * 137).toString(36)}</code></div>
          <pre className="code-block">{tool.out}</pre>
        </div>
      )}
    </div>
  );
}

// Berkeley · Transaction explainer — decode a pending wallet action, verdict it.
const TX_SAMPLES = [
  { id: "swap", title: "swapExactTokensForTokens(120 USDC → ≈0.041 ETH)", to: "Uniswap V3 Router · verified", verdict: "safe" as const,
    facts: [["Touches", "USDC, WETH, Uniswap V3 Router"], ["Allowance change", "none"], ["Slippage bound", "0.5% — protected"], ["Recipient", "your own wallet"]],
    reasons: ["Standard swap on a long-lived, verified router", "No new approvals are granted", "Output is bounded by an explicit slippage limit"] },
  { id: "approve", title: "approve(0x7a…Router, 115792089…MAX_UINT256)", to: "USDC token contract", verdict: "caution" as const,
    facts: [["Touches", "USDC allowance for a router"], ["Allowance change", "0 → unlimited"], ["Spender age", "active 2y · widely used"], ["Reversible", "yes — re-approve to 0"]],
    reasons: ["Unlimited allowance means the router can move all your USDC, now and forever", "The router is reputable, but a future exploit of it would put this balance at risk", "Prefer an exact-amount approval for the swap you're doing"] },
  { id: "drainer", title: "setApprovalForAll(0x9f…ba1, true)", to: "unverified contract · deployed 2 days ago", verdict: "danger" as const,
    facts: [["Touches", "EVERY NFT in this collection"], ["Allowance change", "full operator rights granted"], ["Spender age", "2 days · unverified · 0 other users"], ["Pattern match", "known wallet-drainer signature"]],
    reasons: ["Grants a stranger the right to transfer all your NFTs in this collection", "Destination is a brand-new, unverified contract with no usage history", "This is the classic NFT-drainer pattern — do not sign this"] },
];

function TxExplainerPanel({ workspace }: { workspace: Workspace }) {
  const { emitReceipt, receipts } = useAppState();
  const [id, setId] = useState<string>(TX_SAMPLES[1].id);
  const [calldata, setCalldata] = useState("0x095ea7b3000000000000000000000000a17e0b9c4d2192af31b7…ffffffffffffffffff");
  const [running, setRunning] = useState(false);
  const [decoded, setDecoded] = useState<{ verdict: "safe" | "caution" | "danger"; action: string; facts: [string, string][]; reasons: string[]; decodeId: string } | null>(null);
  const tx = TX_SAMPLES.find((t) => t.id === id) ?? TX_SAMPLES[0];
  const VBASE = { safe: { l: "Safe to sign", c: "#1fb58a", Ico: Check }, caution: { l: "Sign with caution", c: "#ff9b00", Ico: Shield }, danger: { l: "Do not sign", c: "#e63946", Ico: X } };
  const V = VBASE[tx.verdict];
  const history = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id && r.kind === "berkeley.tx.decode").slice(0, 6), [receipts, workspace.id]);

  const decode = async () => {
    setRunning(true);
    await new Promise((r) => setTimeout(r, 420));
    const seed = calldata.trim() || "0x";
    const sel = seed.slice(0, 10).toLowerCase();
    const isApproveAll = sel === "0xa22cb465";
    const isApprove = sel === "0x095ea7b3";
    const isTransfer = sel === "0xa9059cbb";
    const unlimited = isApprove && /f{20,}/i.test(seed);
    const risk = deterministicScore(seed + "|r", 0, 1);
    const verdict: "safe" | "caution" | "danger" = isApproveAll || (unlimited && risk > 0.4) || risk > 0.8 ? "danger" : isApprove || risk > 0.45 ? "caution" : "safe";
    const action = isApproveAll ? "setApprovalForAll(operator, true)" : isApprove ? `approve(spender, ${unlimited ? "MAX_UINT256" : "exact"})` : isTransfer ? "transfer(to, amount)" : "unknown method · raw call";
    const facts: [string, string][] = isApproveAll
      ? [["Touches", "every token in the collection"], ["Allowance change", "full operator rights"], ["Spender age", `${Math.round(deterministicScore(seed + "|age", 1, 800))} days`], ["Pattern", risk > 0.5 ? "matches drainer signature" : "uncommon but seen"]]
      : isApprove ? [["Touches", "token allowance"], ["Allowance change", unlimited ? "0 → unlimited" : "0 → exact amount"], ["Spender age", `${Math.round(deterministicScore(seed + "|age", 1, 900))} days`], ["Reversible", "yes — re-approve to 0"]]
      : [["Method", action], ["Value", isTransfer ? "token amount" : "0"], ["Recipient", "decoded from calldata"], ["Risk score", `${Math.round(risk * 100)}/100`]];
    const reasons = verdict === "danger" ? ["Grants broad transfer rights to the spender", "Destination looks risky / unverified", "Prefer a bounded approval or skip this"] : verdict === "caution" ? ["Allowance/scope is wider than needed", "Spender is reputable but not risk-free", "Use an exact-amount approval where possible"] : ["Standard, bounded operation", "No new broad approvals", "Output/scope is constrained"];
    const decodeId = "dec_" + hashId("dec", seed + Date.now(), 8);
    emitReceipt({ workspaceId: workspace.id, serviceId: "svc_bk_tx_explainer", serviceName: "Tx Explainer API", amount: 0.03, currency: "USDC", network: workspace.networks[0] ?? "base-sepolia", kind: "berkeley.tx.decode", payload: { calldata: seed.slice(0, 20) + "…", verdict, action, decodeId } });
    setDecoded({ verdict, action, facts, reasons, decodeId });
    setRunning(false);
  };

  return (
    <div className="panel block svc-flavor txx">
      <div className="block-head"><div className="ttl"><span className="sq soft"><Shield width={15} height={15} /></span><div><h3>Explain a pending action</h3><div className="sub">decode any wallet calldata — plain-English summary + safe / caution / danger call + receipt ($0.03)</div></div></div></div>
      <div style={{ display: "flex", gap: 8, padding: "0 16px 10px", alignItems: "stretch" }}>
        <input value={calldata} onChange={(e) => setCalldata(e.currentTarget.value)} spellCheck={false} placeholder="0x… calldata or contract address" style={{ flex: 1, padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontFamily: "var(--mono)", fontSize: ".74rem" }} />
        <button className="btn btn-acc btn-sm" type="button" onClick={decode} disabled={running}>{running ? <><Loader2 size={13} className="wallet-spin" /> Decoding…</> : <><Bolt width={13} height={13} /> Decode (paid)</>}</button>
      </div>
      {decoded && (
        <div style={{ padding: "0 16px 12px" }}>
          <div className={`txx-verdict txx-verdict--${decoded.verdict}`}>
            <span className="txx-verdict__icon">{decoded.verdict === "safe" ? <Check width={16} height={16} /> : decoded.verdict === "caution" ? <Shield width={16} height={16} /> : <X width={16} height={16} />}</span>
            <b>{VBASE[decoded.verdict].l}</b><span style={{ marginLeft: 8, fontFamily: "var(--mono)", fontSize: ".74rem", color: "var(--muted)" }}><code>{decoded.action}</code> · {decoded.decodeId}</span>
          </div>
          <div className="txx-facts">{decoded.facts.map(([k, v]) => (<div key={k} className="txx-fact"><span className="txx-fact__k">{k}</span><span className="txx-fact__v">{v}</span></div>))}</div>
          <ul className="svc-guarantees txx-reasons">{decoded.reasons.map((r) => (<li key={r}><span className="txx-bullet" style={{ background: VBASE[decoded.verdict].c }} /> {r}</li>))}</ul>
        </div>
      )}
      <div className="gw-divider"><span>or: try a worked example</span></div>
      <div className="txx-pick">
        {TX_SAMPLES.map((t) => (
          <button key={t.id} type="button" className={"txx-pick__b txx-pick__b--" + t.verdict + (t.id === id ? " on" : "")} onClick={() => setId(t.id)}>
            {t.verdict === "safe" ? "Token swap" : t.verdict === "caution" ? "Token approval" : "Approve-all NFT"}
          </button>
        ))}
      </div>
      <div className="txx-call"><code>{tx.title}</code><span className="txx-call__to">→ {tx.to}</span></div>
      <div className={`txx-verdict txx-verdict--${tx.verdict}`}>
        <span className="txx-verdict__icon"><V.Ico width={16} height={16} /></span>
        <b>{V.l}</b>
      </div>
      <div className="txx-facts">
        {tx.facts.map(([k, v]) => (<div key={k} className="txx-fact"><span className="txx-fact__k">{k}</span><span className="txx-fact__v">{v}</span></div>))}
      </div>
      <ul className="svc-guarantees txx-reasons">
        {tx.reasons.map((r) => (<li key={r}><span className="txx-bullet" style={{ background: V.c }} /> {r}</li>))}
      </ul>
      {history.length > 0 && (
        <div style={{ padding: "8px 16px 4px" }}>
          <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0" }}>Recent decodes · {history.length}</div>
          <div className="svc-hist">{history.map((r) => { const p = (r.payload ?? {}) as { calldata?: string; verdict?: string; decodeId?: string }; return (
            <div className="svc-hist__row" key={r.id}><span className="svc-hist__dot" style={{ background: p.verdict === "danger" ? "#e63946" : p.verdict === "caution" ? "#ff9b00" : "#1fb58a" }} /><div className="svc-hist__main"><b>{p.verdict?.toUpperCase()} · {p.decodeId}</b><span>{p.calldata} · {new Date(r.createdAt).toLocaleTimeString()}</span></div><span className="svc-hist__amt">{r.amount.toFixed(2)}</span></div>
          ); })}</div>
        </div>
      )}
    </div>
  );
}

// Berkeley · Agent debugger — replay an agent's last run, step by step.
const DEBUG_RUN = [
  { t: "12:04:01.220", k: "request", title: "GET /api/wallet-risk?address=0x9f…ba1", note: "agent_yield_researcher · attempt 1 · no payment header", tag: "" },
  { t: "12:04:01.244", k: "challenge", title: "← 402 Payment Required", note: "challenge ch_8f21 · svc_wallet_risk · 0.05 USDC · base-sepolia · expires in 90s", tag: "402" },
  { t: "12:04:01.310", k: "policy", title: "policy check", note: "0.05 ≤ max/req 0.25 ✓ · spentToday 1.40 + 0.05 ≤ daily 10 ✓ · svc on allowlist ✓ · network match ✓", tag: "pass" },
  { t: "12:04:01.402", k: "pay", title: "wallet signs payment", note: "0.05 USDC → 0x4c…D2f (provider wallet) · nonce bound to ch_8f21", tag: "" },
  { t: "12:04:01.560", k: "verify", title: "gateway verifies proof", note: "amount ≥ required ✓ · recipient matches ✓ · single-use ✓ · not expired ✓", tag: "" },
  { t: "12:04:01.612", k: "settle", title: "← 200 OK + receipt", note: "receipt rcpt_abc123 · txHash 0x3f8c…91 · data { riskScore: 82, … }", tag: "200" },
];
const DEBUG_SCENARIOS = [
  { id: "wallet_risk", svc: "svc_wallet_risk", name: "Wallet Risk API", price: 0.05, agent: "agent_yield_researcher", addr: "0x9f3c…ba1" },
  { id: "tx_explain", svc: "svc_tx_explainer", name: "Tx Explainer API", price: 0.03, agent: "agent_wallet_analyst", addr: "0xA17e…3F71" },
  { id: "trading_signal", svc: "svc_trading_signal", name: "Trading Signal API", price: 0.1, agent: "agent_yield_researcher", addr: "ETH/USDC" },
  { id: "tool_call", svc: "svc_research_agent", name: "Research Agent Tool", price: 0.08, agent: "agent_demo", addr: "topic=mev" },
] as const;
function buildDebugTimeline(sc: typeof DEBUG_SCENARIOS[number], seed: string) {
  const base = Date.now();
  const ts = (ms: number) => new Date(base + ms).toLocaleTimeString([], { hour12: false }) + "." + String(Math.floor(deterministicScore(seed + ms, 0, 999))).padStart(3, "0");
  const ch = "ch_" + hashId("ch", seed, 4);
  const rcpt = "rcpt_" + hashId("rc", seed, 6);
  const tx = "0x" + hashId("tx", seed, 12);
  return [
    { t: ts(0), k: "request", title: `GET /api/${sc.svc}?q=${sc.addr}`, note: `${sc.agent} · attempt 1 · no payment header`, tag: "" },
    { t: ts(24), k: "challenge", title: "← 402 Payment Required", note: `challenge ${ch} · ${sc.svc} · ${sc.price} USDC · base-sepolia · expires in 90s`, tag: "402" },
    { t: ts(96), k: "policy", title: "policy check", note: `${sc.price} ≤ max/req 0.25 ✓ · spentToday ${deterministicScore(seed + "|st", 0.4, 4).toFixed(2)} + ${sc.price} ≤ daily 10 ✓ · ${sc.svc} on allowlist ✓ · network match ✓`, tag: "pass" },
    { t: ts(190), k: "pay", title: "wallet signs payment", note: `${sc.price} USDC → provider wallet · nonce bound to ${ch}`, tag: "" },
    { t: ts(350), k: "verify", title: "gateway verifies proof", note: "amount ≥ required ✓ · recipient matches ✓ · single-use ✓ · not expired ✓", tag: "" },
    { t: ts(412), k: "settle", title: "← 200 OK + receipt", note: `receipt ${rcpt} · txHash ${tx}… · data { … }`, tag: "200" },
  ];
}
function AgentDebuggerPanel({ workspace }: { workspace: Workspace }) {
  const { emitReceipt, receipts } = useAppState();
  const [open, setOpen] = useState<number | null>(1);
  const [scId, setScId] = useState<string>(DEBUG_SCENARIOS[0].id);
  const [running, setRunning] = useState(false);
  const [timeline, setTimeline] = useState(DEBUG_RUN);
  const sc = DEBUG_SCENARIOS.find((x) => x.id === scId) ?? DEBUG_SCENARIOS[0];
  const history = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id && r.kind === "berkeley.debug.run").slice(0, 6), [receipts, workspace.id]);
  const rerun = async () => {
    setRunning(true); setOpen(1);
    await new Promise((r) => setTimeout(r, 480));
    const seed = sc.id + Date.now();
    setTimeline(buildDebugTimeline(sc, seed));
    emitReceipt({ workspaceId: workspace.id, serviceId: "svc_bk_debug", serviceName: "Agent Debugger · Re-run", amount: 0.02, currency: "USDC", network: workspace.networks[0] ?? "base-sepolia", kind: "berkeley.debug.run", payload: { scenario: sc.id, svc: sc.svc, agent: sc.agent, price: sc.price } });
    setRunning(false);
  };
  return (
    <div className="panel block svc-flavor dbg">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><Bolt width={15} height={15} /></span><div><h3>Replay an agent run</h3><div className="sub">pick a scenario, re-run it, and inspect every step: request → 402 → policy → pay → verify → receipt</div></div></div>
        <div className="row sm" style={{ gap: 8 }}>
          <select value={scId} onChange={(e) => setScId(e.currentTarget.value)} style={{ padding: "6px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".8rem" }}>{DEBUG_SCENARIOS.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.agent})</option>)}</select>
          <button className="btn btn-acc btn-sm" type="button" onClick={rerun} disabled={running}>{running ? <><Loader2 size={13} className="wallet-spin" /> Running…</> : <><Play width={13} height={13} /> Re-run scenario</>}</button>
        </div>
      </div>
      <ol className="dbg-tl">
        {timeline.map((s, i) => (
          <li key={i} className={`dbg-step dbg-step--${s.k}` + (open === i ? " open" : "")}>
            <button type="button" className="dbg-step__row" onClick={() => setOpen(open === i ? null : i)}>
              <span className="dbg-step__t">{s.t}</span>
              <span className="dbg-step__title">{s.title}</span>
              {s.tag && <span className={`pg-tag pg-tag--${s.tag === "402" ? "402" : s.tag === "200" ? "200" : "ok"}`}>{s.tag}</span>}
            </button>
            {open === i && <div className="dbg-step__note">{s.note}</div>}
          </li>
        ))}
      </ol>
      {history.length > 0 && (
        <div style={{ padding: "8px 16px 4px" }}>
          <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0" }}>Recent re-runs · {history.length}</div>
          <div className="svc-hist">{history.map((r) => { const p = (r.payload ?? {}) as { scenario?: string; agent?: string; svc?: string }; return (
            <div className="svc-hist__row" key={r.id}><span className="svc-hist__dot" style={{ background: "var(--accent-primary)" }} /><div className="svc-hist__main"><b>{p.svc}</b><span>{p.agent} · {new Date(r.createdAt).toLocaleTimeString()}</span></div><span className="svc-hist__amt">{r.amount.toFixed(2)}</span></div>
          ); })}</div>
        </div>
      )}
    </div>
  );
}

// Arbitrum · Orbit chain monitor — chains feeding the gateway.
const ORBIT_CHAINS = [
  { name: "Arbitrum One", id: "42161", block: 271_004_882, settle: "verified", bridge: "healthy", batch: "8s ago" },
  { name: "Arbitrum Nova", id: "42170", block: 64_812_771, settle: "verified", bridge: "healthy", batch: "11s ago" },
  { name: "Orbit · GameChain", id: "660279", block: 9_441_207, settle: "pending", bridge: "healthy", batch: "31s ago" },
  { name: "Orbit · PaymentsL3", id: "421614", block: 12_004_512, settle: "verified", bridge: "degraded", batch: "2m ago" },
];
const ORBIT_METRICS = ["latest block", "batch lag", "bridge health", "sequencer uptime", "gas"] as const;
function OrbitMonitorPanel({ workspace }: { workspace: Workspace }) {
  const { emitReceipt, receipts } = useAppState();
  const [subs, setSubs] = useLocalStore<Record<string, boolean>>("arb.orbit.subs", { "660279": true });
  const [metric, setMetric] = useState<Record<string, typeof ORBIT_METRICS[number]>>({});
  const [open, setOpen] = useState<Record<string, { metric: string; value: string; queryId: string } | null>>({});
  const queries = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id && r.kind === "arb.orbit.query").slice(0, 8), [receipts, workspace.id]);

  const metricValue = (chainId: string, m: string): string => {
    const seed = chainId + "|" + m;
    if (m === "latest block") return "#" + Math.round(deterministicScore(seed, 1e6, 3e8)).toLocaleString();
    if (m === "batch lag") return Math.round(deterministicScore(seed, 4, 180)) + "s";
    if (m === "bridge health") return deterministicScore(seed, 0, 1) > 0.18 ? "healthy" : "degraded";
    if (m === "sequencer uptime") return (99 + deterministicScore(seed, 0, 0.99)).toFixed(2) + "%";
    return deterministicScore(seed, 0.01, 0.4).toFixed(3) + " gwei";
  };

  const query = (c: typeof ORBIT_CHAINS[number]) => {
    const m = metric[c.id] ?? ORBIT_METRICS[0];
    const value = metricValue(c.id, m);
    const queryId = "orb_" + hashId("orb", c.id + m + Date.now(), 8);
    emitReceipt({ workspaceId: workspace.id, serviceId: "svc_arb_orbit", serviceName: "Orbit Monitor API · " + c.name, amount: 0.004, currency: "USDC", network: "arbitrum-sepolia", kind: "arb.orbit.query", payload: { chain: c.name, chainId: c.id, metric: m, value, queryId } });
    setOpen((o) => ({ ...o, [c.id]: { metric: m, value, queryId } }));
  };
  const toggleSub = (c: typeof ORBIT_CHAINS[number]) => {
    const next = !subs[c.id];
    setSubs((s) => ({ ...s, [c.id]: next }));
    if (next) emitReceipt({ workspaceId: workspace.id, serviceName: "Orbit Alerts · " + c.name, amount: 0, currency: "USDC", network: "arbitrum-sepolia", kind: "arb.orbit.alert", payload: { chain: c.name, chainId: c.id, event: "subscription_active" } });
  };
  const simulateAlert = (c: typeof ORBIT_CHAINS[number]) => emitReceipt({ workspaceId: workspace.id, serviceName: "Orbit Alert · " + c.name, amount: 0, currency: "USDC", network: "arbitrum-sepolia", kind: "arb.orbit.alert", payload: { chain: c.name, chainId: c.id, event: "batch_lag_spike", value: Math.round(deterministicScore(c.id + Date.now(), 60, 300)) + "s" } });

  const activeSubs = ORBIT_CHAINS.filter((c) => subs[c.id]);

  return (
    <div className="panel block svc-flavor">
      <div className="block-head"><div className="ttl"><span className="sq soft"><Network width={15} height={15} /></span><div><h3>Orbit chain monitor</h3><div className="sub">pick a metric, run a paid query, or subscribe to alerts — each query is metered ($0.004) and leaves a receipt</div></div></div></div>
      <div className="svc-table__scroll"><table className="svc-table">
        <thead><tr><th>Chain</th><th>Chain ID</th><th>Block height</th><th>Bridge</th><th>Metric</th><th aria-label="actions" /></tr></thead>
        <tbody>
          {ORBIT_CHAINS.map((c) => (
            <Fragment key={c.id}>
              <tr>
                <td><b>{c.name}</b></td>
                <td><code>{c.id}</code></td>
                <td className="svc-table__num">#{c.block.toLocaleString()}</td>
                <td><span className={`pill ${c.bridge === "healthy" ? "ok" : "warn"}`} style={{ textTransform: "capitalize" }}>{c.bridge}</span></td>
                <td>
                  <select value={metric[c.id] ?? ORBIT_METRICS[0]} onChange={(e) => setMetric((m) => ({ ...m, [c.id]: e.currentTarget.value as typeof ORBIT_METRICS[number] }))} style={{ padding: "5px 7px", borderRadius: 7, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".74rem" }}>{ORBIT_METRICS.map((m) => <option key={m}>{m}</option>)}</select>
                </td>
                <td>
                  <span className="row sm" style={{ gap: 6 }}>
                    <button className="btn btn-acc btn-sm" type="button" onClick={() => query(c)}><Bolt width={11} height={11} /> Query</button>
                    <button className={"btn btn-sm" + (subs[c.id] ? " btn-ghost" : "")} type="button" onClick={() => toggleSub(c)}>{subs[c.id] ? "Unsubscribe" : "Subscribe"}</button>
                    {subs[c.id] && <button className="btn btn-ghost btn-sm" type="button" onClick={() => simulateAlert(c)} title="simulate an alert delivery"><Radio width={11} height={11} /></button>}
                  </span>
                </td>
              </tr>
              {open[c.id] && (
                <tr>
                  <td colSpan={6} style={{ background: "var(--field)", padding: "8px 14px" }}>
                    <span style={{ fontSize: ".78rem", fontFamily: "var(--mono)" }}><b>{open[c.id]!.metric}</b> = <b style={{ color: "var(--accent-primary)" }}>{open[c.id]!.value}</b> · query <code>{open[c.id]!.queryId}</code></span>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table></div>
      {(queries.length > 0 || activeSubs.length > 0) && (
        <div style={{ padding: "0 16px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0" }}>Recent queries · {queries.length}</div>
            <div className="svc-hist">{queries.length === 0 && <div className="muted sm">No queries yet.</div>}{queries.map((r) => { const p = (r.payload ?? {}) as { chain?: string; metric?: string; value?: string }; return (
              <div className="svc-hist__row" key={r.id}><span className="svc-hist__dot" style={{ background: "var(--accent-primary)" }} /><div className="svc-hist__main"><b>{p.chain}</b><span>{p.metric}: {p.value} · {new Date(r.createdAt).toLocaleTimeString()}</span></div><span className="svc-hist__amt">{r.amount.toFixed(3)}</span></div>
            ); })}</div>
          </div>
          <div>
            <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0" }}>Active subscriptions · {activeSubs.length}</div>
            <div className="svc-hist">{activeSubs.length === 0 && <div className="muted sm">No subscriptions.</div>}{activeSubs.map((c) => (
              <div className="svc-hist__row" key={c.id}><span className="svc-hist__dot" style={{ background: "#1fb58a" }} /><div className="svc-hist__main"><b>{c.name}</b><span>chain {c.id} · alerts on</span></div><span className="pill ok">live</span></div>
            ))}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// QIE · Checkout — build a hosted payment link agents can pay, then settle it.
const QIE_LINK_PURPOSES = ["Wallet risk lookup", "Tax export bundle", "Swap quote bundle", "Inference job", "Custom"];
type BuiltLink = { id: string; purpose: string; amount: string; url: string; state: "pending" | "paid"; txHash?: string };
type SplitConfig = { merchant: number; platform: number; referrer: number; referrerWallet: string };
function CheckoutLinkBuilder({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [split] = useLocalStore<SplitConfig>("qie.settlement.split", { merchant: 90, platform: 8, referrer: 2, referrerWallet: "0xref9a2c1e0bf3" });
  const [purpose, setPurpose] = useState(QIE_LINK_PURPOSES[0]);
  const [amount, setAmount] = useState("0.05");
  const [links, setLinks] = useLocalStore<BuiltLink[]>("qie.links", []);
  const make = () => {
    const a = (parseFloat(amount) || 0).toFixed(3);
    const id = "lnk_" + hashId("lnk", purpose + a + Date.now(), 6);
    setLinks((ls) => [{ id, purpose, amount: a, url: `https://qie.pay/${id}`, state: "pending" as const }, ...ls].slice(0, 12));
  };
  const settle = (l: BuiltLink) => {
    if (l.state === "paid") return;
    const amt = parseFloat(l.amount) || 0;
    const txHash = "0x" + hashId("tx", l.id, 12);
    setLinks((ls) => ls.map((x) => x.id === l.id ? { ...x, state: "paid", txHash } : x));
    const parent = emitReceipt({ workspaceId: workspace.id, serviceId: "svc_qie_checkout", serviceName: "QIE Checkout · " + l.purpose, amount: amt, currency: "USDC", network: workspace.networks[0] ?? "qie-testnet", kind: "qie.checkout.settle", payload: { linkId: l.id, purpose: l.purpose, url: l.url, txHash } });
    // fan out the split
    ([["merchant", split.merchant, ""], ["platform", split.platform, ""], ["referrer", split.referrer, split.referrerWallet]] as [string, number, string][]).forEach(([party, pct, wallet]) => {
      if (pct <= 0) return;
      emitReceipt({ workspaceId: workspace.id, serviceId: "svc_qie_checkout", serviceName: `QIE Settlement · ${party}`, amount: Number((amt * pct / 100).toFixed(4)), currency: "USDC", network: workspace.networks[0] ?? "qie-testnet", kind: "qie.settlement.split", payload: { party, pct, wallet, parentTx: txHash, parentReceipt: parent.id } });
    });
  };
  const paid = links.filter((l) => l.state === "paid");
  const collected = paid.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
  const amtNum = parseFloat(amount) || 0;
  return (
    <div className="panel block svc-flavor clb">
      <div className="block-head"><div className="ttl"><span className="sq soft"><LinkIco width={15} height={15} /></span><div><h3>Build a payment link</h3><div className="sub">hosted 402-gated endpoint agents can pay — create it, share it, settle it, get a receipt + split fan-out</div></div></div></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 175px", gap: 16, padding: "0 16px 10px", alignItems: "start" }}>
        <div className="clb-form" style={{ padding: 0 }}>
          <label className="clb-field"><span>Purpose</span>
            <select value={purpose} onChange={(e) => setPurpose(e.currentTarget.value)}>{QIE_LINK_PURPOSES.map((p) => <option key={p}>{p}</option>)}</select>
          </label>
          <label className="clb-field"><span>Amount (USDC)</span>
            <input value={amount} onChange={(e) => setAmount(e.currentTarget.value)} inputMode="decimal" placeholder="0.05" />
          </label>
          <button className="btn btn-acc btn-sm" type="button" onClick={make}><Plus width={13} height={13} /> Create link</button>
        </div>
        {/* Live phone mockup */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={{ width: 155, background: "var(--bg-2)", border: "5px solid var(--ink)", borderRadius: 28, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,.25)" }}>
            <div style={{ height: 22, background: "var(--ink)", display: "flex", justifyContent: "center", alignItems: "center" }}>
              <div style={{ width: 44, height: 7, background: "var(--bg-2)", borderRadius: 4 }} />
            </div>
            <div style={{ padding: "14px 12px 18px", minHeight: 190, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ fontSize: ".6rem", fontWeight: 800, letterSpacing: ".06em", color: "var(--muted)", textTransform: "uppercase" }}>QIE Pay</div>
              <div style={{ textAlign: "center", margin: "6px 0 2px" }}>
                <div style={{ fontSize: "1.7rem", fontWeight: 900, color: "var(--accent-primary)", lineHeight: 1 }}>${amtNum.toFixed(2)}</div>
                <div style={{ fontSize: ".58rem", color: "var(--muted)", marginTop: 2 }}>USDC</div>
              </div>
              <div style={{ fontSize: ".62rem", color: "var(--ink)", textAlign: "center", fontWeight: 600, padding: "0 4px" }}>{purpose || "Payment"}</div>
              <div style={{ width: "100%", marginTop: 8, background: "var(--accent-primary)", borderRadius: 10, padding: "9px 0", textAlign: "center", fontSize: ".7rem", fontWeight: 800, color: "#fff", cursor: "pointer" }}>Pay Now</div>
              <div style={{ width: "100%", padding: "6px 8px", background: "var(--bg-3)", borderRadius: 8, fontSize: ".52rem", color: "var(--muted)", textAlign: "center", wordBreak: "break-all", marginTop: 2 }}>qie.pay/lnk_preview</div>
            </div>
          </div>
        </div>
      </div>
      {paid.length > 0 && (
        <div style={{ margin: "0 16px 10px", padding: "7px 12px", borderRadius: 10, background: "color-mix(in srgb, var(--green) 12%, transparent)", color: "var(--green)", fontSize: ".78rem", fontWeight: 700 }}>
          Collected: ${collected.toFixed(3)} USDC across {paid.length} paid link{paid.length === 1 ? "" : "s"} · split {split.merchant}/{split.platform}/{split.referrer}%
        </div>
      )}
      {links.length === 0 ? (
        <p className="clb-empty">No links yet — create one above. Every link is a real 402-gated endpoint stub; click "Simulate payment" to settle it.</p>
      ) : (
        <div className="svc-table__scroll"><table className="svc-table">
          <thead><tr><th>Link</th><th>For</th><th>Amount</th><th>State</th><th aria-label="actions" /></tr></thead>
          <tbody>
            {links.map((l) => (
              <tr key={l.id}>
                <td><code>{l.url.replace("https://", "")}</code></td>
                <td>{l.purpose}</td>
                <td className="svc-table__num">${l.amount} <span className="muted">USDC</span></td>
                <td>{badgeFor(l.state === "paid" ? "verified" : "pending")}</td>
                <td>
                  <span className="row sm" style={{ gap: 6 }}>
                    <CopyLine text={l.url} className="btn btn-ghost btn-sm" />
                    {l.state === "paid" ? <span className="muted" style={{ fontSize: ".7rem", fontFamily: "var(--mono)" }}>{l.txHash?.slice(0, 12)}…</span> : <button className="btn btn-acc btn-sm" type="button" onClick={() => settle(l)}><Check width={11} height={11} /> Simulate payment</button>}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </div>
  );
}

function SettlementSplitConfig({ workspace }: { workspace: Workspace }) {
  const { emitReceipt, receipts } = useAppState();
  const [split, setSplit] = useLocalStore<SplitConfig>("qie.settlement.split", { merchant: 90, platform: 8, referrer: 2, referrerWallet: "0xref9a2c1e0bf3" });
  const [saved, setSaved] = useState(false);
  const sum = split.merchant + split.platform + split.referrer;
  const lastPaid = useMemo(() => { const r = receipts.find((x) => x.workspaceId === workspace.id && x.kind === "qie.checkout.settle"); return r?.amount ?? 1; }, [receipts, workspace.id]);
  const configs = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id && r.kind === "qie.settlement.config").slice(0, 5), [receipts, workspace.id]);
  const set = (k: keyof SplitConfig, v: number | string) => { setSplit((s) => ({ ...s, [k]: v })); setSaved(false); };
  const save = () => { emitReceipt({ workspaceId: workspace.id, serviceName: "QIE Settlement Config", amount: 0, currency: "USDC", network: workspace.networks[0] ?? "qie-testnet", kind: "qie.settlement.config", payload: { ...split } }); setSaved(true); };
  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><CircleDollarSign width={15} height={15} /></span><div><h3>Settlement split</h3><div className="sub">how each settled checkout payment is routed · applied by every "Simulate payment" above</div></div></div>
        <button className="btn btn-acc btn-sm" type="button" onClick={save} disabled={Math.abs(sum - 100) > 0.01}><Check width={13} height={13} /> Save split config</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1.6fr", gap: 10, padding: "0 16px 10px" }}>
        {(["merchant", "platform", "referrer"] as const).map((k) => (
          <label key={k} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>{k} %</span>
            <input value={String(split[k])} onChange={(e) => set(k, parseFloat(e.currentTarget.value) || 0)} inputMode="decimal" style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }} />
          </label>
        ))}
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Referrer wallet</span>
          <input value={split.referrerWallet} onChange={(e) => set("referrerWallet", e.currentTarget.value)} style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".8rem", fontFamily: "var(--mono)" }} />
        </label>
      </div>
      <div style={{ padding: "0 16px 12px", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: ".78rem", color: "var(--muted)" }}>On a <b style={{ color: "var(--ink)" }}>${lastPaid.toFixed(2)}</b> payment → merchant <b style={{ color: "var(--ink)" }}>${(lastPaid * split.merchant / 100).toFixed(3)}</b> · platform <b style={{ color: "var(--ink)" }}>${(lastPaid * split.platform / 100).toFixed(3)}</b> · referrer <b style={{ color: "var(--ink)" }}>${(lastPaid * split.referrer / 100).toFixed(3)}</b></span>
        <span style={{ fontSize: ".74rem", fontWeight: 700, color: Math.abs(sum - 100) > 0.01 ? "var(--red)" : "var(--green)" }}>total {sum}% {Math.abs(sum - 100) > 0.01 ? "(must equal 100)" : "✓"}</span>
        {saved && <span style={{ fontSize: ".74rem", color: "var(--green)", fontWeight: 700 }}><Check width={12} height={12} /> saved</span>}
      </div>
      {configs.length > 0 && (
        <div style={{ padding: "0 16px 14px" }}>
          <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0" }}>Recent config changes · {configs.length}</div>
          <div className="svc-hist">{configs.map((r) => { const p = (r.payload ?? {}) as SplitConfig; return (
            <div className="svc-hist__row" key={r.id}><span className="svc-hist__dot" style={{ background: "var(--accent-primary)" }} /><div className="svc-hist__main"><b>{p.merchant}/{p.platform}/{p.referrer}%</b><span>referrer {String(p.referrerWallet ?? "").slice(0, 12)}… · {new Date(r.createdAt).toLocaleTimeString()}</span></div></div>
          ); })}</div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// QIE — Bill Splitter
// ---------------------------------------------------------------------------
type SplitPerson = { name: string; custom: string };
function QieBillSplitter({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [total, setTotal] = useState("48.00");
  const [currency, setCurrency] = useState<"QIE" | "USDT">("USDT");
  const [people, setPeople] = useState<SplitPerson[]>([
    { name: "Alex", custom: "" },
    { name: "Mia", custom: "" },
    { name: "Sam", custom: "" },
  ]);
  const [mode, setMode] = useState<"equal" | "custom">("equal");
  const [done, setDone] = useState<{ name: string; share: number; link: string }[] | null>(null);

  const t = parseFloat(total) || 0;
  const equalShare = people.length > 0 ? t / people.length : 0;
  const addPerson = () => setPeople((p) => [...p, { name: `Person ${p.length + 1}`, custom: "" }]);
  const rmPerson = (i: number) => setPeople((p) => p.filter((_, j) => j !== i));
  const setName = (i: number, v: string) => setPeople((p) => p.map((x, j) => j === i ? { ...x, name: v } : x));
  const setCustom = (i: number, v: string) => setPeople((p) => p.map((x, j) => j === i ? { ...x, custom: v } : x));
  const customTotal = people.reduce((s, p) => s + (parseFloat(p.custom) || 0), 0);
  const validCustom = Math.abs(customTotal - t) < 0.01;

  const split = () => {
    const results = people.map((p, i) => {
      const share = mode === "equal" ? equalShare : (parseFloat(p.custom) || 0);
      const id = hashId("split", p.name + i + Date.now(), 6);
      const link = `https://pay.qie.digital/bill/${id}?amount=${share.toFixed(2)}&currency=${currency}&to=${p.name.replace(/\s/g, "+")}`;
      emitReceipt({ workspaceId: workspace.id, serviceName: "QIE Bill Split", amount: share, currency: "USDC", network: workspace.networks[0] ?? "qie-testnet", kind: "qie.bill.split", payload: { person: p.name, share, link, batchTotal: t } });
      return { name: p.name, share, link };
    });
    setDone(results);
  };

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft">🍕</span><div><h3>Bill splitter</h3><div className="sub">split any amount between people · get a payment link per person · everyone pays their share in QIE or USDT</div></div></div>
      </div>
      <div style={{ padding: "0 16px 4px" }}>
        {/* total + currency */}
        <div className="row sm" style={{ gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 140 }}>
            <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Total bill</span>
            <input value={total} onChange={(e) => { setTotal(e.currentTarget.value); setDone(null); }} inputMode="decimal" style={{ padding: "10px 12px", borderRadius: 10, border: "2px solid var(--accent-primary)", background: "var(--bg-2)", color: "var(--ink)", fontSize: "1.1rem", fontWeight: 800 }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Currency</span>
            <select value={currency} onChange={(e) => setCurrency(e.currentTarget.value as "QIE" | "USDT")} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".9rem" }}><option>QIE</option><option>USDT</option></select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Split mode</span>
            <div className="row sm" style={{ gap: 0, borderRadius: 10, overflow: "hidden", border: "1px solid var(--line-2)" }}>
              {(["equal", "custom"] as const).map((m) => <button key={m} type="button" className="btn btn-ghost btn-sm" style={{ flex: 1, borderRadius: 0, background: mode === m ? "var(--accent-primary)" : "var(--bg-2)", color: mode === m ? "#fff" : "var(--muted)", fontWeight: mode === m ? 800 : 400, padding: "8px 14px" }} onClick={() => { setMode(m); setDone(null); }}>{m === "equal" ? "Equal" : "Custom"}</button>)}
            </div>
          </label>
        </div>
        {/* people list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
          {people.map((p, i) => (
            <div key={i} className="row sm" style={{ gap: 8, padding: "8px 12px", borderRadius: 10, background: "var(--bg-2)", border: "1px solid var(--line-2)" }}>
              <span style={{ width: 24, height: 24, borderRadius: "50%", background: `hsl(${i * 60},60%,55%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".7rem", fontWeight: 900, color: "#fff", flexShrink: 0 }}>{p.name[0]?.toUpperCase()}</span>
              <input value={p.name} onChange={(e) => { setName(i, e.currentTarget.value); setDone(null); }} placeholder="Name" style={{ flex: 1, padding: "5px 8px", borderRadius: 7, border: "1px solid var(--line-2)", background: "var(--field)", color: "var(--ink)", fontSize: ".85rem" }} />
              {mode === "equal"
                ? <span style={{ fontSize: ".9rem", fontWeight: 800, color: "var(--accent-primary)", minWidth: 70, textAlign: "right" }}>{currency} {equalShare.toFixed(2)}</span>
                : <input value={p.custom} onChange={(e) => { setCustom(i, e.currentTarget.value); setDone(null); }} inputMode="decimal" placeholder="0.00" style={{ width: 80, padding: "5px 8px", borderRadius: 7, border: "1px solid var(--line-2)", background: "var(--field)", color: "var(--ink)", fontSize: ".85rem", textAlign: "right" }} />
              }
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { rmPerson(i); setDone(null); }} style={{ color: "var(--muted)", padding: "4px 6px" }}><X width={13} height={13} /></button>
            </div>
          ))}
          <div className="row sm" style={{ gap: 10, marginTop: 2 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={addPerson}><Plus width={12} height={12} /> Add person</button>
            {mode === "custom" && <span style={{ fontSize: ".74rem", color: validCustom ? "var(--green)" : "var(--red)", fontWeight: 700 }}>sum {customTotal.toFixed(2)} / {t.toFixed(2)} {validCustom ? "✓" : "— must match total"}</span>}
          </div>
        </div>
        <button type="button" className="btn btn-acc" style={{ width: "100%", padding: "11px 0", fontSize: ".92rem", fontWeight: 800 }} onClick={split} disabled={people.length === 0 || (mode === "custom" && !validCustom)}>
          Generate {people.length} payment link{people.length !== 1 ? "s" : ""} →
        </button>
        {/* results */}
        {done && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            {done.map((d, i) => (
              <div key={i} style={{ padding: "10px 14px", borderRadius: 12, background: "color-mix(in srgb, var(--green) 8%, var(--bg-2))", border: "1px solid color-mix(in srgb, var(--green) 25%, transparent)" }}>
                <div className="row sm" style={{ gap: 8, marginBottom: 4 }}>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", background: `hsl(${i * 60},60%,55%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".66rem", fontWeight: 900, color: "#fff" }}>{d.name[0]?.toUpperCase()}</span>
                  <span style={{ fontWeight: 800, flex: 1 }}>{d.name}</span>
                  <span style={{ fontWeight: 900, color: "var(--green)" }}>{currency} {d.share.toFixed(2)}</span>
                </div>
                <div className="row sm" style={{ gap: 6 }}>
                  <code style={{ fontSize: ".65rem", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--muted)" }}>{d.link}</code>
                  <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: ".68rem" }} onClick={() => navigator.clipboard?.writeText(d.link)}><Copy width={11} height={11} /> Copy</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ height: 14 }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// QIE — Request Payment (like "PayPal me" but on QIE)
// ---------------------------------------------------------------------------
function QieRequestPay({ workspace }: { workspace: Workspace }) {
  const { address } = useWallet();
  const [amount, setAmount] = useState("10.00");
  const [note, setNote] = useState("for the design work");
  const [currency, setCurrency] = useState<"QIE" | "USDT">("USDT");
  const [copied, setCopied] = useState(false);

  const myAddr = address ?? ("0xmy" + hashId("me", workspace.id, 12));
  const link = `https://pay.qie.digital/request?to=${myAddr.slice(0, 12)}&amount=${amount}&currency=${currency}&note=${encodeURIComponent(note)}`;

  const copy = () => { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft">💸</span><div><h3>Request payment</h3><div className="sub">fill in amount + note → share a link → payer opens it and pays you instantly in QIE / USDT</div></div></div>
      </div>
      <div style={{ padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Amount</span>
            <input value={amount} onChange={(e) => setAmount(e.currentTarget.value)} inputMode="decimal" style={{ padding: "9px 11px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".95rem", fontWeight: 800 }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Currency</span>
            <select value={currency} onChange={(e) => setCurrency(e.currentTarget.value as "QIE" | "USDT")} style={{ padding: "9px 11px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".9rem" }}><option>QIE</option><option>USDT</option></select>
          </label>
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Note (what is it for?)</span>
          <input value={note} onChange={(e) => setNote(e.currentTarget.value)} placeholder="e.g. dinner last Friday" style={{ padding: "9px 11px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".88rem" }} />
        </label>
        {/* link preview */}
        <div style={{ padding: "12px 14px", borderRadius: 12, background: "color-mix(in srgb, var(--accent-primary) 7%, var(--bg-2))", border: "1px solid color-mix(in srgb, var(--accent-primary) 20%, transparent)" }}>
          <div style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700, marginBottom: 6 }}>Your payment request link</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--muted)", wordBreak: "break-all", marginBottom: 8 }}>{link}</div>
          <button type="button" className="btn btn-acc" style={{ width: "100%", padding: "9px 0", fontWeight: 800 }} onClick={copy}>
            {copied ? <><Check width={14} height={14} /> Copied!</> : <><Copy width={14} height={14} /> Copy link</>}
          </button>
        </div>
        <div style={{ fontSize: ".72rem", color: "var(--muted)", textAlign: "center" }}>Send this link to anyone · they open it · pay with one click · you get notified</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MANTLE — "How much will I earn?" calculator
// ---------------------------------------------------------------------------
function MantleEarnCalc({ workspace }: { workspace: Workspace }) {
  const [amount, setAmount] = useState("1000");
  const [asset, setAsset] = useState<"mETH" | "USDY">("mETH");
  const APY: Record<"mETH" | "USDY", number> = { mETH: 4.12, USDY: 5.03 };
  const apy = APY[asset];
  const principal = parseFloat(amount) || 0;

  const periods = [
    { label: "7 days",   days: 7 },
    { label: "30 days",  days: 30 },
    { label: "90 days",  days: 90 },
    { label: "1 year",   days: 365 },
  ] as const;

  const earn = (days: number) => +(principal * apy / 100 * days / 365).toFixed(4);
  const maxEarn = earn(365);
  const col = asset === "mETH" ? "#3b82f6" : "#10b981";

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft">📈</span><div><h3>How much will I earn?</h3><div className="sub">enter your amount → see projected yield for {asset} at {apy}% APY</div></div></div>
      </div>
      <div style={{ padding: "0 16px 16px" }}>
        <div className="row sm" style={{ gap: 10, marginBottom: 18 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
            <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>I have</span>
            <input value={amount} onChange={(e) => setAmount(e.currentTarget.value)} inputMode="decimal" style={{ padding: "10px 12px", borderRadius: 10, border: `2px solid ${col}`, background: "var(--bg-2)", color: "var(--ink)", fontSize: "1.15rem", fontWeight: 800 }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Asset</span>
            <div className="row sm" style={{ gap: 0, borderRadius: 10, overflow: "hidden", border: "1px solid var(--line-2)" }}>
              {(["mETH", "USDY"] as const).map((a) => <button key={a} type="button" className="btn btn-ghost btn-sm" style={{ borderRadius: 0, background: asset === a ? col : "var(--bg-2)", color: asset === a ? "#fff" : "var(--muted)", fontWeight: asset === a ? 800 : 400, padding: "9px 16px" }} onClick={() => setAsset(a)}>{a}</button>)}
            </div>
          </label>
        </div>
        {/* bar chart */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, alignItems: "end", height: 120 }}>
          {periods.map((p) => {
            const e = earn(p.days);
            const h = maxEarn > 0 ? Math.max(8, (e / maxEarn) * 90) : 8;
            return (
              <div key={p.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ fontSize: ".78rem", fontWeight: 900, color: col }}>${e.toFixed(2)}</div>
                <div style={{ width: "100%", height: h, background: col, borderRadius: "6px 6px 0 0", opacity: 0.85 }} />
                <div style={{ fontSize: ".64rem", color: "var(--muted)", textAlign: "center" }}>{p.label}</div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 12, background: `color-mix(in srgb, ${col} 10%, var(--bg-2))`, border: `1px solid ${col}30` }}>
          <span style={{ fontWeight: 900, color: col, fontSize: ".95rem" }}>${principal.toFixed(2)}</span>
          <span style={{ color: "var(--muted)", fontSize: ".85rem" }}> in {asset} at {apy}% APY earns </span>
          <span style={{ fontWeight: 900, color: col, fontSize: ".95rem" }}>${earn(365).toFixed(2)}</span>
          <span style={{ color: "var(--muted)", fontSize: ".85rem" }}> over 1 year</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 0G — Storage Cost Estimator
// ---------------------------------------------------------------------------
function OgStorageEstimator() {
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
        {/* cost breakdown */}
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

// ---------------------------------------------------------------------------
// ARBITRUM — Address Book (quick-fill for USDC sends)
// ---------------------------------------------------------------------------
type SavedAddr = { nick: string; address: string; tag: string };
function ArbAddressBook({ onSelect }: { onSelect?: (addr: string) => void }) {
  const [book, setBook] = useLocalStore<SavedAddr[]>("arb.addrbook", [
    { nick: "Alice", address: "0xAb12000000000000000000000000000000003f4a", tag: "colleague" },
    { nick: "Treasury", address: "0xDEAD000000000000000000000000000000beef01", tag: "company" },
  ]);
  const [nick, setNick] = useState("");
  const [addr, setAddr] = useState("");
  const [tag, setTag] = useState("friend");
  const [copied, setCopied] = useState<string | null>(null);

  const add = () => {
    if (!addr.startsWith("0x") || addr.length !== 42) return;
    setBook((b) => [...b.filter((x) => x.address !== addr), { nick: nick.trim() || addr.slice(0, 8), address: addr, tag }].slice(0, 20));
    setNick(""); setAddr(""); setTag("friend");
  };
  const remove = (address: string) => setBook((b) => b.filter((x) => x.address !== address));
  const copy = (address: string) => { navigator.clipboard?.writeText(address); setCopied(address); setTimeout(() => setCopied(null), 1500); };

  const tagColor: Record<string, string> = { friend: "#3b82f6", colleague: "#8b5cf6", company: "#f59e0b", exchange: "#10b981" };

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft">📒</span><div><h3>Address book</h3><div className="sub">save wallet addresses with nicknames · click to copy or auto-fill the USDC send form below</div></div></div>
      </div>
      <div style={{ padding: "0 16px 14px" }}>
        {/* saved entries */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, marginBottom: 14 }}>
          {book.length === 0 && <div style={{ fontSize: ".8rem", color: "var(--muted)", padding: "8px 0" }}>No saved addresses yet.</div>}
          {book.map((e) => (
            <div key={e.address} style={{ padding: "10px 12px", borderRadius: 12, background: "var(--bg-2)", border: "1px solid var(--line-2)", display: "flex", flexDirection: "column", gap: 5 }}>
              <div className="row sm" style={{ gap: 6 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: (tagColor[e.tag] ?? "#64748b") + "22", border: `1.5px solid ${tagColor[e.tag] ?? "#64748b"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".75rem", fontWeight: 900, color: tagColor[e.tag] ?? "#64748b" }}>{e.nick[0]?.toUpperCase()}</div>
                <span style={{ fontWeight: 800, flex: 1 }}>{e.nick}</span>
                <span className="pill" style={{ background: (tagColor[e.tag] ?? "#64748b") + "18", color: tagColor[e.tag] ?? "#64748b", fontSize: ".6rem" }}>{e.tag}</span>
              </div>
              <div style={{ fontFamily: "var(--mono)", fontSize: ".66rem", color: "var(--muted)" }}>{e.address.slice(0, 10)}…{e.address.slice(-6)}</div>
              <div className="row sm" style={{ gap: 4, marginTop: 2 }}>
                <button type="button" className="btn btn-ghost btn-sm" style={{ flex: 1, fontSize: ".67rem" }} onClick={() => { copy(e.address); onSelect?.(e.address); }}>{copied === e.address ? "Copied ✓" : <><Copy width={10} height={10} /> Use</>}</button>
                <button type="button" className="btn btn-ghost btn-sm" style={{ color: "var(--muted)", fontSize: ".67rem" }} onClick={() => remove(e.address)}><X width={11} height={11} /></button>
              </div>
            </div>
          ))}
        </div>
        {/* add new */}
        <div style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid var(--line-2)", background: "var(--field)", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Save a new address</div>
          <div className="row sm" style={{ gap: 8, flexWrap: "wrap" }}>
            <input value={nick} onChange={(e) => setNick(e.currentTarget.value)} placeholder="Nickname" style={{ width: 110, padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".82rem" }} />
            <input value={addr} onChange={(e) => setAddr(e.currentTarget.value)} placeholder="0x… (42 chars)" style={{ flex: 1, minWidth: 160, padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".78rem", fontFamily: "var(--mono)" }} />
            <select value={tag} onChange={(e) => setTag(e.currentTarget.value)} style={{ padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".82rem" }}>{["friend", "colleague", "company", "exchange"].map((tt) => <option key={tt}>{tt}</option>)}</select>
            <button type="button" className="btn btn-acc btn-sm" onClick={add} disabled={!addr.startsWith("0x") || addr.length !== 42}><Plus width={12} height={12} /> Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DEEPSURGE — Trade Profit Calculator
// ---------------------------------------------------------------------------
function DeepSurgeProfitCalc({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [buyPrice, setBuyPrice] = useState("1200");
  const [sellPrice, setSellPrice] = useState("1450");
  const [qty, setQty] = useState("10");
  const [fee, setFee] = useState("0.5");
  const [saved, setSaved] = useLocalStore<{ id: string; asset: string; profit: number; roi: number; ts: string }[]>("ds.trades", []);

  const buy = parseFloat(buyPrice) || 0;
  const sell = parseFloat(sellPrice) || 0;
  const q = parseFloat(qty) || 0;
  const feeP = parseFloat(fee) || 0;

  const gross = (sell - buy) * q;
  const feeTotal = (buy * q + sell * q) * feeP / 100;
  const net = gross - feeTotal;
  const roi = buy > 0 ? net / (buy * q) * 100 : 0;
  const isProfit = net >= 0;

  const saveCalc = () => {
    const entry = { id: hashId("trade", `${buy}${sell}${q}${Date.now()}`, 6), asset: "ISK/item", profit: net, roi, ts: new Date().toISOString() };
    setSaved((p) => [entry, ...p].slice(0, 12));
    emitReceipt({ workspaceId: workspace.id, serviceName: "Trade Profit Calc", amount: 0.02, currency: "USDC", network: workspace.networks[0] ?? "deepsurge-chain", kind: "ds.trade.calc", payload: { buy, sell, qty: q, net, roi } });
  };

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft">⚔️</span><div><h3>Trade profit calculator</h3><div className="sub">enter buy / sell price + quantity → see real profit after fees · EVE Frontier / any commodity</div></div></div>
      </div>
      <div style={{ padding: "0 16px 14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Buy price (ISK)", val: buyPrice, set: setBuyPrice },
            { label: "Sell price (ISK)", val: sellPrice, set: setSellPrice },
            { label: "Quantity", val: qty, set: setQty },
            { label: "Fee %", val: fee, set: setFee },
          ].map((f) => (
            <label key={f.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: ".58rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>{f.label}</span>
              <input value={f.val} onChange={(e) => f.set(e.currentTarget.value)} inputMode="decimal" style={{ padding: "9px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".9rem", fontWeight: 700 }} />
            </label>
          ))}
        </div>
        {/* result hero */}
        <div style={{ padding: "16px 20px", borderRadius: 14, background: `color-mix(in srgb, ${isProfit ? "var(--green)" : "var(--red)"} 10%, var(--bg-2))`, border: `1.5px solid ${isProfit ? "var(--green)" : "var(--red)"}40`, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: ".6rem", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 4 }}>Gross profit</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 900, color: isProfit ? "var(--green)" : "var(--red)" }}>{gross >= 0 ? "+" : ""}{gross.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: ".6rem", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 4 }}>Net (after fees)</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 900, color: isProfit ? "var(--green)" : "var(--red)" }}>{net >= 0 ? "+" : ""}{net.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: ".6rem", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 4 }}>ROI</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 900, color: isProfit ? "var(--green)" : "var(--red)" }}>{roi >= 0 ? "+" : ""}{roi.toFixed(1)}%</div>
          </div>
        </div>
        <div className="row sm" style={{ gap: 8, marginTop: 10 }}>
          <span style={{ fontSize: ".72rem", color: "var(--muted)", flex: 1 }}>Fees: {feeTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })} ISK ({fee}% broker + tax)</span>
          <button type="button" className="btn btn-acc btn-sm" onClick={saveCalc}>Save trade</button>
        </div>
        {saved.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0 4px" }}>Saved trades · {saved.length}</div>
            <div className="svc-hist">
              {saved.map((s) => <div className="svc-hist__row" key={s.id}><span className="svc-hist__dot" style={{ background: s.profit >= 0 ? "var(--green)" : "var(--red)" }} /><div className="svc-hist__main"><b>{s.profit >= 0 ? "+" : ""}{s.profit.toFixed(0)} ISK</b><span>ROI {s.roi.toFixed(1)}% · {new Date(s.ts).toLocaleTimeString()}</span></div></div>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// QIE — Wallet Dashboard (QIE Wallet tab — replaces empty QuickCallPanel)
// ---------------------------------------------------------------------------
function QieWalletDashboard({ workspace }: { workspace: Workspace }) {
  const { emitReceipt, receipts } = useAppState();
  const { address: connectedAddr } = useWallet();
  const [balance, setBalance] = useLocalStore("qie.wallet.qie", 142.5);
  const [usdtBal, setUsdtBal] = useLocalStore("qie.wallet.usdt", 28.3);
  const [to, setTo] = useState("");
  const [amt, setAmt] = useState("5");
  const [token, setToken] = useState<"QIE" | "USDT">("QIE");
  const [notice, setNotice] = useState<{ ok: boolean; msg: string } | null>(null);
  const addr = connectedAddr ?? ("0xqw" + hashId("0xqw", workspace.id, 12));

  const txs = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id && (r.kind?.startsWith("qie.wallet") || r.kind?.startsWith("qie."))).slice(0, 10), [receipts, workspace.id]);

  const catSpend: Record<string, number> = useMemo(() => {
    const m: Record<string, number> = { Payments: 0, Gaming: 0, Tips: 0, Passes: 0 };
    for (const r of receipts.filter((r) => r.workspaceId === workspace.id)) {
      if (r.kind?.includes("checkout") || r.kind?.includes("pay")) m.Payments = (m.Payments ?? 0) + r.amount;
      else if (r.kind?.includes("game") || r.kind?.includes("item")) m.Gaming = (m.Gaming ?? 0) + r.amount;
      else if (r.kind?.includes("tip")) m.Tips = (m.Tips ?? 0) + r.amount;
      else if (r.kind?.includes("pass")) m.Passes = (m.Passes ?? 0) + r.amount;
    }
    return m;
  }, [receipts, workspace.id]);

  const catColors = ["#00C389", "#f59e0b", "#8b5cf6", "#3b82f6"] as const;
  const catKeys = ["Payments", "Gaming", "Tips", "Passes"] as const;
  const totalCat = catKeys.reduce((s, k) => s + (catSpend[k] ?? 0), 0) || 1;

  const doSend = () => {
    const a = parseFloat(amt) || 0; if (a <= 0 || !to) return;
    const bal = token === "QIE" ? balance : usdtBal;
    if (a > bal) { setNotice({ ok: false, msg: "Insufficient balance" }); return; }
    if (token === "QIE") setBalance((b) => +(b - a).toFixed(4));
    else setUsdtBal((b) => +(b - a).toFixed(4));
    emitReceipt({ workspaceId: workspace.id, serviceName: `QIE Wallet · Send ${token}`, amount: a, currency: token === "QIE" ? "QIE" as const : "USDC", network: workspace.networks[0] ?? "qie-testnet", kind: "qie.wallet.send", payload: { to, token, txHash: "0x" + hashId("tx", to + amt + Date.now(), 12) } });
    setNotice({ ok: true, msg: `Sent ${a} ${token} → ${to.slice(0, 10)}…` });
    setTo(""); setAmt("5");
  };

  // SVG donut
  const donut = (() => {
    const r = 36; const cx = 44; const cy = 44; const stroke = 14;
    let offset = 0;
    return catKeys.map((k, i) => {
      const pct = (catSpend[k] ?? 0) / totalCat;
      const dash = pct * 2 * Math.PI * r;
      const gap = 2 * Math.PI * r - dash;
      const el = <circle key={k} cx={cx} cy={cy} r={r} fill="none" stroke={catColors[i]!} strokeWidth={stroke} strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-offset} strokeLinecap="round" />;
      offset += dash;
      return el;
    });
  })();

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><Wallet width={15} height={15} /></span><div><h3>QIE Wallet</h3><div className="sub">your balances, spend breakdown, and quick transfer</div></div></div>
      </div>
      {/* balance hero */}
      <div style={{ padding: "0 16px 14px", display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "center" }}>
        <div>
          <div style={{ fontSize: ".58rem", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted)", fontWeight: 800, marginBottom: 3 }}>QIE balance</div>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: "#00C389" }}>{balance.toFixed(2)} <span style={{ fontSize: ".8rem", fontWeight: 600, color: "var(--muted)" }}>QIE</span></div>
        </div>
        <div>
          <div style={{ fontSize: ".58rem", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted)", fontWeight: 800, marginBottom: 3 }}>USDT balance</div>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: "#10b981" }}>{usdtBal.toFixed(2)} <span style={{ fontSize: ".8rem", fontWeight: 600, color: "var(--muted)" }}>USDT</span></div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: ".58rem", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted)", fontWeight: 800, marginBottom: 3 }}>Address</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: ".7rem", color: "var(--muted)" }}>{addr.slice(0, 14)}…</div>
        </div>
      </div>
      {/* spend donut + categories */}
      <div style={{ padding: "0 16px 14px", display: "grid", gridTemplateColumns: "88px 1fr", gap: 16, alignItems: "center" }}>
        <svg width="88" height="88" viewBox="0 0 88 88" style={{ display: "block" }}>
          <circle cx={44} cy={44} r={36} fill="none" stroke="var(--line-2)" strokeWidth={14} />
          <g transform={`rotate(-90 44 44)`}>{donut}</g>
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700, marginBottom: 2 }}>Spend by category</div>
          {catKeys.map((k, i) => (
            <div key={k} className="row sm" style={{ gap: 7 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: catColors[i]!, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: ".78rem" }}>{k}</span>
              <span style={{ fontWeight: 800, fontSize: ".78rem", color: catColors[i]! }}>{((catSpend[k] ?? 0) / totalCat * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
      {/* quick transfer */}
      <div style={{ margin: "0 16px 12px", padding: "10px 14px", borderRadius: 12, border: "1px solid var(--line-2)", background: "var(--field)" }}>
        <div style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700, marginBottom: 8 }}>Quick transfer</div>
        <div className="row sm" style={{ gap: 8, flexWrap: "wrap" }}>
          <input value={to} onChange={(e) => setTo(e.currentTarget.value)} placeholder="0x… recipient" style={{ flex: 1, minWidth: 160, padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".8rem", fontFamily: "var(--mono)" }} />
          <input value={amt} onChange={(e) => setAmt(e.currentTarget.value)} inputMode="decimal" style={{ width: 70, padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".85rem", fontWeight: 700 }} />
          <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid var(--line-2)" }}>
            {(["QIE", "USDT"] as const).map((tk) => <button key={tk} type="button" style={{ padding: "7px 10px", background: token === tk ? "#00C389" : "var(--bg-2)", color: token === tk ? "#fff" : "var(--muted)", border: "none", cursor: "pointer", fontWeight: token === tk ? 800 : 400, fontSize: ".8rem" }} onClick={() => setToken(tk)}>{tk}</button>)}
          </div>
          <button type="button" className="btn btn-acc btn-sm" onClick={doSend}><Send width={12} height={12} /> Send</button>
        </div>
        {notice && <div style={{ marginTop: 6, fontSize: ".76rem", fontWeight: 700, color: notice.ok ? "var(--green)" : "var(--red)" }}>{notice.ok ? <Check width={12} height={12} /> : <X width={12} height={12} />} {notice.msg}</div>}
      </div>
      {/* tx feed */}
      {txs.length > 0 && (
        <div style={{ padding: "0 16px 14px" }}>
          <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "4px 0 6px" }}>Recent transactions · {txs.length}</div>
          <div className="svc-hist">{txs.map((r) => <div className="svc-hist__row" key={r.id}><span className="svc-hist__dot" style={{ background: "#00C389" }} /><div className="svc-hist__main"><b>{r.serviceName}</b><span>{new Date(r.createdAt).toLocaleTimeString()}</span></div><span className="svc-hist__amt">{r.amount.toFixed(2)}</span></div>)}</div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MANTLE — Agent Economy Dashboard (Agent Economy tab — replaces empty QuickCallPanel)
// ---------------------------------------------------------------------------
type EconomyAgent = { id: string; name: string; erc8004Id: string; balance: number; spentToday: number; cap: number; status: "active" | "paused" };
const SEED_ECON_AGENTS: EconomyAgent[] = [
  { id: "ea_01", name: "Yield Optimizer", erc8004Id: "0x8004a1f3", balance: 12.4, spentToday: 3.2, cap: 10, status: "active" },
  { id: "ea_02", name: "Alpha Tracker", erc8004Id: "0x8004b7c2", balance: 5.1, spentToday: 1.0, cap: 5, status: "active" },
  { id: "ea_03", name: "RWA Monitor", erc8004Id: "0x8004c9d0", balance: 8.8, spentToday: 0.6, cap: 8, status: "paused" },
];
function MantleAgentEconomyDashboard({ workspace }: { workspace: Workspace }) {
  const { emitReceipt, receipts } = useAppState();
  const [agents, setAgents] = useLocalStore<EconomyAgent[]>("mantle.agents.econ", SEED_ECON_AGENTS);
  const [newName, setNewName] = useState("Strategy Agent");
  const [newCap, setNewCap] = useState("10");
  const [fundId, setFundId] = useState<string | null>(null);
  const [fundAmt, setFundAmt] = useState("5");
  const agentSparkline = (id: string) => Array.from({ length: 7 }, (_, i) => deterministicScore(id + i, 2, 22));

  const deployAgent = () => {
    const erc8004Id = "0x8004" + hashId("8004", newName + Date.now(), 4);
    const walletAddr = "0x" + hashId("wa", newName + erc8004Id, 12);
    const cap = parseFloat(newCap) || 5;
    const ag: EconomyAgent = { id: "ea_" + hashId("ea", newName + Date.now(), 4), name: newName.trim() || "Unnamed", erc8004Id, balance: 0, spentToday: 0, cap, status: "active" };
    setAgents((p) => [ag, ...p].slice(0, 10));
    emitReceipt({ workspaceId: workspace.id, serviceName: "Mantle Agent · Deploy ERC-8004", amount: 0.05, currency: "USDC", network: workspace.networks[0] ?? "mantle-sepolia", kind: "mantle.agent.deploy", payload: { erc8004Id, wallet: walletAddr, cap } });
  };
  const fundAgent = (id: string) => {
    const a = parseFloat(fundAmt) || 0; if (a <= 0) return;
    setAgents((p) => p.map((ag) => ag.id === id ? { ...ag, balance: +(ag.balance + a).toFixed(2) } : ag));
    emitReceipt({ workspaceId: workspace.id, serviceName: "Mantle Agent · Fund", amount: a, currency: "USDC", network: workspace.networks[0] ?? "mantle-sepolia", kind: "mantle.agent.fund", payload: { agentId: id, amount: a } });
    setFundId(null);
  };
  const toggleStatus = (id: string) => setAgents((p) => p.map((ag) => ag.id === id ? { ...ag, status: ag.status === "active" ? "paused" : "active" } : ag));

  const totalManaged = agents.reduce((s, a) => s + a.balance, 0);
  const totalSpent = agents.reduce((s, a) => s + a.spentToday, 0);
  const recent = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id && r.kind?.startsWith("mantle.agent")).slice(0, 6), [receipts, workspace.id]);

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><Robot width={15} height={15} /></span><div><h3>Agent Economy</h3><div className="sub">ERC-8004 on-chain agent identities · individual budgets · real-time spend tracking · fund & pause</div></div></div>
        <button className="btn btn-acc btn-sm" type="button" onClick={deployAgent}><Plus width={13} height={13} /> Deploy agent</button>
      </div>
      {/* economy stats */}
      <div style={{ padding: "0 16px 14px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
        {[
          { label: "Agents", val: agents.length.toString(), col: "#10b981" },
          { label: "Active", val: agents.filter((a) => a.status === "active").length.toString(), col: "#3b82f6" },
          { label: "Total managed", val: `$${totalManaged.toFixed(2)}`, col: "#8b5cf6" },
          { label: "Spent today", val: `$${totalSpent.toFixed(2)}`, col: "#f59e0b" },
        ].map((s) => (
          <div key={s.label} style={{ padding: "10px 12px", borderRadius: 12, background: s.col + "12", border: `1px solid ${s.col}30`, textAlign: "center" }}>
            <div style={{ fontSize: ".58rem", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted)", fontWeight: 700 }}>{s.label}</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 900, color: s.col, marginTop: 3 }}>{s.val}</div>
          </div>
        ))}
      </div>
      {/* deploy form */}
      <div style={{ padding: "0 16px 12px", display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8 }}>
        <input value={newName} onChange={(e) => setNewName(e.currentTarget.value)} placeholder="Agent name" style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }} />
        <input value={newCap} onChange={(e) => setNewCap(e.currentTarget.value)} inputMode="decimal" placeholder="Daily cap $" style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }} />
      </div>
      {/* agent cards */}
      <div style={{ padding: "0 16px 12px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
        {agents.map((ag) => {
          const spentPct = Math.min(ag.spentToday / ag.cap * 100, 100);
          const barCol = spentPct > 80 ? "var(--red)" : spentPct > 50 ? "#f59e0b" : "#10b981";
          const pts = agentSparkline(ag.id).map((h, i) => `${i * 10},${24 - h}`).join(" ");
          return (
            <div key={ag.id} style={{ borderRadius: 14, border: `1px solid ${ag.status === "active" ? "#10b98140" : "var(--line-2)"}`, background: "var(--bg-2)", padding: "12px 14px", opacity: ag.status === "paused" ? 0.65 : 1 }}>
              <div className="row sm" style={{ gap: 8, marginBottom: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "#10b98118", border: "1.5px solid #10b98160", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: ".78rem", color: "#10b981" }}>{ag.name[0]}</div>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 800, fontSize: ".88rem" }}>{ag.name}</div><div style={{ fontFamily: "var(--mono)", fontSize: ".64rem", color: "var(--muted)", marginTop: 1 }}>ERC-8004 {ag.erc8004Id}</div></div>
                <span className={`pill ${ag.status === "active" ? "ok" : ""}`} style={{ fontSize: ".6rem" }}>{ag.status}</span>
              </div>
              {/* spend bar */}
              <div style={{ marginBottom: 6 }}>
                <div className="row sm" style={{ justifyContent: "space-between", fontSize: ".64rem", color: "var(--muted)", marginBottom: 3 }}><span>Spent today</span><span style={{ fontWeight: 700, color: barCol }}>${ag.spentToday.toFixed(2)} / ${ag.cap}</span></div>
                <div style={{ height: 5, borderRadius: 3, background: "var(--line-2)", overflow: "hidden" }}><div style={{ height: "100%", width: `${spentPct}%`, background: barCol, borderRadius: 3, transition: "width .3s" }} /></div>
              </div>
              {/* balance + sparkline */}
              <div className="row sm" style={{ gap: 8, justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: ".78rem" }}>Balance: <b style={{ color: "#10b981" }}>${ag.balance.toFixed(2)}</b></span>
                <svg width="70" height="24" viewBox="0 0 62 26"><polyline points={pts} fill="none" stroke="#10b981" strokeWidth="2" strokeLinejoin="round" /><polyline points={pts + " 60,24 0,24"} fill="#10b98118" stroke="none" /></svg>
              </div>
              <div className="row sm" style={{ gap: 6 }}>
                <button type="button" className="btn btn-acc btn-sm" style={{ flex: 1, fontSize: ".7rem" }} onClick={() => setFundId(fundId === ag.id ? null : ag.id)}><Plus width={11} height={11} /> Fund</button>
                <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: ".7rem" }} onClick={() => toggleStatus(ag.id)}>{ag.status === "active" ? "Pause" : "Resume"}</button>
              </div>
              {fundId === ag.id && (
                <div className="row sm" style={{ gap: 6, marginTop: 6 }}>
                  <input value={fundAmt} onChange={(e) => setFundAmt(e.currentTarget.value)} inputMode="decimal" style={{ flex: 1, padding: "5px 8px", borderRadius: 7, border: "1px solid var(--line-2)", background: "var(--field)", color: "var(--ink)", fontSize: ".82rem" }} />
                  <button type="button" className="btn btn-acc btn-sm" style={{ fontSize: ".7rem" }} onClick={() => fundAgent(ag.id)}>Send $</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {recent.length > 0 && (
        <div style={{ padding: "0 16px 14px" }}>
          <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "4px 0 6px" }}>Recent · {recent.length}</div>
          <div className="svc-hist">{recent.map((r) => <div className="svc-hist__row" key={r.id}><span className="svc-hist__dot" style={{ background: "#10b981" }} /><div className="svc-hist__main"><b>{r.serviceName}</b><span>{new Date(r.createdAt).toLocaleTimeString()}</span></div><span className="svc-hist__amt">{r.amount.toFixed(2)}</span></div>)}</div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 0G — Agent Memory Checkpoints (Storage & Memory tab)
// ---------------------------------------------------------------------------
type AgentCheckpoint = { id: string; hash: string; size: string; agentId: string; label: string; ts: string };
function AgentCheckpointWidget({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [checkpoints, setCheckpoints] = useLocalStore<AgentCheckpoint[]>("0g.checkpoints", []);
  const [label, setLabel] = useState("session-1");
  const [agentId, setAgentId] = useState("agid_0g_a1f3");
  const [restored, setRestored] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const saveCheckpoint = async () => {
    setSaving(true);
    const payload = JSON.stringify({ agentId, label, timestamp: Date.now(), memory: { lastJob: "inference-job-42", policy: { cap: 8 }, contextTokens: 4096 } });
    const hash = await sha256Hex(payload);
    const id = "ckpt_" + hash.slice(0, 8);
    const size = (payload.length / 1024).toFixed(1) + " KB";
    const ckpt: AgentCheckpoint = { id, hash, size, agentId, label, ts: new Date().toISOString() };
    setCheckpoints((p) => [ckpt, ...p].slice(0, 10));
    emitReceipt({ workspaceId: workspace.id, serviceName: "0G Memory Checkpoint · Save", amount: 0.001, currency: "USDC", network: workspace.networks[0] ?? "0g-testnet", kind: "0g.checkpoint.save", payload: { hash, label, agentId, size } });
    setSaving(false);
  };
  const restore = (ckpt: AgentCheckpoint) => {
    setRestored(ckpt.id);
    emitReceipt({ workspaceId: workspace.id, serviceName: "0G Memory Checkpoint · Restore", amount: 0.001, currency: "USDC", network: workspace.networks[0] ?? "0g-testnet", kind: "0g.checkpoint.restore", payload: { hash: ckpt.hash, label: ckpt.label, agentId: ckpt.agentId } });
  };

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft">🧠</span><div><h3>Agent Memory Checkpoints</h3><div className="sub">save agent state to 0G Storage · get a permanent restore link · agents never lose context again</div></div></div>
        <button className="btn btn-acc btn-sm" type="button" onClick={saveCheckpoint} disabled={saving}>{saving ? <Loader2 width={13} height={13} className="wallet-spin" /> : <Plus width={13} height={13} />} Save checkpoint</button>
      </div>
      <div style={{ padding: "0 16px 12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Agent ID</span>
          <input value={agentId} onChange={(e) => setAgentId(e.currentTarget.value)} style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".8rem", fontFamily: "var(--mono)" }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Label</span>
          <input value={label} onChange={(e) => setLabel(e.currentTarget.value)} placeholder="session-1" style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }} />
        </label>
      </div>
      {checkpoints.length === 0 && <div style={{ padding: "0 16px 14px", color: "var(--muted)", fontSize: ".8rem" }}>No checkpoints yet — save one above to pin agent state to 0G Storage.</div>}
      <div style={{ padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        {checkpoints.map((ckpt) => (
          <div key={ckpt.id} style={{ padding: "10px 14px", borderRadius: 12, background: restored === ckpt.id ? "color-mix(in srgb, var(--green) 8%, var(--bg-2))" : "var(--bg-2)", border: `1px solid ${restored === ckpt.id ? "color-mix(in srgb, var(--green) 30%, transparent)" : "var(--line-2)"}` }}>
            <div className="row sm" style={{ gap: 8, marginBottom: 4 }}>
              <span style={{ fontWeight: 800, flex: 1 }}>{ckpt.label}</span>
              <span style={{ fontSize: ".68rem", color: "var(--muted)" }}>{ckpt.size}</span>
              <span style={{ fontSize: ".68rem", color: "var(--muted)" }}>{new Date(ckpt.ts).toLocaleTimeString()}</span>
            </div>
            <div className="row sm" style={{ gap: 6 }}>
              <code style={{ fontSize: ".66rem", color: "var(--muted)", flex: 1 }}>0g://ckpt/{ckpt.hash.slice(0, 16)}…</code>
              <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: ".68rem" }} onClick={() => navigator.clipboard?.writeText(`0g://ckpt/${ckpt.hash}`)}><Copy width={10} height={10} /> Copy</button>
              <button type="button" className="btn btn-acc btn-sm" style={{ fontSize: ".68rem" }} onClick={() => restore(ckpt)}>{restored === ckpt.id ? <><Check width={10} height={10} /> Restored</> : "Restore"}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 0G — Compute Cost Tracker (Compute tab)
// ---------------------------------------------------------------------------
function OgComputeCostChart({ workspace }: { workspace: Workspace }) {
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
        {/* hero row */}
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
        {/* 7-day bar chart */}
        <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 80, marginBottom: 16 }}>
          {days7.map((d) => (
            <div key={d.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: ".62rem", fontWeight: 700, color: "#3b82f6" }}>${d.cost.toFixed(1)}</span>
              <div style={{ width: "100%", height: Math.max(8, d.cost / maxCost * 56), background: "#3b82f6", borderRadius: "4px 4px 0 0", opacity: 0.8 }} />
              <span style={{ fontSize: ".6rem", color: "var(--muted)" }}>{d.label}</span>
            </div>
          ))}
        </div>
        {/* model breakdown */}
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

// ---------------------------------------------------------------------------
// 0G — SocialFi Content Board (Storage & Memory tab)
// ---------------------------------------------------------------------------
type SocialPost = { id: string; author: string; content: string; hash: string; link: string; tips: number; ts: string };
function OgSocialFeedWidget({ workspace }: { workspace: Workspace }) {
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

// ---------------------------------------------------------------------------
// ARBITRUM — Recurring Payments (USDC Payments tab)
// ---------------------------------------------------------------------------
type RecurringEntry = { id: string; label: string; to: string; amount: number; period: "weekly" | "monthly"; nextDate: string; active: boolean; lastPaidTs?: string };
function ArbRecurringPayments({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const { address: account } = useWallet();
  const [entries, setEntries] = useLocalStore<RecurringEntry[]>("arb.recurring", [
    { id: "rec_01", label: "API subscription", to: "0xDEAD000000000000000000000000000000beef01", amount: 25, period: "monthly", nextDate: new Date(Date.now() + 12 * 864e5).toISOString(), active: true },
  ]);
  const [label, setLabel] = useState("Service subscription");
  const [to, setTo] = useState("");
  const [amt, setAmt] = useState("10");
  const [period, setPeriod] = useState<"weekly" | "monthly">("monthly");
  const [payingId, setPayingId] = useState<string | null>(null);

  const addSchedule = () => {
    if (!to.startsWith("0x") || to.length !== 42) return;
    const nextDate = new Date(Date.now() + (period === "weekly" ? 7 : 30) * 864e5).toISOString();
    const entry: RecurringEntry = { id: "rec_" + hashId("rec", label + to + Date.now(), 6), label: label.trim(), to, amount: parseFloat(amt) || 0, period, nextDate, active: true };
    setEntries((p) => [entry, ...p].slice(0, 10));
    setLabel("Service subscription"); setTo(""); setAmt("10");
  };
  const payNow = (e: RecurringEntry) => {
    setPayingId(e.id);
    const txHash = "0x" + hashId("tx", e.to + e.amount + Date.now(), 12);
    const nextDate = new Date(Date.now() + (e.period === "weekly" ? 7 : 30) * 864e5).toISOString();
    setEntries((p) => p.map((x) => x.id === e.id ? { ...x, nextDate, lastPaidTs: new Date().toISOString() } : x));
    emitReceipt({ workspaceId: workspace.id, serviceName: `USDC · ${e.label}`, amount: e.amount, currency: "USDC", network: workspace.networks[0] ?? "arbitrum-sepolia", kind: "arb.recurring.pay", payload: { to: e.to, label: e.label, txHash, period: e.period, account } });
    setTimeout(() => setPayingId(null), 1500);
  };
  const toggle = (id: string) => setEntries((p) => p.map((x) => x.id === id ? { ...x, active: !x.active } : x));

  const daysUntil = (dt: string) => Math.max(0, Math.round((new Date(dt).getTime() - Date.now()) / 864e5));

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><RefreshCw width={15} height={15} /></span><div><h3>Recurring Payments</h3><div className="sub">set up weekly or monthly USDC payments · one-click pay · track next due date · crypto direct debit</div></div></div>
        <button className="btn btn-acc btn-sm" type="button" onClick={addSchedule} disabled={!to.startsWith("0x") || to.length !== 42}><Plus width={13} height={13} /> Add schedule</button>
      </div>
      {/* add form */}
      <div style={{ padding: "0 16px 12px", display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr", gap: 8 }}>
        <input value={label} onChange={(e) => setLabel(e.currentTarget.value)} placeholder="Label" style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }} />
        <input value={to} onChange={(e) => setTo(e.currentTarget.value)} placeholder="0x… recipient" style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".8rem", fontFamily: "var(--mono)" }} />
        <input value={amt} onChange={(e) => setAmt(e.currentTarget.value)} inputMode="decimal" placeholder="USDC" style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }} />
        <select value={period} onChange={(e) => setPeriod(e.currentTarget.value as typeof period)} style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }}>
          <option value="weekly">Weekly</option><option value="monthly">Monthly</option>
        </select>
      </div>
      {/* scheduled payments */}
      <div style={{ padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        {entries.length === 0 && <div style={{ fontSize: ".8rem", color: "var(--muted)" }}>No recurring payments yet.</div>}
        {entries.map((e) => {
          const days = daysUntil(e.nextDate);
          const urgencyCol = days <= 3 ? "var(--red)" : days <= 7 ? "#f59e0b" : "var(--green)";
          return (
            <div key={e.id} style={{ padding: "12px 14px", borderRadius: 12, background: "var(--bg-2)", border: `1px solid ${e.active ? "#3b82f640" : "var(--line-2)"}`, opacity: e.active ? 1 : 0.55 }}>
              <div className="row sm" style={{ gap: 8, marginBottom: 4 }}>
                <span style={{ fontWeight: 800, flex: 1 }}>{e.label}</span>
                <span className="pill" style={{ background: "#3b82f618", color: "#3b82f6", fontSize: ".62rem", fontWeight: 700 }}>{e.amount} USDC · {e.period}</span>
                <span style={{ fontSize: ".68rem", fontWeight: 800, color: urgencyCol }}>in {days}d</span>
              </div>
              <div style={{ fontFamily: "var(--mono)", fontSize: ".7rem", color: "var(--muted)", marginBottom: 8 }}>{e.to.slice(0, 14)}…{e.to.slice(-6)}</div>
              <div className="row sm" style={{ gap: 6 }}>
                <span style={{ fontSize: ".68rem", color: "var(--muted)", flex: 1 }}>Next: {new Date(e.nextDate).toLocaleDateString()}</span>
                <button type="button" className="btn btn-acc btn-sm" style={{ fontSize: ".7rem" }} onClick={() => payNow(e)} disabled={payingId === e.id}>{payingId === e.id ? <><Check width={10} height={10} /> Paid!</> : "Pay now →"}</button>
                <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: ".7rem" }} onClick={() => toggle(e.id)}>{e.active ? "Pause" : "Resume"}</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ARBITRUM — Allowance Manager / Wallet Protection (Wallet Protection tab)
// ---------------------------------------------------------------------------
type AllowanceEntry = { protocol: string; token: string; allowance: "unlimited" | "high" | "safe"; amount: string; riskLevel: "red" | "yellow" | "green"; revoked: boolean };
function ArbAllowanceManager({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [entries, setEntries] = useLocalStore<AllowanceEntry[]>("arb.allowances", [
    { protocol: "Uniswap V3", token: "USDC", allowance: "unlimited", amount: "∞", riskLevel: "red", revoked: false },
    { protocol: "Arbitrum Bridge", token: "USDC", allowance: "high", amount: "$10,000", riskLevel: "yellow", revoked: false },
    { protocol: "Aave V3", token: "USDT", allowance: "safe", amount: "$500", riskLevel: "green", revoked: false },
    { protocol: "Unknown dApp", token: "ARB", allowance: "unlimited", amount: "∞", riskLevel: "red", revoked: false },
  ]);
  const [maxCap, setMaxCap] = useState("1000");
  const riskCol = { red: "var(--red)", yellow: "#f59e0b", green: "var(--green)" } as const;
  const riskLabel = { red: "UNLIMITED ⚠️", yellow: "High", green: "Safe" } as const;

  const revoke = (protocol: string) => {
    setEntries((p) => p.map((e) => e.protocol === protocol ? { ...e, revoked: true, allowance: "safe", amount: "$0", riskLevel: "green" } : e));
    emitReceipt({ workspaceId: workspace.id, serviceName: `Revoke · ${protocol}`, amount: 0, currency: "USDC", network: workspace.networks[0] ?? "arbitrum-sepolia", kind: "arb.allowance.revoke", payload: { protocol } });
  };
  const setCap = () => {
    emitReceipt({ workspaceId: workspace.id, serviceName: "Wallet Protection · Max Cap", amount: 0, currency: "USDC", network: workspace.networks[0] ?? "arbitrum-sepolia", kind: "arb.allowance.cap", payload: { maxCapUsd: parseFloat(maxCap) } });
  };

  const redCount = entries.filter((e) => e.riskLevel === "red" && !e.revoked).length;

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><ShieldCheck width={15} height={15} /></span><div><h3>Wallet Protection</h3><div className="sub">see who has approval to spend your tokens · revoke unlimited allowances · set a max cap</div></div></div>
        {redCount > 0 && <span className="pill" style={{ background: "color-mix(in srgb,var(--red) 18%,transparent)", color: "var(--red)", fontWeight: 800, fontSize: ".72rem" }}>⚠️ {redCount} risky approval{redCount > 1 ? "s" : ""}</span>}
      </div>
      <div style={{ padding: "0 16px 12px" }}>
        <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", marginBottom: 8 }}>Active approvals</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {entries.map((e) => (
            <div key={e.protocol} style={{ padding: "10px 14px", borderRadius: 12, background: "var(--bg-2)", border: `1px solid ${e.revoked ? "var(--line-2)" : riskCol[e.riskLevel] + "30"}`, opacity: e.revoked ? 0.5 : 1 }}>
              <div className="row sm" style={{ gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: e.revoked ? "var(--muted)" : riskCol[e.riskLevel], flexShrink: 0 }} />
                <span style={{ fontWeight: 800, flex: 1 }}>{e.protocol}</span>
                <span style={{ fontSize: ".72rem", color: "var(--muted)" }}>{e.token}</span>
                <span style={{ fontSize: ".72rem", fontWeight: 800, color: e.revoked ? "var(--muted)" : riskCol[e.riskLevel] }}>{e.revoked ? "Revoked" : riskLabel[e.riskLevel]}</span>
                {!e.revoked && <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: ".68rem", color: e.riskLevel === "red" ? "var(--red)" : "var(--muted)" }} onClick={() => revoke(e.protocol)}>Revoke</button>}
              </div>
              {!e.revoked && <div style={{ marginTop: 3, fontSize: ".7rem", color: "var(--muted)" }}>Approved: {e.amount} {e.token}</div>}
            </div>
          ))}
        </div>
        {/* max cap */}
        <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 12, border: "1px solid var(--line-2)", background: "var(--field)" }}>
          <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", marginBottom: 8 }}>Set max USDC approval cap</div>
          <div className="row sm" style={{ gap: 8 }}>
            <span style={{ fontSize: ".8rem", color: "var(--muted)" }}>Max any protocol can approve:</span>
            <input value={maxCap} onChange={(e) => setMaxCap(e.currentTarget.value)} inputMode="decimal" style={{ width: 90, padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".85rem" }} />
            <span style={{ fontSize: ".8rem" }}>USDC</span>
            <button type="button" className="btn btn-acc btn-sm" onClick={setCap}>Save cap</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ARBITRUM — Contract Payment Simulator (Stylus Contracts tab)
// ---------------------------------------------------------------------------
function ArbContractPaymentSim({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [fnSig, setFnSig] = useState("unlock(bytes32 key)");
  const [amount, setAmount] = useState("1.00");
  const [result, setResult] = useState<{ calldata: string; gas: string; output: string } | null>(null);

  const simulate = () => {
    const hexAmt = parseInt(amount).toString(16).padStart(64, "0");
    const calldata = "0x" + hashId("4bytes", fnSig, 4) + "000000000000000000000000000000000000000000000000000000000000002" + hexAmt.slice(-2);
    const gas = (21000 + fnSig.length * 68 + Math.floor(deterministicScore(fnSig, 10000, 60000))).toLocaleString();
    const output = `{ "status": "success", "result": "0x${hashId("res", fnSig + amount, 12)}", "gasUsed": ${gas.replace(/,/g, "")}, "receiptId": "arb_${hashId("rcpt", fnSig + Date.now(), 8)}" }`;
    setResult({ calldata, gas, output });
    emitReceipt({ workspaceId: workspace.id, serviceName: "Stylus · Contract Payment Sim", amount: parseFloat(amount) || 0, currency: "USDC", network: workspace.networks[0] ?? "arbitrum-sepolia", kind: "arb.contract.sim", payload: { fnSig, amount, calldata } });
  };

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><Code2 width={15} height={15} /></span><div><h3>Contract Payment Simulator</h3><div className="sub">paste an ABI function signature + amount → see calldata, gas estimate, and expected output before deploying</div></div></div>
        <button className="btn btn-acc btn-sm" type="button" onClick={simulate}><Zap width={13} height={13} /> Simulate call</button>
      </div>
      <div style={{ padding: "0 16px 12px", display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>ABI function signature</span>
          <input value={fnSig} onChange={(e) => setFnSig(e.currentTarget.value)} placeholder="functionName(type arg)" style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem", fontFamily: "var(--mono)" }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Payment (USDC)</span>
          <input value={amount} onChange={(e) => setAmount(e.currentTarget.value)} inputMode="decimal" style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }} />
        </label>
      </div>
      {result && (
        <div style={{ padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { label: "Calldata", val: result.calldata, mono: true },
            { label: `Estimated gas: ${result.gas}`, val: result.output, mono: true },
          ].map((r) => (
            <div key={r.label} style={{ padding: "8px 12px", borderRadius: 10, background: "color-mix(in srgb, #3b82f6 6%, var(--bg-2))", border: "1px solid #3b82f625" }}>
              <div style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "#3b82f6", fontWeight: 700, marginBottom: 4 }}>{r.label}</div>
              <code style={{ fontSize: ".7rem", color: "var(--ink)", wordBreak: "break-all" }}>{r.val}</code>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MANTLE — Portfolio Rebalancer (Yield Optimizer tab)
// ---------------------------------------------------------------------------
function MantlePortfolioRebalancer({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [targetMeth, setTargetMeth] = useState(60);
  const targetUsdy = 100 - targetMeth;
  const currentMeth = 72; const currentUsdy = 28;
  const drift = Math.abs(currentMeth - targetMeth);
  const driftCol = drift < 5 ? "var(--green)" : drift < 15 ? "#f59e0b" : "var(--red)";
  const swapDir = currentMeth > targetMeth ? "mETH → USDY" : "USDY → mETH";
  const swapAmt = +(Math.abs(currentMeth - targetMeth) * 10).toFixed(2);
  const [autoRebalance, setAutoRebalance] = useState(false);
  const [done, setDone] = useState(false);

  const rebalance = () => {
    emitReceipt({ workspaceId: workspace.id, serviceName: `Mantle Rebalancer · ${swapDir}`, amount: swapAmt, currency: "USDC", network: workspace.networks[0] ?? "mantle-sepolia", kind: "mantle.rebalance", payload: { from: currentMeth, to: targetMeth, swapAmt, swapDir } });
    setDone(true); setTimeout(() => setDone(false), 2000);
  };

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft">⚖️</span><div><h3>Portfolio Rebalancer</h3><div className="sub">set target mETH/USDY mix · see drift from target · one-click rebalance · auto-rebalance toggle</div></div></div>
      </div>
      <div style={{ padding: "0 16px 16px" }}>
        {/* current vs target */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
          {[
            { label: "Current allocation", meth: currentMeth, usdy: currentUsdy, muted: true },
            { label: "Target allocation", meth: targetMeth, usdy: targetUsdy, muted: false },
          ].map((c) => (
            <div key={c.label} style={{ padding: "12px 14px", borderRadius: 14, background: "var(--bg-2)", border: `1px solid ${c.muted ? "var(--line-2)" : "var(--accent-primary)40"}` }}>
              <div style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700, marginBottom: 8 }}>{c.label}</div>
              <div style={{ height: 10, borderRadius: 5, background: "#3b82f6", display: "flex", overflow: "hidden", marginBottom: 8 }}>
                <div style={{ flex: c.meth, background: "#3b82f6" }} />
                <div style={{ flex: c.usdy, background: "#10b981" }} />
              </div>
              <div className="row sm" style={{ gap: 12 }}>
                <span style={{ fontSize: ".78rem" }}><span style={{ color: "#3b82f6", fontWeight: 800 }}>{c.meth}%</span> mETH</span>
                <span style={{ fontSize: ".78rem" }}><span style={{ color: "#10b981", fontWeight: 800 }}>{c.usdy}%</span> USDY</span>
              </div>
            </div>
          ))}
        </div>
        {/* target slider */}
        <div style={{ marginBottom: 16 }}>
          <div className="row sm" style={{ justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: ".7rem", color: "var(--muted)" }}>Drag to set target mETH %</span>
            <span style={{ fontWeight: 800, color: "var(--accent-primary)" }}>{targetMeth}% mETH / {targetUsdy}% USDY</span>
          </div>
          <input type="range" min={10} max={90} value={targetMeth} onChange={(e) => { setTargetMeth(Number(e.currentTarget.value)); setDone(false); }} style={{ width: "100%", accentColor: "#3b82f6" }} />
        </div>
        {/* drift hero */}
        <div style={{ padding: "12px 16px", borderRadius: 14, background: `color-mix(in srgb, ${driftCol} 8%, var(--bg-2))`, border: `1px solid ${driftCol}30`, marginBottom: 12 }}>
          <div className="row sm" style={{ gap: 12 }}>
            <div>
              <div style={{ fontSize: ".6rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700 }}>Drift</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 900, color: driftCol }}>{drift.toFixed(0)}%</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: ".72rem", color: "var(--muted)", marginBottom: 2 }}>To rebalance:</div>
              <div style={{ fontSize: ".9rem", fontWeight: 800 }}>Swap ${swapAmt} {swapDir}</div>
            </div>
            <button type="button" className="btn btn-acc" style={{ padding: "9px 18px", fontWeight: 800 }} onClick={rebalance} disabled={done}>{done ? <><Check width={14} height={14} /> Done!</> : "Rebalance now"}</button>
          </div>
        </div>
        {/* auto-rebalance toggle */}
        <label className="row sm" style={{ gap: 8, cursor: "pointer", fontSize: ".82rem" }}>
          <input type="checkbox" checked={autoRebalance} onChange={(e) => setAutoRebalance(e.currentTarget.checked)} />
          <span>Auto-rebalance when drift exceeds <b>10%</b></span>
          {autoRebalance && <span className="pill ok" style={{ fontSize: ".6rem" }}>Active</span>}
        </label>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MANTLE — Gas Cost Optimizer (AI DevTools tab)
// ---------------------------------------------------------------------------
function MantleGasOptimizer({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState("0.05");

  const hours = Array.from({ length: 24 }, (_, h) => ({ h, gwei: +(deterministicScore(`gas_mantle_h${h}`, 0.01, 0.18)).toFixed(3) }));
  const minGas = Math.min(...hours.map((x) => x.gwei));
  const maxGas = Math.max(...hours.map((x) => x.gwei));
  const cheapHour = hours.reduce((a, b) => a.gwei < b.gwei ? a : b);
  const currentHour = new Date().getHours();
  const currentGwei = hours[currentHour]?.gwei ?? 0.05;
  const ethL1Gwei = 18.4;
  const savingPct = Math.round((1 - currentGwei / (ethL1Gwei / 100)) * 100);

  const setAlert = () => {
    emitReceipt({ workspaceId: workspace.id, serviceName: "Mantle Gas Alert · Set", amount: 0, currency: "USDC", network: workspace.networks[0] ?? "mantle-sepolia", kind: "mantle.gas.alert", payload: { threshold: parseFloat(alertThreshold) } });
  };

  const gweiBg = (gwei: number) => {
    const pct = (gwei - minGas) / (maxGas - minGas);
    const r = Math.round(pct * 239 + 16); const g = Math.round((1 - pct) * 185 + 90); const b = 50;
    return `rgb(${r},${g},${b})`;
  };

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><Zap width={15} height={15} /></span><div><h3>Gas Cost Optimizer</h3><div className="sub">cheapest time to transact on Mantle today · current vs Ethereum L1 · set a gas price alert</div></div></div>
      </div>
      <div style={{ padding: "0 16px 16px" }}>
        {/* hero stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Current Mantle gas", val: `${currentGwei} gwei`, col: "#10b981" },
            { label: "Cheapest window", val: `${cheapHour.h}:00 UTC (${cheapHour.gwei} gwei)`, col: "#3b82f6" },
            { label: "Savings vs Ethereum", val: `${savingPct > 0 ? savingPct : ">99"}% cheaper`, col: "#8b5cf6" },
          ].map((s) => (
            <div key={s.label} style={{ padding: "10px 12px", borderRadius: 12, background: s.col + "12", border: `1px solid ${s.col}28`, textAlign: "center" }}>
              <div style={{ fontSize: ".58rem", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted)", fontWeight: 700 }}>{s.label}</div>
              <div style={{ fontSize: ".9rem", fontWeight: 900, color: s.col, marginTop: 3 }}>{s.val}</div>
            </div>
          ))}
        </div>
        {/* 24h heatmap */}
        <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", marginBottom: 6 }}>24h gas heatmap (gwei) — green = cheap · red = expensive</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(24, 1fr)", gap: 2, marginBottom: 14 }}>
          {hours.map((x) => (
            <div key={x.h} title={`${x.h}:00 — ${x.gwei} gwei`} style={{ height: 32, borderRadius: 4, background: gweiBg(x.gwei), opacity: x.h === currentHour ? 1 : 0.75, border: x.h === currentHour ? "1.5px solid #fff8" : "none", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
              {x.h % 6 === 0 && <span style={{ fontSize: ".48rem", color: "#fff9", paddingBottom: 2 }}>{x.h}h</span>}
            </div>
          ))}
        </div>
        {/* alert */}
        <div style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid var(--line-2)", background: "var(--field)" }}>
          <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", marginBottom: 8 }}>Gas price alert</div>
          <div className="row sm" style={{ gap: 8 }}>
            <label className="row sm" style={{ gap: 6, fontSize: ".8rem", cursor: "pointer" }}>
              <input type="checkbox" checked={alertEnabled} onChange={(e) => setAlertEnabled(e.currentTarget.checked)} />
              Notify when gas drops below
            </label>
            <input value={alertThreshold} onChange={(e) => setAlertThreshold(e.currentTarget.value)} inputMode="decimal" style={{ width: 70, padding: "6px 8px", borderRadius: 7, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".82rem" }} />
            <span style={{ fontSize: ".8rem" }}>gwei</span>
            <button type="button" className="btn btn-acc btn-sm" onClick={setAlert} disabled={!alertEnabled}>{alertEnabled ? "Save alert" : "Enable first"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// QIE — Creator Subscriptions (Creator Hub tab)
// ---------------------------------------------------------------------------
type QieSub = { id: string; subscriber: string; tier: string; priceQie: number; since: string; active: boolean };
function QieCreatorSubscriptions({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [price, setPrice] = useState("2");
  const [desc, setDesc] = useState("Monthly AI insights newsletter + gated Q&A access");
  const [reqTier, setReqTier] = useState<"bronze" | "silver" | "gold">("silver");
  const [subs, setSubs] = useLocalStore<QieSub[]>("qie.creator.subs", [
    { id: "sub_01", subscriber: "0xfan9a2c1e0b", tier: "silver", priceQie: 2, since: new Date(Date.now() - 15 * 864e5).toISOString(), active: true },
    { id: "sub_02", subscriber: "0xfan4f1d77aa", tier: "gold", priceQie: 2, since: new Date(Date.now() - 45 * 864e5).toISOString(), active: true },
  ]);
  const [copied, setCopied] = useState(false);
  const link = `https://pay.qie.digital/subscribe/${hashId("subs", workspace.id + price + reqTier, 8)}?price=${price}&tier=${reqTier}`;

  const totalMonthly = subs.filter((s) => s.active).reduce((sum, s) => sum + s.priceQie, 0);
  const copy = () => { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const addDemoSub = () => {
    const id = "sub_" + hashId("sub", Date.now().toString(), 6);
    const newSub: QieSub = { id, subscriber: "0xnew" + hashId("fan", id, 8), tier: reqTier, priceQie: parseFloat(price) || 1, since: new Date().toISOString(), active: true };
    setSubs((p) => [newSub, ...p].slice(0, 20));
    emitReceipt({ workspaceId: workspace.id, serviceName: "QIE Creator · New Subscriber", amount: parseFloat(price) || 1, currency: "USDC", network: workspace.networks[0] ?? "qie-testnet", kind: "qie.creator.sub", payload: { tier: reqTier, subscriber: newSub.subscriber } });
  };

  const tierColor = { bronze: "#b07a3a", silver: "#9aa3ad", gold: "#e0a200" } as const;

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft">⭐</span><div><h3>Creator Subscriptions</h3><div className="sub">set up recurring QIE subscriptions · share a link · fans pay monthly · you see every renewal</div></div></div>
      </div>
      <div style={{ padding: "0 16px 14px" }}>
        {/* stats hero */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
          {[
            { label: "Subscribers", val: subs.filter((s) => s.active).length, col: "#00C389" },
            { label: "Monthly revenue", val: `${totalMonthly.toFixed(1)} QIE`, col: "#f59e0b" },
            { label: "Required tier", val: reqTier, col: tierColor[reqTier] },
          ].map((s) => (
            <div key={s.label} style={{ padding: "10px 12px", borderRadius: 12, background: s.col + "12", border: `1px solid ${s.col}28`, textAlign: "center" }}>
              <div style={{ fontSize: ".58rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700 }}>{s.label}</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 900, color: s.col, marginTop: 3, textTransform: "capitalize" }}>{s.val}</div>
            </div>
          ))}
        </div>
        {/* setup form */}
        <div style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid var(--line-2)", background: "var(--field)", marginBottom: 12 }}>
          <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", marginBottom: 8 }}>Subscription settings</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: ".6rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700 }}>Price (QIE/mo)</span>
              <input value={price} onChange={(e) => setPrice(e.currentTarget.value)} inputMode="decimal" style={{ padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".88rem", fontWeight: 800 }} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: ".6rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700 }}>Min QIE Pass tier</span>
              <select value={reqTier} onChange={(e) => setReqTier(e.currentTarget.value as typeof reqTier)} style={{ padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }}>
                <option value="bronze">Bronze</option><option value="silver">Silver</option><option value="gold">Gold</option>
              </select>
            </label>
            <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-end" }} onClick={addDemoSub}><Plus width={11} height={11} /> Demo sub</button>
          </div>
          <div style={{ marginBottom: 8 }}>
            <input value={desc} onChange={(e) => setDesc(e.currentTarget.value)} placeholder="What subscribers get…" style={{ width: "100%", padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".82rem", boxSizing: "border-box" }} />
          </div>
          <div style={{ padding: "8px 12px", borderRadius: 10, background: "color-mix(in srgb, #00C389 7%, var(--bg-2))", border: "1px solid #00C38928" }}>
            <div style={{ fontSize: ".6rem", color: "var(--muted)", fontWeight: 700, marginBottom: 5 }}>Your subscription link</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: ".68rem", color: "var(--muted)", marginBottom: 6, wordBreak: "break-all" }}>{link}</div>
            <button type="button" className="btn btn-acc btn-sm" style={{ width: "100%", fontWeight: 800 }} onClick={copy}>{copied ? <><Check width={12} height={12} /> Copied!</> : <><Copy width={12} height={12} /> Copy subscription link</>}</button>
          </div>
        </div>
        {/* subscriber list */}
        <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", marginBottom: 6 }}>Subscribers · {subs.length}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {subs.map((s) => (
            <div key={s.id} className="row sm" style={{ gap: 8, padding: "7px 10px", borderRadius: 10, background: "var(--bg-2)", border: "1px solid var(--line-2)" }}>
              <span className="pill" style={{ background: tierColor[s.tier as keyof typeof tierColor] + "18", color: tierColor[s.tier as keyof typeof tierColor], fontSize: ".6rem", textTransform: "capitalize" }}>{s.tier}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: ".7rem", flex: 1 }}>{s.subscriber.slice(0, 14)}…</span>
              <span style={{ fontSize: ".68rem", color: "var(--muted)" }}>since {new Date(s.since).toLocaleDateString()}</span>
              <span style={{ fontSize: ".72rem", fontWeight: 800, color: "#00C389" }}>{s.priceQie} QIE/mo</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// QIE — Sales Analytics (Merchant Checkout tab)
// ---------------------------------------------------------------------------
function QieSalesAnalytics({ workspace }: { workspace: Workspace }) {
  const { receipts } = useAppState();
  const checkoutReceipts = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id && (r.kind?.includes("checkout") || r.kind?.includes("invoice") || r.kind?.includes("pos") || r.kind?.includes("split") || r.kind?.includes("request"))), [receipts, workspace.id]);

  const days7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString(undefined, { weekday: "short" });
    const base = deterministicScore(`sales_qie_d${i}`, 2, 18);
    const real = checkoutReceipts.filter((r) => new Date(r.createdAt).getDate() === d.getDate()).reduce((s, r) => s + r.amount, 0);
    return { label, rev: +(base + real).toFixed(2) };
  });
  const maxRev = Math.max(...days7.map((d) => d.rev), 1);
  const totalRev = days7.reduce((s, d) => s + d.rev, 0);
  const avgOrder = +(totalRev / Math.max(days7.reduce((s, d) => s + Math.round(d.rev / 3), 0), 1)).toFixed(2);

  const topProducts = [
    { name: "Premium AI Report", orders: 14, rev: 42 },
    { name: "Monthly Data Feed", orders: 8, rev: 64 },
    { name: "Strategy Signal Pack", orders: 5, rev: 25 },
    { name: "API Access — 100 calls", orders: 11, rev: 33 },
    { name: "Custom Analysis", orders: 3, rev: 60 },
  ];
  const topProduct = topProducts.reduce((a, b) => a.orders > b.orders ? a : b);

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft">📊</span><div><h3>Sales Analytics</h3><div className="sub">7-day revenue · orders · top products · repeat buyer rate — your merchant dashboard</div></div></div>
      </div>
      <div style={{ padding: "0 16px 14px" }}>
        {/* KPI row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Revenue (7d)", val: `$${totalRev.toFixed(2)}`, col: "#00C389" },
            { label: "Orders", val: String(days7.reduce((s, d) => s + Math.round(d.rev / 3), 0)), col: "#3b82f6" },
            { label: "Avg order", val: `$${avgOrder}`, col: "#8b5cf6" },
            { label: "Top product", val: topProduct.name.split(" ").slice(0, 2).join(" "), col: "#f59e0b" },
          ].map((s) => (
            <div key={s.label} style={{ padding: "10px 12px", borderRadius: 12, background: s.col + "12", border: `1px solid ${s.col}28`, textAlign: "center" }}>
              <div style={{ fontSize: ".56rem", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted)", fontWeight: 700 }}>{s.label}</div>
              <div style={{ fontSize: ".95rem", fontWeight: 900, color: s.col, marginTop: 3 }}>{s.val}</div>
            </div>
          ))}
        </div>
        {/* revenue bar chart */}
        <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 80, marginBottom: 14 }}>
          {days7.map((d) => (
            <div key={d.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: ".6rem", fontWeight: 700, color: "#00C389" }}>${d.rev}</span>
              <div style={{ width: "100%", height: Math.max(6, d.rev / maxRev * 56), background: "#00C389", borderRadius: "4px 4px 0 0", opacity: 0.8 }} />
              <span style={{ fontSize: ".6rem", color: "var(--muted)" }}>{d.label}</span>
            </div>
          ))}
        </div>
        {/* top products */}
        <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", marginBottom: 6 }}>Top products</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {topProducts.map((p) => (
            <div key={p.name} className="row sm" style={{ gap: 8, padding: "6px 10px", borderRadius: 9, background: "var(--bg-2)", border: "1px solid var(--line-2)" }}>
              <span style={{ flex: 1, fontSize: ".8rem" }}>{p.name}</span>
              <span style={{ fontSize: ".72rem", color: "var(--muted)" }}>{p.orders} orders</span>
              <span style={{ fontSize: ".78rem", fontWeight: 800, color: "#00C389" }}>${p.rev}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ARBITRUM — Payment flow diagram (402 → Pay → Verify → Unlock)
// ---------------------------------------------------------------------------
function ArbPaymentFlowDiagram() {
  const nodes = [
    { id: "req",    label: "Request",    sub: "Agent calls API",            col: "#64748b" },
    { id: "402",    label: "402",        sub: "Gateway returns challenge",   col: "#f59e0b" },
    { id: "pay",    label: "Pay",        sub: "USDC transfer on Arbitrum",   col: "#3b82f6" },
    { id: "verify", label: "Verify",     sub: "Server checks proof on-chain",col: "#8b5cf6" },
    { id: "unlock", label: "Unlock",     sub: "Response + receipt issued",   col: "#10b981" },
  ] as const;

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><Zap width={15} height={15} /></span><div><h3>x402 payment flow</h3><div className="sub">how every USDC transfer settles on Arbitrum — automated in &lt;3s</div></div></div>
      </div>
      <div style={{ padding: "0 16px 20px" }}>
        {/* flow nodes */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 0, overflowX: "auto", paddingBottom: 4 }}>
          {nodes.map((node, i) => (
            <Fragment key={node.id}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, minWidth: 88 }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: node.col + "18", border: `2.5px solid ${node.col}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontWeight: 900, fontSize: node.label === "402" ? ".95rem" : ".78rem", color: node.col, letterSpacing: node.label === "402" ? ".02em" : ".04em" }}>{node.label}</span>
                </div>
                <span style={{ fontSize: ".65rem", color: "var(--muted)", textAlign: "center", maxWidth: 82, lineHeight: 1.35 }}>{node.sub}</span>
              </div>
              {i < nodes.length - 1 && (
                <div style={{ display: "flex", alignItems: "center", marginTop: 14, flex: 1, minWidth: 20 }}>
                  <svg width="100%" height="20" viewBox="0 0 40 20" preserveAspectRatio="none" style={{ minWidth: 20 }}>
                    <defs><marker id={`arr${i}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill={nodes[i + 1]!.col} /></marker></defs>
                    <line x1="0" y1="10" x2="36" y2="10" stroke={nodes[i + 1]!.col} strokeWidth="1.8" markerEnd={`url(#arr${i})`} />
                  </svg>
                </div>
              )}
            </Fragment>
          ))}
        </div>
        {/* bottom note */}
        <div style={{ marginTop: 14, padding: "8px 14px", borderRadius: 10, background: "color-mix(in srgb, #3b82f6 8%, var(--bg-2))", border: "1px solid #3b82f630", fontSize: ".73rem", color: "var(--muted)", lineHeight: 1.5 }}>
          <span style={{ fontWeight: 800, color: "#3b82f6" }}>On Arbitrum Sepolia</span> — USDC contract <code style={{ fontSize: ".68rem", background: "var(--bg-1)", padding: "1px 5px", borderRadius: 4 }}>0x75faf114…</code> · settlement is final in &lt;1 block · proof is single-use and challenge-bound
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ARBITRUM — USDC Transfer widget
// ---------------------------------------------------------------------------
function UsdcTransferWidget({ workspace }: { workspace: Workspace }) {
  const w = useWallet();
  const { emitReceipt } = useAppState();
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("5.00");
  const [stage, setStage] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const USDC_ARB_SEPOLIA = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";

  const send = async () => {
    if (!w.address) { await w.connect(); return; }
    if (!to.trim() || !parseFloat(amount)) return;
    const provider = typeof window !== "undefined" ? (window as { ethereum?: Parameters<typeof sendErc20Transfer>[0] }).ethereum : undefined;
    if (!provider) { setErrMsg("No wallet provider found"); return; }
    setStage("sending"); setErrMsg(null);
    try {
      const hash = await sendErc20Transfer(provider, w.address, USDC_ARB_SEPOLIA, to.trim(), parseUnits(amount, 6));
      setTxHash(hash);
      emitReceipt({ workspaceId: workspace.id, serviceName: "USDC Settlement API", amount: parseFloat(amount), currency: "USDC", network: "arbitrum-sepolia", kind: "arb.usdc.transfer", payload: { to: to.trim(), amount, txHash: hash } });
      setStage("done");
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : "Transaction failed");
      setStage("error");
    }
  };

  return (
    <div className="panel block svc-flavor">
      <div className="block-head"><div className="ttl"><span className="sq soft"><Send width={15} height={15} /></span><div><h3>Send USDC</h3><div className="sub">settle a payment directly on Arbitrum · wallet signs ERC-20 transfer</div></div></div></div>
      <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Recipient address</span>
            <input value={to} onChange={(e) => setTo(e.currentTarget.value)} placeholder="0x…" style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontFamily: "var(--mono)", fontSize: ".78rem" }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Amount (USDC)</span>
            <input value={amount} onChange={(e) => setAmount(e.currentTarget.value)} inputMode="decimal" placeholder="5.00" style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }} />
          </label>
        </div>
        {!w.address
          ? <button className="btn btn-acc btn-sm" type="button" onClick={() => void w.connect()} disabled={w.connecting}>{w.connecting ? "Connecting…" : "Connect wallet to send"}</button>
          : <button className="btn btn-acc btn-sm" type="button" onClick={send} disabled={stage === "sending" || !to.trim() || !parseFloat(amount)}>
              {stage === "sending" ? <><Loader2 size={13} className="wallet-spin" /> Sending…</> : <><Send size={13} /> Send USDC</>}
            </button>
        }
        {stage === "done" && txHash && (
          <div style={{ padding: "8px 12px", borderRadius: 10, background: "color-mix(in srgb, var(--green) 12%, transparent)", color: "var(--green)", fontSize: ".78rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 7 }}>
            <Check width={14} height={14} /> Sent · <code style={{ background: "rgba(0,0,0,.14)", padding: "1px 5px", borderRadius: 5 }}>{txHash.slice(0, 12)}…</code>
          </div>
        )}
        {stage === "error" && errMsg && (
          <div style={{ padding: "8px 12px", borderRadius: 10, background: "color-mix(in srgb, var(--red) 12%, transparent)", color: "var(--red)", fontSize: ".78rem", fontWeight: 700 }}>
            {errMsg}
          </div>
        )}
        <div className="cm-note"><Shield width={13} height={13} /> Sends real USDC on Arbitrum Sepolia testnet. Ensure you have test tokens and the right network selected.</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ARBITRUM — Interactive Escrow manager
// ---------------------------------------------------------------------------
type EscrowState = { id: string; service: string; agent: string; amount: number; condition: string; state: "held" | "released" | "refunded"; openedAt: string };
const INITIAL_ESCROWS: EscrowState[] = [
  { id: "esc_4a1c2", service: "Stablecoin Invoice API", agent: "agent_f1…", amount: 0.04, condition: "delivery proof", state: "held", openedAt: new Date(Date.now() - 2 * 36e5).toISOString() },
  { id: "esc_9b07d", service: "Agent Escrow API", agent: "agent_d9…", amount: 0.08, condition: "timeout 24h", state: "held", openedAt: new Date(Date.now() - 6 * 36e5).toISOString() },
  { id: "esc_2e3c1", service: "USDC Settlement API", agent: "agent_1a…", amount: 0.1, condition: "delivery proof", state: "released", openedAt: new Date(Date.now() - 26 * 36e5).toISOString() },
  { id: "esc_7f01a", service: "Stablecoin Invoice API", agent: "agent_77…", amount: 0.04, condition: "manual", state: "held", openedAt: new Date(Date.now() - 9 * 36e5).toISOString() },
];
const ESCROW_CONDITIONS = ["delivery proof", "timeout 24h", "manual"] as const;
function InteractiveEscrow({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [escrows, setEscrows] = useLocalStore<EscrowState[]>("arb.escrows", INITIAL_ESCROWS);
  const [svc, setSvc] = useState("Agent Escrow API");
  const [agent, setAgent] = useState("agent_treasury");
  const [amount, setAmount] = useState("0.05");
  const [condition, setCondition] = useState<typeof ESCROW_CONDITIONS[number]>("delivery proof");

  const net = workspace.networks[0] ?? "arbitrum-sepolia";
  const open = () => {
    const a = parseFloat(amount) || 0; if (a <= 0) return;
    const id = "esc_" + hashId("esc", svc + agent + Date.now(), 5);
    setEscrows((prev) => [{ id, service: svc.trim() || "Service", agent: agent.trim() || "agent", amount: a, condition, state: "held" as const, openedAt: new Date().toISOString() }, ...prev].slice(0, 20));
    emitReceipt({ workspaceId: workspace.id, serviceName: "Agent Escrow · Open", amount: a, currency: "USDC", network: net, kind: "arb.escrow.open", payload: { escId: id, service: svc.trim(), agent: agent.trim(), condition } });
  };
  const resolve = (e: EscrowState, newState: "released" | "refunded") => {
    setEscrows((prev) => prev.map((x) => x.id === e.id ? { ...x, state: newState } : x));
    emitReceipt({ workspaceId: workspace.id, serviceName: `Agent Escrow · ${newState === "released" ? "Release" : "Refund"}`, amount: e.amount, currency: "USDC", network: net, kind: newState === "released" ? "arb.escrow.release" : "arb.escrow.refund", payload: { escId: e.id, service: e.service, agent: e.agent } });
  };
  const held = escrows.filter((e) => e.state === "held").reduce((s, e) => s + e.amount, 0);
  const released = escrows.filter((e) => e.state === "released").reduce((s, e) => s + e.amount, 0);
  const refunded = escrows.filter((e) => e.state === "refunded").reduce((s, e) => s + e.amount, 0);

  const SM_STATES: { key: EscrowState["state"] | "open"; label: string; color: string }[] = [
    { key: "open", label: "Open", color: "#94a3b8" },
    { key: "held", label: "Funded", color: "#3aa0e6" },
    { key: "released", label: "Released", color: "#1fb58a" },
    { key: "refunded", label: "Refunded", color: "#e63946" },
  ];

  const EscrowCard = ({ e }: { e: EscrowState }) => {
    const activeIdx = e.state === "held" ? 1 : e.state === "released" ? 2 : 3;
    return (
      <div style={{ borderRadius: 14, border: "1px solid var(--line-2)", background: "var(--bg-2)", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        {/* Mini state machine */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 2 }}>
          {SM_STATES.filter((s) => s.key !== "open").map((s, i) => {
            const isActive = (i === 0 && e.state === "held") || (i === 1 && e.state === "released") || (i === 2 && e.state === "refunded");
            const isPast = (i === 0 && (e.state === "released" || e.state === "refunded"));
            const col = isActive ? s.color : isPast ? s.color : "var(--line-2)";
            return (
              <Fragment key={s.key}>
                {i > 0 && <div style={{ flex: 1, height: 1, background: isPast || isActive ? col : "var(--line-2)", minWidth: 12 }} />}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${col}`, background: isActive ? col : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {(isActive || isPast) && <Check width={10} height={10} style={{ color: isActive ? "#fff" : col }} />}
                  </div>
                  <span style={{ fontSize: ".55rem", fontWeight: 700, color: col, whiteSpace: "nowrap" }}>{s.label}</span>
                </div>
              </Fragment>
            );
          })}
        </div>
        {/* Escrow details */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: ".82rem" }}>{e.service}</div>
            <div style={{ fontSize: ".68rem", color: "var(--muted)" }}>{e.agent} · {e.condition}</div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontWeight: 900, fontSize: ".92rem", color: SM_STATES[activeIdx]!.color }}>${e.amount.toFixed(3)}</div>
            <div style={{ fontSize: ".62rem", color: "var(--muted)" }}>USDC</div>
          </div>
        </div>
        {e.state === "held" && (
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-acc btn-sm" style={{ flex: 1, fontSize: ".7rem" }} type="button" onClick={() => resolve(e, "released")}><Check width={11} height={11} /> Release</button>
            <button className="btn btn-sm btn-ghost" style={{ flex: 1, fontSize: ".7rem" }} type="button" onClick={() => resolve(e, "refunded")}>Refund</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="panel block svc-flavor">
      <div className="block-head" style={{ borderBottom: "1px solid var(--line-2)", paddingBottom: 12 }}>
        <div className="ttl"><span className="sq soft"><Shield width={15} height={15} /></span><div><h3>Escrow state machine</h3><div className="sub">each escrow moves through Open → Funded → Released (or Refunded) · every transition is a receipt</div></div></div>
        <span style={{ fontSize: ".72rem", color: "var(--muted)" }}>Held <b style={{ color: "var(--ink)" }}>${held.toFixed(3)}</b> · Released <b style={{ color: "#1fb58a" }}>${released.toFixed(3)}</b></span>
      </div>

      {/* Global state machine diagram */}
      <div style={{ padding: "16px 20px 12px", display: "flex", alignItems: "center", justifyContent: "center", gap: 0, overflowX: "auto" }}>
        {["Open", "Funded", "Released"].map((label, i) => {
          const colors = ["#94a3b8", "#3aa0e6", "#1fb58a"];
          const col = colors[i]!;
          return (
            <Fragment key={label}>
              {i > 0 && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 40, height: 2, background: `linear-gradient(90deg, ${colors[i-1]!}, ${col})` }} />
                  <span style={{ fontSize: ".55rem", color: "var(--muted)", marginTop: 2 }}>{i === 1 ? "fund" : "verify"}</span>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", border: `2.5px solid ${col}`, background: `color-mix(in srgb, ${col} 12%, var(--bg-2))`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: ".68rem", fontWeight: 800, color: col }}>{label.slice(0, 3)}</span>
                </div>
                <span style={{ fontSize: ".65rem", fontWeight: 700, color: col }}>{label}</span>
              </div>
            </Fragment>
          );
        })}
        {/* Refund branch */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginLeft: 16, paddingLeft: 16, borderLeft: "1px dashed var(--line-2)" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", border: "2px dashed #e63946", background: "color-mix(in srgb, #e63946 8%, var(--bg-2))", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: ".62rem", fontWeight: 800, color: "#e63946" }}>Ref</span>
          </div>
          <span style={{ fontSize: ".6rem", fontWeight: 700, color: "#e63946", marginTop: 4 }}>Refunded</span>
        </div>
      </div>

      {/* Escrow cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10, padding: "0 16px 12px" }}>
        {escrows.map((e) => <EscrowCard key={e.id} e={e} />)}
      </div>

      {/* New escrow form */}
      <div style={{ margin: "0 16px 14px", padding: "12px 14px", borderRadius: 12, border: "1px solid var(--line-2)", background: "var(--field)" }}>
        <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", marginBottom: 8 }}>Open new escrow</div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.4fr 1fr 1.4fr", gap: 8, marginBottom: 8 }}>
          <input value={svc} onChange={(e) => setSvc(e.currentTarget.value)} placeholder="Service / counterparty" style={{ padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".78rem" }} />
          <input value={agent} onChange={(e) => setAgent(e.currentTarget.value)} placeholder="Agent ID" style={{ padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".78rem", fontFamily: "var(--mono)" }} />
          <input value={amount} onChange={(e) => setAmount(e.currentTarget.value)} placeholder="USDC" inputMode="decimal" style={{ padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".78rem" }} />
          <select value={condition} onChange={(e) => setCondition(e.currentTarget.value as typeof condition)} style={{ padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".78rem" }}>{ESCROW_CONDITIONS.map((c) => <option key={c}>{c}</option>)}</select>
        </div>
        <button className="btn btn-acc btn-sm" type="button" onClick={open}><Plus width={13} height={13} /> Open escrow → Funded state</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MANTLE — Live Backtest Runner
// ---------------------------------------------------------------------------
const BACKTEST_ASSETS = ["mETH / USDY", "T-BILL 90D / mETH", "RWA-A / USDC", "mETH / USDC"] as const;
const BACKTEST_WINDOWS = ["30d", "90d", "180d", "1y"] as const;

function BacktestRunner({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const { receipts } = useAppState();
  const [assetIdx, setAssetIdx] = useState(0);
  const [windowIdx, setWindowIdx] = useState(1);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ ret: string; maxDD: string; sharpe: number; trades: number; runId: string } | null>(null);

  const asset = BACKTEST_ASSETS[assetIdx] ?? BACKTEST_ASSETS[0];
  const window_ = BACKTEST_WINDOWS[windowIdx] ?? BACKTEST_WINDOWS[1];
  const history = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id && r.kind === "mantle.backtest").slice(0, 8), [receipts, workspace.id]);

  const curveData = useMemo(() => {
    const seed = `${asset}|${window_}`;
    const retFloat = result ? parseFloat(result.ret) : deterministicScore(seed + "pre", -3, 12);
    const pts: number[] = [50];
    for (let i = 1; i <= 30; i++) {
      const delta = deterministicScore(seed + i, -3, 4.5) + (retFloat > 0 ? 0.55 : retFloat < 0 ? -0.35 : 0.1);
      pts.push(Math.max(2, Math.min(98, (pts[pts.length - 1] ?? 50) + delta)));
    }
    return pts;
  }, [asset, window_, result]);

  const run = async () => {
    setRunning(true);
    await new Promise((r) => setTimeout(r, 600));
    const seed = `${asset}|${window_}`;
    const retRaw = deterministicScore(seed + "|ret", -5, 38);
    const ret = (retRaw >= 0 ? "+" : "") + retRaw.toFixed(1) + "%";
    const dd = "-" + deterministicScore(seed + "|dd", 2, 18).toFixed(1) + "%";
    const sharpe = parseFloat(deterministicScore(seed + "|sr", 0.4, 2.4).toFixed(2));
    const trades = Math.round(deterministicScore(seed + "|tr", 40, 300));
    const runId = "sim_" + hashId("bt", seed, 6);
    emitReceipt({ workspaceId: workspace.id, serviceName: "Strategy Backtest API", amount: 0.15, currency: "USDC", network: workspace.networks[0] ?? "mantle-sepolia", kind: "mantle.backtest", payload: { asset, window: window_, ret, maxDD: dd, sharpe, trades, runId } });
    setResult({ ret, maxDD: dd, sharpe, trades, runId });
    setRunning(false);
  };

  const CW = 460, CH = 130;
  const svgPoints = curveData.map((p, i) => [Math.round((i / 30) * CW), Math.round(CH - (p / 100) * (CH - 12) - 6)] as [number, number]);
  const lineD = svgPoints.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const fillD = `${lineD} L${CW},${CH + 6} L0,${CH + 6} Z`;
  const curveUp = (curveData[curveData.length - 1] ?? 50) > (curveData[0] ?? 50);
  const curveColor = curveUp ? "#1fb58a" : "#e63946";

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><TrendingUp width={15} height={15} /></span><div><h3>Trading Strategies</h3><div className="sub">$0.15 USDC / run · deterministic simulation · receipt issued</div></div></div>
        <button className="btn btn-acc btn-sm" type="button" onClick={run} disabled={running}>{running ? <><Loader2 size={13} className="wallet-spin" /> Running…</> : <><Play size={13} /> Run backtest</>}</button>
      </div>

      {/* Equity curve — chart-first */}
      <div style={{ padding: "0 16px 4px", position: "relative" }}>
        <svg viewBox={`0 0 ${CW} ${CH}`} style={{ width: "100%", height: CH, display: "block", borderRadius: 8, background: "var(--bg-3)", overflow: "hidden" }} preserveAspectRatio="none">
          <defs>
            <linearGradient id="btFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={curveColor} stopOpacity="0.28" />
              <stop offset="100%" stopColor={curveColor} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={fillD} fill="url(#btFill)" />
          <path d={lineD} fill="none" stroke={curveColor} strokeWidth="2" strokeLinejoin="round" />
          {/* Baseline */}
          <line x1={0} y1={Math.round(CH - (50 / 100) * (CH - 12) - 6)} x2={CW} y2={Math.round(CH - (50 / 100) * (CH - 12) - 6)} stroke="var(--line-2)" strokeWidth="1" strokeDasharray="4 4" />
        </svg>
        <div style={{ position: "absolute", top: 8, left: 24, fontSize: ".68rem", fontWeight: 800, color: curveColor }}>{curveUp ? "▲" : "▼"} {asset} · {window_}</div>
        {result && (
          <div style={{ position: "absolute", top: 8, right: 24, fontSize: ".76rem", fontWeight: 800, color: curveUp ? "#1fb58a" : "#e63946" }}>{result.ret}</div>
        )}
      </div>

      {/* Param sliders */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, padding: "12px 16px 12px" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Asset pair · <b style={{ color: "var(--ink)" }}>{asset}</b></span>
          <input type="range" min={0} max={BACKTEST_ASSETS.length - 1} value={assetIdx} onChange={(e) => setAssetIdx(Number(e.currentTarget.value))} style={{ width: "100%", accentColor: "var(--accent-primary)" }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Window · <b style={{ color: "var(--ink)" }}>{window_}</b></span>
          <input type="range" min={0} max={BACKTEST_WINDOWS.length - 1} value={windowIdx} onChange={(e) => setWindowIdx(Number(e.currentTarget.value))} style={{ width: "100%", accentColor: "var(--accent-primary)" }} />
        </label>
      </div>

      {result && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, padding: "4px 16px 12px" }}>
          {[["Return", result.ret, "#1fb58a"], ["Max DD", result.maxDD, "#e63946"], ["Sharpe", result.sharpe, "var(--accent-primary)"], ["Trades", result.trades, "var(--ink)"]].map(([k, v, c]) => (
            <div key={String(k)} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted)", fontWeight: 800 }}>{k}</span>
              <span style={{ fontSize: "1.1rem", fontWeight: 800, color: String(c), letterSpacing: "-.03em" }}>{v}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ padding: "0 16px 14px" }}>
        <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0" }}>Recent runs · {history.length}</div>
        <div className="svc-table__scroll"><table className="svc-table">
          <thead><tr><th>Run ID</th><th>Asset</th><th>Window</th><th>Return</th><th>Sharpe</th><th>Cost</th></tr></thead>
          <tbody>
            {history.length === 0 && <tr><td colSpan={6} style={{ color: "var(--muted)", padding: 12 }}>No runs yet — try one above.</td></tr>}
            {history.map((r) => {
              const p = (r.payload ?? {}) as { asset?: string; window?: string; ret?: string; sharpe?: number };
              return (
                <tr key={r.id}>
                  <td><code>#{hashId("bt", r.id, 6)}</code></td>
                  <td>{p.asset ?? "—"}</td>
                  <td>{p.window ?? "—"}</td>
                  <td style={{ color: "#1fb58a", fontWeight: 700 }}>{p.ret ?? "—"}</td>
                  <td className="svc-table__num">{p.sharpe ?? "—"}</td>
                  <td className="svc-table__num">${r.amount.toFixed(2)} <span className="muted">{r.currency}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MANTLE — Alpha feed
// ---------------------------------------------------------------------------
type AlphaDrop = { id: string; at: string; conf: number; text: string };
const ALPHA_ITEMS: AlphaDrop[] = [
  { id: "a0", at: "09:14", conf: 91, text: "mETH APY trending +0.3% vs 7d avg — accumulate bias confirmed by on-chain flow" },
  { id: "a1", at: "08:41", conf: 76, text: "T-BILL 90D tranche filling fast; next issuance window in 3d — front-run window open" },
  { id: "a2", at: "07:58", conf: 83, text: "USDY / USDC spread compressed to 0.04% — neutral rotation signal" },
  { id: "a3", at: "06:30", conf: 68, text: "RWA basket A- collateral ratio dipped to 102% — monitor closely, grade may slip" },
  { id: "a4", at: "05:11", conf: 88, text: "mETH / USDC pool depth +14% overnight — improved fill for large strategy rebalance" },
];
const ALPHA_LINES = [
  "mETH staking flow turned net-positive over the last 4h — accumulate window",
  "USDY APY ticked to {x}% — rotation edge vs mETH widening",
  "T-BILL {x}D tranche {x}% subscribed — issuance front-run window {x}d",
  "RWA basket grade-{g} collateral ratio at {x}% — {note}",
  "mETH/USDT depth +{x}% — large rebalance fills cleanly now",
  "Smart-money cluster rotated {x}% mETH → USDY at block {x}",
];
function makeAlphaDrop(seed: string): AlphaDrop {
  const tIdx = Math.floor(deterministicScore(seed + "|t", 0, ALPHA_LINES.length - 0.001));
  const conf = Math.round(deterministicScore(seed + "|c", 58, 95));
  const x1 = deterministicScore(seed + "|x", 2, 18).toFixed(1);
  const grade = (["A", "A-", "BBB"] as const)[Math.floor(deterministicScore(seed + "|g", 0, 2.999))]!;
  const note = conf > 80 ? "stable" : "watch for downgrade";
  const text = (ALPHA_LINES[tIdx] ?? ALPHA_LINES[0]!).replace(/\{x\}/g, x1).replace(/\{g\}/g, grade).replace(/\{note\}/g, note);
  const now = new Date();
  return { id: "ad_" + hashId("ad", seed, 6), at: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), conf, text };
}

function AlphaDesk({ workspace }: { workspace: Workspace }) {
  const { emitReceipt, receipts } = useAppState();
  const [feed, setFeed] = useState<AlphaDrop[]>(ALPHA_ITEMS);
  const [pulls, setPulls] = useState(0);
  const [subbed, setSubbed] = useLocalStore<boolean>("mantle.alpha.sub", false);
  const [livePrice, setLivePrice] = useState<{ mnt: number; change: number } | null>(null);
  const recent = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id && r.kind === "mantle.alpha.pull").slice(0, 6), [receipts, workspace.id]);
  const dot = (c: number) => c > 80 ? "#1fb58a" : c > 70 ? "#ff9b00" : "var(--muted)";

  const pull = async () => {
    const n = pulls + 1;
    // fetch real MNT price to anchor alpha drops in real data
    let freshPrice = livePrice;
    try {
      const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=mantle&vs_currencies=usd&include_24hr_change=true", { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json() as { mantle?: { usd: number; usd_24h_change?: number } };
        if (data.mantle) { freshPrice = { mnt: data.mantle.usd, change: data.mantle.usd_24h_change ?? 0 }; setLivePrice(freshPrice); }
      }
    } catch { /* use existing livePrice */ }
    const fresh = [makeAlphaDrop(`${workspace.id}|p${n}|0`), makeAlphaDrop(`${workspace.id}|p${n}|1`)];
    setFeed((f) => [...fresh, ...f].slice(0, 12));
    setPulls(n);
    emitReceipt({ workspaceId: workspace.id, serviceId: "svc_mnt_alpha", serviceName: "Mantle Alpha Desk · Pull", amount: 0.04, currency: "USDC", network: workspace.networks[0] ?? "mantle-sepolia", kind: "mantle.alpha.pull", payload: { drops: fresh.map((d) => ({ conf: d.conf, text: d.text })), pull: n, mntPrice: freshPrice?.mnt } });
  };
  const toggleSub = () => {
    const next = !subbed; setSubbed(next);
    if (next) emitReceipt({ workspaceId: workspace.id, serviceName: "Mantle Alpha Desk · Subscribe", amount: 0, currency: "USDC", network: workspace.networks[0] ?? "mantle-sepolia", kind: "mantle.alpha.pull", payload: { event: "subscription_active" } });
  };

  return (
    <div className="panel block svc-flavor" style={{ overflow: "hidden" }}>
      {/* Terminal header bar */}
      <div style={{ background: "var(--bg-3, #0d1117)", borderBottom: "1px solid var(--line-2)", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: subbed ? "#1fb58a" : "#555" }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff9b00" }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#e63946" }} />
          </div>
          <span style={{ fontFamily: "monospace", fontSize: ".75rem", color: "#8b949e", letterSpacing: ".04em" }}>MANTLE ALPHA TERMINAL{subbed ? " — LIVE" : ""}</span>
          {livePrice && (
            <span style={{ fontFamily: "monospace", fontSize: ".72rem", color: livePrice.change >= 0 ? "#1fb58a" : "#e63946", fontWeight: 700, marginLeft: 8 }}>
              MNT ${livePrice.mnt.toFixed(4)} {livePrice.change >= 0 ? "▲" : "▼"}{Math.abs(livePrice.change).toFixed(2)}%
            </span>
          )}
        </div>
        <span style={{ display: "flex", gap: 6 }}>
          <button className={"btn btn-sm" + (subbed ? " btn-ghost" : "")} style={{ fontFamily: "monospace", fontSize: ".7rem" }} type="button" onClick={toggleSub}>{subbed ? "[LIVE ✓]" : "[SUBSCRIBE]"}</button>
          <button className="btn btn-acc btn-sm" style={{ fontFamily: "monospace", fontSize: ".7rem" }} type="button" onClick={pull}>[PULL $0.04]</button>
        </span>
      </div>

      {/* Terminal body */}
      <div style={{ background: "color-mix(in srgb, var(--bg-3, #0d1117) 60%, transparent)", padding: "8px 0", maxHeight: 360, overflowY: "auto" }}>
        {feed.map((a, i) => {
          const c = dot(a.conf);
          const confLabel = a.conf > 80 ? "HIGH" : a.conf > 70 ? " MED" : " LOW";
          return (
            <div key={a.id} style={{ display: "flex", gap: 0, alignItems: "flex-start", borderLeft: `3px solid ${c}`, marginBottom: 1, padding: "7px 14px", background: i === 0 ? `color-mix(in srgb, ${c} 6%, transparent)` : "transparent", transition: "background .3s" }}>
              <span style={{ fontFamily: "monospace", fontSize: ".68rem", color: "#8b949e", whiteSpace: "nowrap", marginRight: 10, paddingTop: 1 }}>{a.at}</span>
              <span style={{ fontFamily: "monospace", fontSize: ".68rem", fontWeight: 800, color: c, whiteSpace: "nowrap", marginRight: 10, paddingTop: 1 }}>[{confLabel} {a.conf}%]</span>
              <span style={{ fontFamily: "monospace", fontSize: ".75rem", color: "var(--ink)", lineHeight: 1.45 }}>{a.text}</span>
            </div>
          );
        })}
        <div style={{ fontFamily: "monospace", fontSize: ".68rem", color: "#8b949e", padding: "8px 14px", borderLeft: "3px solid transparent" }}>
          <span style={{ animation: "blink 1s step-end infinite" }}>█</span> {pulls > 0 ? `${pulls} pull${pulls === 1 ? "" : "s"} · ${pulls * 2} signals ingested` : "awaiting first pull…"}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 0, borderTop: "1px solid var(--line-2)", fontSize: ".68rem", fontFamily: "monospace" }}>
        {([["signals", feed.length], ["high conf", feed.filter(a => a.conf > 80).length], ["med conf", feed.filter(a => a.conf > 70 && a.conf <= 80).length], ["cost", `$${(pulls * 0.04).toFixed(2)}`]] as [string, string|number][]).map(([k, v]) => (
          <div key={k} style={{ flex: 1, padding: "7px 12px", borderRight: "1px solid var(--line-2)", textAlign: "center" }}>
            <div style={{ color: "var(--muted)", marginBottom: 2 }}>{k}</div>
            <div style={{ fontWeight: 800, color: "var(--ink)" }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MANTLE — RWA portfolio (RWA Data tab) — allocation donut + credit-grade ladder
// ---------------------------------------------------------------------------
const RWA_BASKETS = [
  { id: "rwa_tbill90", name: "US T-Bills 90D", grade: "AAA", duration: "90d", baseApy: 5.3 },
  { id: "rwa_tbill180", name: "US T-Bills 180D", grade: "AAA", duration: "180d", baseApy: 5.1 },
  { id: "rwa_ig_credit", name: "IG Corporate Credit", grade: "A", duration: "1.8y", baseApy: 6.4 },
  { id: "rwa_re_income", name: "Real-Estate Income", grade: "BBB", duration: "3.0y", baseApy: 7.8 },
  { id: "rwa_priv_credit", name: "Private Credit Pool", grade: "BBB-", duration: "1.2y", baseApy: 9.2 },
] as const;
const RWA_GRADE_RUNGS = ["AAA", "AA", "A", "BBB", "BBB-", "BB"] as const;
const RWA_DONUT_COLORS = ["#1fb58a", "#3aa0e6", "#7C5CF8", "#ff9b00", "#e63946", "#d8ff2f"];
function rwaGradeIdx(g: string): number { const i = (RWA_GRADE_RUNGS as readonly string[]).indexOf(g); return i >= 0 ? i : RWA_GRADE_RUNGS.length - 1; }
function rwaGradeColor(g: string): string { return g.startsWith("AAA") ? "#1fb58a" : g.startsWith("AA") ? "#3aa0e6" : g.startsWith("A") ? "#3aa0e6" : g.startsWith("BBB") ? "#ff9b00" : "#e63946"; }
function RwaRegistry({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const baskets = useMemo(() => {
    const raw = RWA_BASKETS.map((b) => ({
      ...b,
      apy: Number((b.baseApy + deterministicScore(b.id + "|apy", -0.4, 0.4)).toFixed(2)),
      tvl: Number(deterministicScore(b.id + "|tvl", 8, 220).toFixed(1)),
      wRaw: deterministicScore(b.id + "|w", 9, 30),
    }));
    const sum = raw.reduce((s, b) => s + b.wRaw, 0);
    let used = 0;
    return raw.map((b, i) => {
      const w = i === raw.length - 1 ? 100 - used : Math.round((b.wRaw / sum) * 100);
      used += w;
      return { ...b, weight: w, color: RWA_DONUT_COLORS[i % RWA_DONUT_COLORS.length]! };
    });
  }, []);
  const [selId, setSelId] = useState<string>(RWA_BASKETS[0].id);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<{ basketId: string; collateralRatio: number; defaultProb: number; stress: string; recommendation: string; reportId: string } | null>(null);
  const sel = baskets.find((b) => b.id === selId) ?? baskets[0]!;
  const portfolioApy = (baskets.reduce((s, b) => s + b.apy * b.weight, 0) / 100);
  const wGradeIdx = Math.round(baskets.reduce((s, b) => s + rwaGradeIdx(b.grade) * b.weight, 0) / 100);
  const wGrade = RWA_GRADE_RUNGS[Math.min(wGradeIdx, RWA_GRADE_RUNGS.length - 1)]!;
  const totalTvl = baskets.reduce((s, b) => s + b.tvl, 0);

  // donut geometry
  const R = 46, STROKE = 16, CIRC = 2 * Math.PI * R;
  let acc = 0;
  const segs = baskets.map((b) => {
    const frac = b.weight / 100;
    const s = { id: b.id, color: b.color, len: CIRC * frac, gap: CIRC * (1 - frac), offset: -CIRC * acc };
    acc += frac;
    return s;
  });

  const runReport = async () => {
    setRunning(true);
    await new Promise((r) => setTimeout(r, 520));
    const b = sel;
    const collateralRatio = Math.round(deterministicScore(b.id + "|cr", 101, 138));
    const defaultProb = Number(deterministicScore(b.id + "|dp", 0.05, 2.4).toFixed(2));
    const stress = collateralRatio < 108 || defaultProb > 1.5 ? "fails -20% rate shock" : collateralRatio < 118 ? "marginal under -20% rate shock" : "passes -20% rate shock";
    const recommendation = defaultProb < 0.6 && collateralRatio > 115 ? "size up to target weight" : defaultProb < 1.2 ? "hold at current weight" : "trim — grade may slip";
    const reportId = "rwar_" + hashId("rwar", b.id + Date.now(), 8);
    emitReceipt({ workspaceId: workspace.id, serviceId: "svc_mnt_stress", serviceName: `RWA Risk Report · ${b.name}`, amount: 0.06, currency: "USDC", network: workspace.networks[0] ?? "mantle-sepolia", kind: "mantle.rwa.report", payload: { basket: b.name, basketId: b.id, grade: b.grade, collateralRatio, defaultProb, stress, recommendation, reportId } });
    setReport({ basketId: b.id, collateralRatio, defaultProb, stress, recommendation, reportId });
    setRunning(false);
  };

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><FileText width={15} height={15} /></span><div><h3>RWA portfolio</h3><div className="sub">tokenised real-world assets on Mantle · allocation by weight, credit quality at a glance · pull a risk report on any basket</div></div></div>
      </div>

      {/* Donut + ladder side by side */}
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", padding: "0 16px 14px", alignItems: "flex-start" }}>
        {/* Allocation donut */}
        <div style={{ position: "relative", flex: "0 0 auto" }}>
          <svg width={128} height={128} viewBox="0 0 128 128" role="img" aria-label="RWA allocation">
            <circle cx={64} cy={64} r={R} fill="none" stroke="var(--line-2)" strokeWidth={STROKE} opacity={0.4} />
            {segs.map((s) => (
              <circle key={s.id} cx={64} cy={64} r={R} fill="none" stroke={s.color} strokeWidth={selId === s.id ? STROKE + 4 : STROKE}
                strokeDasharray={`${s.len} ${s.gap}`} strokeDashoffset={s.offset} transform="rotate(-90 64 64)"
                style={{ cursor: "pointer", transition: "stroke-width .15s" }} onClick={() => setSelId(s.id)} />
            ))}
            <text x={64} y={59} textAnchor="middle" fontSize="9" fill="var(--muted)" fontWeight="700">PORTFOLIO APY</text>
            <text x={64} y={76} textAnchor="middle" fontSize="20" fill="var(--ink)" fontWeight="800">{portfolioApy.toFixed(2)}%</text>
          </svg>
        </div>
        {/* Stats + grade ladder */}
        <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div><div style={{ fontSize: ".58rem", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted)", fontWeight: 800 }}>Weighted grade</div><div style={{ fontSize: "1.1rem", fontWeight: 800, color: rwaGradeColor(wGrade) }}>{wGrade}</div></div>
            <div><div style={{ fontSize: ".58rem", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted)", fontWeight: 800 }}>Total TVL</div><div style={{ fontSize: "1.1rem", fontWeight: 800 }}>${totalTvl.toFixed(0)}M</div></div>
            <div><div style={{ fontSize: ".58rem", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted)", fontWeight: 800 }}>Baskets</div><div style={{ fontSize: "1.1rem", fontWeight: 800 }}>{baskets.length}</div></div>
          </div>
          {/* Credit-grade ladder */}
          <div>
            <div style={{ fontSize: ".58rem", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted)", fontWeight: 800, marginBottom: 4 }}>Credit-grade ladder</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {RWA_GRADE_RUNGS.map((rung) => {
                const here = baskets.filter((b) => b.grade === rung);
                if (here.length === 0 && rung !== "AA" && rung !== "BB") { /* keep rung visible only if AAA/A/BBB/BBB- present somewhere */ }
                return (
                  <div key={rung} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", opacity: here.length ? 1 : 0.35 }}>
                    <span style={{ width: 36, fontSize: ".7rem", fontWeight: 800, color: rwaGradeColor(rung), textAlign: "right" }}>{rung}</span>
                    <div style={{ flex: 1, height: 18, borderRadius: 6, background: "var(--bg-2)", border: "1px solid var(--line-2)", display: "flex", alignItems: "center", gap: 4, padding: "0 5px" }}>
                      {here.map((b) => (
                        <button key={b.id} type="button" onClick={() => setSelId(b.id)} title={`${b.name} · ${b.weight}%`}
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, border: "none", borderRadius: 5, padding: "1px 6px", fontSize: ".66rem", fontWeight: 700, cursor: "pointer", background: selId === b.id ? b.color : `color-mix(in srgb, ${b.color} 22%, transparent)`, color: selId === b.id ? "#fff" : "var(--ink)" }}>
                          {b.name.replace(/ \d.*$/, "").slice(0, 16)} {b.weight}%
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Legend (clickable allocation rows) */}
      <div style={{ padding: "0 16px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
        {baskets.map((b) => (
          <div key={b.id} onClick={() => setSelId(b.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 11px", borderRadius: 10, border: `1px solid ${selId === b.id ? "var(--accent-primary)" : "var(--line-2)"}`, background: selId === b.id ? "color-mix(in srgb, var(--accent-primary) 7%, transparent)" : "var(--bg-2)", cursor: "pointer" }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: b.color, flex: "none" }} />
            <span style={{ flex: 1, fontSize: ".84rem", fontWeight: 700 }}>{b.name}</span>
            <span className="pill" style={{ background: `color-mix(in srgb, ${rwaGradeColor(b.grade)} 16%, transparent)`, color: rwaGradeColor(b.grade), fontWeight: 800, flex: "none", fontSize: ".68rem" }}>{b.grade}</span>
            <span style={{ flex: "none", fontSize: ".74rem", color: "var(--muted)", fontFamily: "var(--mono)" }}>{b.duration}</span>
            <span style={{ flex: "none", fontSize: ".82rem", fontWeight: 700 }}>{b.apy.toFixed(2)}%</span>
            <span style={{ flex: "none", fontSize: ".82rem", fontWeight: 800, color: "var(--accent-primary)", minWidth: 38, textAlign: "right" }}>{b.weight}%</span>
          </div>
        ))}
      </div>

      {/* Selected basket detail + risk report */}
      <div style={{ margin: "0 16px 14px", padding: "12px 14px", borderRadius: 12, border: "1px solid var(--line-2)", background: "var(--bg-2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: report?.basketId === sel.id ? 10 : 0 }}>
          <span style={{ width: 12, height: 12, borderRadius: 4, background: sel.color }} />
          <div style={{ flex: 1, minWidth: 160 }}><div style={{ fontSize: ".95rem", fontWeight: 800 }}>{sel.name}</div><div style={{ fontSize: ".72rem", color: "var(--muted)" }}>{sel.grade} · {sel.duration} duration · {sel.weight}% of portfolio · ${sel.tvl.toFixed(1)}M TVL · {sel.apy.toFixed(2)}% APY</div></div>
          <button className="btn btn-acc btn-sm" type="button" onClick={runReport} disabled={running}>{running ? <><Loader2 size={13} className="wallet-spin" /> Scoring…</> : <><Bolt width={13} height={13} /> Get risk report ($0.06)</>}</button>
        </div>
        {report?.basketId === sel.id && (
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", paddingTop: 10, borderTop: "1px solid var(--line-2)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 110 }}><span style={{ fontSize: ".56rem", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted)", fontWeight: 800 }}>Report</span><span style={{ fontSize: ".74rem", color: "var(--muted)", fontFamily: "var(--mono)" }}>{report.reportId}</span></div>
            {[["Collateral", report.collateralRatio + "%", report.collateralRatio < 108 ? "#e63946" : report.collateralRatio < 118 ? "#ff9b00" : "#1fb58a"], ["Default prob 12m", report.defaultProb + "%", report.defaultProb > 1.5 ? "#e63946" : report.defaultProb > 0.8 ? "#ff9b00" : "#1fb58a"], ["Stress test", report.stress, report.stress.startsWith("fails") ? "#e63946" : report.stress.startsWith("marginal") ? "#ff9b00" : "#1fb58a"], ["Recommendation", report.recommendation, "var(--ink)"]].map(([k, v, c]) => (
              <div key={String(k)} style={{ display: "flex", flexDirection: "column", gap: 1 }}><span style={{ fontSize: ".56rem", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted)", fontWeight: 800 }}>{k}</span><span style={{ fontSize: ".88rem", fontWeight: 800, color: String(c) }}>{v}</span></div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MANTLE — Agent economy loop (Agent Wallets tab): earn x402 → store → deploy → yield
// ---------------------------------------------------------------------------
type MantleEconomy = { deployedUsd: number; methAcquired: number; deploys: number };
const METH_PRICE = 3120; // mark-to-market base; current price drifts slightly above
function MantleEconomyLoop({ workspace }: { workspace: Workspace }) {
  const { emitReceipt, receipts } = useAppState();
  const [eco, setEco] = useLocalStore<MantleEconomy>("mantle.economy", { deployedUsd: 0, methAcquired: 0, deploys: 0 });
  const [fraction, setFraction] = useState("0.5");
  const wsReceipts = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id), [receipts, workspace.id]);
  const revenue = useMemo(() => wsReceipts.filter((r) => r.kind !== "mantle.deploy").reduce((s, r) => s + r.amount, 0), [wsReceipts]);
  const threshold = 0.05;
  const surplus = Math.max(0, revenue - eco.deployedUsd - threshold);
  const methNow = METH_PRICE * (1 + 0.012); // +1.2% mark
  const lpCurrent = eco.methAcquired * methNow;
  const yieldUsd = lpCurrent - eco.deployedUsd;
  const aiSpend = useMemo(() => wsReceipts.filter((r) => r.kind === "mantle.backtest" || r.kind === "mantle.alpha.pull" || (r.kind ?? "").startsWith("mantle.rwa")).reduce((s, r) => s + r.amount, 0), [wsReceipts]);
  const netProfit = revenue + yieldUsd - aiSpend;
  const deploys = useMemo(() => wsReceipts.filter((r) => r.kind === "mantle.deploy").slice(0, 6), [wsReceipts]);
  // simulated agent wallet balances
  const mnt = Number((4.2 + deterministicScore(workspace.id + "|mnt", 0, 6)).toFixed(3));

  const deploy = () => {
    const fr = Math.min(1, Math.max(0.05, parseFloat(fraction) || 0.5));
    const amt = Number((surplus * fr).toFixed(4));
    if (amt <= 0) return;
    const methGot = amt / METH_PRICE;
    setEco((e) => ({ deployedUsd: Number((e.deployedUsd + amt).toFixed(4)), methAcquired: Number((e.methAcquired + methGot).toFixed(8)), deploys: e.deploys + 1 }));
    emitReceipt({ workspaceId: workspace.id, serviceName: "Agent Economy · Deploy surplus → mETH", amount: amt, currency: "USDC", network: workspace.networks[0] ?? "mantle-sepolia", kind: "mantle.deploy", payload: { deployedUsd: amt, methAcquired: methGot, fraction: fr, txHash: "0x" + hashId("tx", "deploy" + Date.now(), 12) } });
  };

  const Node = ({ n, title, value, sub, active }: { n: string; title: string; value: string; sub: string; active?: boolean }) => (
    <div style={{ flex: 1, minWidth: 150, padding: "12px 14px", borderRadius: 14, border: `1px solid ${active ? "color-mix(in srgb, var(--accent-primary) 40%, var(--line-2))" : "var(--line-2)"}`, background: active ? "color-mix(in srgb, var(--accent-primary) 7%, transparent)" : "var(--bg-2)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}><span style={{ fontSize: ".64rem", fontWeight: 800, color: active ? "var(--accent-primary)" : "var(--muted)" }}>{n}</span><span style={{ fontSize: ".74rem", fontWeight: 700 }}>{title}</span></div>
      <div style={{ fontSize: "1.25rem", fontWeight: 800, color: active ? "var(--accent-primary)" : "var(--ink)", letterSpacing: "-.02em" }}>{value}</div>
      <div style={{ fontSize: ".66rem", color: "var(--muted)", marginTop: 2 }}>{sub}</div>
    </div>
  );

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><TrendingUp width={15} height={15} /></span><div><h3>Agent economy loop · earn → store → deploy → yield</h3><div className="sub">x402 revenue lands in the agent wallet; surplus over ${threshold.toFixed(2)} is deployed into mETH on Mantle and marked to market</div></div></div>
        <span className="row sm" style={{ gap: 8 }}>
          <select value={fraction} onChange={(e) => setFraction(e.currentTarget.value)} style={{ padding: "6px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".8rem" }}>{["0.25", "0.5", "0.75", "1.0"].map((f) => <option key={f} value={f}>deploy {Math.round(parseFloat(f) * 100)}% of surplus</option>)}</select>
          <button className="btn btn-acc btn-sm" type="button" onClick={deploy} disabled={surplus <= 0}><Bolt width={13} height={13} /> Deploy surplus → mETH</button>
        </span>
      </div>
      <div style={{ display: "flex", gap: 10, padding: "0 16px 12px", flexWrap: "wrap", alignItems: "stretch" }}>
        <Node n="1 · EARN" title="x402 revenue" value={fmtUsd(revenue)} sub={`${wsReceipts.length} receipts`} active={revenue > 0} />
        <Node n="2 · STORE" title="agent wallet" value={`${mnt} MNT`} sub={`+ ${eco.methAcquired.toFixed(5)} mETH`} />
        <Node n="3 · DEPLOY" title="into mETH" value={fmtUsd(eco.deployedUsd)} sub={`${eco.deploys} deploys · surplus ${fmtUsd(surplus)}`} active={surplus > 0} />
        <Node n="4 · YIELD" title="mark-to-market" value={(yieldUsd >= 0 ? "+" : "") + fmtUsd(yieldUsd)} sub={`pos ${fmtUsd(lpCurrent)} @ ${methNow.toLocaleString()}`} active={yieldUsd > 0} />
      </div>
      <div style={{ margin: "0 16px 12px", padding: "8px 12px", borderRadius: 10, background: "var(--field)", fontSize: ".76rem", color: "var(--muted)", display: "flex", gap: 16, flexWrap: "wrap" }}>
        <span>Revenue <b style={{ color: "var(--ink)" }}>{fmtUsd(revenue)}</b></span>
        <span>AI/data spend <b style={{ color: "var(--ink)" }}>{fmtUsd(aiSpend)}</b></span>
        <span>Yield <b style={{ color: yieldUsd >= 0 ? "#1fb58a" : "#e63946" }}>{(yieldUsd >= 0 ? "+" : "") + fmtUsd(yieldUsd)}</b></span>
        <span>Net <b style={{ color: netProfit >= 0 ? "#1fb58a" : "#e63946" }}>{(netProfit >= 0 ? "+" : "") + fmtUsd(netProfit)}</b></span>
      </div>
      {deploys.length > 0 && (
        <div style={{ padding: "0 16px 14px" }}>
          <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0" }}>Recent deploys · {deploys.length}</div>
          <div className="svc-hist">{deploys.map((r) => { const p = (r.payload ?? {}) as { deployedUsd?: number; methAcquired?: number; txHash?: string }; return (
            <div className="svc-hist__row" key={r.id}><span className="svc-hist__dot" style={{ background: "#1fb58a" }} /><div className="svc-hist__main"><b>{fmtUsd(p.deployedUsd ?? r.amount)} → {(p.methAcquired ?? 0).toFixed(6)} mETH</b><span>{(p.txHash ?? "").slice(0, 14)}… · {new Date(r.createdAt).toLocaleTimeString()}</span></div><span className="svc-hist__amt">{r.amount.toFixed(3)}</span></div>
          ); })}</div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MANTLE — Yield board (mETH vs USDY) + agent rotation
// ---------------------------------------------------------------------------
function YieldBoard({ workspace }: { workspace: Workspace }) {
  const { emitReceipt, receipts } = useAppState();
  const [rotating, setRotating] = useState(false);
  const [rotated, setRotated] = useState<string | null>(null);
  const [holding, setHolding] = useState<"mETH" | "USDY">("mETH");
  const [holdAmt, setHoldAmt] = useState("1000");

  const meth = { apy: Number(deterministicScore("meth-apy", 3.6, 4.8).toFixed(2)), tvl: 182, risk: "Low", protocol: "Mantle LSP", symbol: "mETH", color: "#1fb58a" };
  const usdy = { apy: Number(deterministicScore("usdy-apy", 4.4, 5.4).toFixed(2)), tvl: 74, risk: "Very Low", protocol: "Ondo Finance", symbol: "USDY", color: "#3aa0e6" };
  const winner = usdy.apy >= meth.apy ? "USDY" : "mETH";
  const loser = winner === "USDY" ? "mETH" : "USDY";
  const movePct = Math.round(deterministicScore("rot-pct", 25, 55));
  const history = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id && r.kind === "mantle.yield.rotate").slice(0, 6), [receipts, workspace.id]);

  const totalApy = meth.apy + usdy.apy;
  const methBarPct = Math.round((meth.apy / totalApy) * 100);
  const usdyBarPct = 100 - methBarPct;

  const projAmt = Number(holdAmt) || 0;
  const projAsset = holding === "mETH" ? meth : usdy;
  const proj30 = (projAmt * projAsset.apy / 100 / 12).toFixed(2);
  const proj365 = (projAmt * projAsset.apy / 100).toFixed(2);

  const approveRotation = async () => {
    setRotating(true);
    await new Promise((r) => setTimeout(r, 500));
    const rid = emitReceipt({ workspaceId: workspace.id, serviceId: "svc_mnt_yield", serviceName: "mETH/USDY Yield API", amount: 0.03, currency: "USDC", network: workspace.networks[0] ?? "mantle-sepolia", kind: "mantle.yield.rotate", payload: { from: loser, to: winner, movePct, methApy: meth.apy, usdyApy: usdy.apy } });
    setRotated(rid.id);
    setRotating(false);
  };

  const winnerAsset = winner === "USDY" ? usdy : meth;
  const spread = Math.abs(usdy.apy - meth.apy).toFixed(2);

  return (
    <div className="panel block svc-flavor" style={{ overflow: "hidden" }}>
      {/* Real-user answer hero — the first thing you see */}
      <div style={{ padding: "14px 18px", background: `color-mix(in srgb, ${winnerAsset.color} 10%, var(--bg-2))`, borderBottom: `2px solid color-mix(in srgb, ${winnerAsset.color} 30%, var(--line-2))` }}>
        <div style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 800, color: "var(--muted)", marginBottom: 4 }}>Best yield for your mETH right now</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: "1.6rem", fontWeight: 900, letterSpacing: "-.04em", color: winnerAsset.color }}>{winner}</span>
          <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)" }}>at {winnerAsset.apy.toFixed(2)}% APY</span>
          <span style={{ fontSize: ".8rem", color: "var(--muted)" }}>— <b style={{ color: "var(--ink)" }}>+{spread}%</b> more than {loser} right now</span>
        </div>
        <div style={{ fontSize: ".72rem", color: "var(--muted)", marginTop: 3 }}>Rotate {movePct}% of your {loser} position to gain this edge · one click below</div>
      </div>

      {/* Header */}
      <div className="block-head" style={{ borderBottom: "1px solid var(--line-2)", paddingBottom: 12 }}>
        <div className="ttl"><span className="sq soft"><TrendingUp width={15} height={15} /></span><div><h3>mETH vs USDY · yield race</h3><div className="sub">Full comparison · yield projector · rotation advisor · $0.03 / query</div></div></div>
      </div>

      {/* Head-to-head two-column comparison */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 0, padding: "20px 20px 0" }}>
        {/* mETH column */}
        <div style={{ textAlign: "center", padding: "0 12px" }}>
          <div style={{ fontSize: ".7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".1em", color: meth.color, marginBottom: 6 }}>{meth.symbol}</div>
          <div style={{ fontSize: "2.8rem", fontWeight: 900, letterSpacing: "-.04em", color: winner === "mETH" ? meth.color : "var(--ink)", lineHeight: 1 }}>{meth.apy.toFixed(2)}<span style={{ fontSize: "1rem", fontWeight: 700 }}>%</span></div>
          <div style={{ fontSize: ".68rem", color: "var(--muted)", marginTop: 4 }}>APY · {meth.protocol}</div>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 5 }}>
            {[["TVL", `$${meth.tvl}M`], ["Risk", meth.risk], ["Type", "Liquid Staking"]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: ".72rem", padding: "3px 8px", borderRadius: 6, background: "var(--field)" }}>
                <span style={{ color: "var(--muted)" }}>{k}</span><span style={{ fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>
          {winner === "mETH" && <div style={{ marginTop: 10, fontSize: ".68rem", fontWeight: 800, color: meth.color, padding: "4px 10px", borderRadius: 8, background: `color-mix(in srgb, ${meth.color} 12%, transparent)` }}>▲ HIGHER NOW</div>}
        </div>

        {/* VS divider */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 8px", gap: 6 }}>
          <div style={{ fontSize: ".85rem", fontWeight: 900, color: "var(--muted)", letterSpacing: ".05em" }}>VS</div>
          <div style={{ width: 1, flex: 1, background: "var(--line-2)" }} />
        </div>

        {/* USDY column */}
        <div style={{ textAlign: "center", padding: "0 12px" }}>
          <div style={{ fontSize: ".7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".1em", color: usdy.color, marginBottom: 6 }}>{usdy.symbol}</div>
          <div style={{ fontSize: "2.8rem", fontWeight: 900, letterSpacing: "-.04em", color: winner === "USDY" ? usdy.color : "var(--ink)", lineHeight: 1 }}>{usdy.apy.toFixed(2)}<span style={{ fontSize: "1rem", fontWeight: 700 }}>%</span></div>
          <div style={{ fontSize: ".68rem", color: "var(--muted)", marginTop: 4 }}>APY · {usdy.protocol}</div>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 5 }}>
            {[["TVL", `$${usdy.tvl}M`], ["Risk", usdy.risk], ["Type", "Yield-bearing USD"]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: ".72rem", padding: "3px 8px", borderRadius: 6, background: "var(--field)" }}>
                <span style={{ color: "var(--muted)" }}>{k}</span><span style={{ fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>
          {winner === "USDY" && <div style={{ marginTop: 10, fontSize: ".68rem", fontWeight: 800, color: usdy.color, padding: "4px 10px", borderRadius: 8, background: `color-mix(in srgb, ${usdy.color} 12%, transparent)` }}>▲ HIGHER NOW</div>}
        </div>
      </div>

      {/* APY Race bar */}
      <div style={{ margin: "16px 20px 0" }}>
        <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", marginBottom: 6 }}>APY race · relative share</div>
        <div style={{ display: "flex", height: 20, borderRadius: 10, overflow: "hidden", gap: 2 }}>
          <div style={{ width: `${methBarPct}%`, background: meth.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".6rem", fontWeight: 800, color: "#fff", transition: "width .5s" }}>{meth.apy.toFixed(2)}%</div>
          <div style={{ flex: 1, background: usdy.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".6rem", fontWeight: 800, color: "#fff" }}>{usdy.apy.toFixed(2)}%</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".6rem", color: "var(--muted)", marginTop: 3 }}>
          <span style={{ color: meth.color, fontWeight: 700 }}>mETH {methBarPct}%</span>
          <span style={{ color: usdy.color, fontWeight: 700 }}>{usdyBarPct}% USDY</span>
        </div>
      </div>

      {/* Yield projector */}
      <div style={{ margin: "14px 20px", padding: "12px 14px", borderRadius: 12, background: "var(--field)", border: "1px solid var(--line-2)" }}>
        <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", marginBottom: 8 }}>Your yield projector</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input type="number" value={holdAmt} onChange={(e) => setHoldAmt(e.currentTarget.value)} placeholder="Amount USD" style={{ width: 110, padding: "5px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".8rem" }} />
          <select value={holding} onChange={(e) => setHolding(e.currentTarget.value as "mETH" | "USDY")} style={{ padding: "5px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".8rem" }}>
            <option value="mETH">mETH</option>
            <option value="USDY">USDY</option>
          </select>
          <div style={{ display: "flex", gap: 10, fontSize: ".78rem" }}>
            <span style={{ color: "var(--muted)" }}>30d: <b style={{ color: "var(--accent-primary)" }}>${proj30}</b></span>
            <span style={{ color: "var(--muted)" }}>1y: <b style={{ color: "var(--accent-primary)" }}>${proj365}</b></span>
            <span style={{ color: "var(--muted)" }}>@ <b>{projAsset.apy}% APY</b></span>
          </div>
        </div>
      </div>

      {/* Rotation advisor */}
      <div style={{ margin: "0 20px 16px", padding: "10px 14px", borderRadius: 12, border: `1px solid color-mix(in srgb, var(--accent-primary) 30%, var(--line-2))`, background: "color-mix(in srgb, var(--accent-primary) 5%, transparent)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: ".82rem", flex: 1, minWidth: 220 }}>
          Agent advisor: rotate <b>{movePct}%</b> of {loser} → <b style={{ color: "var(--accent-primary)" }}>{winner}</b> for <b>+{Math.abs(usdy.apy - meth.apy).toFixed(2)}%</b> APY spread.
        </span>
        <button className="btn btn-acc btn-sm" type="button" onClick={approveRotation} disabled={rotating}>{rotating ? <><Loader2 size={13} className="wallet-spin" /> Rotating…</> : <><Check width={13} height={13} /> Approve rotation</>}</button>
      </div>
      {rotated && (
        <div style={{ margin: "-8px 20px 14px", padding: "7px 12px", borderRadius: 10, background: "color-mix(in srgb, var(--green) 12%, transparent)", color: "var(--green)", fontSize: ".78rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 7 }}>
          <Check width={14} height={14} /> Rotation queued — receipt <code style={{ background: "rgba(0,0,0,.14)", padding: "1px 5px", borderRadius: 5 }}>{rotated.slice(0, 14)}…</code>
        </div>
      )}
      {history.length > 0 && (
        <div style={{ padding: "0 20px 14px" }}>
          <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0" }}>Rotation history · {history.length}</div>
          <div className="svc-hist">
            {history.map((r) => {
              const p = (r.payload ?? {}) as { from?: string; to?: string; movePct?: number };
              const col = p.to === "mETH" ? meth.color : usdy.color;
              return (
                <div className="svc-hist__row" key={r.id}>
                  <span className="svc-hist__dot" style={{ background: col }} />
                  <div className="svc-hist__main"><b>{p.movePct ?? "?"}% {p.from} → {p.to}</b><span>{new Date(r.createdAt).toLocaleTimeString()}</span></div>
                  <span className="svc-hist__amt">${r.amount.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LIQUIFY — Tax Export
// ---------------------------------------------------------------------------
function TaxExport({ workspace, receipts }: { workspace: Workspace; receipts: Receipt[] }) {
  const { emitReceipt } = useAppState();
  const [year, setYear] = useState("2025");
  const [exported, setExported] = useState<string | null>(null);

  const wsReceipts = receipts.filter((r) => r.workspaceId === workspace.id && new Date(r.createdAt).getFullYear() === parseInt(year));

  const doExport = () => {
    const headers = ["Receipt ID", "Service", "Agent", "Amount", "Currency", "Network", "Status", "Date"];
    const rows = wsReceipts.map((r) => [r.id, r.serviceName, r.agentName, r.amount.toFixed(4), r.currency, r.network, r.status, r.createdAt].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `liquify-tax-${year}.csv`; a.click();
    URL.revokeObjectURL(url);
    const rid = emitReceipt({ workspaceId: workspace.id, serviceName: "Tax Classification API", amount: 0.08, currency: "USDC", network: workspace.networks[0] ?? "base-sepolia", kind: "liquify.tax.export", payload: { year, records: wsReceipts.length } });
    setExported(rid.id);
  };

  const income = wsReceipts.filter((r) => r.status === "verified").length;
  const total = wsReceipts.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><Download width={15} height={15} /></span><div><h3>Tax export</h3><div className="sub">aggregate receipts → categorised CSV · $0.08 USDC / export</div></div></div>
        <div className="row sm" style={{ gap: 8 }}>
          <select value={year} onChange={(e) => setYear(e.currentTarget.value)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".82rem" }}>
            {["2026", "2025", "2024"].map((y) => <option key={y}>{y}</option>)}
          </select>
          <button className="btn btn-acc btn-sm" type="button" onClick={doExport} disabled={wsReceipts.length === 0}><Download size={13} /> Export CSV</button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, padding: "0 16px 16px" }}>
        {[["Receipts", wsReceipts.length.toString(), "in " + year], ["Settled", income.toString(), "verified / paid"], ["Total spend", "$" + total.toFixed(2), "across all calls"]].map(([k, v, s]) => (
          <div key={String(k)} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted)", fontWeight: 800 }}>{k}</span>
            <span style={{ fontSize: "1.2rem", fontWeight: 800, letterSpacing: "-.03em" }}>{v}</span>
            <span style={{ fontSize: ".68rem", color: "var(--muted)" }}>{s}</span>
          </div>
        ))}
      </div>
      {exported && (
        <div style={{ margin: "0 16px 14px", padding: "8px 12px", borderRadius: 10, background: "color-mix(in srgb, var(--green) 12%, transparent)", color: "var(--green)", fontSize: ".78rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 7 }}>
          <Check width={14} height={14} /> Exported — receipt <code style={{ background: "rgba(0,0,0,.14)", padding: "1px 5px", borderRadius: 5 }}>{exported}</code>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LIQUIFY — Wallet Risk Analyzer
// ---------------------------------------------------------------------------
const RISK_FLAGS = [
  "Interacted with a sanctioned mixer",
  "2 unlimited token approvals outstanding",
  "Funded from a fresh CEX withdrawal",
  "Bridged value in the last 7 days",
  "Holds a low-liquidity meme position",
  "Recent approval to an unverified contract",
  "Counterparty overlap with a known drainer",
  "Dormant 90+ days before recent activity",
];
const RISK_GOOD = [
  "No mixer proximity within 3 hops",
  "All approvals are bounded amounts",
  "Long, consistent on-chain history",
  "No exposure to flagged contracts",
];

function isHexAddress(s: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(s.trim());
}

function WalletRiskAnalyzer({ workspace }: { workspace: Workspace }) {
  const { emitReceipt, receipts } = useAppState();
  const [addr, setAddr] = useState("0x91cE...d2A7f3b04E9");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ addr: string; score: number; band: string; flags: string[]; good: string[]; reportId: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const history = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id && r.kind === "liquify.wallet.risk").slice(0, 8), [receipts, workspace.id]);

  const analyze = async () => {
    const a = addr.trim();
    if (!isHexAddress(a)) { setErr("Enter a valid 0x… EVM address (40 hex chars)."); return; }
    setErr(null); setRunning(true);
    await new Promise((r) => setTimeout(r, 550));
    const score = Math.round(deterministicScore(a + "|risk", 4, 96));
    const band = score >= 75 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW";
    const nFlags = score >= 75 ? 3 : score >= 40 ? 2 : 1;
    const flags: string[] = [];
    for (let i = 0; i < nFlags; i++) flags.push(RISK_FLAGS[Math.floor(deterministicScore(a + "|f" + i, 0, RISK_FLAGS.length - 0.001))]!);
    const nGood = score >= 75 ? 1 : 2;
    const good: string[] = [];
    for (let i = 0; i < nGood; i++) good.push(RISK_GOOD[Math.floor(deterministicScore(a + "|g" + i, 0, RISK_GOOD.length - 0.001))]!);
    const reportId = "wr_" + hashId("wr", a, 8);
    emitReceipt({
      workspaceId: workspace.id,
      serviceId: "svc_liq_wallet_risk",
      serviceName: "Wallet Risk API",
      amount: 0.05,
      currency: "USDC",
      network: workspace.networks[0] ?? "base-sepolia",
      kind: "liquify.wallet.risk",
      payload: { address: a, score, band, flags, reportId },
    });
    setResult({ addr: a, score, band, flags: [...new Set(flags)], good: [...new Set(good)], reportId });
    setRunning(false);
  };

  const bandColor = (b: string) => b === "HIGH" ? "#e63946" : b === "MEDIUM" ? "#ff9b00" : "#1fb58a";

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><Shield width={15} height={15} /></span><div><h3>Wallet risk analyzer</h3><div className="sub">paste an address → risk score · labels · approval exposure · $0.05 USDC / lookup</div></div></div>
        <button className="btn btn-acc btn-sm" type="button" onClick={analyze} disabled={running}>{running ? <><Loader2 size={13} className="wallet-spin" /> Scoring…</> : <><Shield width={13} height={13} /> Pay &amp; analyze</>}</button>
      </div>
      <div style={{ padding: "0 16px 12px" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>EVM address</span>
          <input value={addr} onChange={(e) => { setAddr(e.currentTarget.value); setErr(null); }} placeholder="0x…" spellCheck={false}
            style={{ padding: "8px 10px", borderRadius: 9, border: `1px solid ${err ? "var(--red)" : "var(--line-2)"}`, background: "var(--bg-2)", color: "var(--ink)", fontFamily: "var(--mono)", fontSize: ".82rem" }} />
        </label>
        {err && <div style={{ color: "var(--red)", fontSize: ".74rem", marginTop: 6, fontWeight: 600 }}>{err}</div>}
      </div>
      {result && (
        <div style={{ padding: "0 16px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", padding: "10px 14px", borderRadius: 12, border: "1px solid var(--line-2)", background: "var(--bg-2)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted)", fontWeight: 800 }}>Risk score</span>
              <span style={{ fontSize: "1.6rem", fontWeight: 800, color: bandColor(result.band), letterSpacing: "-.03em" }}>{result.score}<span style={{ fontSize: ".8rem", color: "var(--muted)", fontWeight: 600 }}>/100</span></span>
            </div>
            <span className="pill" style={{ background: `color-mix(in srgb, ${bandColor(result.band)} 16%, transparent)`, color: bandColor(result.band), fontWeight: 800 }}>{result.band}</span>
            <div style={{ flex: 1, minWidth: 200, fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--muted)" }}>
              {result.addr} · report <code style={{ background: "rgba(0,0,0,.14)", padding: "1px 5px", borderRadius: 5 }}>{result.reportId}</code>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 12 }}>
            <div>
              <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--red)", marginBottom: 4 }}>Risk signals</div>
              <ul className="svc-guarantees">{result.flags.map((f) => <li key={f} style={{ color: "var(--ink)" }}><X width={13} height={13} style={{ color: "var(--red)" }} /> {f}</li>)}</ul>
            </div>
            <div>
              <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "#1fb58a", marginBottom: 4 }}>Clean signals</div>
              <ul className="svc-guarantees">{result.good.map((g) => <li key={g}><Check width={13} height={13} /> {g}</li>)}</ul>
            </div>
          </div>
        </div>
      )}
      <div style={{ padding: "0 16px 14px" }}>
        <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0" }}>Recent reports · {history.length}</div>
        <div className="svc-table__scroll"><table className="svc-table">
          <thead><tr><th>Report</th><th>Address</th><th>Score</th><th>Band</th><th>Cost</th></tr></thead>
          <tbody>
            {history.length === 0 && <tr><td colSpan={5} style={{ color: "var(--muted)", padding: 12 }}>No reports yet — score a wallet above.</td></tr>}
            {history.map((r) => {
              const p = (r.payload ?? {}) as { address?: string; score?: number; band?: string; reportId?: string };
              return (
                <tr key={r.id}>
                  <td><code>{p.reportId ?? "wr_" + hashId("wr", r.id, 8)}</code></td>
                  <td style={{ fontFamily: "var(--mono)", fontSize: ".74rem" }}>{p.address ? p.address.slice(0, 10) + "…" + p.address.slice(-4) : "—"}</td>
                  <td className="svc-table__num" style={{ fontWeight: 700 }}>{p.score ?? "—"}</td>
                  <td><span className="pill" style={{ background: `color-mix(in srgb, ${bandColor(p.band ?? "LOW")} 14%, transparent)`, color: bandColor(p.band ?? "LOW") }}>{p.band ?? "—"}</span></td>
                  <td className="svc-table__num">${r.amount.toFixed(2)} <span className="muted">{r.currency}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DEEPSURGE — Frontier Intel Query
// ---------------------------------------------------------------------------
const INTEL_REGIONS = ["Jita", "Amarr", "Rens", "Dodixie", "Hek"] as const;
const INTEL_KINDS = ["Resource Yield", "Hostile Activity", "Market Anomaly"] as const;
const INTEL_ROUTES = ["via Perimeter", "via New Caldari", "via Ikuchi", "direct (high-sec)", "via Niarja (caution)"];

function FrontierIntelQuery({ workspace }: { workspace: Workspace }) {
  const { emitReceipt, receipts } = useAppState();
  const [region, setRegion] = useState<typeof INTEL_REGIONS[number]>(INTEL_REGIONS[0]);
  const [kind, setKind] = useState<typeof INTEL_KINDS[number]>(INTEL_KINDS[0]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const history = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id && r.kind === "ds.intel.query").slice(0, 8), [receipts, workspace.id]);

  const buy = async () => {
    setRunning(true);
    await new Promise((r) => setTimeout(r, 500));
    const seed = `${region}|${kind}`;
    const hostiles = Math.round(deterministicScore(seed + "|h", 0, 9));
    const campRisk = hostiles >= 6 ? "high" : hostiles >= 3 ? "medium" : "low";
    const route = INTEL_ROUTES[Math.floor(deterministicScore(seed + "|r", 0, INTEL_ROUTES.length - 0.001))]!;
    const queryId = "qi_" + hashId("qi", seed + Date.now(), 8);
    let body: Record<string, unknown>;
    if (kind === "Resource Yield") {
      body = { region, query: kind, top_node: ["Veldspar belt 7", "Pyroxeres pocket", "Arkonor cluster", "Gas site C-3"][Math.floor(deterministicScore(seed + "|n", 0, 3.999))], est_yield_per_hour: Math.round(deterministicScore(seed + "|y", 12_000, 92_000)), contested: hostiles >= 4, hostiles_24h: hostiles, recommended_route: route, queryId };
    } else if (kind === "Hostile Activity") {
      body = { region, query: kind, hostiles_spotted: hostiles, gate_camp_risk: campRisk, top_threat: ["Catalyst gang", "Cynabal solo", "Tornado camp", "Bomber wing"][Math.floor(deterministicScore(seed + "|t", 0, 3.999))], last_kill_min_ago: Math.round(deterministicScore(seed + "|k", 1, 58)), recommended_route: route, queryId };
    } else {
      body = { region, query: kind, anomaly: ["mineral spike +14%", "module dump detected", "spread compression", "thin sell wall"][Math.floor(deterministicScore(seed + "|a", 0, 3.999))], confidence: Number(deterministicScore(seed + "|c", 0.45, 0.95).toFixed(2)), window_min: Math.round(deterministicScore(seed + "|w", 8, 90)), recommended_route: route, queryId };
    }
    emitReceipt({ workspaceId: workspace.id, serviceId: "svc_ds_intel", serviceName: "Frontier Intel API", amount: 0.04, currency: "USDC", network: workspace.networks[0] ?? "base-sepolia", kind: "ds.intel.query", payload: { region, kind, queryId, hostiles } });
    setResult(body);
    setRunning(false);
  };

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><Radio width={15} height={15} /></span><div><h3>Frontier intel query</h3><div className="sub">live resource / hostile / market intel for a Frontier region · $0.04 USDC / query</div></div></div>
        <button className="btn btn-acc btn-sm" type="button" onClick={buy} disabled={running}>{running ? <><Loader2 size={13} className="wallet-spin" /> Querying…</> : <><Bolt width={13} height={13} /> Pay &amp; buy intel</>}</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "0 16px 12px" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Region</span>
          <select value={region} onChange={(e) => setRegion(e.currentTarget.value as typeof region)} style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }}>
            {INTEL_REGIONS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Query type</span>
          <select value={kind} onChange={(e) => setKind(e.currentTarget.value as typeof kind)} style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }}>
            {INTEL_KINDS.map((k) => <option key={k}>{k}</option>)}
          </select>
        </label>
      </div>
      {result && <div style={{ padding: "0 16px 12px" }}><pre className="code-block">{JSON.stringify(result, null, 2)}</pre></div>}
      <div style={{ padding: "0 16px 14px" }}>
        <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0" }}>Recent queries · {history.length}</div>
        <div className="svc-table__scroll"><table className="svc-table">
          <thead><tr><th>Query</th><th>Region</th><th>Type</th><th>Hostiles 24h</th><th>Cost</th></tr></thead>
          <tbody>
            {history.length === 0 && <tr><td colSpan={5} style={{ color: "var(--muted)", padding: 12 }}>No queries yet — buy one above.</td></tr>}
            {history.map((r) => {
              const p = (r.payload ?? {}) as { region?: string; kind?: string; queryId?: string; hostiles?: number };
              return (
                <tr key={r.id}>
                  <td><code>{p.queryId ?? "qi_" + hashId("qi", r.id, 8)}</code></td>
                  <td>{p.region ?? "—"}</td>
                  <td>{p.kind ?? "—"}</td>
                  <td className="svc-table__num">{p.hostiles ?? "—"}</td>
                  <td className="svc-table__num">${r.amount.toFixed(2)} <span className="muted">{r.currency}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BERKELEY — Paid Tools grid
// ---------------------------------------------------------------------------
function PaidToolsGrid({ workspace, services, onOpenPayment }: { workspace: Workspace; services: Service[]; onOpenPayment: (s: Service) => void }) {
  const { receipts } = useAppState();
  const paidIds = new Set(receipts.filter((r) => r.workspaceId === workspace.id && r.status === "verified").map((r) => r.serviceId));
  return (
    <div className="panel block svc-flavor">
      <div className="block-head"><div className="ttl"><span className="sq soft"><Play width={15} height={15} /></span><div><h3>Paid tools</h3><div className="sub">each "Run" fires a real 402 → pay → verify → unlock cycle</div></div></div></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, padding: "4px 16px 16px" }}>
        {services.filter((s) => s.status === "active").map((s) => {
          const Ico = CAT_ICON[s.category] ?? CAT_ICON.data;
          const paid = paidIds.has(s.id);
          return (
            <div key={s.id} style={{ display: "flex", flexDirection: "column", gap: 8, padding: "14px 14px", borderRadius: 12, border: "1px solid var(--line-2)", background: paid ? "color-mix(in srgb, var(--accent-primary) 6%, transparent)" : "var(--bg-2)", transition: "all .18s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="sq" style={{ background: catColor(s.category) }}><Ico width={15} height={15} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: ".82rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                  <div style={{ fontSize: ".68rem", color: "var(--muted)" }}>{s.category} · {s.network}</div>
                </div>
              </div>
              <div style={{ fontSize: ".74rem", color: "var(--muted)", lineHeight: 1.4 }}>{s.description.slice(0, 80)}…</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
                <span style={{ fontWeight: 800, fontSize: ".8rem" }}>${s.priceUsd.toFixed(3)} <span style={{ fontWeight: 500, color: "var(--muted)" }}>{s.currency}</span></span>
                <button className={`btn btn-sm ${paid ? "btn-ghost" : "btn-acc"}`} type="button" onClick={() => onOpenPayment(s)}>
                  {paid ? <><Check width={12} height={12} /> Paid</> : <><Bolt width={13} height={13} /> Pay &amp; Run</>}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DEEPSURGE — Route risk scorer
// ---------------------------------------------------------------------------
const DS_HUBS = ["Hub-A", "Rim-7", "Q-OP4", "B-2 Gate", "Core-1", "Delta-9"] as const;
function RouteRiskScorer({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [from, setFrom] = useState<string>(DS_HUBS[0]);
  const [to_, setTo_] = useState<string>(DS_HUBS[1]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ risk: number; spread: string; jumps: number; escort: string; runId: string } | null>(null);

  const score = async () => {
    setRunning(true);
    await new Promise((r) => setTimeout(r, 500));
    const seed = `${from}|${to_}`;
    const risk = Math.round(deterministicScore(seed + "|risk", 10, 90));
    const spread = deterministicScore(seed + "|spr", 1, 14).toFixed(1) + "%";
    const jumps = Math.round(deterministicScore(seed + "|jmp", 2, 12));
    const escort = risk > 60 ? "recommended" : risk > 35 ? "optional" : "not needed";
    const runId = hashId("route", seed, 6);
    emitReceipt({ workspaceId: workspace.id, serviceName: "Trade Risk API", amount: 0.05, currency: "mock", network: workspace.networks[0] ?? "frontier-testnet", kind: "ds.route.risk", payload: { from, to: to_, risk, spread, jumps, escort, runId } });
    setResult({ risk, spread, jumps, escort, runId });
    setRunning(false);
  };

  const riskColor = result ? (result.risk > 60 ? "#e63946" : result.risk > 35 ? "#ff9b00" : "#1fb58a") : "var(--muted)";

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft" style={{ color: "var(--accent-primary)" }}><TrendingUp width={15} height={15} /></span><div><h3>Route risk scorer</h3><div className="sub">$0.05 / check · gank probability + spread + escort recommendation</div></div></div>
        <button className="btn btn-acc btn-sm" type="button" onClick={score} disabled={running || from === to_}>{running ? <><Loader2 size={13} className="wallet-spin" /> Scoring…</> : "Score route"}</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "0 16px 12px" }}>
        {([["From", from, setFrom], ["To", to_, setTo_]] as [string, string, (v: string) => void][]).map(([label, val, set]) => (
          <label key={label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>{label}</span>
            <select value={val} onChange={(e) => set(e.currentTarget.value)} style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontFamily: "inherit", fontSize: ".84rem" }}>
              {DS_HUBS.map((h) => <option key={h}>{h}</option>)}
            </select>
          </label>
        ))}
      </div>
      {result && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, padding: "4px 16px 14px" }}>
          {[["Risk score", result.risk + " / 100", riskColor], ["Market spread", result.spread, "var(--ink)"], ["Jumps", result.jumps + " gates", "var(--ink)"], ["Escort", result.escort, result.escort === "recommended" ? "#e63946" : result.escort === "optional" ? "#ff9b00" : "#1fb58a"]].map(([k, v, c]) => (
            <div key={String(k)} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted)", fontWeight: 800 }}>{k}</span>
              <span style={{ fontSize: "1rem", fontWeight: 800, color: String(c), letterSpacing: "-.03em" }}>{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EAZO — Subscription manager
// ---------------------------------------------------------------------------
type EazoSub = { id: string; name: string; category: string; priceUsd: number; cycle: string; status: "active" | "paused" };
const INITIAL_SUBS: EazoSub[] = [
  { id: "sub_01", name: "Spotify Premium", category: "entertainment", priceUsd: 9.99, cycle: "monthly", status: "active" },
  { id: "sub_02", name: "ChatGPT Plus", category: "ai-tools", priceUsd: 20.00, cycle: "monthly", status: "active" },
  { id: "sub_03", name: "Figma Professional", category: "design", priceUsd: 15.00, cycle: "monthly", status: "active" },
  { id: "sub_04", name: "GitHub Copilot", category: "dev-tools", priceUsd: 10.00, cycle: "monthly", status: "paused" },
  { id: "sub_05", name: "1Password", category: "security", priceUsd: 2.99, cycle: "monthly", status: "active" },
];

function EazoSubManager({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [subs, setSubs] = useLocalStore<EazoSub[]>("eazo.subs", INITIAL_SUBS);
  const BUDGET = 80;
  const weeklyUsed = subs.filter((s) => s.status === "active").reduce((t, s) => t + s.priceUsd / 4.33, 0);
  const budgetPct = Math.min(100, (weeklyUsed / BUDGET) * 100);

  const toggle = (id: string) => {
    setSubs((prev) => prev.map((s) => s.id === id ? { ...s, status: s.status === "active" ? "paused" : "active" } : s));
    emitReceipt({ workspaceId: workspace.id, serviceName: "Subscription Optimizer API", amount: 0.02, currency: "USDC", network: workspace.networks[0] ?? "base-sepolia", kind: "eazo.sub.toggle", payload: { subId: id } });
  };
  const remove = (id: string) => setSubs((prev) => prev.filter((s) => s.id !== id));

  return (
    <div className="panel block svc-flavor">
      <div className="block-head"><div className="ttl"><span className="sq soft"><Wallet width={15} height={15} /></span><div><h3>Subscription manager</h3><div className="sub">companion manages these — pause or cancel within weekly budget</div></div></div></div>
      <div style={{ padding: "0 16px 10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".72rem", fontWeight: 700, marginBottom: 6 }}>
          <span style={{ color: "var(--muted)" }}>WEEKLY BUDGET</span>
          <span>{fmtUsd(weeklyUsed)} <span style={{ color: "var(--muted)" }}>/ {fmtUsd(BUDGET)}</span></span>
        </div>
        <div className="pbar"><i style={{ width: `${budgetPct}%`, background: budgetPct > 85 ? "var(--red)" : "var(--acc-grad)" }} /></div>
      </div>
      <div className="svc-table__scroll"><table className="svc-table">
        <thead><tr><th>Subscription</th><th>Category</th><th>Price / wk</th><th>Status</th><th aria-label="actions" /></tr></thead>
        <tbody>
          {subs.map((s) => (
            <tr key={s.id}>
              <td><b>{s.name}</b></td>
              <td className="muted">{s.category}</td>
              <td className="svc-table__num">{fmtUsd(s.priceUsd / 4.33)}</td>
              <td>{badgeFor(s.status === "active" ? "active" : "paused")}</td>
              <td><span className="row sm" style={{ gap: 6 }}>
                <button className="btn btn-sm" type="button" title={s.status === "active" ? "Pause" : "Resume"} onClick={() => toggle(s.id)}>{s.status === "active" ? <Pause size={12} /> : <Play size={12} />}</button>
                <button className="btn btn-sm" type="button" title="Remove" onClick={() => remove(s.id)} style={{ color: "var(--red)" }}><Trash2 size={12} /></button>
              </span></td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </div>
  );
}

type SigBlock = { title: string; sub: string; headers: string[]; rows: (string | number)[][]; accentCol?: number };
const WS_SIGNATURE: Record<WorkspaceId, SigBlock> = {
  "0g": {
    title: "0G network at a glance", sub: "the four layers your endpoints settle against",
    headers: ["Layer", "Role", "Throughput", "Status"],
    rows: [
      ["0G Compute", "inference jobs", "612 jobs/min", "healthy"],
      ["0G Storage", "memory & blobs", "2.1k pins/min", "healthy"],
      ["0G DA", "data availability", "44 MB/s", "healthy"],
      ["0G Chain", "receipts & settlement", "1.4s blocks", "healthy"],
    ], accentCol: 3,
  },
  liquify: {
    title: "Market pulse", sub: "the assets your signals & risk endpoints cover right now",
    headers: ["Asset", "Last", "24h", "Signal"],
    rows: [
      ["ETH / USDC", "3,142.40", "+1.8%", "accumulate"],
      ["mETH", "3,189.10", "+2.1%", "accumulate"],
      ["ARB", "0.842", "-0.6%", "neutral"],
      ["USDC", "1.0001", "+0.0%", "park"],
    ], accentCol: 3,
  },
  qie: {
    title: "QIE rail health", sub: "checkout, passes and merchant payouts on the QIE network",
    headers: ["Metric", "Value", "Window", "Trend"],
    rows: [
      ["Active merchants", "142", "this week", "+8"],
      ["Checkouts settled", "2,210", "7 days", "+12%"],
      ["QIE Pass holders", "1,884", "all-time", "+63"],
      ["Next payout run", "Fri 18:00", "scheduled", "42.10 QIE"],
    ], accentCol: 3,
  },
  arbitrum: {
    title: "Orbit & USDC settlement", sub: "chains feeding the gateway and the stablecoin flowing through them",
    headers: ["Chain", "USDC settled 24h", "Bridge", "Status"],
    rows: [
      ["Arbitrum One", "$184,200", "healthy", "verified"],
      ["Arbitrum Nova", "$31,040", "healthy", "verified"],
      ["Orbit · PaymentsL3", "$12,510", "degraded", "pending"],
      ["Orbit · GameChain", "$4,180", "healthy", "verified"],
    ], accentCol: 3,
  },
  mantle: {
    title: "Yield board", sub: "the instruments your alpha & RWA endpoints track",
    headers: ["Instrument", "APY", "Duration", "7d trend"],
    rows: [
      ["mETH", "3.9%", "perpetual", "+0.2%"],
      ["USDY", "5.1%", "perpetual", "+0.0%"],
      ["T-BILL 90D", "4.83%", "84 days", "+0.1%"],
      ["RWA basket A-", "6.2%", "120 days", "-0.3%"],
    ], accentCol: 3,
  },
  eazo: {
    title: "Companion this week", sub: "what the agent is managing inside your weekly budget",
    headers: ["Item", "Value", "Status", "Note"],
    rows: [
      ["Managed subscriptions", "7", "2 flagged", "pause suggested"],
      ["Weekly budget used", "$18.40 / $21.00", "on track", "88%"],
      ["Actions pending approval", "1", "waiting", "tool purchase $0.05"],
      ["Estimated saved / mo", "$14.50", "from audits", "3 actions"],
    ], accentCol: 2,
  },
  berkeley: {
    title: "Toolbox", sub: "the paid tools the playground agent can call",
    headers: ["Tool", "Price / call", "Runs today", "Status"],
    rows: [
      ["Wallet Risk API", "$0.05", "31", "active"],
      ["Transaction Explainer", "$0.02", "18", "active"],
      ["Docs Search Tool", "$0.015", "12", "active"],
      ["Code Reviewer Tool", "$0.05", "6", "active"],
    ], accentCol: 3,
  },
  deepsurge: {
    title: "Frontier feed", sub: "live intel the resource, oracle and route endpoints serve",
    headers: ["Region", "Top resource", "Hostiles", "Trade risk"],
    rows: [
      ["Q-OP4", "Veldspar +18%", "3", "64 · high"],
      ["Hub-A", "Tritanium 5.21", "0", "22 · low"],
      ["Rim-7", "Mexallon +9%", "1", "38 · medium"],
      ["B-2 Gate", "—", "2", "51 · medium"],
    ], accentCol: 3,
  },
  sui: {
    title: "Sui agent economy", sub: "Walrus storage, Move contracts, NFT passes and zkLogin on Sui mainnet",
    headers: ["Layer", "Role", "Volume 24h", "Status"],
    rows: [
      ["Walrus Storage", "blob pinning & retrieval", "2,840 blobs", "healthy"],
      ["Move VM", "PTB execution & dry-run", "1,120 txs", "healthy"],
      ["Kiosk / NFT", "agent passes & access NFTs", "620 mints", "healthy"],
      ["zkLogin", "OAuth-to-Sui proofs", "1,100 proofs", "healthy"],
    ], accentCol: 3,
  },
};

function WorkspaceSignature({ workspace }: { workspace: Workspace }) {
  const sig = WS_SIGNATURE[workspace.id];
  if (!sig) return null;
  return (
    <div className="panel block svc-flavor">
      <div className="block-head"><div className="ttl"><span className="sq soft" style={{ color: "var(--accent-primary)" }}><workspace.Icon size={15} /></span><div><h3>{sig.title}</h3><div className="sub">{sig.sub}</div></div></div></div>
      <div className="svc-table__scroll"><table className="svc-table">
        <thead><tr>{sig.headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>
          {sig.rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => {
                const isFirst = ci === 0;
                const isAccent = ci === sig.accentCol;
                const known = ["verified", "pending", "active", "paused"].includes(String(cell));
                return (
                  <td key={ci} className={!isFirst ? "svc-table__num" : undefined}>
                    {isFirst ? <b>{cell}</b>
                      : known ? badgeFor(String(cell) as ReceiptStatus | "active" | "paused")
                      : isAccent ? <span style={{ color: "var(--accent-primary)", fontWeight: 700 }}>{cell}</span>
                      : cell}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table></div>
    </div>
  );
}

// Fallback functional block for any service tab that doesn't already have a
// bespoke widget — pick an endpoint, see the request/response shape, pay & call.
function QuickCallPanel({ workspace, services, primary, onOpenPayment, receipts }: { workspace: Workspace; services: Service[]; primary: Service; onOpenPayment: (s: Service) => void; receipts: Receipt[] }) {
  const active = services.filter((s) => s.status === "active");
  const [selId, setSelId] = useState(primary.id);
  const sel = active.find((s) => s.id === selId) ?? primary;
  const ids = useMemo(() => new Set(services.map((s) => s.id)), [services]);
  const recent = receipts.filter((r) => r.workspaceId === workspace.id && ids.has(r.serviceId)).slice(0, 6);
  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><Bolt width={15} height={15} /></span><div><h3>Run a paid call</h3><div className="sub">pick an endpoint → 402 → pay → unlocked response + receipt</div></div></div>
        <button className="btn btn-acc btn-sm" type="button" onClick={() => onOpenPayment(sel)} disabled={sel.status !== "active"}><Bolt width={13} height={13} /> Pay &amp; call · ${sel.priceUsd.toFixed(3)} {sel.currency}</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, padding: "0 16px 12px" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Endpoint</span>
          <select value={selId} onChange={(e) => setSelId(e.currentTarget.value)} style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }}>
            {active.map((s) => <option key={s.id} value={s.id}>{s.name} — ${s.priceUsd.toFixed(3)} {s.currency}</option>)}
          </select>
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Request</span>
            <pre className="code-block" style={{ margin: 0 }}>{`GET ${endpointPath(sel)}\n${sel.sampleIn}`}</pre>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Response · unlocks after payment</span>
            <pre className="code-block" style={{ margin: 0, opacity: 0.72 }}>{sel.response}</pre>
          </div>
        </div>
      </div>
      <div style={{ padding: "0 16px 14px" }}>
        <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0" }}>Recent calls · {recent.length}</div>
        <div className="svc-hist">
          {recent.length === 0 && <div className="muted sm">No calls yet — pay &amp; call above.</div>}
          {recent.map((r) => (
            <div className="svc-hist__row" key={r.id}>
              <span className="svc-hist__dot" style={{ background: catColor(serviceById(r.serviceId)?.category ?? "data") }} />
              <div className="svc-hist__main"><b>{r.serviceName}</b><span>{r.agentName} · {ago(r.createdAt)}</span></div>
              {badgeFor(r.status)}
              <span className="svc-hist__amt">{r.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LIQUIFY — Trading Signal Desk (Trading Data tab)
// ---------------------------------------------------------------------------
const SIG_PAIRS = ["ETH/USDC", "BTC/USDC", "ARB/USDC", "SOL/USDC", "WBTC/USDC", "Custom"] as const;
const SIG_TFS = ["5m", "1h", "4h", "1d"] as const;
const SIG_PROFILES = ["conservative", "balanced", "aggressive"] as const;

// CoinGecko id per base token
const SIG_CG_ID: Record<string, string> = { "ETH/USDC": "ethereum", "BTC/USDC": "bitcoin", "ARB/USDC": "arbitrum", "SOL/USDC": "solana", "WBTC/USDC": "bitcoin" };

async function fetchLivePrice(pair: string): Promise<{ price: number; change24h: number } | null> {
  const id = SIG_CG_ID[pair];
  if (!id) return null;
  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json() as Record<string, { usd: number; usd_24h_change?: number }>;
    const entry = data[id];
    if (!entry) return null;
    return { price: entry.usd, change24h: entry.usd_24h_change ?? 0 };
  } catch { return null; }
}

function TradingSignalDesk({ workspace }: { workspace: Workspace }) {
  const { emitReceipt, receipts } = useAppState();
  const [pair, setPair] = useState<string>(SIG_PAIRS[0]);
  const [customPair, setCustomPair] = useState("MNT/USDC");
  const [tf, setTf] = useState<typeof SIG_TFS[number]>(SIG_TFS[1]);
  const [profile, setProfile] = useState<typeof SIG_PROFILES[number]>(SIG_PROFILES[1]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ pair: string; dir: string; conf: number; entry: number; stop: number; target: number; rr: string; signalId: string } | null>(null);

  const effPair = pair === "Custom" ? customPair.trim() || "CUSTOM" : pair;
  const history = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id && r.kind === "liquify.trading.signal").slice(0, 8), [receipts, workspace.id]);
  const sparkData = useMemo(() => history.slice(0, 7).reverse().map((r, i) => ({ label: String(i), value: ((r.payload ?? {}) as { conf?: number }).conf ?? 50 })), [history]);

  const run = async () => {
    setRunning(true);
    const seed = `${effPair}|${tf}|${profile}`;
    // fetch real live price; fall back to deterministicScore if CoinGecko unavailable
    const live = await fetchLivePrice(effPair);
    const base = live?.price ?? deterministicScore(effPair + "|base", 1, 4000);
    // use 24h change direction as the signal direction when live data available
    const d = live ? (live.change24h > 0.5 ? 0.7 : live.change24h < -0.5 ? 0.2 : 0.45) : deterministicScore(seed + "|dir", 0, 1);
    const dir = d > 0.58 ? "LONG" : d > 0.3 ? "FLAT" : "SHORT";
    const confBoost = profile === "aggressive" ? 6 : profile === "conservative" ? -4 : 0;
    // higher confidence when direction matches 24h momentum strongly
    const momentumBoost = live ? Math.min(8, Math.abs(live.change24h)) : 0;
    const conf = Math.min(96, Math.max(50, Math.round(deterministicScore(seed + "|c", 52, 92) + confBoost + momentumBoost)));
    const entry = Number(base.toPrecision(6));
    const stopPct = dir === "SHORT" ? deterministicScore(seed + "|s", 0.01, 0.04) : -deterministicScore(seed + "|s", 0.01, 0.04);
    const tgtPct = dir === "SHORT" ? -deterministicScore(seed + "|t", 0.02, 0.07) : deterministicScore(seed + "|t", 0.02, 0.07);
    const stop = Number((entry * (1 + stopPct)).toPrecision(5));
    const target = Number((entry * (1 + tgtPct)).toPrecision(5));
    const rr = (Math.abs(tgtPct / stopPct)).toFixed(2);
    const signalId = "sig_" + hashId("sig", seed + Date.now(), 8);
    emitReceipt({ workspaceId: workspace.id, serviceId: "svc_liq_signal", serviceName: "Trading Signal API", amount: 0.1, currency: "USDC", network: workspace.networks[0] ?? "base-sepolia", kind: "liquify.trading.signal", payload: { pair: effPair, timeframe: tf, profile, dir, conf, entry, stop, target, rr, signalId, live: !!live } });
    setResult({ pair: effPair, dir, conf, entry, stop, target, rr, signalId });
    setRunning(false);
  };

  const dirColor = (dr: string) => dr === "LONG" ? "#1fb58a" : dr === "SHORT" ? "#e63946" : "var(--muted)";

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><TrendingUp width={15} height={15} /></span><div><h3>Trading signal desk</h3><div className="sub">paid live signal · direction · confidence · entry/stop/target · $0.10 USDC / call</div></div></div>
        <button className="btn btn-acc btn-sm" type="button" onClick={run} disabled={running}>{running ? <><Loader2 size={13} className="wallet-spin" /> Pulling…</> : <><Bolt width={13} height={13} /> Pay &amp; get signal</>}</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: pair === "Custom" ? "1fr 1fr 1fr 1fr" : "1fr 1fr 1fr", gap: 10, padding: "0 16px 12px" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Pair</span>
          <select value={pair} onChange={(e) => setPair(e.currentTarget.value)} style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }}>{SIG_PAIRS.map((p) => <option key={p}>{p}</option>)}</select>
        </label>
        {pair === "Custom" && (
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Custom pair</span>
            <input value={customPair} onChange={(e) => setCustomPair(e.currentTarget.value)} style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem", fontFamily: "var(--mono)" }} />
          </label>
        )}
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Timeframe</span>
          <select value={tf} onChange={(e) => setTf(e.currentTarget.value as typeof tf)} style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }}>{SIG_TFS.map((x) => <option key={x}>{x}</option>)}</select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Risk profile</span>
          <select value={profile} onChange={(e) => setProfile(e.currentTarget.value as typeof profile)} style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem", textTransform: "capitalize" }}>{SIG_PROFILES.map((x) => <option key={x}>{x}</option>)}</select>
        </label>
      </div>
      {result && (
        <div style={{ padding: "0 16px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", padding: "10px 14px", borderRadius: 12, border: "1px solid var(--line-2)", background: "var(--bg-2)" }}>
            <span className="pill" style={{ background: `color-mix(in srgb, ${dirColor(result.dir)} 16%, transparent)`, color: dirColor(result.dir), fontWeight: 800, fontSize: ".82rem" }}>{result.dir}</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}><span style={{ fontSize: ".58rem", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted)", fontWeight: 800 }}>Confidence</span><span style={{ fontSize: "1.2rem", fontWeight: 800 }}>{result.conf}%</span></div>
            {[["Entry", result.entry], ["Stop", result.stop], ["Target", result.target], ["R:R", result.rr]].map(([k, v]) => (
              <div key={String(k)} style={{ display: "flex", flexDirection: "column", gap: 1 }}><span style={{ fontSize: ".58rem", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted)", fontWeight: 800 }}>{k}</span><span style={{ fontSize: ".95rem", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{v}</span></div>
            ))}
            <div style={{ flex: 1, minWidth: 160, fontFamily: "var(--mono)", fontSize: ".7rem", color: "var(--muted)", textAlign: "right" }}>{result.pair} · <code>{result.signalId}</code></div>
          </div>
          {sparkData.length > 1 && <div style={{ marginTop: 10 }}><WeekBars data={sparkData} avgLabel={`last ${sparkData.length} signal confidences`} /></div>}
        </div>
      )}
      <div style={{ padding: "0 16px 14px" }}>
        <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0" }}>Recent signals · {history.length}</div>
        <div className="svc-table__scroll"><table className="svc-table">
          <thead><tr><th>Signal</th><th>Pair</th><th>TF</th><th>Direction</th><th>Conf</th><th>When</th><th>Cost</th></tr></thead>
          <tbody>
            {history.length === 0 && <tr><td colSpan={7} style={{ color: "var(--muted)", padding: 12 }}>No signals yet — pull one above.</td></tr>}
            {history.map((r) => {
              const p = (r.payload ?? {}) as { pair?: string; timeframe?: string; dir?: string; conf?: number; signalId?: string };
              return (
                <tr key={r.id}>
                  <td><code>{p.signalId ?? "sig_" + hashId("sig", r.id, 8)}</code></td>
                  <td>{p.pair ?? "—"}</td>
                  <td>{p.timeframe ?? "—"}</td>
                  <td><span className="pill" style={{ background: `color-mix(in srgb, ${dirColor(p.dir ?? "FLAT")} 14%, transparent)`, color: dirColor(p.dir ?? "FLAT") }}>{p.dir ?? "—"}</span></td>
                  <td className="svc-table__num">{p.conf != null ? p.conf + "%" : "—"}</td>
                  <td className="muted svc-table__num">{new Date(r.createdAt).toLocaleTimeString()}</td>
                  <td className="svc-table__num">${r.amount.toFixed(2)} <span className="muted">{r.currency}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// QIE — Swap Quote Desk (QIEDEX Data tab) — replaces the old static pairs table
// ---------------------------------------------------------------------------
const DEX_TOKENS = ["QIE", "USDC", "ETH", "mQIE", "USDT"] as const;
const DEX_PX: Record<string, number> = { QIE: 0.0412, mQIE: 1.003, ETH: 3120, USDC: 1, USDT: 1 };

function SwapQuoteDesk({ workspace }: { workspace: Workspace }) {
  const { emitReceipt, receipts } = useAppState();
  const [tokenIn, setTokenIn] = useState<string>("USDC");
  const [tokenOut, setTokenOut] = useState<string>("QIE");
  const [amountIn, setAmountIn] = useState("100");
  const [slippage, setSlippage] = useState("0.5");
  const [quote, setQuote] = useState<{ out: number; impact: number; minOut: number; route: string[]; quoteId: string; fee: number } | null>(null);
  const [running, setRunning] = useState(false);
  const [settled, setSettled] = useState<string | null>(null);

  const quotes = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id && r.kind === "qie.dex.quote").slice(0, 8), [receipts, workspace.id]);
  const swaps = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id && r.kind === "qie.dex.swap").slice(0, 5), [receipts, workspace.id]);

  const getQuote = async () => {
    if (tokenIn === tokenOut) return;
    setRunning(true); setSettled(null);
    await new Promise((r) => setTimeout(r, 420));
    const amt = parseFloat(amountIn) || 0;
    const seed = `${tokenIn}|${tokenOut}|${amt}`;
    const rate = (DEX_PX[tokenIn] ?? 1) / (DEX_PX[tokenOut] ?? 1) * (1 - deterministicScore(seed + "|spread", 0.001, 0.006));
    const out = Number((amt * rate).toPrecision(6));
    const impact = Number(deterministicScore(seed + "|imp", 0.02, 1.7).toFixed(2));
    const slip = parseFloat(slippage) || 0.5;
    const minOut = Number((out * (1 - slip / 100)).toPrecision(6));
    const route = tokenIn === "USDC" || tokenOut === "USDC" ? [tokenIn, tokenOut] : [tokenIn, "QIE", tokenOut];
    const fee = 0.003;
    const quoteId = "q_" + hashId("q", seed + Date.now(), 8);
    emitReceipt({ workspaceId: workspace.id, serviceId: "svc_qie_dex", serviceName: "QIEDEX Quote API", amount: fee, currency: "USDC", network: workspace.networks[0] ?? "qie-testnet", kind: "qie.dex.quote", payload: { tokenIn, tokenOut, amountIn: amt, out, impact, minOut, route, quoteId } });
    setQuote({ out, impact, minOut, route, quoteId, fee });
    setRunning(false);
  };

  const acceptSwap = () => {
    if (!quote) return;
    const notionalFee = Math.max(0.002, (parseFloat(amountIn) || 0) * 0.0008);
    const rid = emitReceipt({ workspaceId: workspace.id, serviceId: "svc_qie_dex", serviceName: "QIEDEX Swap Settlement", amount: Number(notionalFee.toFixed(4)), currency: "USDC", network: workspace.networks[0] ?? "qie-testnet", kind: "qie.dex.swap", payload: { quoteId: quote.quoteId, tokenIn, tokenOut, amountIn: parseFloat(amountIn) || 0, out: quote.out } });
    setSettled(rid.id);
  };

  const pairRows = useMemo(() => ([
    ["QIE / USDC", DEX_PX.QIE!, deterministicScore("QIE/USDC|tvl", 0.8, 2.4)],
    ["mQIE / USDC", DEX_PX.mQIE!, deterministicScore("mQIE/USDC|tvl", 1.4, 3.2)],
    ["QIE / ETH", DEX_PX.QIE! / DEX_PX.ETH!, deterministicScore("QIE/ETH|tvl", 0.4, 1.2)],
  ] as [string, number, number][]), []);

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><Bolt width={15} height={15} /></span><div><h3>Swap quote desk</h3><div className="sub">paid QIEDEX quote · expected out · price impact · min-received · $0.003 USDC / quote</div></div></div>
        <button className="btn btn-acc btn-sm" type="button" onClick={getQuote} disabled={running || tokenIn === tokenOut}>{running ? <><Loader2 size={13} className="wallet-spin" /> Quoting…</> : <><Bolt width={13} height={13} /> Pay &amp; quote</>}</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, padding: "0 16px 12px" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>From</span>
          <select value={tokenIn} onChange={(e) => setTokenIn(e.currentTarget.value)} style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }}>{DEX_TOKENS.map((x) => <option key={x}>{x}</option>)}</select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>To</span>
          <select value={tokenOut} onChange={(e) => setTokenOut(e.currentTarget.value)} style={{ padding: "8px 10px", borderRadius: 9, border: `1px solid ${tokenIn === tokenOut ? "var(--red)" : "var(--line-2)"}`, background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }}>{DEX_TOKENS.map((x) => <option key={x}>{x}</option>)}</select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Amount in</span>
          <input value={amountIn} onChange={(e) => setAmountIn(e.currentTarget.value)} inputMode="decimal" style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem", fontVariantNumeric: "tabular-nums" }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Slippage %</span>
          <select value={slippage} onChange={(e) => setSlippage(e.currentTarget.value)} style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }}>{["0.1", "0.5", "1.0"].map((x) => <option key={x}>{x}</option>)}</select>
        </label>
      </div>
      {quote && (
        <div style={{ padding: "0 16px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", padding: "10px 14px", borderRadius: 12, border: "1px solid var(--line-2)", background: "var(--bg-2)" }}>
            {[["Expected out", `${quote.out} ${tokenOut}`], ["Price impact", `${quote.impact}%`], ["Min received", `${quote.minOut} ${tokenOut}`], ["Route", quote.route.join(" → ")], ["Fee", `$${quote.fee.toFixed(3)}`]].map(([k, v]) => (
              <div key={String(k)} style={{ display: "flex", flexDirection: "column", gap: 1 }}><span style={{ fontSize: ".58rem", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted)", fontWeight: 800 }}>{k}</span><span style={{ fontSize: ".95rem", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{v}</span></div>
            ))}
            <div style={{ flex: 1, minWidth: 120, textAlign: "right" }}><button className="btn btn-acc btn-sm" type="button" onClick={acceptSwap}><Check width={12} height={12} /> Accept &amp; settle swap</button></div>
          </div>
          {settled && <div style={{ marginTop: 8, padding: "7px 12px", borderRadius: 10, background: "color-mix(in srgb, var(--green) 12%, transparent)", color: "var(--green)", fontSize: ".76rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 7 }}><Check width={13} height={13} /> Swap settled — receipt <code style={{ background: "rgba(0,0,0,.14)", padding: "1px 5px", borderRadius: 5 }}>{settled}</code></div>}
        </div>
      )}
      <div style={{ padding: "0 16px 12px" }}>
        <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0" }}>Pool snapshot</div>
        <div className="svc-table__scroll"><table className="svc-table">
          <thead><tr><th>Pair</th><th>Mid price</th><th>TVL</th><th>Depth ±2%</th><th>Quote cost</th></tr></thead>
          <tbody>{pairRows.map(([p, px, tvl]) => (
            <tr key={p}><td><b>{p}</b></td><td className="svc-table__num">{px < 1 ? px.toFixed(5) : px.toLocaleString()}</td><td className="svc-table__num">${tvl.toFixed(1)}M</td><td className="svc-table__num">${(tvl * deterministicScore(p + "|d", 0.04, 0.12) * 1000).toFixed(0)}k</td><td className="svc-table__num">${(0.003).toFixed(3)}</td></tr>
          ))}</tbody>
        </table></div>
      </div>
      <div style={{ padding: "0 16px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0" }}>Recent quotes · {quotes.length}</div>
          <div className="svc-hist">
            {quotes.length === 0 && <div className="muted sm">No quotes yet.</div>}
            {quotes.map((r) => { const p = (r.payload ?? {}) as { tokenIn?: string; tokenOut?: string; out?: number; quoteId?: string }; return (
              <div className="svc-hist__row" key={r.id}><span className="svc-hist__dot" style={{ background: "var(--accent-primary)" }} /><div className="svc-hist__main"><b>{p.tokenIn} → {p.tokenOut}</b><span>out {p.out} · {p.quoteId}</span></div><span className="svc-hist__amt">{r.amount.toFixed(3)}</span></div>
            ); })}
          </div>
        </div>
        <div>
          <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0" }}>Settled swaps · {swaps.length}</div>
          <div className="svc-hist">
            {swaps.length === 0 && <div className="muted sm">No swaps settled yet.</div>}
            {swaps.map((r) => { const p = (r.payload ?? {}) as { tokenIn?: string; tokenOut?: string; amountIn?: number; out?: number }; return (
              <div className="svc-hist__row" key={r.id}><span className="svc-hist__dot" style={{ background: "#1fb58a" }} /><div className="svc-hist__main"><b>{p.amountIn} {p.tokenIn} → {p.out} {p.tokenOut}</b><span>{new Date(r.createdAt).toLocaleTimeString()}</span></div>{badgeFor(r.status)}<span className="svc-hist__amt">{r.amount.toFixed(3)}</span></div>
            ); })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ARBITRUM — Agent Service Registry (Agent Services tab)
// ---------------------------------------------------------------------------
type RegService = { svcId: string; name: string; category: string; price: number; network: string; gatewayUrl: string; providerWallet: string; createdAt: string; status: "active" | "inactive" };
const SEED_REG_SERVICES: RegService[] = [
  { svcId: "svc_arb_a1", name: "Orbit Bridge Health API", category: "data", price: 0.004, network: "arbitrum-sepolia", gatewayUrl: "/arbitrum/orbit-bridge-health", providerWallet: "0xa17e0b9c4d21f00ab12c", createdAt: new Date(Date.now() - 864e5).toISOString(), status: "active" },
  { svcId: "svc_arb_a2", name: "USDC Settlement Webhook", category: "payments", price: 0.002, network: "arbitrum-sepolia", gatewayUrl: "/arbitrum/usdc-settlement-webhook", providerWallet: "0xcc91f0e7a3b2d4e5f607", createdAt: new Date(Date.now() - 3 * 864e5).toISOString(), status: "active" },
];
const REG_CATS = ["data", "inference", "payments", "risk", "oracle"] as const;
function slugify(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "service"; }

function AgentServiceRegistry({ workspace, onOpenPayment }: { workspace: Workspace; onOpenPayment: (s: Service) => void }) {
  const { emitReceipt, receipts } = useAppState();
  const [list, setList] = useLocalStore<RegService[]>("arb.services", SEED_REG_SERVICES);
  const [name, setName] = useState("Stablecoin Invoice API");
  const [category, setCategory] = useState<typeof REG_CATS[number]>("payments");
  const [price, setPrice] = useState("0.02");
  const [network, setNetwork] = useState(workspace.networks[0] ?? "arbitrum-sepolia");
  const registrations = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id && r.kind === "arb.service.register").slice(0, 6), [receipts, workspace.id]);

  const register = () => {
    const p = parseFloat(price) || 0.01;
    const svcId = "svc_arb_" + hashId("svc", name + category, 6);
    const gatewayUrl = `/arbitrum/${slugify(name)}`;
    const providerWallet = "0x" + hashId("0xprov", name + workspace.id, 12);
    const reg: RegService = { svcId, name: name.trim() || "Unnamed service", category, price: p, network, gatewayUrl, providerWallet, createdAt: new Date().toISOString(), status: "active" };
    setList((prev) => [reg, ...prev.filter((x) => x.svcId !== svcId)].slice(0, 20));
    emitReceipt({ workspaceId: workspace.id, serviceId: svcId, serviceName: reg.name, amount: 0.01, currency: "USDC", network, kind: "arb.service.register", payload: { svcId, category, price: p, gatewayUrl, providerWallet } });
  };

  const testCall = (r: RegService) => {
    const adHoc: Service = {
      id: r.svcId, workspaceIds: [workspace.id], name: r.name, provider: "You (registered)", providerWallet: r.providerWallet,
      category: r.category, price: `${r.price.toFixed(3)} USDC`, priceUsd: r.price, currency: "USDC", network: r.network,
      description: `Registered ${r.category} service on the Arbitrum agent-services registry.`, sampleIn: `{ "input": "…" }`,
      response: `{ "ok": true, "service": "${r.svcId}", "result": "…" }`, latency: "~120ms", calls: 0, status: "active",
    };
    onOpenPayment(adHoc);
  };

  const setStatus = (svcId: string, status: RegService["status"]) => setList((prev) => prev.map((x) => x.svcId === svcId ? { ...x, status } : x));

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><Plus width={15} height={15} /></span><div><h3>Agent service registry</h3><div className="sub">register an x402-gated agent service · get a gateway URL + provider wallet · test it with a real 402 call</div></div></div>
        <button className="btn btn-acc btn-sm" type="button" onClick={register}><Plus width={13} height={13} /> Register service</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.4fr", gap: 10, padding: "0 16px 12px" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Service name</span>
          <input value={name} onChange={(e) => setName(e.currentTarget.value)} style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Category</span>
          <select value={category} onChange={(e) => setCategory(e.currentTarget.value as typeof category)} style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem", textTransform: "capitalize" }}>{REG_CATS.map((c) => <option key={c}>{c}</option>)}</select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Price USDC</span>
          <input value={price} onChange={(e) => setPrice(e.currentTarget.value)} inputMode="decimal" style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem", fontVariantNumeric: "tabular-nums" }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Network</span>
          <select value={network} onChange={(e) => setNetwork(e.currentTarget.value)} style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }}>{(workspace.networks.length ? workspace.networks : ["arbitrum-sepolia"]).map((n) => <option key={n}>{n}</option>)}</select>
        </label>
      </div>
      <div style={{ padding: "0 16px 14px" }}>
        <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0" }}>Registered services · {list.length}</div>
        <div className="svc-ep-grid">
          {list.map((r) => {
            const Ico = CAT_ICON[r.category] ?? CAT_ICON.data;
            const rating = deterministicScore("rating_" + r.svcId, 3.2, 5.0);
            const stars = Math.round(rating);
            const callCount = Math.round(deterministicScore("calls_" + r.svcId, 18, 2800));
            return (
              <div key={r.svcId} className="svc-ep-card">
                <div className="svc-ep-card__top">
                  <span className="sq sm" style={{ background: catColor(r.category) }}><Ico width={13} height={13} /></span>
                  <div className="svc-ep-card__id"><b>{r.name}</b><code>{r.gatewayUrl}</code></div>
                  {badgeFor(r.status === "active" ? "active" : "paused")}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0 4px" }}>
                  <span style={{ color: "#ff9b00", fontSize: ".8rem", letterSpacing: "-.03em" }}>{"★".repeat(stars)}{"☆".repeat(5 - stars)}</span>
                  <span style={{ fontSize: ".65rem", color: "var(--muted)", fontWeight: 600 }}>{rating.toFixed(1)} · {callCount.toLocaleString()} calls</span>
                </div>
                <div className="svc-ep-card__meta">
                  <span><b>${r.price.toFixed(3)}</b> USDC</span><span>{r.category}</span><span>{r.network}</span><span style={{ fontFamily: "var(--mono)" }}>{r.providerWallet.slice(0, 10)}…</span>
                </div>
                <div className="row sm" style={{ gap: 6 }}>
                  <button className="btn btn-acc btn-sm" type="button" disabled={r.status !== "active"} onClick={() => testCall(r)} style={{ flex: 1, justifyContent: "center" }}><Bolt width={12} height={12} /> Test call (pay &amp; unlock)</button>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => setStatus(r.svcId, r.status === "active" ? "inactive" : "active")}>{r.status === "active" ? "Pause" : "Resume"}</button>
                </div>
              </div>
            );
          })}
          {list.length === 0 && <div className="muted sm" style={{ padding: "10px 4px" }}>No services registered — register one above.</div>}
        </div>
        {registrations.length > 0 && (
          <>
            <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "10px 0 4px" }}>Recent registrations · {registrations.length}</div>
            <div className="svc-hist">{registrations.map((r) => { const p = (r.payload ?? {}) as { svcId?: string; gatewayUrl?: string }; return (
              <div className="svc-hist__row" key={r.id}><span className="svc-hist__dot" style={{ background: "var(--accent-primary)" }} /><div className="svc-hist__main"><b>{r.serviceName}</b><span>{p.gatewayUrl} · {p.svcId}</span></div>{badgeFor(r.status)}<span className="svc-hist__amt">{r.amount.toFixed(2)}</span></div>
            ); })}</div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ARBITRUM — Spend Rules Editor (Risk Rules tab)
// ---------------------------------------------------------------------------
type SpendRules = { maxPerRequestUsd: number; dailyLimitUsd: number; allowedServiceIds: string[]; blockedAddresses: string[]; network: string; autoPay: boolean };
const makeDefaultRules = (services: Service[], net: string): SpendRules => ({ maxPerRequestUsd: 0.25, dailyLimitUsd: 12, allowedServiceIds: services.slice(0, 4).map((s) => s.id), blockedAddresses: ["0x000000000000000000000000000000000000dead"], network: net, autoPay: true });

function SpendRulesEditor({ workspace, services }: { workspace: Workspace; services: Service[] }) {
  const { emitReceipt, receipts } = useAppState();
  const net0 = workspace.networks[0] ?? "arbitrum-sepolia";
  const [rules, setRules] = useLocalStore<SpendRules>("arb.risk.rules", makeDefaultRules(services, net0));
  const [blocked, setBlocked] = useState(rules.blockedAddresses.join("\n"));
  const [testSvc, setTestSvc] = useState(services[0]?.id ?? "");
  const [testAmt, setTestAmt] = useState("0.15");
  const [testAddr, setTestAddr] = useState("0xA17e0b9c4d2192aF31b7c0e2e5b8f1");
  const [testResult, setTestResult] = useState<{ pass: boolean; reason: string } | null>(null);
  const [publishedId, setPublishedId] = useState<string | null>(null);

  const spentToday = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id && (r.kind ?? "").startsWith("arb.") && new Date(r.createdAt).toDateString() === new Date().toDateString()).reduce((s, r) => s + r.amount, 0), [receipts, workspace.id]);
  const publishes = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id && r.kind === "arb.risk.publish").slice(0, 6), [receipts, workspace.id]);

  const toggleSvc = (id: string) => setRules((r) => ({ ...r, allowedServiceIds: r.allowedServiceIds.includes(id) ? r.allowedServiceIds.filter((x) => x !== id) : [...r.allowedServiceIds, id] }));

  const publish = () => {
    const next: SpendRules = { ...rules, blockedAddresses: blocked.split(/\s+/).map((x) => x.trim().toLowerCase()).filter(Boolean) };
    setRules(next);
    const rulesetId = "rules_" + hashId("rules", JSON.stringify(next) + Date.now(), 8);
    emitReceipt({ workspaceId: workspace.id, serviceName: "Risk Ruleset · Publish", amount: 0, currency: "USDC", network: next.network, kind: "arb.risk.publish", payload: { rulesetId, maxPerRequestUsd: next.maxPerRequestUsd, dailyLimitUsd: next.dailyLimitUsd, allowlistCount: next.allowedServiceIds.length, blockedCount: next.blockedAddresses.length, autoPay: next.autoPay } });
    setPublishedId(rulesetId);
  };

  const runTest = () => {
    const svc = services.find((s) => s.id === testSvc);
    const amt = parseFloat(testAmt) || 0;
    const blockedNow = blocked.split(/\s+/).map((x) => x.trim().toLowerCase()).filter(Boolean);
    let pass = true, reason = "All rules satisfied";
    if (!rules.autoPay) { pass = false; reason = "auto-pay is disabled — human approval required"; }
    else if (!svc) { pass = false; reason = "unknown service"; }
    else if (amt > rules.maxPerRequestUsd) { pass = false; reason = `amount $${amt.toFixed(3)} > max-per-request $${rules.maxPerRequestUsd.toFixed(3)}`; }
    else if (spentToday + amt > rules.dailyLimitUsd) { pass = false; reason = `would exceed daily limit ($${(spentToday + amt).toFixed(2)} > $${rules.dailyLimitUsd.toFixed(2)})`; }
    else if (rules.allowedServiceIds.length && !rules.allowedServiceIds.includes(testSvc)) { pass = false; reason = "service not on the allowlist"; }
    else if (blockedNow.includes(testAddr.trim().toLowerCase())) { pass = false; reason = "counterparty address is denylisted"; }
    else if (svc.network !== rules.network) { pass = false; reason = `service network ${svc.network} ≠ allowed ${rules.network}`; }
    setTestResult({ pass, reason });
    if (pass) emitReceipt({ workspaceId: workspace.id, serviceId: testSvc, serviceName: "Risk Check · Pass", amount: 0, currency: "USDC", network: rules.network, kind: "arb.risk.test", payload: { serviceId: testSvc, amount: amt, from: testAddr.trim(), result: "pass" } });
  };

  const protectPct = Math.round((spentToday / rules.dailyLimitUsd) * 100);

  return (
    <div className="panel block svc-flavor">
      <div className="block-head" style={{ borderBottom: "1px solid var(--line-2)", paddingBottom: 12 }}>
        <div className="ttl"><span className="sq soft"><ShieldCheck width={15} height={15} /></span><div><h3>Spend limits · agent protection</h3><div className="sub">Stop an agent from draining your wallet — set a daily cap and it cannot spend more</div></div></div>
        <button className="btn btn-acc btn-sm" type="button" onClick={publish}><Check width={13} height={13} /> Save ruleset</button>
      </div>

      {/* Quick protect hero */}
      <div style={{ margin: "14px 16px 12px", padding: "14px 16px", borderRadius: 14, border: "1px solid color-mix(in srgb, var(--accent-primary) 25%, var(--line-2))", background: "color-mix(in srgb, var(--accent-primary) 5%, transparent)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: ".9rem" }}>Daily spend cap</div>
            <div style={{ fontSize: ".7rem", color: "var(--muted)" }}>Agent cannot spend more than this per day — ever</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 900, letterSpacing: "-.04em", color: "var(--accent-primary)", lineHeight: 1 }}>${rules.dailyLimitUsd}</div>
            <div style={{ fontSize: ".65rem", color: "var(--muted)" }}>USDC / day</div>
          </div>
        </div>
        <input type="range" min={1} max={100} step={1} value={rules.dailyLimitUsd} onChange={(e) => setRules((r) => ({ ...r, dailyLimitUsd: parseFloat(e.currentTarget.value) }))} style={{ width: "100%", accentColor: "var(--accent-primary)" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".62rem", color: "var(--muted)", marginTop: 2 }}>
          <span>$1</span><span>$50</span><span>$100</span>
        </div>
        {/* Spent today bar */}
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".68rem", color: "var(--muted)", marginBottom: 4 }}>
            <span>Spent today: <b style={{ color: "var(--ink)" }}>${spentToday.toFixed(2)}</b></span>
            <span>Remaining: <b style={{ color: protectPct < 80 ? "#1fb58a" : "#e63946" }}>${Math.max(0, rules.dailyLimitUsd - spentToday).toFixed(2)}</b></span>
          </div>
          <div style={{ height: 6, borderRadius: 6, background: "var(--line-2)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(100, protectPct)}%`, background: protectPct >= 80 ? "#e63946" : "var(--accent-primary)", borderRadius: 6, transition: "width .3s" }} />
          </div>
        </div>
        {publishedId && <div style={{ marginTop: 8, fontSize: ".68rem", color: "var(--green)", fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}><Check width={12} height={12} /> Saved — ruleset ID {publishedId.slice(0, 16)}</div>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, padding: "0 16px 10px" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Max per request (USDC)</span>
          <input value={String(rules.maxPerRequestUsd)} onChange={(e) => setRules((r) => ({ ...r, maxPerRequestUsd: parseFloat(e.currentTarget.value) || 0 }))} inputMode="decimal" style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Daily limit (USDC)</span>
          <input value={String(rules.dailyLimitUsd)} onChange={(e) => setRules((r) => ({ ...r, dailyLimitUsd: parseFloat(e.currentTarget.value) || 0 }))} inputMode="decimal" style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Allowed network</span>
          <select value={rules.network} onChange={(e) => setRules((r) => ({ ...r, network: e.currentTarget.value }))} style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }}>{(workspace.networks.length ? workspace.networks : ["arbitrum-sepolia"]).map((n) => <option key={n}>{n}</option>)}</select>
        </label>
      </div>
      <div style={{ padding: "0 16px 10px" }}>
        <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Allowed services</span>
        <div className="row sm" style={{ gap: 6, flexWrap: "wrap", marginTop: 6 }}>
          {services.map((s) => (
            <button key={s.id} type="button" className={"pill click" + (rules.allowedServiceIds.includes(s.id) ? " on" : "")} onClick={() => toggleSvc(s.id)}>{rules.allowedServiceIds.includes(s.id) ? <Check width={11} height={11} /> : null} {s.name}</button>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "0 16px 12px" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Denylisted addresses (one per line)</span>
          <textarea value={blocked} onChange={(e) => setBlocked(e.currentTarget.value)} rows={2} style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontFamily: "var(--mono)", fontSize: ".72rem", resize: "vertical" }} />
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
          <label className="row sm" style={{ gap: 8, fontSize: ".82rem", cursor: "pointer" }}>
            <input type="checkbox" checked={rules.autoPay} onChange={(e) => setRules((r) => ({ ...r, autoPay: e.currentTarget.checked }))} /> Auto-pay enabled (agent settles without human approval)
          </label>
          <div style={{ fontSize: ".72rem", color: "var(--muted)" }}>Spent today (arb.*): <b style={{ color: "var(--ink)" }}>${spentToday.toFixed(3)}</b> · headroom <b style={{ color: "var(--ink)" }}>${Math.max(0, rules.dailyLimitUsd - spentToday).toFixed(3)}</b></div>
          {publishedId && <div style={{ fontSize: ".72rem", color: "var(--green)", fontWeight: 700 }}><Check width={12} height={12} /> Published <code style={{ background: "rgba(0,0,0,.14)", padding: "1px 5px", borderRadius: 5 }}>{publishedId}</code></div>}
        </div>
      </div>
      {/* IF-THEN rule cards */}
      <div style={{ padding: "0 16px 10px" }}>
        <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", marginBottom: 8 }}>Active rules · IF → THEN</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 8 }}>
          {([
            { cond: `amount > $${rules.maxPerRequestUsd}`, action: "BLOCK payment", color: "#e63946" },
            { cond: `daily spend > $${rules.dailyLimitUsd}`, action: "BLOCK payment", color: "#e63946" },
            { cond: "service NOT on allowlist", action: "REJECT call", color: "#ff9b00" },
            { cond: "address on denylist", action: "REJECT call", color: "#ff9b00" },
            { cond: `network ≠ ${rules.network}`, action: "REJECT call", color: "#ff9b00" },
            { cond: rules.autoPay ? "all rules pass" : "any rule checked", action: rules.autoPay ? "AUTO-PAY ✓" : "REQUEST approval", color: rules.autoPay ? "#1fb58a" : "#3aa0e6" },
          ] as { cond: string; action: string; color: string }[]).map(({ cond, action, color }) => (
            <div key={cond} style={{ borderRadius: 10, border: `1px solid color-mix(in srgb, ${color} 25%, var(--line-2))`, background: `color-mix(in srgb, ${color} 5%, var(--bg-2))`, padding: "9px 12px" }}>
              <div style={{ fontSize: ".6rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", marginBottom: 4 }}>IF</div>
              <div style={{ fontSize: ".78rem", fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>{cond}</div>
              <div style={{ fontSize: ".6rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", marginBottom: 4 }}>THEN</div>
              <div style={{ fontSize: ".78rem", fontWeight: 900, color }}>{action}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ margin: "0 16px 14px", padding: "10px 14px", borderRadius: 12, border: "1px solid var(--line-2)", background: "var(--field)" }}>
        <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", marginBottom: 8 }}>Test a request against the live rules</div>
        <div className="row sm" style={{ gap: 8, flexWrap: "wrap" }}>
          <select value={testSvc} onChange={(e) => setTestSvc(e.currentTarget.value)} style={{ padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".8rem" }}>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <input value={testAmt} onChange={(e) => setTestAmt(e.currentTarget.value)} inputMode="decimal" placeholder="amount" style={{ width: 80, padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".8rem" }} />
          <input value={testAddr} onChange={(e) => setTestAddr(e.currentTarget.value)} placeholder="from address" style={{ flex: 1, minWidth: 180, padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".78rem", fontFamily: "var(--mono)" }} />
          <button className="btn btn-sm" type="button" onClick={runTest}>Evaluate</button>
        </div>
        {testResult && (
          <div style={{ marginTop: 8, padding: "7px 12px", borderRadius: 10, background: `color-mix(in srgb, ${testResult.pass ? "var(--green)" : "var(--red)"} 12%, transparent)`, color: testResult.pass ? "var(--green)" : "var(--red)", fontSize: ".78rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 7 }}>
            {testResult.pass ? <Check width={13} height={13} /> : <X width={13} height={13} />} {testResult.pass ? "PASS" : "BLOCK"} — {testResult.reason}
          </div>
        )}
      </div>
      {publishes.length > 0 && (
        <div style={{ padding: "0 16px 14px" }}>
          <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0" }}>Recent ruleset changes · {publishes.length}</div>
          <div className="svc-hist">{publishes.map((r) => { const p = (r.payload ?? {}) as { rulesetId?: string; maxPerRequestUsd?: number; dailyLimitUsd?: number; allowlistCount?: number }; return (
            <div className="svc-hist__row" key={r.id}><span className="svc-hist__dot" style={{ background: "var(--accent-primary)" }} /><div className="svc-hist__main"><b>{p.rulesetId}</b><span>cap ${p.maxPerRequestUsd} · daily ${p.dailyLimitUsd} · {p.allowlistCount} allowed · {new Date(r.createdAt).toLocaleTimeString()}</span></div></div>
          ); })}</div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LIQUIFY — Tax Lot Calculator (Tax Reports tab, above TaxExport)
// ---------------------------------------------------------------------------
type TaxLot = { asset: string; date: string; side: "buy" | "sell"; qty: number; priceUsd: number };
const TAX_METHODS = ["FIFO", "LIFO", "HIFO"] as const;
function seedLots(receipts: Receipt[], wsId: WorkspaceId, year: number): TaxLot[] {
  const r = receipts.filter((x) => x.workspaceId === wsId);
  const assets = ["ETH", "WBTC", "ARB"];
  const lots: TaxLot[] = [];
  assets.forEach((a, ai) => {
    // a couple of buys then a sell, deterministic
    lots.push({ asset: a, date: `${year - 1}-09-1${ai}`, side: "buy", qty: Number(deterministicScore(a + "|q1", 0.3, 3).toFixed(3)), priceUsd: Number(deterministicScore(a + "|p1", 1000, 60000).toFixed(2)) });
    lots.push({ asset: a, date: `${year}-02-0${ai + 2}`, side: "buy", qty: Number(deterministicScore(a + "|q2", 0.2, 2).toFixed(3)), priceUsd: Number(deterministicScore(a + "|p2", 1200, 65000).toFixed(2)) });
    lots.push({ asset: a, date: `${year}-08-1${ai}`, side: "sell", qty: Number(deterministicScore(a + "|q3" + r.length, 0.2, 2.5).toFixed(3)), priceUsd: Number(deterministicScore(a + "|p3", 1500, 68000).toFixed(2)) });
  });
  return lots;
}
function matchLots(lots: TaxLot[], method: typeof TAX_METHODS[number]) {
  // per-asset queues of buy lots; match sells
  const matched: { asset: string; qty: number; proceeds: number; cost: number; gain: number; held: "short" | "long"; buyDate: string; sellDate: string }[] = [];
  let shortTerm = 0, longTerm = 0, proceeds = 0, costBasis = 0;
  const byAsset = new Map<string, TaxLot[]>();
  for (const l of lots) { if (l.side === "buy") { const q = byAsset.get(l.asset) ?? []; q.push({ ...l }); byAsset.set(l.asset, q); } }
  for (const a of byAsset.keys()) {
    const q = byAsset.get(a)!;
    if (method === "LIFO") q.sort((x, y) => (y.date < x.date ? -1 : 1));
    else if (method === "HIFO") q.sort((x, y) => y.priceUsd - x.priceUsd);
    // FIFO: keep insertion order (already chronological from seedLots)
  }
  for (const sell of lots.filter((l) => l.side === "sell")) {
    let remaining = sell.qty;
    const q = byAsset.get(sell.asset) ?? [];
    while (remaining > 1e-9 && q.length) {
      const lot = q[0]!;
      const take = Math.min(remaining, lot.qty);
      const p = take * sell.priceUsd;
      const c = take * lot.priceUsd;
      const gain = p - c;
      const longHeld = new Date(sell.date).getFullYear() - new Date(lot.date).getFullYear() >= 1;
      if (longHeld) longTerm += gain; else shortTerm += gain;
      proceeds += p; costBasis += c;
      matched.push({ asset: sell.asset, qty: Number(take.toFixed(4)), proceeds: Number(p.toFixed(2)), cost: Number(c.toFixed(2)), gain: Number(gain.toFixed(2)), held: longHeld ? "long" : "short", buyDate: lot.date, sellDate: sell.date });
      lot.qty -= take; remaining -= take;
      if (lot.qty <= 1e-9) q.shift();
    }
  }
  return { matched, shortTerm: Number(shortTerm.toFixed(2)), longTerm: Number(longTerm.toFixed(2)), proceeds: Number(proceeds.toFixed(2)), costBasis: Number(costBasis.toFixed(2)) };
}
function TaxLotCalculator({ workspace, receipts }: { workspace: Workspace; receipts: Receipt[] }) {
  const { emitReceipt } = useAppState();
  const [method, setMethod] = useState<typeof TAX_METHODS[number]>("FIFO");
  const [year, setYear] = useState(2025);
  const [lots, setLots] = useState<TaxLot[]>(() => seedLots(receipts, workspace.id, 2025));
  const [result, setResult] = useState<ReturnType<typeof matchLots> | null>(null);
  const history = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id && r.kind === "liquify.tax.lots").slice(0, 6), [receipts, workspace.id]);

  const setLot = (i: number, k: keyof TaxLot, v: string) => setLots((ls) => ls.map((l, j) => j === i ? { ...l, [k]: k === "qty" || k === "priceUsd" ? (parseFloat(v) || 0) : k === "side" ? (v === "sell" ? "sell" : "buy") : v } as TaxLot : l));
  const addLot = () => setLots((ls) => [...ls, { asset: "ETH", date: `${year}-01-01`, side: "buy", qty: 1, priceUsd: 3000 }]);
  const rmLot = (i: number) => setLots((ls) => ls.length > 1 ? ls.filter((_, j) => j !== i) : ls);
  const reseed = (y: number) => { setYear(y); setLots(seedLots(receipts, workspace.id, y)); setResult(null); };

  const calc = () => {
    const out = matchLots(lots, method);
    setResult(out);
    emitReceipt({ workspaceId: workspace.id, serviceName: "Tax Lot Calculator API", amount: 0.08, currency: "USDC", network: workspace.networks[0] ?? "base-sepolia", kind: "liquify.tax.lots", payload: { method, year, shortTermGain: out.shortTerm, longTermGain: out.longTerm, lotCount: out.matched.length } });
  };
  const downloadCsv = () => {
    if (!result) return;
    const headers = ["Asset", "Qty", "Acquired", "Sold", "Proceeds", "Cost basis", "Gain/loss", "Term"];
    const rows = result.matched.map((m) => [m.asset, m.qty, m.buyDate, m.sellDate, m.proceeds, m.cost, m.gain, m.held].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `liquify-form8949-${year}-${method}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><CircleDollarSign width={15} height={15} /></span><div><h3>Tax lot calculator</h3><div className="sub">FIFO / LIFO / HIFO lot matching · short- vs long-term split · Form-8949-style CSV · $0.08 USDC / run</div></div></div>
        <div className="row sm" style={{ gap: 8 }}>
          <select value={year} onChange={(e) => reseed(Number(e.currentTarget.value))} style={{ padding: "6px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".8rem" }}>{[2026, 2025, 2024].map((y) => <option key={y}>{y}</option>)}</select>
          <button className="btn btn-acc btn-sm" type="button" onClick={calc}><Bolt width={13} height={13} /> Calculate (paid)</button>
        </div>
      </div>
      <div className="row sm" style={{ gap: 8, padding: "0 16px 8px" }}>
        <div className="seg" style={{ display: "inline-flex" }}>{TAX_METHODS.map((m) => <button key={m} type="button" className={method === m ? "on" : ""} onClick={() => setMethod(m)}>{m}</button>)}</div>
        <button className="btn btn-ghost btn-sm" type="button" onClick={addLot}><Plus width={12} height={12} /> Add lot</button>
        {result && <button className="btn btn-ghost btn-sm" type="button" onClick={downloadCsv}><Download width={12} height={12} /> Form-8949 CSV</button>}
      </div>
      <div style={{ padding: "0 16px 10px" }}>
        <div className="svc-table__scroll"><table className="svc-table">
          <thead><tr><th>Asset</th><th>Date</th><th>Side</th><th>Qty</th><th>Price USD</th><th aria-label="rm" /></tr></thead>
          <tbody>
            {lots.map((l, i) => (
              <tr key={i}>
                <td><input value={l.asset} onChange={(e) => setLot(i, "asset", e.currentTarget.value)} style={{ width: 64, padding: "4px 6px", borderRadius: 6, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".76rem" }} /></td>
                <td><input value={l.date} onChange={(e) => setLot(i, "date", e.currentTarget.value)} style={{ width: 96, padding: "4px 6px", borderRadius: 6, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".76rem", fontFamily: "var(--mono)" }} /></td>
                <td><select value={l.side} onChange={(e) => setLot(i, "side", e.currentTarget.value)} style={{ padding: "4px 6px", borderRadius: 6, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".76rem" }}><option value="buy">buy</option><option value="sell">sell</option></select></td>
                <td><input value={String(l.qty)} onChange={(e) => setLot(i, "qty", e.currentTarget.value)} inputMode="decimal" style={{ width: 70, padding: "4px 6px", borderRadius: 6, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".76rem", textAlign: "right" }} /></td>
                <td><input value={String(l.priceUsd)} onChange={(e) => setLot(i, "priceUsd", e.currentTarget.value)} inputMode="decimal" style={{ width: 90, padding: "4px 6px", borderRadius: 6, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".76rem", textAlign: "right" }} /></td>
                <td><button className="btn btn-ghost btn-sm" type="button" onClick={() => rmLot(i)} style={{ color: "var(--red)" }}><Trash2 width={11} height={11} /></button></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
      {result && (
        <div style={{ padding: "0 16px 14px" }}>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", padding: "10px 14px", borderRadius: 12, border: "1px solid var(--line-2)", background: "var(--bg-2)", marginBottom: 10 }}>
            {[["Short-term gain", result.shortTerm, result.shortTerm >= 0 ? "#1fb58a" : "#e63946"], ["Long-term gain", result.longTerm, result.longTerm >= 0 ? "#1fb58a" : "#e63946"], ["Net gain", result.shortTerm + result.longTerm, (result.shortTerm + result.longTerm) >= 0 ? "#1fb58a" : "#e63946"], ["Proceeds", result.proceeds, "var(--ink)"], ["Cost basis", result.costBasis, "var(--ink)"]].map(([k, v, c]) => (
              <div key={String(k)} style={{ display: "flex", flexDirection: "column", gap: 1 }}><span style={{ fontSize: ".58rem", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted)", fontWeight: 800 }}>{k}</span><span style={{ fontSize: "1.05rem", fontWeight: 800, color: String(c), fontVariantNumeric: "tabular-nums" }}>${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
            ))}
          </div>
          <div className="svc-table__scroll"><table className="svc-table">
            <thead><tr><th>Asset</th><th>Qty</th><th>Acquired</th><th>Sold</th><th>Proceeds</th><th>Cost</th><th>Gain/loss</th><th>Term</th></tr></thead>
            <tbody>{result.matched.map((m, i) => (
              <tr key={i}><td><b>{m.asset}</b></td><td className="svc-table__num">{m.qty}</td><td className="muted">{m.buyDate}</td><td className="muted">{m.sellDate}</td><td className="svc-table__num">${m.proceeds.toLocaleString()}</td><td className="svc-table__num">${m.cost.toLocaleString()}</td><td className="svc-table__num" style={{ color: m.gain >= 0 ? "#1fb58a" : "#e63946", fontWeight: 700 }}>${m.gain.toLocaleString()}</td><td><span className="pill" style={{ background: m.held === "long" ? "color-mix(in srgb, #1fb58a 14%, transparent)" : "color-mix(in srgb, #ff9b00 14%, transparent)", color: m.held === "long" ? "#1fb58a" : "#ff9b00" }}>{m.held}</span></td></tr>
            ))}</tbody>
          </table></div>
        </div>
      )}
      {history.length > 0 && (
        <div style={{ padding: "0 16px 14px" }}>
          <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0" }}>Recent calculations · {history.length}</div>
          <div className="svc-hist">{history.map((r) => { const p = (r.payload ?? {}) as { method?: string; year?: number; shortTermGain?: number; longTermGain?: number }; return (
            <div className="svc-hist__row" key={r.id}><span className="svc-hist__dot" style={{ background: "var(--accent-primary)" }} /><div className="svc-hist__main"><b>{p.method} · {p.year}</b><span>ST ${p.shortTermGain} · LT ${p.longTermGain} · {new Date(r.createdAt).toLocaleTimeString()}</span></div><span className="svc-hist__amt">{r.amount.toFixed(2)}</span></div>
          ); })}</div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LIQUIFY — Approval Revoke Planner (Wallet Analysis tab, after WalletRiskAnalyzer)
// ---------------------------------------------------------------------------
const APPROVAL_SPENDERS = ["UniversalRouter", "Permit2", "OpenSea Seaport", "1inch Aggregator", "Unknown 0x4f…", "CowSwap GPv2", "Sushi Router"];
const APPROVAL_TOKENS = ["USDC", "WETH", "DAI", "USDT", "ARB", "WBTC"];
function ApprovalRevokePlanner({ workspace }: { workspace: Workspace }) {
  const { emitReceipt, receipts } = useAppState();
  const [addr, setAddr] = useState("0x91cE...d2A7f3b04E9");
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [queued, setQueued] = useState<string | null>(null);
  const rows = useMemo(() => {
    const a = addr.trim() || "0x";
    const n = 4 + Math.round(deterministicScore(a + "|n", 0, 3.99));
    return Array.from({ length: n }, (_, i) => {
      const spender = APPROVAL_SPENDERS[Math.floor(deterministicScore(a + "|sp" + i, 0, APPROVAL_SPENDERS.length - 0.001))]!;
      const token = APPROVAL_TOKENS[Math.floor(deterministicScore(a + "|tk" + i, 0, APPROVAL_TOKENS.length - 0.001))]!;
      const unlimited = deterministicScore(a + "|u" + i, 0, 1) > 0.45;
      const risk = Math.round(deterministicScore(a + "|r" + i, unlimited ? 35 : 5, 95));
      const lastUsedDays = Math.round(deterministicScore(a + "|l" + i, 1, 320));
      return { i, spender, token, unlimited, risk, lastUsedDays };
    });
  }, [addr]);
  const history = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id && r.kind === "liquify.approval.revoke").slice(0, 6), [receipts, workspace.id]);
  const riskColor = (r: number) => r >= 70 ? "#e63946" : r >= 40 ? "#ff9b00" : "#1fb58a";
  const toggle = (i: number) => setSel((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });

  const queue = () => {
    if (sel.size === 0) return;
    const picked = rows.filter((r) => sel.has(r.i));
    const bundleId = "rvk_" + hashId("rvk", addr + [...sel].join(","), 8);
    const estGas = (0.0008 + 0.00021 * picked.length).toFixed(5);
    emitReceipt({ workspaceId: workspace.id, serviceName: "Approval Revoke Planner API", amount: 0.04, currency: "USDC", network: workspace.networks[0] ?? "base-sepolia", kind: "liquify.approval.revoke", payload: { address: addr.trim(), revoked: picked.map((p) => `${p.token}→${p.spender}`), bundleId, count: picked.length, estGasEth: estGas } });
    setQueued(bundleId + "|" + estGas);
  };

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><Shield width={15} height={15} /></span><div><h3>Approval revoke planner</h3><div className="sub">list outstanding ERC-20 approvals for an address · select risky ones · queue a revoke bundle · $0.04 USDC</div></div></div>
        <button className="btn btn-acc btn-sm" type="button" onClick={queue} disabled={sel.size === 0}><Shield width={13} height={13} /> Pay &amp; queue revoke bundle ({sel.size})</button>
      </div>
      <div style={{ padding: "0 16px 10px" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Address</span>
          <input value={addr} onChange={(e) => { setAddr(e.currentTarget.value); setSel(new Set()); setQueued(null); }} spellCheck={false} style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontFamily: "var(--mono)", fontSize: ".82rem" }} />
        </label>
      </div>
      <div style={{ padding: "0 16px 12px" }}>
        <div className="svc-table__scroll"><table className="svc-table">
          <thead><tr><th aria-label="sel" /><th>Token</th><th>Spender</th><th>Allowance</th><th>Last used</th><th>Risk</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.i} style={sel.has(r.i) ? { background: "color-mix(in srgb, var(--accent-primary) 7%, transparent)" } : undefined}>
              <td><input type="checkbox" checked={sel.has(r.i)} onChange={() => toggle(r.i)} /></td>
              <td><b>{r.token}</b></td>
              <td>{r.spender}</td>
              <td>{r.unlimited ? <span className="pill warn">unlimited</span> : <span className="muted">bounded</span>}</td>
              <td className="muted svc-table__num">{r.lastUsedDays}d ago</td>
              <td><span className="pill" style={{ background: `color-mix(in srgb, ${riskColor(r.risk)} 14%, transparent)`, color: riskColor(r.risk) }}>{r.risk}</span></td>
            </tr>
          ))}</tbody>
        </table></div>
      </div>
      {queued && (
        <div style={{ margin: "0 16px 12px", padding: "8px 12px", borderRadius: 10, background: "color-mix(in srgb, var(--green) 12%, transparent)", color: "var(--green)", fontSize: ".78rem", fontWeight: 700 }}>
          <Check width={13} height={13} /> Revoke bundle <code style={{ background: "rgba(0,0,0,.14)", padding: "1px 5px", borderRadius: 5 }}>{queued.split("|")[0]}</code> queued · {sel.size} approvals · ~{queued.split("|")[1]} ETH gas
        </div>
      )}
      {history.length > 0 && (
        <div style={{ padding: "0 16px 14px" }}>
          <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0" }}>Recent revoke bundles · {history.length}</div>
          <div className="svc-hist">{history.map((r) => { const p = (r.payload ?? {}) as { address?: string; count?: number; bundleId?: string }; return (
            <div className="svc-hist__row" key={r.id}><span className="svc-hist__dot" style={{ background: "var(--accent-primary)" }} /><div className="svc-hist__main"><b>{p.bundleId}</b><span>{p.count} approvals · {(p.address ?? "").slice(0, 12)}… · {new Date(r.createdAt).toLocaleTimeString()}</span></div><span className="svc-hist__amt">{r.amount.toFixed(2)}</span></div>
          ); })}</div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// QIE — QIE Pass Issuer (QIE Pass tab, replaces the static access-rules list)
// ---------------------------------------------------------------------------
type QiePass = { passId: string; holder: string; tier: "gold" | "silver" | "bronze"; issuedAt: string; expiresAt: string; status: "active" | "revoked" };
const PASS_TIERS = ["gold", "silver", "bronze"] as const;
const TIER_RANK: Record<string, number> = { gold: 3, silver: 2, bronze: 1 };
const SEED_PASSES: QiePass[] = [
  { passId: "qpass_a1f3c2", holder: "0xholder9a2c1e0b", tier: "gold", issuedAt: new Date(Date.now() - 10 * 864e5).toISOString(), expiresAt: new Date(Date.now() + 80 * 864e5).toISOString(), status: "active" },
  { passId: "qpass_77bd09", holder: "0xholder4f1d77aa", tier: "silver", issuedAt: new Date(Date.now() - 3 * 864e5).toISOString(), expiresAt: new Date(Date.now() + 27 * 864e5).toISOString(), status: "active" },
];
function gatedEndpoints(services: Service[]) {
  // deterministically assign a required tier to each service
  return services.map((s) => ({ s, req: (["bronze", "silver", "gold"] as const)[Math.floor(deterministicScore(s.id + "|tier", 0, 2.999))]! }));
}
function QiePassIssuer({ workspace, services }: { workspace: Workspace; services: Service[] }) {
  const { emitReceipt, receipts } = useAppState();
  const [list, setList] = useLocalStore<QiePass[]>("qie.passes", SEED_PASSES);
  const [holder, setHolder] = useState("0xnewholder1a2b3c4d");
  const [tier, setTier] = useState<typeof PASS_TIERS[number]>("silver");
  const [days, setDays] = useState(90);
  const gated = useMemo(() => gatedEndpoints(services.slice(0, 6)), [services]);
  const [checkPass, setCheckPass] = useState(list[0]?.passId ?? "");
  const [checkSvc, setCheckSvc] = useState(gated[0]?.s.id ?? "");
  const [checkRes, setCheckRes] = useState<{ ok: boolean; reason: string } | null>(null);
  const accessChecks = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id && r.kind === "qie.pass.access").slice(0, 6), [receipts, workspace.id]);

  const issue = () => {
    const passId = "qpass_" + hashId("qpass", holder + tier + Date.now(), 6);
    const p: QiePass = { passId, holder: holder.trim() || "0x", tier, issuedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + days * 864e5).toISOString(), status: "active" };
    setList((prev) => [p, ...prev].slice(0, 20));
    emitReceipt({ workspaceId: workspace.id, serviceId: "svc_qie_pass", serviceName: "QIE Pass · Mint", amount: 0.02, currency: "USDC", network: workspace.networks[0] ?? "qie-testnet", kind: "qie.pass.issue", payload: { passId, holder: p.holder, tier, expiresAt: p.expiresAt } });
  };
  const revoke = (id: string) => setList((prev) => prev.map((x) => x.passId === id ? { ...x, status: "revoked" } : x));
  const checkAccess = () => {
    const p = list.find((x) => x.passId === checkPass);
    const g = gated.find((x) => x.s.id === checkSvc);
    let ok = true, reason = "Access granted";
    if (!p) { ok = false; reason = "pass not found"; }
    else if (p.status === "revoked") { ok = false; reason = "pass has been revoked"; }
    else if (new Date(p.expiresAt) < new Date()) { ok = false; reason = "pass expired"; }
    else if (g && TIER_RANK[p.tier]! < TIER_RANK[g.req]!) { ok = false; reason = `endpoint requires ${g.req} tier — pass is ${p.tier}`; }
    setCheckRes({ ok, reason });
    if (ok && p && g) emitReceipt({ workspaceId: workspace.id, serviceId: g.s.id, serviceName: `QIE Pass · Access ${g.s.name}`, amount: 0, currency: "USDC", network: workspace.networks[0] ?? "qie-testnet", kind: "qie.pass.access", payload: { passId: p.passId, endpoint: g.s.id, tier: p.tier } });
  };
  const tierColor = (tt: string) => tt === "gold" ? "#e0a200" : tt === "silver" ? "#9aa3ad" : "#b07a3a";

  const TIER_META = [
    { t: "gold" as const, col: "#e0a200", label: "Gold", price: "$9.99", validity: "365 days", perks: ["All endpoints unlocked", "Batch API (up to 500 calls/day)", "Priority queue + 0-fee transactions", "White-label checkout embed"] },
    { t: "silver" as const, col: "#9aa3ad", label: "Silver", price: "$3.99", validity: "90 days", perks: ["Standard API access", "Up to 100 calls/day", "QIE Pay checkout link", "Access reports & receipts"] },
    { t: "bronze" as const, col: "#b07a3a", label: "Bronze", price: "$0.99", validity: "30 days", perks: ["Basic read-only endpoints", "Up to 10 calls/day", "Public checkout link"] },
  ] as const;

  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><Shield width={15} height={15} /></span><div><h3>QIE Pass — membership tiers</h3><div className="sub">get an on-chain pass · unlocks paid API endpoints · gates by tier · every access logged as receipt</div></div></div>
      </div>

      {/* tier ladder */}
      <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {TIER_META.map((tm) => {
          const active = list.filter((p) => p.tier === tm.t && p.status === "active");
          const isSelected = tier === tm.t;
          return (
            <div key={tm.t} onClick={() => setTier(tm.t)} style={{ borderRadius: 14, border: `2px solid ${isSelected ? tm.col : "var(--line-2)"}`, background: isSelected ? `color-mix(in srgb, ${tm.col} 8%, var(--bg-2))` : "var(--bg-2)", padding: "14px 18px", cursor: "pointer", transition: "border-color .15s, background .15s", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "0 18px", alignItems: "center" }}>
              {/* left: tier badge */}
              <div style={{ width: 44, height: 44, borderRadius: 12, background: tm.col + "22", border: `2px solid ${tm.col}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: "1.1rem" }}>{tm.t === "gold" ? "🥇" : tm.t === "silver" ? "🥈" : "🥉"}</span>
              </div>
              {/* middle: name + perks */}
              <div>
                <div className="row sm" style={{ gap: 8, alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontWeight: 900, fontSize: "1rem", color: tm.col }}>{tm.label}</span>
                  <span style={{ fontSize: ".72rem", color: "var(--muted)", fontWeight: 600 }}>{tm.validity}</span>
                  {active.length > 0 && <span className="pill ok" style={{ fontSize: ".6rem" }}>{active.length} active</span>}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {tm.perks.map((p) => <span key={p} style={{ fontSize: ".68rem", color: "var(--muted)", background: "var(--bg-1)", padding: "2px 7px", borderRadius: 6 }}>✓ {p}</span>)}
                </div>
              </div>
              {/* right: price + CTA */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                <span style={{ fontWeight: 900, fontSize: "1.15rem", color: isSelected ? tm.col : "var(--ink)" }}>{tm.price}</span>
                {isSelected && <span style={{ fontSize: ".65rem", fontWeight: 800, color: tm.col, textTransform: "uppercase", letterSpacing: ".07em" }}>Selected ✓</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* issue form */}
      <div style={{ margin: "0 16px 12px", padding: "12px 14px", borderRadius: 12, border: "1px solid var(--line-2)", background: "var(--field)" }}>
        <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", marginBottom: 10 }}>Issue a {tier} pass to an address</div>
        <div className="row sm" style={{ gap: 8, flexWrap: "wrap" }}>
          <input value={holder} onChange={(e) => setHolder(e.currentTarget.value)} placeholder="0xholder…" style={{ flex: 1, minWidth: 200, padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".82rem", fontFamily: "var(--mono)" }} />
          <select value={days} onChange={(e) => setDays(Number(e.currentTarget.value))} style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }}>{[30, 90, 365].map((d) => <option key={d}>{d} days</option>)}</select>
          <button className="btn btn-acc btn-sm" type="button" onClick={issue}><Plus width={13} height={13} /> Mint pass ($0.02)</button>
        </div>
      </div>

      {/* active passes compact list */}
      {list.filter((p) => p.status === "active").length > 0 && (
        <div style={{ padding: "0 16px 10px" }}>
          <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "4px 0 6px" }}>Active passes · {list.filter((p) => p.status === "active").length}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {list.filter((p) => p.status === "active").map((p) => (
              <div key={p.passId} className="row sm" style={{ gap: 8, padding: "7px 10px", borderRadius: 10, background: "var(--bg-2)", border: "1px solid var(--line-2)" }}>
                <span className="pill" style={{ background: `color-mix(in srgb, ${tierColor(p.tier)} 18%, transparent)`, color: tierColor(p.tier), fontWeight: 800, fontSize: ".62rem", textTransform: "capitalize" }}>{p.tier}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: ".72rem", flex: 1 }}>{p.holder.slice(0, 16)}…</span>
                <span style={{ fontSize: ".68rem", color: "var(--muted)" }}>exp {new Date(p.expiresAt).toLocaleDateString()}</span>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => revoke(p.passId)} style={{ fontSize: ".68rem", padding: "2px 8px" }}>Revoke</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* access check */}
      <div style={{ margin: "0 16px 12px", padding: "10px 14px", borderRadius: 12, border: "1px solid var(--line-2)", background: "var(--field)" }}>
        <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", marginBottom: 8 }}>Check access to a gated endpoint</div>
        <div className="row sm" style={{ gap: 8, flexWrap: "wrap" }}>
          <select value={checkPass} onChange={(e) => setCheckPass(e.currentTarget.value)} style={{ padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".8rem" }}>{list.map((p) => <option key={p.passId} value={p.passId}>{p.passId} ({p.tier})</option>)}</select>
          <select value={checkSvc} onChange={(e) => setCheckSvc(e.currentTarget.value)} style={{ padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".8rem" }}>{gated.map((g) => <option key={g.s.id} value={g.s.id}>{g.s.name} — needs {g.req}</option>)}</select>
          <button className="btn btn-sm" type="button" onClick={checkAccess}>Check</button>
        </div>
        {checkRes && <div style={{ marginTop: 8, padding: "7px 12px", borderRadius: 10, background: `color-mix(in srgb, ${checkRes.ok ? "var(--green)" : "var(--red)"} 12%, transparent)`, color: checkRes.ok ? "var(--green)" : "var(--red)", fontSize: ".78rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 7 }}>{checkRes.ok ? <Check width={13} height={13} /> : <X width={13} height={13} />} {checkRes.ok ? "ACCESS GRANTED" : "ACCESS DENIED"} — {checkRes.reason}</div>}
      </div>
      {accessChecks.length > 0 && (
        <div style={{ padding: "0 16px 14px" }}>
          <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0" }}>Recent access checks · {accessChecks.length}</div>
          <div className="svc-hist">{accessChecks.map((r) => { const p = (r.payload ?? {}) as { passId?: string; endpoint?: string; tier?: string }; return (
            <div className="svc-hist__row" key={r.id}><span className="svc-hist__dot" style={{ background: "#1fb58a" }} /><div className="svc-hist__main"><b>{p.passId}</b><span>{p.endpoint} · {p.tier} · {new Date(r.createdAt).toLocaleTimeString()}</span></div><span className="pill ok">granted</span></div>
          ); })}</div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 0G — Sealed Payload Vault (Privacy tab, replaces the static access-rules list)
// ---------------------------------------------------------------------------
type SealedRecord = { sealId: string; recipient: string; digest: string; createdAt: string };
function SealedPayloadVault({ workspace }: { workspace: Workspace }) {
  const { emitReceipt, receipts } = useAppState();
  const [seals, setSeals] = useLocalStore<SealedRecord[]>("0g.seals", []);
  const [recipient, setRecipient] = useState("agid_0g_a1f3");
  const [payload, setPayload] = useState('{ "strategy": "rotate 40% mETH→USDY when spread<0.04%", "params": { "band": 0.6 } }');
  const [unsealId, setUnsealId] = useState("");
  const [unsealReceipt, setUnsealReceipt] = useState("");
  const [unsealRes, setUnsealRes] = useState<{ ok: boolean; text: string } | null>(null);
  const [sealing, setSealing] = useState(false);
  const recent = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id && r.kind === "0g.seal").slice(0, 6), [receipts, workspace.id]);

  const seal = async () => {
    if (!payload.trim() || sealing) return;
    setSealing(true);
    const nonce = Math.random().toString(36).slice(2);
    const hash = await sha256Hex(payload + recipient + nonce);
    const sealId = "seal_" + hashId("seal", hash, 8);
    const digest = hash.slice(0, 32);
    setSeals((prev) => [{ sealId, recipient: recipient.trim() || "(unset)", digest, createdAt: new Date().toISOString() }, ...prev].slice(0, 20));
    emitReceipt({ workspaceId: workspace.id, serviceName: "0G Sealed Payload", amount: 0.008, currency: "USDC", network: workspace.networks[0] ?? "0g-testnet", kind: "0g.seal", payload: { sealId, recipient: recipient.trim(), digest } });
    setUnsealId(sealId);
    setSealing(false);
  };
  const unseal = () => {
    const s = seals.find((x) => x.sealId === unsealId.trim());
    if (!s) { setUnsealRes({ ok: false, text: "no such seal id" }); return; }
    const r = receipts.find((x) => x.id === unsealReceipt.trim());
    if (!r) { setUnsealRes({ ok: false, text: "receipt not found — paste the receipt id from the seal payment" }); return; }
    const okMatch = ((r.payload ?? {}) as { sealId?: string }).sealId === s.sealId;
    setUnsealRes(okMatch ? { ok: true, text: `unsealed for ${s.recipient} — digest ${s.digest}…` } : { ok: false, text: "proof does not match this seal — that receipt is for a different sealed payload" });
  };

  return (
    <div className="panel block svc-flavor">
      <div className="block-head"><div className="ttl"><span className="sq soft"><ShieldCheck width={15} height={15} /></span><div><h3>Sealed payload vault</h3><div className="sub">encrypt a request payload for a recipient Agent ID · the vault stores only the ciphertext digest · unseal only with a matching receipt</div></div></div></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 10, padding: "0 16px 10px", alignItems: "end" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Recipient Agent ID</span>
          <input value={recipient} onChange={(e) => setRecipient(e.currentTarget.value)} style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".82rem", fontFamily: "var(--mono)" }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Payload (encrypted before submit)</span>
          <input value={payload} onChange={(e) => setPayload(e.currentTarget.value)} style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".78rem", fontFamily: "var(--mono)" }} />
        </label>
        <button className="btn btn-acc btn-sm" type="button" onClick={seal} disabled={sealing || !payload.trim()}>{sealing ? <><Loader2 size={12} className="wallet-spin" /> Sealing…</> : <><ShieldCheck width={12} height={12} /> Seal payload ($0.008)</>}</button>
      </div>
      <div style={{ padding: "0 16px 12px" }}>
        <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0" }}>Sealed payloads · {seals.length}</div>
        <div className="svc-table__scroll"><table className="svc-table">
          <thead><tr><th>Seal ID</th><th>Recipient</th><th>Digest</th><th>When</th></tr></thead>
          <tbody>
            {seals.length === 0 && <tr><td colSpan={4} style={{ color: "var(--muted)", padding: 12 }}>No sealed payloads — seal one above.</td></tr>}
            {seals.map((s) => (<tr key={s.sealId}><td><code>{s.sealId}</code></td><td style={{ fontFamily: "var(--mono)", fontSize: ".74rem" }}>{s.recipient}</td><td style={{ fontFamily: "var(--mono)", fontSize: ".7rem", color: "var(--muted)" }}>{s.digest}…</td><td className="muted svc-table__num">{new Date(s.createdAt).toLocaleTimeString()}</td></tr>))}
          </tbody>
        </table></div>
      </div>
      <div style={{ margin: "0 16px 12px", padding: "10px 14px", borderRadius: 12, border: "1px solid var(--line-2)", background: "var(--field)" }}>
        <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", marginBottom: 8 }}>Unseal — requires a matching receipt id</div>
        <div className="row sm" style={{ gap: 8, flexWrap: "wrap" }}>
          <input value={unsealId} onChange={(e) => setUnsealId(e.currentTarget.value)} placeholder="seal id" style={{ flex: 1, minWidth: 160, padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".78rem", fontFamily: "var(--mono)" }} />
          <input value={unsealReceipt} onChange={(e) => setUnsealReceipt(e.currentTarget.value)} placeholder="receipt id (rcpt_…)" style={{ flex: 1, minWidth: 160, padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".78rem", fontFamily: "var(--mono)" }} />
          <button className="btn btn-sm" type="button" onClick={unseal}>Unseal</button>
        </div>
        {unsealRes && <div style={{ marginTop: 8, padding: "7px 12px", borderRadius: 10, background: `color-mix(in srgb, ${unsealRes.ok ? "var(--green)" : "var(--red)"} 12%, transparent)`, color: unsealRes.ok ? "var(--green)" : "var(--red)", fontSize: ".78rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 7 }}>{unsealRes.ok ? <Check width={13} height={13} /> : <X width={13} height={13} />} {unsealRes.text}</div>}
      </div>
      {recent.length > 0 && (
        <div style={{ padding: "0 16px 14px" }}>
          <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0" }}>Recent seals · {recent.length}</div>
          <div className="svc-hist">{recent.map((r) => { const p = (r.payload ?? {}) as { sealId?: string; recipient?: string }; return (
            <div className="svc-hist__row" key={r.id}><span className="svc-hist__dot" style={{ background: "var(--accent-primary)" }} /><div className="svc-hist__main"><b>{p.sealId}</b><span>→ {p.recipient} · receipt {r.id} · {new Date(r.createdAt).toLocaleTimeString()}</span></div><span className="svc-hist__amt">{r.amount.toFixed(3)}</span></div>
          ); })}</div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DEEPSURGE — Resource map query (Resource Data tab)
// ---------------------------------------------------------------------------
const DS_SYSTEMS = ["Jita", "Amarr", "Rens", "Dodixie", "Hek", "Tash-Murkon", "Perimeter", "New Caldari"] as const;
const DS_NODES = ["Veldspar belt 7", "Pyroxeres pocket", "Arkonor cluster", "Gas site C-3", "Ice field NW", "Mercoxit vein"] as const;
function ResourceMapQuery({ workspace }: { workspace: Workspace }) {
  const { emitReceipt, receipts } = useAppState();
  const [sys, setSys] = useState<string>(DS_SYSTEMS[0]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const history = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id && r.kind === "ds.resource.map").slice(0, 8), [receipts, workspace.id]);
  const query = async () => {
    setRunning(true);
    await new Promise((r) => setTimeout(r, 480));
    const seed = sys;
    const hostiles = Math.round(deterministicScore(seed + "|h", 0, 9));
    const yieldHr = Math.round(deterministicScore(seed + "|y", 14_000, 96_000));
    const topNode = DS_NODES[Math.floor(deterministicScore(seed + "|n", 0, DS_NODES.length - 0.001))]!;
    const contested = hostiles >= 4;
    const queryId = "rm_" + hashId("rm", seed + Date.now(), 8);
    const body = { system: sys, top_node: topNode, est_yield_per_hour: yieldHr, contested, hostiles_24h: hostiles, gate_camp_risk: hostiles >= 6 ? "high" : hostiles >= 3 ? "medium" : "low", recommended_approach: contested ? "wait for downtime or bring escort" : "safe to mine — solo OK", queryId };
    emitReceipt({ workspaceId: workspace.id, serviceId: "svc_ds_oracle", serviceName: "Frontier Resource Map API · " + sys, amount: 0.04, currency: "USDC", network: workspace.networks[0] ?? "base-sepolia", kind: "ds.resource.map", payload: { system: sys, queryId, hostiles, contested } });
    setResult(body);
    setRunning(false);
  };
  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><FileText width={15} height={15} /></span><div><h3>Resource map query</h3><div className="sub">live resource intel for a Frontier system — top node · yield/hr · contested · hostiles · $0.04 USDC / query</div></div></div>
        <div className="row sm" style={{ gap: 8 }}>
          <select value={sys} onChange={(e) => setSys(e.currentTarget.value)} style={{ padding: "6px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".8rem" }}>{DS_SYSTEMS.map((s) => <option key={s}>{s}</option>)}</select>
          <button className="btn btn-acc btn-sm" type="button" onClick={query} disabled={running}>{running ? <><Loader2 size={13} className="wallet-spin" /> Querying…</> : <><Bolt width={13} height={13} /> Pay &amp; query map</>}</button>
        </div>
      </div>
      {result && <div style={{ padding: "0 16px 12px" }}><pre className="code-block">{JSON.stringify(result, null, 2)}</pre></div>}
      <div style={{ padding: "0 16px 14px" }}>
        <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0" }}>Recent map queries · {history.length}</div>
        <div className="svc-table__scroll"><table className="svc-table">
          <thead><tr><th>Query</th><th>System</th><th>Hostiles 24h</th><th>Contested</th><th>Cost</th></tr></thead>
          <tbody>
            {history.length === 0 && <tr><td colSpan={5} style={{ color: "var(--muted)", padding: 12 }}>No queries yet — buy one above.</td></tr>}
            {history.map((r) => { const p = (r.payload ?? {}) as { system?: string; queryId?: string; hostiles?: number; contested?: boolean }; return (
              <tr key={r.id}><td><code>{p.queryId ?? "rm_" + hashId("rm", r.id, 8)}</code></td><td>{p.system ?? "—"}</td><td className="svc-table__num">{p.hostiles ?? "—"}</td><td>{p.contested ? <span className="pill warn">contested</span> : <span className="muted">clear</span>}</td><td className="svc-table__num">${r.amount.toFixed(2)} <span className="muted">{r.currency}</span></td></tr>
            ); })}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DEEPSURGE — Alert subscriptions (Alerts tab, replaces the static list)
// ---------------------------------------------------------------------------
const DS_ALERT_TYPES = [
  { id: "gate_camp", name: "Gate camp on a route", freq: "realtime", fee: 0.002 },
  { id: "resource_surge", name: "Resource surge nearby", freq: "5 min", fee: 0.0015 },
  { id: "market_crash", name: "Market crash / price spike", freq: "realtime", fee: 0.0025 },
  { id: "hostile_fleet", name: "Hostile fleet forming", freq: "realtime", fee: 0.003 },
] as const;
function AlertSubscriptions({ workspace }: { workspace: Workspace }) {
  const { emitReceipt, receipts } = useAppState();
  const [subs, setSubs] = useLocalStore<Record<string, boolean>>("ds.alerts", { gate_camp: true });
  const today = new Date().toDateString();
  const deliveredToday = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id && r.kind === "ds.alert.deliver" && new Date(r.createdAt).toDateString() === today).length, [receipts, workspace.id, today]);
  const recent = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id && (r.kind === "ds.alert.deliver" || r.kind === "ds.alert.sub")).slice(0, 8), [receipts, workspace.id]);
  const toggle = (t: typeof DS_ALERT_TYPES[number]) => {
    const next = !subs[t.id]; setSubs((s) => ({ ...s, [t.id]: next }));
    if (next) emitReceipt({ workspaceId: workspace.id, serviceName: "Alert Feed · Subscribe · " + t.name, amount: 0, currency: "USDC", network: workspace.networks[0] ?? "base-sepolia", kind: "ds.alert.sub", payload: { type: t.id, name: t.name } });
  };
  const deliver = (t: typeof DS_ALERT_TYPES[number]) => emitReceipt({ workspaceId: workspace.id, serviceId: "svc_ds_route", serviceName: "Alert · " + t.name, amount: t.fee, currency: "USDC", network: workspace.networks[0] ?? "base-sepolia", kind: "ds.alert.deliver", payload: { type: t.id, name: t.name, detail: t.id === "gate_camp" ? "5-man camp at Niarja gate" : t.id === "market_crash" ? `${(deterministicScore(t.id + Date.now(), 4, 22)).toFixed(1)}% drop on Tritanium` : "see route board" } });
  const activeCount = DS_ALERT_TYPES.filter((t) => subs[t.id]).length;
  return (
    <div className="panel block svc-flavor">
      <div className="block-head"><div className="ttl"><span className="sq soft"><Radio width={15} height={15} /></span><div><h3>Alert subscriptions</h3><div className="sub">subscribe to live Frontier alerts — each delivery is metered & billed; {activeCount} active · {deliveredToday} delivered today</div></div></div></div>
      <div className="svc-hist" style={{ padding: "4px 16px 12px" }}>
        {DS_ALERT_TYPES.map((t) => (
          <div key={t.id} className="svc-hist__row">
            <span className="svc-hist__dot" style={{ background: subs[t.id] ? "#1fb58a" : "var(--muted)" }} />
            <div className="svc-hist__main"><b>{t.name}</b><span>{t.freq} · ${t.fee.toFixed(4)} / delivery</span></div>
            <span className="row sm" style={{ gap: 6 }}>
              {subs[t.id] && <button className="btn btn-ghost btn-sm" type="button" onClick={() => deliver(t)} title="simulate a delivery"><Bolt width={11} height={11} /> Deliver</button>}
              <button className={"btn btn-sm" + (subs[t.id] ? " btn-ghost" : " btn-acc")} type="button" onClick={() => toggle(t)}>{subs[t.id] ? "Unsubscribe" : "Subscribe"}</button>
            </span>
          </div>
        ))}
      </div>
      {recent.length > 0 && (
        <div style={{ padding: "0 16px 14px" }}>
          <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0" }}>Recent · {recent.length}</div>
          <div className="svc-hist">{recent.map((r) => { const p = (r.payload ?? {}) as { name?: string; detail?: string }; const sub = r.kind === "ds.alert.sub"; return (
            <div className="svc-hist__row" key={r.id}><span className="svc-hist__dot" style={{ background: sub ? "var(--accent-primary)" : "#ff9b00" }} /><div className="svc-hist__main"><b>{sub ? "Subscribed: " : "Alert: "}{p.name}</b><span>{p.detail ?? ""}{p.detail ? " · " : ""}{new Date(r.createdAt).toLocaleTimeString()}</span></div>{sub ? <span className="pill ok">on</span> : <span className="svc-hist__amt">{r.amount.toFixed(4)}</span>}</div>
          ); })}</div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EAZO — Companion chat (AI Companion tab, conversational surface)
// ---------------------------------------------------------------------------
type ChatMsg = { role: "user" | "companion"; text: string; ts: string };
const COMPANION_RESPONSES: Record<string, { plan: string[]; fee: number }> = {
  default: { plan: ["Analyse your spending pattern", "Identify inactive subscriptions", "Propose 3 actions to reduce cost"], fee: 0.05 },
  spend: { plan: ["Pull receipts from last 30d", "Cluster by category (SaaS / DeFi / Household)", "Flag any anomalies above your approval threshold"], fee: 0.05 },
  sub: { plan: ["List all active subscriptions", "Score each by last-used date", "Draft cancellation for the lowest-value ones"], fee: 0.04 },
  budget: { plan: ["Read your weekly cap setting", "Project spend for the rest of the month", "Alert if any single category exceeds 40% of cap"], fee: 0.03 },
  tool: { plan: ["Search available AI tools in the catalog", "Filter by your approval rules", "Purchase the best match and return the access key"], fee: 0.08 },
  save: { plan: ["Compare current vs cheapest equivalent plans", "Negotiate auto-renew discounts where available", "Show projected savings over 3 months"], fee: 0.05 },
};
function matchResponse(goal: string) {
  const g = goal.toLowerCase();
  if (g.includes("spend") || g.includes("cost") || g.includes("how much")) return COMPANION_RESPONSES.spend!;
  if (g.includes("sub") || g.includes("cancel") || g.includes("subscription")) return COMPANION_RESPONSES.sub!;
  if (g.includes("budget") || g.includes("cap") || g.includes("limit")) return COMPANION_RESPONSES.budget!;
  if (g.includes("tool") || g.includes("buy") || g.includes("purchase")) return COMPANION_RESPONSES.tool!;
  if (g.includes("save") || g.includes("cut") || g.includes("reduce") || g.includes("cheaper")) return COMPANION_RESPONSES.save!;
  return COMPANION_RESPONSES.default!;
}
function EazoChatPanel({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [msgs, setMsgs] = useLocalStore<ChatMsg[]>("eazo.chat.msgs", []);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<{ plan: string[]; fee: number; goal: string } | null>(null);
  const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const send = async () => {
    const goal = input.trim(); if (!goal) return;
    setInput(""); setBusy(true);
    const userMsg: ChatMsg = { role: "user", text: goal, ts: now() };
    setMsgs((m) => [...m, userMsg]);
    await new Promise((r) => setTimeout(r, 700));
    const resp = matchResponse(goal);
    const companionMsg: ChatMsg = { role: "companion", text: `Here's my plan:\n• ${resp.plan.join("\n• ")}`, ts: now() };
    setMsgs((m) => [...m, companionMsg]);
    setPendingPlan({ ...resp, goal });
    setBusy(false);
  };
  const execute = () => {
    if (!pendingPlan) return;
    emitReceipt({ workspaceId: workspace.id, serviceId: "svc_eazo_brief", serviceName: "Companion · Execute plan", amount: pendingPlan.fee, currency: "USDC", network: workspace.networks[0] ?? "base-sepolia", kind: "eazo.companion.approve", payload: { goal: pendingPlan.goal, steps: pendingPlan.plan } });
    const doneMsg: ChatMsg = { role: "companion", text: `Done ✓ — executed ${pendingPlan.plan.length} steps. Receipt saved.`, ts: now() };
    setMsgs((m) => [...m, doneMsg]);
    setPendingPlan(null);
  };
  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><Robot width={15} height={15} /></span><div><h3>Companion chat</h3><div className="sub">type a goal → companion proposes a plan → approve to execute (receipt issued)</div></div></div>
        {msgs.length > 0 && <button className="btn btn-ghost btn-sm" type="button" onClick={() => { setMsgs([]); setPendingPlan(null); }}>Clear</button>}
      </div>
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8, maxHeight: 280, overflowY: "auto" }}>
        {msgs.length === 0 && <div className="muted sm" style={{ padding: "8px 0" }}>Say something like "cut my subscription spend 30%" or "find me the best AI coding tool".</div>}
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "80%", padding: "8px 12px", borderRadius: m.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px", background: m.role === "user" ? "var(--accent-primary)" : "var(--bg-2)", color: m.role === "user" ? "#fff" : "var(--ink)", fontSize: ".82rem", whiteSpace: "pre-wrap", border: "1px solid var(--line-2)" }}>{m.text}</div>
            <span style={{ fontSize: ".6rem", color: "var(--muted)" }}>{m.ts}</span>
          </div>
        ))}
        {busy && <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted)", fontSize: ".8rem" }}><Loader2 size={12} className="wallet-spin" /> Companion is thinking…</div>}
      </div>
      {pendingPlan && (
        <div style={{ margin: "8px 16px", padding: "10px 14px", borderRadius: 12, border: "1px solid var(--line-2)", background: "var(--bg-2)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ flex: 1, fontSize: ".8rem", color: "var(--muted)" }}>Ready to execute · <b>${pendingPlan.fee.toFixed(2)} USDC</b></span>
          <button className="btn btn-acc btn-sm" type="button" onClick={execute}><Check width={12} height={12} /> Approve &amp; execute</button>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setPendingPlan(null)}><X width={12} height={12} /> Dismiss</button>
        </div>
      )}
      <div style={{ padding: "8px 16px 14px", display: "flex", gap: 8 }}>
        <input value={input} onChange={(e) => setInput(e.currentTarget.value)} onKeyDown={(e) => { if (e.key === "Enter" && !busy) send(); }} placeholder='e.g. "cut my subscription spend 30%"' style={{ flex: 1, padding: "8px 12px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }} />
        <button className="btn btn-acc btn-sm" type="button" onClick={send} disabled={busy || !input.trim()}>{busy ? <Loader2 size={13} className="wallet-spin" /> : <Bolt width={13} height={13} />} Send</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 0G — Compute Kanban (Queued → Running → Verified job board)
// ---------------------------------------------------------------------------
type KanbanJob = { id: string; model: string; promptSnippet: string; cost: number; latencyMs: number; attestationId?: string; status: "queued" | "running" | "verified"; ts: string };

function OgComputeKanban({ workspace }: { workspace: Workspace }) {
  const { emitReceipt, receipts } = useAppState();
  const [ephemeral, setEphemeral] = useLocalStore<KanbanJob[]>("0g.kanban.jobs", []);
  const [submitModel, setSubmitModel] = useState<string>("risk-scorer-v2");
  const [submitPrompt, setSubmitPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const KANBAN_MODELS = ["risk-scorer-v2", "llama-3-8b", "mistral-7b", "anomaly-detect", "wallet-labeler"] as const;

  // Merge ephemeral + receipt history into kanban jobs
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

      {/* Kanban columns */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, padding: "0 16px 12px", minHeight: 180 }}>
        {COLS.map((col) => (
          <div key={col.key} style={{ borderRadius: 12, background: "var(--field)", border: `1px solid color-mix(in srgb, ${col.color} 20%, var(--line-2))`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Column header */}
            <div style={{ padding: "8px 12px", background: `color-mix(in srgb, ${col.color} 10%, transparent)`, borderBottom: `1px solid color-mix(in srgb, ${col.color} 20%, var(--line-2))`, display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: col.color, flexShrink: 0 }} />
              <span style={{ fontWeight: 800, fontSize: ".72rem", textTransform: "uppercase", letterSpacing: ".08em", color: col.color }}>{col.label}</span>
              <span style={{ marginLeft: "auto", fontWeight: 800, fontSize: ".7rem", color: "var(--muted)", background: "var(--bg-2)", borderRadius: 6, padding: "1px 6px" }}>{col.jobs.length}</span>
            </div>
            {/* Cards */}
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

      {/* Submit new job bar */}
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

// ---------------------------------------------------------------------------
// 0G — Privacy 3-step stepper (Encrypt → TEE Run → Attestation)
// ---------------------------------------------------------------------------
type StepperStage = 0 | 1 | 2 | 3; // 0=idle,1=encrypting,2=running TEE,3=attested
function OgPrivacyStepper({ workspace }: { workspace: Workspace }) {
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

      {/* Input */}
      {stage === 0 && (
        <div style={{ padding: "0 16px 12px" }}>
          <div style={{ fontSize: ".7rem", color: "var(--muted)", marginBottom: 6 }}>Payload to encrypt and execute privately:</div>
          <textarea value={inputText} onChange={(e) => setInputText(e.currentTarget.value)} rows={3} style={{ width: "100%", padding: "8px 10px", borderRadius: 10, border: "1px solid var(--line-2)", background: "var(--field)", color: "var(--ink)", fontSize: ".78rem", fontFamily: "monospace", resize: "vertical", boxSizing: "border-box" }} />
        </div>
      )}

      {/* Steps visual */}
      <div style={{ display: "flex", padding: "4px 16px 16px", gap: 0 }}>
        {STEPS.map((step, i) => (
          <div key={step.n} style={{ display: "flex", alignItems: "flex-start", flex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
              {/* circle + connector */}
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
              {/* label + desc */}
              <div style={{ marginTop: 8, textAlign: "center", padding: "0 4px" }}>
                <div style={{ fontWeight: 800, fontSize: ".75rem", color: stepInk(step.n), marginBottom: 3 }}>{step.label}</div>
                <div style={{ fontSize: ".65rem", color: "var(--muted)", lineHeight: 1.35 }}>{step.desc}</div>
              </div>
              {/* step-specific result */}
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

      {/* CTA */}
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

// ---------------------------------------------------------------------------
// 0G — "agents pay agents" loop (Hubble pattern: x402 + on-chain decision log)
// A Strategist agent hires an Executor agent over HTTP 402; the Executor pulls a
// trade signal from real 0G Compute, then anchors its decision via AgentVault
// .recordDecision (real Mantle tx when the vault is configured, else simulated).
// ---------------------------------------------------------------------------
type A2AReceiptRow = { id: string; label: string; amount: number; currency: string };
const A2A_STEPS: { title: string; body: React.ReactNode }[] = [
  { title: "Strategist agent hires the Executor", body: <>The Strategist needs a trade made but can&apos;t run a model itself. It pays the Executor <b>$0.02 USDC</b> over HTTP&nbsp;402 — agent paying agent, no account, no key.</> },
  { title: "Executor pulls a signal from 0G Compute", body: <>The hired Executor calls <b>0G Compute</b> for a BUY / SELL / HOLD verdict on mETH&nbsp;/&nbsp;USDY, paying <b>$0.03 USDC</b> per call.</> },
  { title: "Executor anchors its decision on-chain", body: <>The Executor writes <code>recordDecision(hash(verdict), hash(context))</code> to <code>AgentVault</code> — a permanent benchmarking trail of what it decided and why.</> },
];

function OgAgentToAgentLoop({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const vaultReady = isMantleVaultConfigured();
  const STRATEGIST = "agid_0g_strategist";
  const EXECUTOR = "agid_0g_executor";
  const [cursor, setCursor] = useState(-1);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [signal, setSignal] = useState<{ verdict: "BUY" | "SELL" | "HOLD"; confidence: number; live: boolean; provider?: string } | null>(null);
  const [decision, setDecision] = useState<{ txHash: string; onChain: boolean } | null>(null);
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

    // Step 1 — Strategist hires Executor (x402 micropayment)
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

    // Step 2 — Executor fetches a signal from 0G Compute (real call, demo fallback)
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

    // Step 3 — Executor anchors its decision via AgentVault.recordDecision
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
    setPhase("done");
  }
  function reset() { setCursor(-1); setPhase("idle"); setSignal(null); setDecision(null); setRows([]); setErr(null); }

  const vColor = (v: "BUY" | "SELL" | "HOLD") => (v === "BUY" ? "#1fb58a" : v === "SELL" ? "#e63946" : "var(--muted)");

  return (
    <div className="panel block ogdf mb">
      <div className="block-head">
        <div className="ttl">
          <span className="sq soft"><Robot width={15} height={15} /></span>
          <div>
            <h3>Agents pay agents · Strategist hires Executor</h3>
            <div className="sub">x402 micropayment → 0G Compute signal → decision anchored on-chain (AgentVault). Each hop a receipt.</div>
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
              </div>
            </div>
          );
        })}
      </div>

      {rows.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "4px 0 6px" }}>Receipts from this loop · {rows.length}</div>
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// 0G — Trading Arena (sealed inference for trading decisions, T2 track)
// ---------------------------------------------------------------------------
const OG_TRADE_PAIRS = ["mETH / USDY", "0G / ETH", "ETH / USDC", "BTC / ETH", "ARB / USDC"] as const;
const OG_STRATEGIES = ["RSI Momentum", "MACD Cross", "Mean Reversion", "Breakout", "Trend Follow"] as const;
type TradingSignal = { id: string; pair: string; strategy: string; signal: "BUY" | "SELL" | "HOLD"; confidence: number; attestationId: string; sealed: boolean; ts: string };
function OgTradingArenaWidget({ workspace }: { workspace: Workspace }) {
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

// ---------------------------------------------------------------------------
// QIE — Creator Tips & Social (Social & Community tab)
// ---------------------------------------------------------------------------
const QIE_CREATORS = [
  { id: "cr_01", name: "0xZara.qie", niche: "AI research", followers: 4120, tier: "Gold" },
  { id: "cr_02", name: "0xNova.qie", niche: "DeFi strategies", followers: 2340, tier: "Silver" },
  { id: "cr_03", name: "0xMiro.qie", niche: "Game dev", followers: 870, tier: "Bronze" },
  { id: "cr_04", name: "0xAria.qie", niche: "NFT art", followers: 5600, tier: "Gold" },
] as const;
type CreatorTip = { id: string; creator: string; amount: number; message: string; ts: string };
function QieCreatorTipsWidget({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [tips, setTips] = useLocalStore<CreatorTip[]>("qie.creator.tips", []);
  const [selectedCreator, setSelectedCreator] = useState<string>(QIE_CREATORS[0]!.id);
  const [amtStr, setAmtStr] = useState("5");
  const [message, setMessage] = useState("Great content!");
  const [busy, setBusy] = useState(false);
  const tierColor = { Gold: "#F59E0B", Silver: "#94A3B8", Bronze: "#CD7C2F" } as const;
  const tip = async () => {
    const creator = QIE_CREATORS.find((c) => c.id === selectedCreator) ?? QIE_CREATORS[0]!;
    const amt = parseFloat(amtStr) || 1;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 500));
    const t: CreatorTip = { id: "tip_" + hashId("qie", creator.id + Date.now(), 8), creator: creator.name, amount: amt, message: message.trim() || "Great content!", ts: new Date().toLocaleTimeString() };
    setTips((prev) => [t, ...prev].slice(0, 30));
    emitReceipt({ workspaceId: workspace.id, serviceId: "svc_qie_checkout", serviceName: `Creator Tip · ${creator.name}`, amount: amt, currency: "QIE", network: workspace.networks[0] ?? "qie-testnet", kind: "qie.creator.tip", payload: { creatorId: creator.id, name: creator.name, amount: amt, message: t.message } });
    setBusy(false);
  };
  const totalTipped = tips.reduce((s, tt) => s + tt.amount, 0);
  const AVATARS = ["#7C5CF8", "#1fb58a", "#3aa0e6", "#e63946"];
  const sel = QIE_CREATORS.find((c) => c.id === selectedCreator) ?? QIE_CREATORS[0]!;
  const selColor = tierColor[sel.tier as keyof typeof tierColor] ?? "var(--muted)";
  return (
    <div className="panel block svc-flavor" style={{ overflow: "hidden" }}>
      <div className="block-head" style={{ borderBottom: "1px solid var(--line-2)", paddingBottom: 12 }}>
        <div className="ttl"><span className="sq soft"><MessageCircle width={15} height={15} /></span><div><h3>Creator social feed</h3><div className="sub">Support QIE creators · QIE Pass gating · Social &amp; Community track</div></div></div>
        {totalTipped > 0 && <span style={{ fontSize: ".72rem", fontWeight: 800, color: "var(--accent-primary)", background: "color-mix(in srgb, var(--accent-primary) 10%, transparent)", borderRadius: 8, padding: "3px 8px" }}>{totalTipped.toFixed(0)} QIE tipped</span>}
      </div>
      {/* Creator profile card grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(178px, 1fr))", gap: 10, padding: "16px 16px 12px" }}>
        {QIE_CREATORS.map((c, i) => {
          const tc = tierColor[c.tier as keyof typeof tierColor] ?? "var(--muted)";
          const avatar = AVATARS[i % AVATARS.length]!;
          const creatorTips = tips.filter((tt) => tt.creator === c.name);
          const tipped = creatorTips.reduce((s, tt) => s + tt.amount, 0);
          const isSel = selectedCreator === c.id;
          return (
            <div key={c.id} onClick={() => setSelectedCreator(c.id)} style={{ borderRadius: 14, border: `2px solid ${isSel ? tc : "var(--line-2)"}`, background: isSel ? `color-mix(in srgb, ${tc} 6%, var(--bg-2))` : "var(--bg-2)", padding: "14px 14px 12px", cursor: "pointer", transition: "all .2s", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: avatar, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "1rem", color: "#fff", flexShrink: 0 }}>{c.name.slice(2, 4).toUpperCase()}</div>
                <span style={{ fontSize: ".6rem", fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: tc, background: `${tc}22`, borderRadius: 6, padding: "2px 7px" }}>{c.tier}</span>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: ".85rem" }}>{c.name}</div>
                <div style={{ fontSize: ".68rem", color: "var(--muted)" }}>{c.niche}</div>
              </div>
              <div style={{ display: "flex", gap: 10, fontSize: ".68rem" }}>
                <span style={{ color: "var(--muted)" }}>👥 <b style={{ color: "var(--ink)" }}>{(c.followers / 1000).toFixed(1)}K</b></span>
                {tipped > 0 && <span style={{ color: "var(--muted)" }}>💸 <b style={{ color: tc }}>{tipped} QIE</b></span>}
              </div>
              {isSel && <div style={{ fontSize: ".65rem", fontWeight: 700, color: tc, borderTop: `1px solid ${tc}33`, paddingTop: 6 }}><Check width={11} height={11} /> Selected</div>}
            </div>
          );
        })}
      </div>
      {/* Tip form */}
      <div style={{ margin: "0 16px 14px", padding: "12px 14px", borderRadius: 12, border: `1px solid color-mix(in srgb, ${selColor} 30%, var(--line-2))`, background: `color-mix(in srgb, ${selColor} 5%, transparent)` }}>
        <div style={{ fontSize: ".7rem", fontWeight: 800, color: selColor, marginBottom: 8 }}>Tip {sel.name} ({sel.tier})</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)" }}>
            <span style={{ fontSize: ".7rem", color: "var(--muted)" }}>QIE</span>
            <input value={amtStr} onChange={(e) => setAmtStr(e.currentTarget.value)} inputMode="decimal" style={{ width: 55, background: "none", border: "none", outline: "none", color: "var(--ink)", fontSize: ".9rem", fontWeight: 800 }} />
          </div>
          <input value={message} onChange={(e) => setMessage(e.currentTarget.value)} placeholder="Message…" style={{ flex: 1, minWidth: 120, padding: "7px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".8rem" }} />
          <button className="btn btn-acc btn-sm" type="button" onClick={tip} disabled={busy}>{busy ? <Loader2 size={13} className="wallet-spin" /> : <Zap width={13} height={13} />} Send tip</button>
        </div>
      </div>
      {/* Social feed */}
      {tips.length > 0 && (
        <div style={{ borderTop: "1px solid var(--line-2)", padding: "10px 16px 14px" }}>
          <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", marginBottom: 8 }}>Recent tips · {tips.length}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {tips.slice(0, 5).map((tt) => (
              <div key={tt.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 10px", borderRadius: 10, background: "var(--field)", border: "1px solid var(--line-2)" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--accent-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".75rem", flexShrink: 0 }}>💸</div>
                <div style={{ flex: 1 }}><div style={{ fontSize: ".78rem", fontWeight: 700 }}>→ {tt.creator}</div><div style={{ fontSize: ".68rem", color: "var(--muted)" }}>{tt.message}</div></div>
                <div style={{ textAlign: "right", flexShrink: 0 }}><div style={{ fontWeight: 800, color: "var(--accent-primary)", fontSize: ".82rem" }}>{tt.amount} QIE</div><div style={{ fontSize: ".62rem", color: "var(--muted)" }}>{tt.ts}</div></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MANTLE — AI DevTools (publish backtest as paid API, AI DevTools track)
// ---------------------------------------------------------------------------
const MANTLE_API_ENDPOINTS = [
  { id: "svc_mantle_backtest_api", name: "Backtest Runner API", method: "POST", path: "/api/gateway/svc_mantle_alpha", price: "0.10 MNT", desc: "Run a strategy backtest via x402 — submit {pair, strategy, days} → returns {returns, sharpe, maxDrawdown}" },
  { id: "svc_mantle_yield_api", name: "Yield Projection API", method: "GET", path: "/api/gateway/svc_mantle_yield", price: "0.02 MNT", desc: "Project yield for mETH/USDY/RWA — query {asset, amount, days} → projected returns" },
  { id: "svc_mantle_alpha_api", name: "Alpha Signal API", method: "GET", path: "/api/gateway/svc_mantle_alpha", price: "0.05 MNT", desc: "Real-time alpha signal for a Mantle asset → {signal, confidence, source}" },
] as const;
type RegisteredApi = { id: string; endpointId: string; name: string; path: string; registeredAt: string; calls: number };
function MantleDevToolsPanel({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [registered, setRegistered] = useLocalStore<RegisteredApi[]>("mantle.devtools.apis", []);
  const [selected, setSelected] = useState<string>(MANTLE_API_ENDPOINTS[0]!.id);
  const [busy, setBusy] = useState(false);
  const endpoint = MANTLE_API_ENDPOINTS.find((e) => e.id === selected) ?? MANTLE_API_ENDPOINTS[0]!;
  const isRegistered = registered.some((r) => r.endpointId === selected);
  const curlSnippet = `curl -X ${endpoint.method} \\
  -H "X-PAYMENT: dev-bypass" \\
  -H "X-Agent-Id: agent_mantle_devtools" \\
  http://localhost:8787${endpoint.path}`;
  const register = async () => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 500));
    const api: RegisteredApi = { id: "api_" + hashId("mnt", selected + Date.now(), 8), endpointId: selected, name: endpoint.name, path: endpoint.path, registeredAt: new Date().toISOString(), calls: 0 };
    setRegistered((prev) => [api, ...prev]);
    emitReceipt({ workspaceId: workspace.id, serviceId: "svc_mantle_alpha", serviceName: `DevTools · Register ${endpoint.name}`, amount: 0.05, currency: "MNT", network: workspace.networks[0] ?? "mantle-sepolia", kind: "mantle.devtools.register", payload: { endpointId: selected, name: endpoint.name, path: endpoint.path, price: endpoint.price } });
    setBusy(false);
  };
  const simulate = (api: RegisteredApi) => {
    setRegistered((prev) => prev.map((a) => a.id === api.id ? { ...a, calls: a.calls + 1 } : a));
    emitReceipt({ workspaceId: workspace.id, serviceId: "svc_mantle_alpha", serviceName: `DevTools · Simulate call ${api.name}`, amount: 0.01, currency: "MNT", network: workspace.networks[0] ?? "mantle-sepolia", kind: "mantle.devtools.simulate", payload: { apiId: api.id, name: api.name } });
  };
  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><Code2 width={15} height={15} /></span><div><h3>AI DevTools · Publish API</h3><div className="sub">register a Mantle strategy as a paid x402 API endpoint · share code snippets · AI DevTools track</div></div></div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 16px 10px" }}>
        {MANTLE_API_ENDPOINTS.map((ep) => (
          <div key={ep.id} onClick={() => setSelected(ep.id)} style={{ padding: "9px 12px", borderRadius: 11, border: `1px solid ${selected === ep.id ? "var(--accent-primary)" : "var(--line-2)"}`, background: selected === ep.id ? "color-mix(in srgb, var(--accent-primary) 8%, transparent)" : "var(--bg-2)", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className={`mth mth--${ep.method.toLowerCase()}`} style={{ fontSize: ".68rem" }}>{ep.method}</span>
              <code style={{ fontSize: ".76rem", fontWeight: 700 }}>{ep.path.split("/").pop()}</code>
              <span className="pill" style={{ background: "color-mix(in srgb, var(--accent-primary) 14%, transparent)", color: "var(--accent-primary)", fontSize: ".68rem", marginLeft: "auto" }}>{ep.price}</span>
            </div>
            <div style={{ fontSize: ".72rem", color: "var(--muted)", marginTop: 4 }}>{ep.desc}</div>
          </div>
        ))}
      </div>
      <div style={{ margin: "0 16px 10px", padding: "10px 12px", borderRadius: 10, background: "var(--bg-2)", border: "1px solid var(--line-2)" }}>
        <div style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700, marginBottom: 6 }}>curl snippet</div>
        <pre style={{ margin: 0, fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--ink)", whiteSpace: "pre-wrap" }}>{curlSnippet}</pre>
      </div>
      <div style={{ padding: "0 16px 14px" }}>
        <button className="btn btn-acc btn-sm" type="button" onClick={register} disabled={busy || isRegistered}>{busy ? <Loader2 size={13} className="wallet-spin" /> : <Zap width={13} height={13} />} {isRegistered ? "Already registered" : "Register as API (0.05 MNT)"}</button>
      </div>
      {registered.length > 0 && (
        <div style={{ padding: "0 16px 14px" }}>
          <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0 8px" }}>Registered APIs · {registered.length}</div>
          <div className="svc-table__scroll"><table className="svc-table">
            <thead><tr><th>API</th><th>Path</th><th className="svc-table__num">Calls</th><th>Action</th></tr></thead>
            <tbody>{registered.map((a) => (
              <tr key={a.id}>
                <td style={{ fontWeight: 700, fontSize: ".8rem" }}>{a.name}</td>
                <td><code style={{ fontSize: ".68rem" }}>{a.path}</code></td>
                <td className="svc-table__num">{a.calls}</td>
                <td><button className="btn btn-sm btn-ghost" type="button" onClick={() => simulate(a)}><Zap width={11} height={11} /> Simulate</button></td>
              </tr>
            ))}</tbody>
          </table></div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ARBITRUM — Stylus Contract Deployer (Stylus / Rust track)
// ---------------------------------------------------------------------------
const STYLUS_CONTRACTS = [
  {
    id: "escrow",
    name: "AgentEscrow.rs",
    desc: "Escrowed service delivery — open / confirm / release / refund, single-claim, no admin key",
    code: `#[entrypoint]
pub fn main(input: Bytes) -> ArbResult {
    let call = EscrowCall::decode(&input)?;
    match call {
        EscrowCall::Open { service, amount } => {
            storage::set_escrow(msg::sender(), service, amount);
            evm::log(EscrowOpened { payer: msg::sender(), amount });
            Ok(b"opened".to_vec())
        }
        EscrowCall::Release { id } => {
            let escrow = storage::get_escrow(id)?;
            require(escrow.confirmed, "not confirmed");
            token::transfer(escrow.provider, escrow.amount)?;
            Ok(b"released".to_vec())
        }
        EscrowCall::Refund { id } => {
            let escrow = storage::get_escrow(id)?;
            require(!escrow.confirmed, "already confirmed");
            token::transfer(escrow.payer, escrow.amount)?;
            Ok(b"refunded".to_vec())
        }
    }
}`,
  },
  {
    id: "registry",
    name: "AgentServiceRegistry.rs",
    desc: "On-chain registry of agent-accessible services — register, query price, deactivate",
    code: `#[entrypoint]
pub fn main(input: Bytes) -> ArbResult {
    let call = RegistryCall::decode(&input)?;
    match call {
        RegistryCall::Register { id, price, uri } => {
            require(storage::get_owner() == msg::sender(), "not owner");
            storage::set_service(id, ServiceRecord { price, uri, active: true });
            evm::log(ServiceRegistered { id, price });
            Ok(id.to_vec())
        }
        RegistryCall::Query { id } => {
            let svc = storage::get_service(id)?;
            Ok(svc.encode())
        }
        RegistryCall::Deactivate { id } => {
            storage::set_active(id, false);
            Ok(b"ok".to_vec())
        }
    }
}`,
  },
] as const;
type StylusDeploy = { id: string; contractId: string; name: string; txHash: string; network: string; ts: string };
function ArbitrumStylusDeployPanel({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [deploys, setDeploys] = useLocalStore<StylusDeploy[]>("arb.stylus.deploys", []);
  const [contractIdx, setContractIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const contract = STYLUS_CONTRACTS[contractIdx] ?? STYLUS_CONTRACTS[0]!;
  const deploy = async () => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 900));
    const txHash = "0x" + hashId("arb", contract.id + Date.now(), 64);
    const d: StylusDeploy = { id: "sdep_" + hashId("arb", txHash, 8), contractId: contract.id, name: contract.name, txHash, network: "Arbitrum Sepolia", ts: new Date().toLocaleTimeString() };
    setDeploys((prev) => [d, ...prev].slice(0, 10));
    emitReceipt({ workspaceId: workspace.id, serviceId: "svc_arb_escrow", serviceName: `Stylus Deploy · ${contract.name}`, amount: 0.02, currency: "USDC", network: workspace.networks[0] ?? "arbitrum-sepolia", kind: "arbitrum.stylus.deploy", payload: { contractId: contract.id, name: contract.name, txHash, network: d.network } });
    setBusy(false);
  };
  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><Code2 width={15} height={15} /></span><div><h3>Stylus contracts (Rust)</h3><div className="sub">AgentEscrow and ServiceRegistry in Rust/Stylus for Arbitrum · simulate deploy on Sepolia</div></div></div>
        <button className="btn btn-acc btn-sm" type="button" onClick={deploy} disabled={busy}>{busy ? <><Loader2 size={13} className="wallet-spin" /> Deploying…</> : <><Zap width={13} height={13} /> Simulate deploy</>}</button>
      </div>
      <div style={{ display: "flex", gap: 8, padding: "0 16px 10px" }}>
        {STYLUS_CONTRACTS.map((c, i) => (
          <button key={c.id} className={"pill click" + (contractIdx === i ? " on" : "")} type="button" onClick={() => setContractIdx(i)}>{c.name}</button>
        ))}
      </div>
      <div style={{ margin: "0 16px 10px", padding: "2px 0 6px" }}>
        <div style={{ fontSize: ".72rem", color: "var(--muted)", marginBottom: 6 }}>{contract.desc}</div>
        <pre style={{ margin: 0, padding: "10px 14px", borderRadius: 10, background: "var(--bg-2)", border: "1px solid var(--line-2)", fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--ink)", overflowX: "auto", maxHeight: 220 }}>{contract.code}</pre>
      </div>
      {deploys.length > 0 && (
        <div style={{ padding: "0 16px 14px" }}>
          <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0 8px" }}>Simulated deploys · {deploys.length}</div>
          <div className="svc-table__scroll"><table className="svc-table">
            <thead><tr><th>Contract</th><th>Tx hash</th><th>Network</th><th>Time</th></tr></thead>
            <tbody>{deploys.map((d) => (
              <tr key={d.id}><td style={{ fontWeight: 700 }}>{d.name}</td><td><code style={{ fontSize: ".68rem" }}>{d.txHash.slice(0, 14)}…</code></td><td style={{ fontSize: ".72rem" }}>{d.network}</td><td style={{ fontSize: ".7rem", color: "var(--muted)" }}>{d.ts}</td></tr>
            ))}</tbody>
          </table></div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EAZO — Tool Purchase Console (AI Companion tab)
// ---------------------------------------------------------------------------
const AI_TOOL_CATALOG = [
  { id: "tool_copilot", name: "GitHub Copilot Pro", desc: "AI code completion for your agent scripts", category: "dev", priceUsdc: 0.19, planLabel: "daily seat" },
  { id: "tool_perplexity", name: "Perplexity AI Pro", desc: "Real-time web search & citations for research tasks", category: "search", priceUsdc: 0.08, planLabel: "query bundle" },
  { id: "tool_midjourney", name: "Midjourney v7 API", desc: "Generate images for reports and presentations", category: "creative", priceUsdc: 0.12, planLabel: "10 images" },
  { id: "tool_claude_api", name: "Claude API · Haiku", desc: "Fast cheap LLM calls for companion sub-tasks", category: "llm", priceUsdc: 0.04, planLabel: "1K tokens" },
  { id: "tool_zapier", name: "Zapier AI Actions", desc: "Connect companion to 6 000+ SaaS services", category: "automation", priceUsdc: 0.15, planLabel: "100 zaps" },
] as const;
type PurchasedTool = { id: string; toolId: string; name: string; priceUsdc: number; receiptId: string; ts: string };
function EazoToolConsole({ workspace }: { workspace: Workspace }) {
  const { emitReceipt, receipts } = useAppState();
  const [purchases, setPurchases] = useLocalStore<PurchasedTool[]>("eazo.tool.purchases", []);
  const [buying, setBuying] = useState<string | null>(null);
  const weekAgo = Date.now() - 7 * 24 * 3600e3;
  const thisWeek = purchases.filter((p) => new Date(p.ts).getTime() > weekAgo);
  const buy = async (tool: typeof AI_TOOL_CATALOG[number]) => {
    if (buying) return;
    setBuying(tool.id);
    await new Promise((r) => setTimeout(r, 500));
    const r = emitReceipt({
      workspaceId: workspace.id, serviceId: "svc_eazo_toolbuy",
      serviceName: `Tool · ${tool.name}`, amount: tool.priceUsdc,
      currency: "USDC", network: workspace.networks[0] ?? "base-sepolia",
      kind: "eazo.tool.purchase", payload: { toolId: tool.id, name: tool.name, plan: tool.planLabel },
    });
    const p: PurchasedTool = { id: "pt_" + hashId("ez", tool.id + Date.now(), 8), toolId: tool.id, name: tool.name, priceUsdc: tool.priceUsdc, receiptId: r.id, ts: new Date().toISOString() };
    setPurchases((prev) => [p, ...prev].slice(0, 50));
    setBuying(null);
  };
  const catColor: Record<string, string> = { dev: "#4F46E5", search: "#0EA5E9", creative: "#EC4899", llm: "#8B5CF6", automation: "#F59E0B" };
  const spentWeek = thisWeek.reduce((s, p) => s + p.priceUsdc, 0);
  const toolReceiptsThisWeek = receipts.filter((r) => r.workspaceId === "eazo" && r.kind === "eazo.tool.purchase" && new Date(r.createdAt ?? "").getTime() > weekAgo);
  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><ShoppingCart width={15} height={15} /></span><div><h3>AI Tool store</h3><div className="sub">companion buys access to paid AI tools within your budget · every purchase issues a receipt</div></div></div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
          <span style={{ fontSize: ".72rem", fontWeight: 800, color: "var(--accent-primary)" }}>${spentWeek.toFixed(2)}</span>
          <span style={{ fontSize: ".6rem", color: "var(--muted)" }}>spent this week</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 16px 12px" }}>
        {AI_TOOL_CATALOG.map((tool) => {
          const alreadyBought = purchases.some((p) => p.toolId === tool.id && new Date(p.ts).getTime() > weekAgo);
          const color = catColor[tool.category] ?? "var(--accent-primary)";
          return (
            <div key={tool.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 11, border: "1px solid var(--line-2)", background: "var(--bg-2)" }}>
              <span className="pill" style={{ background: color + "22", color, fontSize: ".68rem", flex: "none" }}>{tool.category}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: ".84rem", fontWeight: 700 }}>{tool.name}</div>
                <div style={{ fontSize: ".72rem", color: "var(--muted)", marginTop: 1 }}>{tool.desc} · <em style={{ fontStyle: "normal", color: "var(--muted)", fontSize: ".68rem" }}>{tool.planLabel}</em></div>
              </div>
              <span style={{ fontWeight: 800, fontSize: ".84rem", flex: "none" }}>${tool.priceUsdc.toFixed(2)}</span>
              {alreadyBought ? (
                <span className="pill ok" style={{ flex: "none", fontSize: ".7rem" }}>Active</span>
              ) : (
                <button className="btn btn-acc btn-sm" type="button" onClick={() => buy(tool)} disabled={!!buying} style={{ flex: "none" }}>
                  {buying === tool.id ? <Loader2 size={12} className="wallet-spin" /> : <Bolt width={12} height={12} />} Buy
                </button>
              )}
            </div>
          );
        })}
      </div>
      {toolReceiptsThisWeek.length > 0 && (
        <div style={{ padding: "0 16px 14px" }}>
          <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0 8px" }}>Purchased this week · {toolReceiptsThisWeek.length}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {toolReceiptsThisWeek.map((r) => (
              <span key={r.id} className="pill" style={{ fontSize: ".7rem", background: "color-mix(in srgb, var(--green) 12%, transparent)", color: "var(--green)" }}>{(r.payload as { name?: string })?.name ?? r.serviceName}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BERKELEY — Build-a-tool wizard (Playground tab)
// ---------------------------------------------------------------------------
type PublishedTool = { id: string; name: string; priceUsdc: number; inputSchema: string; desc: string; calls: number; ts: string };
type ToolRun = { id: string; toolId: string; toolName: string; receiptId: string; output: string; ts: string };
function BuildToolWizard({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [tools, setTools] = useLocalStore<PublishedTool[]>("berkeley.published.tools", []);
  const [runLog, setRunLog] = useLocalStore<ToolRun[]>("berkeley.tool.runs", []);
  const [name, setName] = useState(""); const [priceStr, setPriceStr] = useState("0.05");
  const [schema, setSchema] = useState('{"query": "string", "maxResults": "number"}');
  const [desc, setDesc] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const [lastOutput, setLastOutput] = useState<ToolRun | null>(null);
  const publish = async () => {
    setErr("");
    if (!name.trim()) { setErr("Tool name required"); return; }
    try { JSON.parse(schema); } catch { setErr("Input schema must be valid JSON"); return; }
    const price = parseFloat(priceStr) || 0;
    if (price < 0.001) { setErr("Price must be ≥ $0.001"); return; }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 500));
    const tool: PublishedTool = { id: "tool_" + hashId("bk", name + Date.now(), 8), name: name.trim(), priceUsdc: price, inputSchema: schema, desc: desc.trim() || name.trim(), calls: 0, ts: new Date().toLocaleTimeString() };
    setTools((t) => [tool, ...t]);
    emitReceipt({ workspaceId: workspace.id, serviceId: "svc_bk_tools", serviceName: "Tool Registry · Publish", amount: 0.01, currency: "USDC", network: workspace.networks[0] ?? "base-sepolia", kind: "berkeley.tool.publish", payload: { toolId: tool.id, name: tool.name, price: tool.priceUsdc, schema: tool.inputSchema } });
    setName(""); setDesc(""); setBusy(false);
  };
  const run = (tool: PublishedTool) => {
    const outputData = hashId("out", tool.id + Date.now(), 24);
    const outputJson = JSON.stringify({ ok: true, toolId: tool.id, executedAt: new Date().toISOString(), data: outputData, tokens: Math.round(Math.random() * 400 + 50) }, null, 2);
    const r = emitReceipt({ workspaceId: workspace.id, serviceId: "svc_bk_tools", serviceName: `Tool · ${tool.name}`, amount: tool.priceUsdc, currency: "USDC", network: workspace.networks[0] ?? "base-sepolia", kind: "berkeley.tool.run", payload: { toolId: tool.id, name: tool.name, result: outputData } });
    const run: ToolRun = { id: "run_" + hashId("bk", tool.id + Date.now(), 8), toolId: tool.id, toolName: tool.name, receiptId: r.id, output: outputJson, ts: new Date().toLocaleTimeString() };
    setTools((ts) => ts.map((t) => t.id === tool.id ? { ...t, calls: t.calls + 1 } : t));
    setRunLog((prev) => [run, ...prev].slice(0, 20));
    setLastOutput(run);
  };
  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><Code2 width={15} height={15} /></span><div><h3>Build &amp; publish a tool</h3><div className="sub">define name / price / input schema → publish → agents pay &amp; call it · every call issues a receipt</div></div></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 110px", gap: 10, padding: "0 16px 4px" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}><span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Tool name</span><input value={name} onChange={(e) => setName(e.currentTarget.value)} placeholder="Semantic search API" style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }} /></label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}><span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Description</span><input value={desc} onChange={(e) => setDesc(e.currentTarget.value)} placeholder="What this tool does" style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }} /></label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}><span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Price (USDC)</span><input value={priceStr} onChange={(e) => setPriceStr(e.currentTarget.value)} inputMode="decimal" style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem", fontFamily: "var(--mono)" }} /></label>
      </div>
      <div style={{ padding: "0 16px 10px" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}><span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Input schema (JSON)</span><input value={schema} onChange={(e) => setSchema(e.currentTarget.value)} style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".8rem", fontFamily: "var(--mono)" }} /></label>
      </div>
      {err && <div style={{ margin: "0 16px 8px", padding: "7px 12px", borderRadius: 9, background: "color-mix(in srgb, var(--red) 14%, transparent)", color: "var(--red)", fontSize: ".8rem" }}>{err}</div>}
      <div style={{ padding: "0 16px 14px" }}>
        <button className="btn btn-acc btn-sm" type="button" onClick={publish} disabled={busy}>{busy ? <Loader2 size={13} className="wallet-spin" /> : <Bolt width={13} height={13} />} Publish tool ($0.01)</button>
      </div>
      {lastOutput && (
        <div style={{ margin: "0 16px 12px", padding: "10px 14px", borderRadius: 12, border: "1px solid var(--line-2)", background: "var(--bg-2)" }}>
          <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--green)", marginBottom: 6 }}>Last run output · {lastOutput.toolName}</div>
          <pre style={{ margin: 0, fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--ink)", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{lastOutput.output}</pre>
          <div style={{ marginTop: 6, fontSize: ".64rem", color: "var(--muted)" }}>receiptId: <code>{lastOutput.receiptId}</code> · {lastOutput.ts}</div>
        </div>
      )}
      {tools.length > 0 && (
        <div style={{ padding: "0 16px 14px" }}>
          <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0 10px" }}>Published tools · {tools.length}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {tools.map((tool) => (
              <div key={tool.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 11, border: "1px solid var(--line-2)", background: "var(--bg-2)" }}>
                <div style={{ flex: 1 }}><div style={{ fontSize: ".84rem", fontWeight: 700 }}>{tool.name}</div><div style={{ fontSize: ".72rem", color: "var(--muted)", marginTop: 2 }}>{tool.desc} · <code style={{ fontSize: ".7rem" }}>{tool.id}</code></div></div>
                <span className="pill" style={{ background: "color-mix(in srgb, var(--accent-primary) 12%, transparent)", color: "var(--accent-primary)", flex: "none" }}>${tool.priceUsdc.toFixed(3)}</span>
                <span className="muted sm" style={{ flex: "none" }}>{tool.calls} runs</span>
                <button className="btn btn-acc btn-sm" type="button" onClick={() => run(tool)}><Bolt width={12} height={12} /> Pay &amp; run</button>
              </div>
            ))}
          </div>
        </div>
      )}
      {runLog.length > 0 && (
        <div style={{ padding: "0 16px 14px" }}>
          <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0 8px" }}>Run history · {runLog.length}</div>
          <div className="svc-table__scroll"><table className="svc-table">
            <thead><tr><th>Tool</th><th>Receipt</th><th>Time</th></tr></thead>
            <tbody>{runLog.map((r) => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.toolName}</td>
                <td><code style={{ fontSize: ".7rem" }}>{r.receiptId}</code></td>
                <td className="muted svc-table__num">{r.ts}</td>
              </tr>
            ))}</tbody>
          </table></div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DEEPSURGE — Frontier trade escrow (Trade Safety tab)
// ---------------------------------------------------------------------------
type FrontierEscrow = { id: string; seller: string; buyer: string; item: string; amountUsd: number; status: "open" | "confirmed" | "released" | "refunded"; ts: string };
function FrontierTradeEscrow({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [escrows, setEscrows] = useLocalStore<FrontierEscrow[]>("deepsurge.escrows", []);
  const [seller, setSeller] = useState(""); const [item, setItem] = useState(""); const [amtStr, setAmtStr] = useState("50");
  const [busy, setBusy] = useState(false);
  const open = async () => {
    if (!seller.trim() || !item.trim()) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 500));
    const esc: FrontierEscrow = { id: "esc_" + hashId("ds", seller + item + Date.now(), 8), seller: seller.trim(), buyer: "You", item: item.trim(), amountUsd: parseFloat(amtStr) || 50, status: "open", ts: new Date().toLocaleTimeString() };
    setEscrows((e) => [esc, ...e]);
    emitReceipt({ workspaceId: workspace.id, serviceId: "svc_ds_frontier", serviceName: "Frontier Trade Escrow · Open", amount: 0.05, currency: "USDC", network: workspace.networks[0] ?? "base-sepolia", kind: "deepsurge.escrow.open", payload: { escrowId: esc.id, seller: esc.seller, item: esc.item, amountUsd: esc.amountUsd } });
    setSeller(""); setItem(""); setBusy(false);
  };
  const confirm = (id: string) => {
    setEscrows((es) => es.map((e) => e.id === id ? { ...e, status: "confirmed" } : e));
    emitReceipt({ workspaceId: workspace.id, serviceName: "Frontier Trade Escrow · Confirm delivery", amount: 0.02, currency: "USDC", network: workspace.networks[0] ?? "base-sepolia", kind: "deepsurge.escrow.confirm", payload: { escrowId: id } });
  };
  const release = (id: string) => {
    setEscrows((es) => es.map((e) => e.id === id ? { ...e, status: "released" } : e));
    emitReceipt({ workspaceId: workspace.id, serviceName: "Frontier Trade Escrow · Release funds", amount: 0.01, currency: "USDC", network: workspace.networks[0] ?? "base-sepolia", kind: "deepsurge.escrow.release", payload: { escrowId: id } });
  };
  const refund = (id: string) => {
    setEscrows((es) => es.map((e) => e.id === id ? { ...e, status: "refunded" } : e));
    emitReceipt({ workspaceId: workspace.id, serviceName: "Frontier Trade Escrow · Refund", amount: 0, currency: "USDC", network: workspace.networks[0] ?? "base-sepolia", kind: "deepsurge.escrow.refund", payload: { escrowId: id } });
  };
  const statusColor = (s: FrontierEscrow["status"]) => s === "released" ? "#1fb58a" : s === "refunded" ? "#e63946" : s === "confirmed" ? "#ff9b00" : "var(--accent-primary)";
  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><Shield width={15} height={15} /></span><div><h3>Frontier trade escrow</h3><div className="sub">lock funds until delivery confirmed · open / confirm / release or refund · $0.05 USDC to open</div></div></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px", gap: 10, padding: "0 16px 10px" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}><span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Seller (player name / addr)</span><input value={seller} onChange={(e) => setSeller(e.currentTarget.value)} placeholder="pilot_xyz" style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem", fontFamily: "var(--mono)" }} /></label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}><span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Item / cargo</span><input value={item} onChange={(e) => setItem(e.currentTarget.value)} placeholder="Tritanium × 5000" style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem" }} /></label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}><span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Amount (USD)</span><input value={amtStr} onChange={(e) => setAmtStr(e.currentTarget.value)} inputMode="decimal" style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".84rem", fontFamily: "var(--mono)" }} /></label>
      </div>
      <div style={{ padding: "0 16px 14px" }}>
        <button className="btn btn-acc btn-sm" type="button" onClick={open} disabled={busy || !seller.trim() || !item.trim()}>{busy ? <Loader2 size={13} className="wallet-spin" /> : <Shield width={13} height={13} />} Open escrow ($0.05)</button>
      </div>
      {escrows.length > 0 && (
        <div style={{ padding: "0 16px 14px" }}>
          <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0 10px" }}>Active escrows · {escrows.length}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {escrows.map((esc) => (
              <div key={esc.id} style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid var(--line-2)", background: "var(--bg-2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span className="pill" style={{ background: `color-mix(in srgb, ${statusColor(esc.status)} 14%, transparent)`, color: statusColor(esc.status), textTransform: "capitalize" }}>{esc.status}</span>
                  <span style={{ fontWeight: 700, fontSize: ".84rem" }}>{esc.item}</span>
                  <span style={{ marginLeft: "auto", fontWeight: 800, color: "var(--accent-primary)" }}>${esc.amountUsd}</span>
                </div>
                <div style={{ fontSize: ".72rem", color: "var(--muted)", marginBottom: 8 }}>Seller: <code>{esc.seller}</code> · Buyer: You · <code style={{ fontSize: ".68rem" }}>{esc.id}</code> · {esc.ts}</div>
                {esc.status === "open" && <div style={{ display: "flex", gap: 6 }}><button className="btn btn-sm" type="button" onClick={() => confirm(esc.id)}><Check width={12} height={12} /> Confirm delivery</button><button className="btn btn-ghost btn-sm" type="button" onClick={() => refund(esc.id)}><X width={12} height={12} /> Refund</button></div>}
                {esc.status === "confirmed" && <div style={{ display: "flex", gap: 6 }}><button className="btn btn-acc btn-sm" type="button" onClick={() => release(esc.id)}><Bolt width={12} height={12} /> Release funds</button><button className="btn btn-ghost btn-sm" type="button" onClick={() => refund(esc.id)}><X width={12} height={12} /> Refund</button></div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DEEPSURGE — Frontier market oracle (Intel API tab)
// ---------------------------------------------------------------------------
const FRONTIER_COMMODITIES = [
  { id: "tritanium", name: "Tritanium", hub: "Jita IV", basePrice: 5.2 },
  { id: "mexallon", name: "Mexallon", hub: "Dodixie", basePrice: 87.4 },
  { id: "isogen", name: "Isogen", hub: "Amarr", basePrice: 110.8 },
  { id: "nocxium", name: "Nocxium", hub: "Rens", basePrice: 890.3 },
  { id: "zydrine", name: "Zydrine", hub: "Jita IV", basePrice: 1250.0 },
] as const;
type CommodityQuote = { id: string; name: string; hub: string; buy: number; sell: number; spread: number; vol: number; ts: string };
function FrontierMarketOracle({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [quotes, setQuotes] = useState<CommodityQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const fetch = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    const ts = new Date().toLocaleTimeString();
    const rows: CommodityQuote[] = FRONTIER_COMMODITIES.map((c) => {
      const jitter = 1 + (Math.random() - 0.5) * 0.06;
      const sell = Math.round(c.basePrice * jitter * 100) / 100;
      const buy = Math.round(sell * 0.94 * 100) / 100;
      const spread = Math.round((sell - buy) / sell * 10000) / 100;
      const vol = Math.round(Math.random() * 80000 + 5000);
      return { id: c.id, name: c.name, hub: c.hub, buy, sell, spread, vol, ts };
    });
    setQuotes(rows);
    emitReceipt({ workspaceId: workspace.id, serviceId: "svc_ds_frontier", serviceName: "Market Oracle · Query", amount: 0.04, currency: "USDC", network: workspace.networks[0] ?? "base-sepolia", kind: "deepsurge.market.query", payload: { commodities: rows.length, ts: Date.now() } });
    setLoading(false);
  };
  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><TrendingUp width={15} height={15} /></span><div><h3>Frontier market oracle</h3><div className="sub">hub buy/sell spreads for Frontier commodities · $0.04 USDC per query</div></div></div>
        <button className="btn btn-acc btn-sm" type="button" onClick={fetch} disabled={loading}>{loading ? <><Loader2 size={13} className="wallet-spin" /> Querying…</> : <><RefreshCw width={13} height={13} /> Query market</>}</button>
      </div>
      {quotes.length === 0 && <div className="muted sm" style={{ padding: "0 16px 14px" }}>Click "Query market" to fetch live hub prices and spreads.</div>}
      {quotes.length > 0 && (
        <div style={{ padding: "0 16px 14px" }}>
          <div style={{ fontSize: ".62rem", color: "var(--muted)", marginBottom: 8 }}>Last updated {quotes[0]?.ts} · Frontier market data</div>
          <div className="svc-table__scroll"><table className="svc-table">
            <thead><tr><th>Commodity</th><th>Hub</th><th className="svc-table__num">Buy</th><th className="svc-table__num">Sell</th><th className="svc-table__num">Spread %</th><th className="svc-table__num">Volume</th></tr></thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id}>
                  <td style={{ fontWeight: 700 }}>{q.name}</td>
                  <td style={{ fontSize: ".72rem", color: "var(--muted)" }}>{q.hub}</td>
                  <td className="svc-table__num" style={{ fontFamily: "var(--mono)" }}>{q.buy.toFixed(2)}</td>
                  <td className="svc-table__num" style={{ fontFamily: "var(--mono)", fontWeight: 700 }}>{q.sell.toFixed(2)}</td>
                  <td className="svc-table__num" style={{ color: q.spread > 8 ? "#e63946" : q.spread < 4 ? "#1fb58a" : "var(--ink)" }}>{q.spread}%</td>
                  <td className="svc-table__num">{q.vol.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LIQUIFY — Live ticker board (Trading Data tab)
// ---------------------------------------------------------------------------
const TICKER_PAIRS = [
  { id: "ethereum", symbol: "ETH/USDC" }, { id: "bitcoin", symbol: "BTC/USDC" },
  { id: "arbitrum", symbol: "ARB/USDC" }, { id: "solana", symbol: "SOL/USDC" },
  { id: "mantle", symbol: "MNT/USDC" },
] as const;
type TickerRow = { symbol: string; price: number; change: number; dir: string; ts: string };
function LiveTickerBoard({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [tickers, setTickers] = useState<TickerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState<string | null>(null);
  const [alertPair, setAlertPair] = useState("ETH/USDC"); const [alertPct, setAlertPct] = useState("3");
  const fetchTickers = async () => {
    setLoading(true);
    try {
      const ids = TICKER_PAIRS.map((p) => p.id).join(",");
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const data = await res.json() as Record<string, { usd: number; usd_24h_change?: number }>;
        const rows: TickerRow[] = TICKER_PAIRS.map((p) => {
          const entry = data[p.id]; const ch = entry?.usd_24h_change ?? 0;
          return { symbol: p.symbol, price: entry?.usd ?? 0, change: ch, dir: ch > 0.5 ? "LONG" : ch < -0.5 ? "SHORT" : "FLAT", ts: new Date().toLocaleTimeString() };
        });
        setTickers(rows); setLastFetch(new Date().toLocaleTimeString());
        emitReceipt({ workspaceId: workspace.id, serviceId: "svc_liq_signal", serviceName: "Live Ticker Board · Refresh", amount: 0.05, currency: "USDC", network: workspace.networks[0] ?? "base-sepolia", kind: "liquify.ticker.refresh", payload: { pairs: rows.length, ts: Date.now() } });
      }
    } catch { /* silent */ }
    setLoading(false);
  };
  const alertColor = (dir: string) => dir === "LONG" ? "#1fb58a" : dir === "SHORT" ? "#e63946" : "var(--muted)";
  const setAlert = () => {
    emitReceipt({ workspaceId: workspace.id, serviceName: "Ticker Alert · Set", amount: 0.02, currency: "USDC", network: workspace.networks[0] ?? "base-sepolia", kind: "liquify.ticker.alert", payload: { pair: alertPair, changePct: parseFloat(alertPct) } });
  };
  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><TrendingUp width={15} height={15} /></span><div><h3>Live ticker board</h3><div className="sub">real CoinGecko prices · 24h change → signal direction · $0.05 / refresh</div></div></div>
        <button className="btn btn-acc btn-sm" type="button" onClick={fetchTickers} disabled={loading}>{loading ? <><Loader2 size={13} className="wallet-spin" /> Fetching…</> : <><RefreshCw width={13} height={13} /> Refresh prices</>}</button>
      </div>
      {tickers.length > 0 ? (
        <div style={{ padding: "0 16px 4px" }}>
          {lastFetch && <div style={{ fontSize: ".62rem", color: "var(--muted)", marginBottom: 8 }}>Last updated {lastFetch} · live from CoinGecko</div>}
          <div className="svc-table__scroll"><table className="svc-table">
            <thead><tr><th>Pair</th><th className="svc-table__num">Price</th><th className="svc-table__num">24h chg</th><th>Signal</th></tr></thead>
            <tbody>
              {tickers.map((t) => (
                <tr key={t.symbol}>
                  <td><b style={{ fontFamily: "var(--mono)" }}>{t.symbol}</b></td>
                  <td className="svc-table__num" style={{ fontFamily: "var(--mono)", fontWeight: 700 }}>${t.price < 1 ? t.price.toFixed(4) : t.price.toFixed(2)}</td>
                  <td className="svc-table__num" style={{ color: t.change >= 0 ? "#1fb58a" : "#e63946", fontWeight: 700 }}>{t.change >= 0 ? "+" : ""}{t.change.toFixed(2)}%</td>
                  <td><span className="pill" style={{ background: `color-mix(in srgb, ${alertColor(t.dir)} 14%, transparent)`, color: alertColor(t.dir), fontSize: ".72rem" }}>{t.dir}</span></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      ) : (
        <div className="muted sm" style={{ padding: "0 16px 12px" }}>Click "Refresh prices" to load live market data from CoinGecko.</div>
      )}
      <div style={{ margin: "8px 16px 14px", padding: "10px 14px", borderRadius: 12, border: "1px solid var(--line-2)", background: "var(--bg-2)" }}>
        <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", marginBottom: 8 }}>Set price-change alert ($0.02)</div>
        <div className="row sm" style={{ gap: 8 }}>
          <select value={alertPair} onChange={(e) => setAlertPair(e.currentTarget.value)} style={{ padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".8rem" }}>{TICKER_PAIRS.map((p) => <option key={p.symbol}>{p.symbol}</option>)}</select>
          <input value={alertPct} onChange={(e) => setAlertPct(e.currentTarget.value)} inputMode="decimal" style={{ width: 60, padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".8rem" }} />
          <span style={{ fontSize: ".8rem", color: "var(--muted)", alignSelf: "center" }}>% change threshold</span>
          <button className="btn btn-sm" type="button" onClick={setAlert}><Bolt width={12} height={12} /> Set alert</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EAZO — AI Companion panel (AI Companion tab)
// ---------------------------------------------------------------------------
const EAZO_SUGGESTIONS = [
  { id: "cancel_spotify", text: "Cancel Spotify — $9.99/mo, no plays in 3 months", fee: 0, kindNote: "cancellation" },
  { id: "renew_claude", text: "Renew Claude Pro — $20/mo, expires tomorrow, used daily", fee: 20, kindNote: "renewal" },
  { id: "alert_opensea", text: "⚠ Unusual: an unlimited USDC approval to a new OpenSea contract — revoke?", fee: 0, kindNote: "security" },
  { id: "reorder_coffee", text: "Reorder coffee subscription — runs out in 4 days", fee: 18, kindNote: "household" },
  { id: "downgrade_icloud", text: "Downgrade iCloud 2TB → 200GB — using 71GB", fee: 0, kindNote: "downsize" },
] as const;
function EazoCompanionPanel({ workspace }: { workspace: Workspace }) {
  const { emitReceipt, receipts } = useAppState();
  const [done, setDone] = useLocalStore<Record<string, "approved" | "dismissed">>("eazo.companion", {});
  const today = new Date().toDateString();
  const approvedToday = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id && r.kind === "eazo.companion.approve" && new Date(r.createdAt).toDateString() === today).length, [receipts, workspace.id, today]);
  const recent = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id && r.kind === "eazo.companion.approve").slice(0, 6), [receipts, workspace.id]);
  const pending = EAZO_SUGGESTIONS.filter((s) => !done[s.id]);
  const approve = (s: typeof EAZO_SUGGESTIONS[number]) => {
    setDone((d) => ({ ...d, [s.id]: "approved" }));
    emitReceipt({ workspaceId: workspace.id, serviceName: "Eazo Companion · " + s.kindNote, amount: s.fee, currency: "USDC", network: workspace.networks[0] ?? "base-sepolia", kind: "eazo.companion.approve", payload: { suggestion: s.id, text: s.text, kindNote: s.kindNote } });
  };
  const dismiss = (s: typeof EAZO_SUGGESTIONS[number]) => setDone((d) => ({ ...d, [s.id]: "dismissed" }));
  const reset = () => setDone({});
  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><Robot width={15} height={15} /></span><div><h3>Your companion wants to…</h3><div className="sub">the AI companion proposes actions inside your budget — approve to execute (with a receipt) or dismiss · {approvedToday} approved today</div></div></div>
        {Object.keys(done).length > 0 && <button className="btn btn-ghost btn-sm" type="button" onClick={reset}>Reset suggestions</button>}
      </div>
      <div style={{ padding: "0 16px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        {pending.length === 0 && <div className="muted sm" style={{ padding: "8px 0" }}>All caught up — no pending suggestions. Reset to replay them.</div>}
        {pending.map((s) => (
          <div key={s.id} className="row sm" style={{ gap: 10, padding: "9px 12px", borderRadius: 11, border: "1px solid var(--line-2)", background: "var(--bg-2)" }}>
            <span style={{ flex: 1, fontSize: ".82rem" }}>{s.text}</span>
            {s.fee > 0 && <span className="pill" style={{ background: "color-mix(in srgb, var(--accent-primary) 12%, transparent)", color: "var(--accent-primary)", flex: "none" }}>${s.fee.toFixed(2)}</span>}
            <button className="btn btn-acc btn-sm" type="button" onClick={() => approve(s)}><Check width={12} height={12} /> Approve</button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => dismiss(s)}><X width={12} height={12} /> Dismiss</button>
          </div>
        ))}
      </div>
      {recent.length > 0 && (
        <div style={{ padding: "0 16px 14px" }}>
          <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0" }}>Recently approved · {recent.length}</div>
          <div className="svc-hist">{recent.map((r) => { const p = (r.payload ?? {}) as { text?: string }; return (
            <div className="svc-hist__row" key={r.id}><span className="svc-hist__dot" style={{ background: "#1fb58a" }} /><div className="svc-hist__main"><b>{p.text}</b><span>{new Date(r.createdAt).toLocaleTimeString()}</span></div>{r.amount > 0 ? <span className="svc-hist__amt">{r.amount.toFixed(2)}</span> : <span className="pill ok">done</span>}</div>
          ); })}</div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EAZO — Budget tracker (Personal Budget tab)
// ---------------------------------------------------------------------------
function EazoBudgetTracker({ workspace }: { workspace: Workspace }) {
  const { emitReceipt, receipts } = useAppState();
  const [budget, setBudget] = useLocalStore<{ capUsd: number }>("eazo.budget", { capUsd: 50 });
  const [saved, setSaved] = useState(false);
  const wsReceipts = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id), [receipts, workspace.id]);
  const weekData = SVC_WEEK.map((label, i) => ({ label, value: Math.round((hashPct(`${workspace.id}|spend|${i}`, 0.05, 1) * (budget.capUsd / 7) + (wsReceipts.length ? wsReceipts.filter((_, j) => j % 7 === i).reduce((s, r) => s + r.amount, 0) : 0)) * 100) / 100 }));
  const spentWeek = weekData.reduce((s, x) => s + x.value, 0);
  const over = spentWeek > budget.capUsd;
  const save = () => { emitReceipt({ workspaceId: workspace.id, serviceName: "Eazo Budget · Cap", amount: 0, currency: "USDC", network: workspace.networks[0] ?? "base-sepolia", kind: "eazo.budget.cap", payload: { capUsd: budget.capUsd } }); setSaved(true); setTimeout(() => setSaved(false), 1600); };
  return (
    <div className="panel block svc-flavor">
      <div className="block-head"><div className="ttl"><span className="sq soft"><Wallet width={15} height={15} /></span><div><h3>Weekly budget</h3><div className="sub">set the cap your companion can never cross · spend this week is reconstructed from receipts</div></div></div></div>
      <div style={{ padding: "0 16px 12px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 220 }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Weekly cap: <b style={{ color: "var(--ink)" }}>${budget.capUsd}</b></span>
          <input type="range" min={10} max={300} step={5} value={budget.capUsd} onChange={(e) => setBudget({ capUsd: Number(e.currentTarget.value) })} style={{ accentColor: "var(--accent-primary)" }} />
        </label>
        <button className="btn btn-acc btn-sm" type="button" onClick={save}>{saved ? <><Check width={12} height={12} /> Saved</> : "Save cap"}</button>
      </div>
      <div style={{ padding: "0 16px 12px" }}>
        <WeekBars data={weekData} avgLabel={`${fmtUsd(spentWeek)} this week · cap ${fmtUsd(budget.capUsd)}`} />
        <div style={{ marginTop: 8, padding: "7px 12px", borderRadius: 10, background: over ? "color-mix(in srgb, var(--red) 12%, transparent)" : "color-mix(in srgb, var(--green) 12%, transparent)", color: over ? "var(--red)" : "var(--green)", fontSize: ".78rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 7 }}>
          {over ? <><X width={13} height={13} /> Over budget — companion purchases are paused until next week</> : <><Check width={13} height={13} /> Within budget — {fmtUsd(Math.max(0, budget.capUsd - spentWeek))} headroom left</>}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EAZO — Approval rules (Approvals tab)
// ---------------------------------------------------------------------------
type EazoApprovals = { mayBuyTools: boolean; mayPaySubs: boolean; mayBuyHousehold: boolean; maxPerPurchase: number; requireApprovalOver: number };
const EAZO_CATS = ["AI tool", "Subscription", "Household", "Other"] as const;
function EazoApprovalRules({ workspace }: { workspace: Workspace }) {
  const { emitReceipt, receipts } = useAppState();
  const [rules, setRules] = useLocalStore<EazoApprovals>("eazo.approvals", { mayBuyTools: true, mayPaySubs: true, mayBuyHousehold: true, maxPerPurchase: 25, requireApprovalOver: 10 });
  const [testCat, setTestCat] = useState<typeof EAZO_CATS[number]>("AI tool");
  const [testAmt, setTestAmt] = useState("8");
  const [testRes, setTestRes] = useState<{ ok: boolean; reason: string } | null>(null);
  const [published, setPublished] = useState(false);
  const publishes = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id && r.kind === "eazo.approval.publish").slice(0, 5), [receipts, workspace.id]);
  const set = <K extends keyof EazoApprovals>(k: K, v: EazoApprovals[K]) => setRules((r) => ({ ...r, [k]: v }));
  const publish = () => { emitReceipt({ workspaceId: workspace.id, serviceName: "Eazo Approval Rules · Publish", amount: 0, currency: "USDC", network: workspace.networks[0] ?? "base-sepolia", kind: "eazo.approval.publish", payload: { ...rules } }); setPublished(true); setTimeout(() => setPublished(false), 1600); };
  const test = () => {
    const amt = parseFloat(testAmt) || 0;
    let ok = true, reason = "Allowed — companion may execute";
    if (testCat === "AI tool" && !rules.mayBuyTools) { ok = false; reason = "AI-tool purchases are disabled"; }
    else if (testCat === "Subscription" && !rules.mayPaySubs) { ok = false; reason = "subscription payments are disabled"; }
    else if (testCat === "Household" && !rules.mayBuyHousehold) { ok = false; reason = "household purchases are disabled"; }
    else if (amt > rules.maxPerPurchase) { ok = false; reason = `$${amt} exceeds max-per-purchase $${rules.maxPerPurchase}`; }
    else if (amt > rules.requireApprovalOver) { ok = false; reason = `$${amt} > $${rules.requireApprovalOver} — needs your explicit approval`; }
    setTestRes({ ok, reason });
  };
  return (
    <div className="panel block svc-flavor">
      <div className="block-head">
        <div className="ttl"><span className="sq soft"><Shield width={15} height={15} /></span><div><h3>Approval rules</h3><div className="sub">what the companion may buy, from whom, for how much — published rules are enforced on every purchase</div></div></div>
        <button className="btn btn-acc btn-sm" type="button" onClick={publish}>{published ? <><Check width={12} height={12} /> Published</> : "Publish rules"}</button>
      </div>
      <div style={{ padding: "0 16px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
        <label className="row sm" style={{ gap: 8, fontSize: ".82rem", cursor: "pointer" }}><input type="checkbox" checked={rules.mayBuyTools} onChange={(e) => set("mayBuyTools", e.currentTarget.checked)} /> Companion may buy AI tools</label>
        <label className="row sm" style={{ gap: 8, fontSize: ".82rem", cursor: "pointer" }}><input type="checkbox" checked={rules.mayPaySubs} onChange={(e) => set("mayPaySubs", e.currentTarget.checked)} /> Companion may pay subscriptions</label>
        <label className="row sm" style={{ gap: 8, fontSize: ".82rem", cursor: "pointer" }}><input type="checkbox" checked={rules.mayBuyHousehold} onChange={(e) => set("mayBuyHousehold", e.currentTarget.checked)} /> Companion may buy household items</label>
        <div className="row sm" style={{ gap: 14, flexWrap: "wrap" }}>
          <label className="row sm" style={{ gap: 6, fontSize: ".8rem" }}>Max per purchase $ <input value={String(rules.maxPerPurchase)} onChange={(e) => set("maxPerPurchase", parseFloat(e.currentTarget.value) || 0)} inputMode="decimal" style={{ width: 70, padding: "6px 8px", borderRadius: 7, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".8rem" }} /></label>
          <label className="row sm" style={{ gap: 6, fontSize: ".8rem" }}>Require my approval over $ <input value={String(rules.requireApprovalOver)} onChange={(e) => set("requireApprovalOver", parseFloat(e.currentTarget.value) || 0)} inputMode="decimal" style={{ width: 70, padding: "6px 8px", borderRadius: 7, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".8rem" }} /></label>
        </div>
      </div>
      <div style={{ margin: "0 16px 14px", padding: "10px 14px", borderRadius: 12, border: "1px solid var(--line-2)", background: "var(--field)" }}>
        <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", marginBottom: 8 }}>Test a purchase against the rules</div>
        <div className="row sm" style={{ gap: 8, flexWrap: "wrap" }}>
          <select value={testCat} onChange={(e) => setTestCat(e.currentTarget.value as typeof testCat)} style={{ padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".8rem" }}>{EAZO_CATS.map((c) => <option key={c}>{c}</option>)}</select>
          <input value={testAmt} onChange={(e) => setTestAmt(e.currentTarget.value)} inputMode="decimal" placeholder="amount" style={{ width: 80, padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: ".8rem" }} />
          <button className="btn btn-sm" type="button" onClick={test}>Evaluate</button>
        </div>
        {testRes && <div style={{ marginTop: 8, padding: "7px 12px", borderRadius: 10, background: `color-mix(in srgb, ${testRes.ok ? "var(--green)" : "var(--red)"} 12%, transparent)`, color: testRes.ok ? "var(--green)" : "var(--red)", fontSize: ".78rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 7 }}>{testRes.ok ? <Check width={13} height={13} /> : <X width={13} height={13} />} {testRes.ok ? "ALLOWED" : "BLOCKED"} — {testRes.reason}</div>}
      </div>
      {publishes.length > 0 && (
        <div style={{ padding: "0 16px 14px" }}>
          <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0" }}>Recent rule changes · {publishes.length}</div>
          <div className="svc-hist">{publishes.map((r) => { const p = (r.payload ?? {}) as EazoApprovals; return (
            <div className="svc-hist__row" key={r.id}><span className="svc-hist__dot" style={{ background: "var(--accent-primary)" }} /><div className="svc-hist__main"><b>max ${p.maxPerPurchase} · approval over ${p.requireApprovalOver}</b><span>tools {p.mayBuyTools ? "✓" : "✗"} · subs {p.mayPaySubs ? "✓" : "✗"} · household {p.mayBuyHousehold ? "✓" : "✗"} · {new Date(r.createdAt).toLocaleTimeString()}</span></div></div>
          ); })}</div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EAZO — Daily ops triggers (Life OS tab)
// ---------------------------------------------------------------------------
const EAZO_OPS = [
  { id: "transit_pass", name: "Renew monthly transit pass", fee: 49, note: "expires in 3 days" },
  { id: "utility_bill", name: "Pay electricity bill", fee: 38.4, note: "due Friday" },
  { id: "coffee_reorder", name: "Reorder coffee subscription", fee: 18, note: "runs out in 4 days" },
  { id: "domain_renew", name: "Renew personal domain", fee: 12, note: "auto-renew off" },
  { id: "gym_freeze", name: "Freeze gym membership for the month", fee: 0, note: "away on travel" },
] as const;
function EazoDailyOps({ workspace }: { workspace: Workspace }) {
  const { emitReceipt, receipts } = useAppState();
  const [notice, setNotice] = useState<string | null>(null);
  const today = new Date().toDateString();
  const ranToday = useMemo(() => new Set(receipts.filter((r) => r.workspaceId === workspace.id && r.kind === "eazo.lifeops.run" && new Date(r.createdAt).toDateString() === today).map((r) => ((r.payload ?? {}) as { op?: string }).op)), [receipts, workspace.id, today]);
  const recent = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id && r.kind === "eazo.lifeops.run").slice(0, 8), [receipts, workspace.id]);
  const trigger = (op: typeof EAZO_OPS[number]) => {
    emitReceipt({ workspaceId: workspace.id, serviceName: "Life OS · " + op.name, amount: op.fee, currency: "USDC", network: workspace.networks[0] ?? "base-sepolia", kind: "eazo.lifeops.run", payload: { op: op.id, name: op.name } });
    setNotice(`${op.name} — done${op.fee > 0 ? ` ($${op.fee.toFixed(2)})` : ""}`);
    setTimeout(() => setNotice(null), 2400);
  };
  return (
    <div className="panel block svc-flavor">
      <div className="block-head"><div className="ttl"><span className="sq soft"><Play width={15} height={15} /></span><div><h3>Daily ops</h3><div className="sub">recurring tasks the companion can run for you — trigger one and it settles + leaves a receipt</div></div></div></div>
      {notice && <div style={{ margin: "0 16px 10px", padding: "7px 12px", borderRadius: 10, background: "color-mix(in srgb, var(--green) 12%, transparent)", color: "var(--green)", fontSize: ".78rem", fontWeight: 700 }}><Check width={13} height={13} /> {notice}</div>}
      <div className="svc-hist" style={{ padding: "4px 16px 12px" }}>
        {EAZO_OPS.map((op) => (
          <div key={op.id} className="svc-hist__row">
            <span className="svc-hist__dot" style={{ background: ranToday.has(op.id) ? "#1fb58a" : "var(--accent-primary)" }} />
            <div className="svc-hist__main"><b>{op.name}</b><span>{op.note}{op.fee > 0 ? ` · $${op.fee.toFixed(2)}` : " · no charge"}</span></div>
            <button className={"btn btn-sm" + (ranToday.has(op.id) ? " btn-ghost" : " btn-acc")} type="button" onClick={() => trigger(op)}>{ranToday.has(op.id) ? "Run again" : "Trigger"}</button>
          </div>
        ))}
      </div>
      {recent.length > 0 && (
        <div style={{ padding: "0 16px 14px" }}>
          <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0" }}>Recent runs · {recent.length}</div>
          <div className="svc-hist">{recent.map((r) => { const p = (r.payload ?? {}) as { name?: string }; return (
            <div className="svc-hist__row" key={r.id}><span className="svc-hist__dot" style={{ background: "#1fb58a" }} /><div className="svc-hist__main"><b>{p.name}</b><span>{new Date(r.createdAt).toLocaleTimeString()}</span></div>{r.amount > 0 ? <span className="svc-hist__amt">{r.amount.toFixed(2)}</span> : <span className="pill ok">done</span>}</div>
          ); })}</div>
        </div>
      )}
    </div>
  );
}

export function ServiceTabPage({
  services,
  workspace,
  tabLabel,
  receipts,
  variant,
  onOpenPayment,
}: {
  services: Service[];
  workspace: Workspace;
  tabLabel: string;
  receipts: Receipt[];
  variant: "service" | "verify";
  onOpenPayment: (s: Service) => void;
}) {
  const [q, setQ] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const t = tabLabel.toLowerCase();

  const tabCat =
    t.includes("trading") ? "trading"
    : t.includes("tax") ? "tax"
    : t.includes("storage") ? "storage"
    : (t.includes("compute") || t.includes("inference")) ? "inference"
    : (t.includes("analy") || t.includes("wallet")) ? "analytics"
    : t.includes("intel") ? "game-intel"
    : null;

  // Always show every endpoint in the workspace — but float the tab's own category to the top.
  const base = [...services].sort((a, b) => {
    const ax = tabCat && a.category === tabCat ? 0 : 1;
    const bx = tabCat && b.category === tabCat ? 0 : 1;
    if (ax !== bx) return ax - bx;
    return b.calls - a.calls;
  });
  const primary = base[0];
  const rows = base
    .map((s, i) => ({ s, method: SVC_METHODS[i % SVC_METHODS.length] as string }))
    .filter(({ s }) => `${s.name} ${s.provider} ${s.network} ${s.category}`.toLowerCase().includes(q.toLowerCase()))
    .filter(({ method }) => methodFilter === "all" || method === methodFilter);

  // Tab-scoped slice — so KPIs / activity / callers differ between tabs of the
  // same workspace instead of repeating the same workspace-wide block everywhere.
  const tabServices = tabCat ? base.filter((s) => s.category === tabCat) : [];
  const scoped = tabServices.length ? tabServices : base;
  const scopedIds = new Set(scoped.map((s) => s.id));
  const tabReceipts = receipts.filter((r) => r.workspaceId === workspace.id && scopedIds.has(r.serviceId));
  const tabRecent = (tabReceipts.length ? tabReceipts : receipts.filter((r) => r.workspaceId === workspace.id)).slice(0, 7);

  const wsAgents = allAgents.filter((a) => a.workspaceId === workspace.id);
  const topCallers = wsAgents
    .map((a) => {
      const rs = tabReceipts.filter((r) => r.agentName === a.name);
      const calls = rs.length || Math.max(2, Math.round(hashPct(`${workspace.id}|${tabLabel}|${a.id}`, 0.15, 0.85) * 32));
      const spend = rs.reduce((s, r) => s + r.amount, 0) || calls * 0.04;
      return { name: a.name, calls, spend };
    })
    .sort((a, b) => b.calls - a.calls)
    .slice(0, 4);

  const scopedCalls = scoped.reduce((a, s) => a + s.calls, 0);
  const scopedAvg = scoped.length ? scoped.reduce((a, s) => a + s.priceUsd, 0) / scoped.length : 0;
  const scopedRevenue = tabReceipts.reduce((a, r) => a + r.amount, 0);
  const avgPrice = base.length ? base.reduce((a, s) => a + s.priceUsd, 0) / base.length : 0;
  const weekData = SVC_WEEK.map((label, i) => ({
    label,
    value: Math.max(1, Math.round((hashPct(`${workspace.id}|${tabLabel}|${i}`, 0.35, 1) * scopedCalls) / 7)),
  }));

  const [ttl, sub] = TAB_COPY[t] ?? [tabLabel, `Paid ${tabLabel.toLowerCase()} endpoints in the ${workspace.shortName} workspace — every call is wrapped by the x402 gateway.`];

  // True if any bespoke functional widget below already covers this tab; if not,
  // the generic QuickCallPanel is shown so every tab has a working call surface.
  const isVerifyFlavor = t.includes("pass") || (variant === "verify" && !t.includes("rule") && !t.includes("risk") && !t.includes("protection"));
  const hasFlavor =
    t.includes("escrow") || t.includes("alert") || t.includes("strateg") || t.includes("sandbox") ||
    isVerifyFlavor || t.includes("compute") || t.includes("inference") || t.includes("storage") ||
    t.includes("checkout") || t.includes("orbit") || t.includes("monitor") || t.includes("qiedex") || t.includes("dex") ||
    (workspace.id === "arbitrum" && (t.includes("stablecoin") || t.includes("payment") || t.includes("usdc") || t.includes("agent") || t.includes("marketplace") || t.includes("risk") || t.includes("rule") || t.includes("protection") || t.includes("stylus") || t.includes("rust"))) ||
    (workspace.id === "mantle" && (t.includes("alpha") || t.includes("meth") || t.includes("usdy") || t.includes("yield") || t.includes("rwa") || t.includes("devtool") || t.includes("dev tool") || t.includes("economy"))) ||
    (workspace.id === "liquify" && (t.includes("tax") || t.includes("wallet") || t.includes("analysis") || t.includes("trading"))) ||
    (workspace.id === "berkeley" && (t.includes("paid tool") || t.includes("catalog") || t.includes("playground"))) ||
    (workspace.id === "deepsurge" && (t.includes("trade") || t.includes("safety") || t.includes("intel") || t.includes("resource"))) ||
    (workspace.id === "eazo" && (t.includes("companion") || t.includes("subscription") || t.includes("life") || t.includes("os"))) ||
    (workspace.id === "sui" && (t.includes("walrus") || t.includes("storage") || t.includes("move") || t.includes("contracts") || t.includes("nft") || t.includes("market") || t.includes("wallet") || t.includes("agent"))) ||
    (workspace.id === "qie" && (t.includes("merchant") || t.includes("gaming") || t.includes("game") || t.includes("social") || t.includes("creator") || t.includes("wallet"))) ||
    (workspace.id === "0g" && (t.includes("compute") || t.includes("inference") || t.includes("storage") || t.includes("trading") || t.includes("privacy") || t.includes("sovereign") || t.includes("tee") || t.includes("identity") || t.includes("agent")));

  return (
    <section className="svc-tab">
      <div className="pay-market-hero">
        <small>{workspace.shortName} · {tabLabel}</small>
        <h2>{ttl}</h2>
        <p>{sub}</p>
        <label>
          <Search size={17} />
          <input value={q} onChange={(e) => setQ(e.currentTarget.value)} placeholder={`Search ${tabLabel.toLowerCase()}…`} />
        </label>
      </div>

      <div className="svc-kpis">
        <div className="svc-kpi"><span className="svc-kpi__k">Endpoints</span><span className="svc-kpi__v">{scoped.length}</span><span className="svc-kpi__d">{tabCat ? `${tabCat} category` : `across ${workspace.shortName}`}</span></div>
        <div className="svc-kpi"><span className="svc-kpi__k">Calls · 7d</span><span className="svc-kpi__v">{scopedCalls.toLocaleString()}</span><span className="svc-kpi__d">on this tab</span></div>
        <div className="svc-kpi"><span className="svc-kpi__k">Avg price</span><span className="svc-kpi__v">${scopedAvg.toFixed(3)}</span><span className="svc-kpi__d">per request here</span></div>
        <div className="svc-kpi"><span className="svc-kpi__k">Settled here</span><span className="svc-kpi__v">{tabReceipts.length}</span><span className="svc-kpi__d">{scopedRevenue > 0 ? fmtUsd(scopedRevenue) + " total" : "no receipts yet"}</span></div>
      </div>

      {/* ── FUNCTIONAL ZONE — the page is built around what you can DO here ── */}

      {t.includes("escrow") && <InteractiveEscrow workspace={workspace} />}
      {workspace.id === "arbitrum" && t.includes("escrow") && <ArbitrumEscrowPanel workspace={workspace} />}

      {t.includes("alert") && <AlertSubscriptions workspace={workspace} />}

      {(t.includes("strateg") || t.includes("sandbox")) && <BacktestRunner workspace={workspace} />}

      {workspace.id === "0g" && (t.includes("privacy") || t.includes("sovereign") || (variant === "verify" && !t.includes("pass") && !t.includes("rule") && !t.includes("risk"))) && (
        <OgPrivacyStepper workspace={workspace} />
      )}
      {workspace.id === "0g" && (t.includes("privacy") || t.includes("sovereign") || (variant === "verify" && !t.includes("pass") && !t.includes("rule") && !t.includes("risk"))) && (
        <SealedPayloadVault workspace={workspace} />
      )}

      {(t.includes("pass") || (variant === "verify" && !t.includes("rule") && !t.includes("risk") && !t.includes("privacy") && !t.includes("sovereign"))) && (
        <>
          <ProofVerifier workspace={workspace} />
          {workspace.id === "qie" ? <QiePassIssuer workspace={workspace} services={base} />
            : workspace.id === "0g" ? null
            : (
              <div className="panel block svc-flavor">
                <div className="block-head"><div className="ttl"><span className="sq soft"><Shield width={15} height={15} /></span><div><h3>Access rules</h3><div className="sub">who can call what, and the proof attached to each access</div></div></div></div>
                <ul className="svc-guarantees">
                  <li><Check width={13} height={13} /> Only addresses holding a valid pass / verified identity may call gated endpoints</li>
                  <li><Check width={13} height={13} /> Each access check is recorded as a single-use receipt with caller, endpoint and timestamp</li>
                  <li><Check width={13} height={13} /> Sealed request payloads are unsealed only for the matching receipt holder</li>
                  <li><Check width={13} height={13} /> Spend caps and allowlists are evaluated server-side before any payment clears</li>
                </ul>
              </div>
            )}
        </>
      )}

      {workspace.id === "0g" && (t.includes("compute") || t.includes("inference")) && <OgComputeCostChart workspace={workspace} />}
      {workspace.id === "0g" && (t.includes("compute") || t.includes("inference")) && <OgComputeKanban workspace={workspace} />}
      {(t.includes("compute") || t.includes("inference")) && <InferenceJobRunner workspace={workspace} />}
      {workspace.id === "0g" && (t.includes("compute") || t.includes("inference")) && <TeeAttestationVerifier workspace={workspace} />}

      {workspace.id === "0g" && t.includes("trading") && <OgAgentToAgentLoop workspace={workspace} />}
      {workspace.id === "0g" && t.includes("trading") && <OgTradingArenaWidget workspace={workspace} />}

      {t.includes("storage") && <StoragePinWidget workspace={workspace} />}
      {workspace.id === "0g" && t.includes("storage") && <DePinBulkPin workspace={workspace} />}

      {t.includes("checkout") && <><CheckoutLinkBuilder workspace={workspace} /><SettlementSplitConfig workspace={workspace} /></>}
      {workspace.id === "qie" && t.includes("checkout") && <QiePosWidget workspace={workspace} />}
      {workspace.id === "qie" && t.includes("checkout") && <QieBillSplitter workspace={workspace} />}
      {workspace.id === "qie" && t.includes("checkout") && <QieRequestPay workspace={workspace} />}
      {workspace.id === "qie" && (t.includes("checkout") || t.includes("merchant")) && <QieSalesAnalytics workspace={workspace} />}

      {(t.includes("orbit") || t.includes("monitor")) && <OrbitMonitorPanel workspace={workspace} />}
      {workspace.id === "arbitrum" && (t.includes("orbit") || t.includes("monitor")) && <RobinhoodChainPanel workspace={workspace} />}

      {(t.includes("qiedex") || t.includes("dex")) && <SwapQuoteDesk workspace={workspace} />}

      {workspace.id === "qie" && (t.includes("gaming") || t.includes("game")) && <GameItemShop workspace={workspace} />}
      {workspace.id === "qie" && (t.includes("social") || t.includes("creator")) && <QieCreatorTipsWidget workspace={workspace} />}
      {workspace.id === "qie" && (t.includes("social") || t.includes("creator")) && <QieCreatorSubscriptions workspace={workspace} />}
      {workspace.id === "qie" && t.includes("wallet") && <QieWalletDashboard workspace={workspace} />}
      {workspace.id === "qie" && t.includes("merchant") && <><MerchantPayoutsPanel workspace={workspace} /></>}

      {workspace.id === "arbitrum" && (t.includes("stablecoin") || t.includes("payment") || t.includes("usdc")) && <ArbPaymentFlowDiagram />}
      {workspace.id === "arbitrum" && (t.includes("stablecoin") || t.includes("payment") || t.includes("usdc")) && <ArbAddressBook />}
      {workspace.id === "arbitrum" && (t.includes("stablecoin") || t.includes("payment") || t.includes("usdc")) && <UsdcTransferWidget workspace={workspace} />}
      {workspace.id === "arbitrum" && (t.includes("stablecoin") || t.includes("payment") || t.includes("usdc")) && <BatchPayoutConsole workspace={workspace} />}
      {workspace.id === "arbitrum" && (t.includes("stablecoin") || t.includes("payment") || t.includes("usdc")) && <ArbRecurringPayments workspace={workspace} />}
      {workspace.id === "arbitrum" && t.includes("agent") && <AgentServiceRegistry workspace={workspace} onOpenPayment={onOpenPayment} />}
      {workspace.id === "arbitrum" && (t.includes("stylus") || t.includes("rust") || t.includes("agent")) && <StylusSnippetViewer workspace={workspace} />}
      {workspace.id === "arbitrum" && t.includes("stylus") && <ArbitrumStylusDeployPanel workspace={workspace} />}
      {workspace.id === "arbitrum" && t.includes("stylus") && <ArbContractPaymentSim workspace={workspace} />}
      {workspace.id === "arbitrum" && (t.includes("risk") || t.includes("rule") || t.includes("protection")) && <ArbAllowanceManager workspace={workspace} />}
      {workspace.id === "arbitrum" && (t.includes("risk") || t.includes("rule") || t.includes("protection")) && <SpendRulesEditor workspace={workspace} services={base} />}
      {workspace.id === "mantle" && t.includes("economy") && <MantleAgentEconomyDashboard workspace={workspace} />}
      {workspace.id === "mantle" && t.includes("alpha") && <AlphaDesk workspace={workspace} />}
      {workspace.id === "mantle" && t.includes("alpha") && <WhaleAlertFeed workspace={workspace} />}
      {workspace.id === "mantle" && (t.includes("meth") || t.includes("usdy") || (t.includes("yield") && !t.includes("alpha"))) && <MantleEarnCalc workspace={workspace} />}
      {workspace.id === "mantle" && (t.includes("meth") || t.includes("usdy") || (t.includes("yield") && !t.includes("alpha"))) && <MantlePortfolioRebalancer workspace={workspace} />}
      {workspace.id === "mantle" && (t.includes("meth") || t.includes("usdy") || (t.includes("yield") && !t.includes("alpha"))) && <YieldBoard workspace={workspace} />}
      {workspace.id === "mantle" && (t.includes("meth") || t.includes("usdy") || (t.includes("yield") && !t.includes("alpha"))) && <YieldProjectionCalc workspace={workspace} />}
      {workspace.id === "mantle" && (t.includes("strateg") || t.includes("sandbox")) && <StrategyDeployPanel workspace={workspace} />}
      {workspace.id === "mantle" && t.includes("rwa") && <RwaRegistry workspace={workspace} />}
      {workspace.id === "mantle" && (t.includes("devtool") || t.includes("dev tool")) && <MantleGasOptimizer workspace={workspace} />}
      {workspace.id === "mantle" && (t.includes("devtool") || t.includes("dev tool")) && <MantleDevToolsPanel workspace={workspace} />}
      {workspace.id === "liquify" && t.includes("trading") && <><LiveTickerBoard workspace={workspace} /><TradingSignalDesk workspace={workspace} /></>}
      {workspace.id === "liquify" && t.includes("tax") && <><TaxLotCalculator workspace={workspace} receipts={receipts} /><TaxExport workspace={workspace} receipts={receipts} /></>}
      {workspace.id === "liquify" && (t.includes("wallet") || t.includes("analysis")) && <><WalletRiskAnalyzer workspace={workspace} /><ApprovalRevokePlanner workspace={workspace} /></>}
      {workspace.id === "berkeley" && t.includes("playground") && <BuildToolWizard workspace={workspace} />}
      {workspace.id === "berkeley" && (t.includes("paid tool") || t.includes("catalog")) && <PaidToolsGrid workspace={workspace} services={services} onOpenPayment={onOpenPayment} />}
      {workspace.id === "deepsurge" && (t.includes("trade") || t.includes("safety")) && <><DeepSurgeProfitCalc workspace={workspace} /><FrontierTradeEscrow workspace={workspace} /><RouteRiskScorer workspace={workspace} /></>}
      {workspace.id === "deepsurge" && t.includes("intel") && <><FrontierMarketOracle workspace={workspace} /><FrontierIntelQuery workspace={workspace} /></>}
      {workspace.id === "deepsurge" && t.includes("resource") && <ResourceMapQuery workspace={workspace} />}
      {workspace.id === "eazo" && t.includes("companion") && <EazoChatPanel workspace={workspace} />}
      {workspace.id === "eazo" && t.includes("companion") && <EazoToolConsole workspace={workspace} />}
      {workspace.id === "eazo" && t.includes("subscription") && <EazoSubManager workspace={workspace} />}
      {workspace.id === "eazo" && (t.includes("life") || t.includes("os")) && <EazoDailyOps workspace={workspace} />}

      {workspace.id === "sui" && (t.includes("walrus") || t.includes("storage")) && <WalrusStorageWidget workspace={workspace} />}
      {workspace.id === "sui" && (t.includes("move") || t.includes("contracts")) && <MoveContractViewer workspace={workspace} />}
      {workspace.id === "sui" && (t.includes("nft") || t.includes("market")) && <SuiNftMarket workspace={workspace} />}
      {workspace.id === "sui" && (t.includes("wallet") || t.includes("agent")) && <><SuiAgentWalletPanel workspace={workspace} /><ZkLoginPanel workspace={workspace} /><SuiAgentEconomyLoop workspace={workspace} /></>}

      {!hasFlavor && <QuickCallPanel workspace={workspace} services={base} primary={base.find((s) => s.status === "active") ?? primary} onOpenPayment={onOpenPayment} receipts={receipts} />}

      {/* Endpoints — responsive cards; the Try button is always visible (no horizontal scroll) */}
      <div className="panel block" style={{ marginBottom: 18 }}>
        <div className="block-head">
          <div className="ttl"><span className="sq soft"><Bolt width={15} height={15} /></span><div><h3>{tabLabel} endpoints</h3><div className="sub">{tabCat ? `${tabCat} endpoints first` : "all endpoints"} · click Try to run the 402 → pay → unlock flow</div></div></div>
          <div className="row sm" style={{ gap: 6 }}>
            {["all", "GET", "POST"].map((mth) => (
              <button key={mth} className={"pill click" + (methodFilter === mth ? " on" : "")} type="button" onClick={() => setMethodFilter(mth)}>{mth === "all" ? "All" : mth}</button>
            ))}
          </div>
        </div>
        <div className="svc-ep-grid">
          {rows.map(({ s, method }) => {
            const Ico = CAT_ICON[s.category] ?? CAT_ICON.data;
            return (
              <div key={s.id} className="svc-ep-card">
                <div className="svc-ep-card__top">
                  <span className="sq sm" style={{ background: catColor(s.category) }}><Ico width={13} height={13} /></span>
                  <div className="svc-ep-card__id"><b>{s.name}</b><code>{endpointPath(s)}</code></div>
                  <span className={`mth mth--${method.toLowerCase()}`}>{method}</span>
                </div>
                <div className="svc-ep-card__meta">
                  <span><b>${s.priceUsd.toFixed(3)}</b> {s.currency}</span>
                  <span>p95 {s.latency}</span>
                  <span>{s.calls.toLocaleString()} / 7d</span>
                  {badgeFor(s.status)}
                </div>
                <button
                  className={`btn btn-sm ${s.status === "active" ? "btn-acc" : ""}`}
                  type="button"
                  disabled={s.status !== "active"}
                  onClick={() => { if (s.status === "active") onOpenPayment(s); }}
                >
                  {s.status === "active" ? <><Bolt width={12} height={12} /> Try · pay &amp; call</> : "Paused"}
                </button>
              </div>
            );
          })}
          {rows.length === 0 && <div className="muted sm" style={{ padding: "10px 4px" }}>No endpoints match this filter.</div>}
        </div>
      </div>

      {/* ── REFERENCE ── integrate / pricing / networks ── */}
      <div className="svc-tab__foot">
        <div className="panel block">
          <div className="block-head"><div className="ttl"><span className="sq soft"><Code width={15} height={15} /></span><div><h3>Integrate this endpoint</h3><div className="sub">{primary.name}</div></div></div></div>
          <div className="svc-foot__snip">
            <div className="svc-foot__snip-head"><span>cURL</span><CopyLine text={`curl -s https://gateway.tollgate.dev/${workspace.id}/${endpointPath(primary).split("/").pop()} \\\n  -H "X-Payment: $(tollgate pay ${primary.id})"`} /></div>
            <pre className="code-block">{`curl -s https://gateway.tollgate.dev/${workspace.id}/${endpointPath(primary).split("/").pop()} \\\n  -H "X-Payment: $(tollgate pay ${primary.id})"`}</pre>
          </div>
          <div className="svc-foot__snip">
            <div className="svc-foot__snip-head"><span>SDK</span><CopyLine text={`import { TollGate } from "@tollgate/sdk";\nconst ap = new TollGate({ wallet });\nconst res = await ap.call("${primary.id}", ${primary.sampleIn});`} /></div>
            <pre className="code-block">{`import { TollGate } from "@tollgate/sdk";\nconst ap = new TollGate({ wallet });\nconst res = await ap.call("${primary.id}", ${primary.sampleIn});`}</pre>
          </div>
        </div>

        <div className="panel block">
          <div className="block-head"><div className="ttl"><span className="sq soft"><CircleDollarSign width={15} height={15} /></span><div><h3>Pricing tiers</h3><div className="sub">per-call, billed against the agent budget</div></div></div></div>
          <div className="svc-table__scroll"><table className="svc-table">
            <thead><tr><th>Tier</th><th>Rate</th><th>Best for</th></tr></thead>
            <tbody>
              <tr><td><b>Free</b></td><td className="svc-table__num">100 calls / mo</td><td className="muted">trying it out</td></tr>
              <tr><td><b>Pro</b></td><td className="svc-table__num">${avgPrice.toFixed(3)} <span className="muted">/ call</span></td><td className="muted">pooled monthly billing</td></tr>
              <tr><td><b>Scale</b></td><td className="svc-table__num">${(avgPrice * 0.7).toFixed(3)} <span className="muted">/ call</span></td><td className="muted">volume −30% · invoiced</td></tr>
            </tbody>
          </table></div>
        </div>

        <div className="panel block">
          <div className="block-head"><div className="ttl"><span className="sq soft"><Network width={15} height={15} /></span><div><h3>Networks &amp; contracts</h3><div className="sub">where settlement happens</div></div></div></div>
          <div className="svc-hist">
            {workspace.networks.map((n) => (
              <div className="svc-hist__row" key={n}>
                <span className="svc-hist__dot" style={{ background: "var(--accent-primary)" }} />
                <div className="svc-hist__main"><b>{n}</b><span>x402 gateway live</span></div>
                <span className="pill ok">active</span>
              </div>
            ))}
            <div className="svc-hist__row">
              <span className="svc-hist__dot" style={{ background: "var(--muted)" }} />
              <div className="svc-hist__main"><b>Gateway</b><span><code>0x{fnvHex(`${workspace.id}-gw`)}…{fnvHex(`${workspace.id}-gw2`).slice(0, 4)}</code></span></div>
            </div>
            <div className="svc-hist__row">
              <span className="svc-hist__dot" style={{ background: "var(--muted)" }} />
              <div className="svc-hist__main"><b>Settlement</b><span><code>0x{fnvHex(`${workspace.id}-settle`)}…{fnvHex(`${workspace.id}-st2`).slice(0, 4)}</code></span></div>
            </div>
          </div>
        </div>
      </div>

      {/* ── INSIGHTS — collapsed by default so functional surfaces dominate; scoped to this tab ── */}
      <details className="svc-insights">
        <summary>{tabLabel} insights — usage chart · {variant === "verify" ? "guarantees" : "recent activity"} · top callers (scoped to this tab)</summary>
        <div style={{ marginTop: 14 }}>
          <div className="svc-tab__foot">
            <div className="panel block">
              <div className="block-head"><div className="ttl"><span className="sq soft"><Bolt width={15} height={15} /></span><div><h3>Call volume — {tabLabel}</h3><div className="sub">last 7 days{tabCat ? ` · ${tabCat} endpoints` : ""}</div></div></div></div>
              <WeekBars data={weekData} avgLabel={`${Math.max(1, Math.round(scopedCalls / 7)).toLocaleString()}/day avg`} />
            </div>
            {variant === "verify" ? (
              <div className="panel block">
                <div className="block-head"><div className="ttl"><span className="sq soft"><Shield width={15} height={15} /></span><div><h3>Guarantees</h3><div className="sub">enforced server-side on every request</div></div></div></div>
                <ul className="svc-guarantees">{ENFORCED.map((r) => (<li key={r}><Check width={13} height={13} /> {r}</li>))}</ul>
              </div>
            ) : (
              <div className="panel block">
                <div className="block-head"><div className="ttl"><span className="sq soft"><RIco width={15} height={15} /></span><div><h3>Recent activity — {tabLabel}</h3><div className="sub">{tabReceipts.length > 0 ? `latest ${tabCat ?? ""} receipts` : "latest receipts in this workspace"}</div></div></div></div>
                <div className="svc-hist">
                  {tabRecent.length === 0 && <div className="muted sm">No activity yet — try an endpoint.</div>}
                  {tabRecent.map((r) => (
                    <div className="svc-hist__row" key={r.id}>
                      <span className="svc-hist__dot" style={{ background: catColor(serviceById(r.serviceId)?.category ?? "data") }} />
                      <div className="svc-hist__main"><b>{r.serviceName}</b><span>{r.agentName} · {ago(r.createdAt)}</span></div>
                      {badgeFor(r.status)}
                      <span className="svc-hist__amt">{r.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="panel block">
              <div className="block-head"><div className="ttl"><span className="sq soft"><Robot width={15} height={15} /></span><div><h3>Top callers — {tabLabel}</h3><div className="sub">agents driving traffic to these endpoints</div></div></div></div>
              <div className="svc-hist">
                {topCallers.map((c) => (
                  <div className="svc-hist__row" key={c.name}>
                    <span className="svc-hist__dot" style={{ background: "var(--accent-primary)" }} />
                    <div className="svc-hist__main"><b>{c.name}</b><span>{c.calls.toLocaleString()} calls</span></div>
                    <span className="svc-hist__amt">{fmtUsd(c.spend)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </details>
    </section>
  );
}

// ---------------------------------------------------------------------------
// AGENTS
// ---------------------------------------------------------------------------

function AgentCard({ a, onTogglePause }: { a: Agent; onTogglePause: () => void }) {
  const status = a.status === "Ready" ? "active" : "paused";
  const pct = Math.min(100, (a.spentTodayUsd / a.dailyLimitUsd) * 100);
  return (
    <div className="svc">
      <div className="svc-top">
        <div className="left">
          <span className="sq lg" style={{ background: "var(--ink)" }}><Robot width={18} height={18} /></span>
          <div><h4>{a.name}</h4><div className="svc-cat">{a.wallet}</div></div>
        </div>
        {badgeFor(status)}
      </div>
      <div>
        <div className="spread" style={{ fontSize: 11.5, fontWeight: 600 }}><span className="muted">DAILY BUDGET</span><span className="num">${a.spentTodayUsd.toFixed(2)} / ${a.dailyLimitUsd.toFixed(2)}</span></div>
        <div className="pbar" style={{ marginTop: 6 }}><i style={{ width: `${pct}%`, background: pct > 80 ? "var(--red)" : "var(--acc-grad)" }} /></div>
      </div>
      <div className="io" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, whiteSpace: "normal" }}>
        <div><span className="k">max/req </span>${a.maxPerRequestUsd.toFixed(2)}</div>
        <div><span className="k">auto-pay </span>{a.autoPay ? "on" : "off"}</div>
        <div style={{ gridColumn: "1 / -1" }}><span className="k">allowlist </span>{a.allowlist.map((id) => serviceById(id)?.name ?? id).join(", ")}</div>
      </div>
      <div className="svc-foot">
        <div className="row sm muted" style={{ fontSize: 11, fontWeight: 600 }}>
          {a.autoPay ? <><Check width={12} height={12} style={{ color: "var(--green)" }} /> AUTO-SIGNS ≤ ${a.maxPerRequestUsd.toFixed(2)}</> : <><X width={12} height={12} style={{ color: "var(--red)" }} /> APPROVAL REQUIRED</>}
        </div>
        <button className="btn btn-ghost btn-sm" type="button" onClick={onTogglePause}><Shield width={13} height={13} /> {a.status === "Ready" ? "Pause agent" : "Resume agent"}</button>
      </div>
    </div>
  );
}

function SpendWeekCard({ agent, workspace }: { agent: Agent; workspace: Workspace }) {
  const data = SVC_WEEK.map((label, i) => ({
    label,
    value: Math.round(hashPct(`${workspace.id}|${agent.id}|spend|${i}`, 0.05, 1) * agent.dailyLimitUsd * 100) / 100,
  }));
  const total = data.reduce((s, x) => s + x.value, 0);
  return (
    <div className="svc">
      <div className="svc-top">
        <div className="left">
          <span className="sq lg" style={{ background: "var(--accent-primary)" }}><Bolt width={18} height={18} /></span>
          <div><h4>Spend this week</h4><div className="svc-cat">{agent.name}</div></div>
        </div>
        <span className="pill ok">{fmtUsd(total)}</span>
      </div>
      <WeekBars data={data} avgLabel={`${fmtUsd(total / 7)}/day avg · cap ${fmtUsd(agent.dailyLimitUsd)}`} />
      <div className="io" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, whiteSpace: "normal" }}>
        <div><span className="k">today </span>{fmtUsd(agent.spentTodayUsd)}</div>
        <div><span className="k">weekly cap </span>{fmtUsd(agent.dailyLimitUsd * 7)}</div>
      </div>
    </div>
  );
}

function NewAgentCard({ workspace }: { workspace: Workspace }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="svc svc--ghost"
      onClick={() => { setDone(true); setTimeout(() => setDone(false), 2200); }}
      style={{ textAlign: "left", cursor: "pointer" }}
    >
      <span className="sq lg" style={{ background: "var(--surface-3)", color: "var(--accent-primary)" }}>
        {done ? <Check width={18} height={18} /> : <Plus width={18} height={18} />}
      </span>
      <h4 style={{ marginTop: 10 }}>{done ? "Agent draft created" : "New agent"}</h4>
      <p className="muted sm" style={{ margin: "4px 0 0" }}>
        {done
          ? `A new agent for ${workspace.shortName} was queued — set its budget, allowlist and auto-pay cap to activate it.`
          : "Spin up another agent with its own budget, allowlist and per-request cap."}
      </p>
      <span className="row sm muted" style={{ marginTop: "auto", fontSize: 11, fontWeight: 700 }}>
        <Plus width={12} height={12} /> {done ? "OPEN DRAFT" : "ADD AGENT"}
      </span>
    </button>
  );
}

const ENFORCED = [
  "price ≤ maxPerRequestUsd",
  "spentToday + price ≤ dailyLimitUsd",
  "serviceId ∈ allowedServiceIds",
  "agent.status === active",
  "challenge not expired",
  "network matches service network",
  "payment proof is single-use",
  "recipient matches provider wallet",
];

// ---------------------------------------------------------------------------
// 0G — Agent ID Registry (Agents tab)
// ---------------------------------------------------------------------------
type RegAgent = { agentId: string; name: string; role: string; wallet: string; dailyCapUsd: number; sealed: boolean; createdAt: string; status: "active" | "revoked" };
const AG_ROLES = ["Job Worker", "Trading Agent", "Memory Curator", "Data Pipeline", "Custom"] as const;
const SEED_REG_AGENTS: RegAgent[] = [
  { agentId: "agid_0g_a1f3", name: "Yield Researcher", role: "Trading Agent", wallet: "0xag9c2a1e0bf3", dailyCapUsd: 10, sealed: true, createdAt: new Date(Date.now() - 5 * 864e5).toISOString(), status: "active" },
  { agentId: "agid_0g_77bd", name: "Memory Curator", role: "Memory Curator", wallet: "0xag4f1d77aac0", dailyCapUsd: 4, sealed: false, createdAt: new Date(Date.now() - 2 * 864e5).toISOString(), status: "active" },
];
function AgentIdRegistry({ workspace }: { workspace: Workspace }) {
  const { emitReceipt, receipts } = useAppState();
  const [list, setList] = useLocalStore<RegAgent[]>("0g.agentIds", SEED_REG_AGENTS);
  const [name, setName] = useState("Inference Worker");
  const [role, setRole] = useState<typeof AG_ROLES[number]>("Job Worker");
  const [cap, setCap] = useState("8");
  const [sealed, setSealed] = useState(true);
  const recent = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id && r.kind === "0g.agentid.register").slice(0, 6), [receipts, workspace.id]);

  const register = () => {
    const agentId = "agid_0g_" + hashId("agid", name + role, 4);
    const wallet = "0xag" + hashId("0xag", name + role + workspace.id, 12);
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
      {/* new agent form */}
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
      {/* identity card grid */}
      <div style={{ padding: "0 16px 6px" }}>
        <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "2px 0 8px" }}>Your agents · {list.length}</div>
        {list.length === 0 && <div style={{ color: "var(--muted)", fontSize: ".8rem", padding: "8px 0" }}>No agents yet — register one above.</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 12 }}>
          {list.map((a) => {
            const col = agentColor(a.agentId);
            const pts = sparkPath(a.agentId);
            return (
              <div key={a.agentId} style={{ borderRadius: 14, border: `1px solid ${a.status === "revoked" ? "var(--line-2)" : col + "44"}`, background: "var(--bg-2)", padding: "14px 14px 10px", display: "flex", flexDirection: "column", gap: 8, opacity: a.status === "revoked" ? 0.5 : 1, position: "relative", overflow: "hidden" }}>
                {/* accent top bar */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: col, borderRadius: "14px 14px 0 0" }} />
                {/* avatar + name */}
                <div className="row sm" style={{ gap: 10, alignItems: "center" }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: col + "22", border: `2px solid ${col}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: ".82rem", color: col, flexShrink: 0 }}>{agentInitials(a.name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: ".88rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</div>
                    <div style={{ fontSize: ".68rem", color: roleColor[a.role] ?? "var(--muted)", fontWeight: 700, marginTop: 2 }}>{a.role}</div>
                  </div>
                </div>
                {/* wallet */}
                <div style={{ fontFamily: "var(--mono)", fontSize: ".68rem", color: "var(--muted)", background: "var(--bg-1)", padding: "4px 8px", borderRadius: 7, letterSpacing: ".03em" }}>{a.wallet.slice(0, 18)}…</div>
                {/* badges row */}
                <div className="row sm" style={{ gap: 6, flexWrap: "wrap" }}>
                  <span className="pill" style={{ background: col + "18", color: col, fontWeight: 800, fontSize: ".62rem" }}>${a.dailyCapUsd}/day</span>
                  {a.sealed ? <span className="pill ok" style={{ fontSize: ".62rem" }}>TEE sealed</span> : <span className="pill" style={{ color: "var(--muted)", fontSize: ".62rem" }}>open exec</span>}
                  {a.status === "active" ? <span className="pill ok" style={{ fontSize: ".62rem" }}>active</span> : <span className="pill" style={{ background: "color-mix(in srgb,var(--red) 15%,transparent)", color: "var(--red)", fontSize: ".62rem" }}>revoked</span>}
                </div>
                {/* activity sparkline */}
                <div>
                  <div style={{ fontSize: ".58rem", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 3 }}>7-day activity</div>
                  <svg width="68" height="24" viewBox="0 0 62 32" style={{ display: "block" }}>
                    <polyline points={pts} fill="none" stroke={col} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
                    <polyline points={pts + ` 60,32 0,32`} fill={col + "22"} stroke="none" />
                  </svg>
                </div>
                {/* action */}
                <button className="btn btn-ghost btn-sm" type="button" style={{ alignSelf: "flex-start", marginTop: 2, fontSize: ".7rem", padding: "3px 10px" }} onClick={() => setStatus(a.agentId, a.status === "active" ? "revoked" : "active")}>{a.status === "active" ? "Revoke" : "Restore"}</button>
              </div>
            );
          })}
        </div>
      </div>
      {/* recent receipt feed */}
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

// ---------------------------------------------------------------------------
// 0G — Revenue Split Console (Agents tab)
// ---------------------------------------------------------------------------
function RevenueSplitConsole({ workspace }: { workspace: Workspace }) {
  const { emitReceipt, receipts } = useAppState();
  const wsServices = useMemo(() => allCatalogServices.filter((s) => s.workspaceIds.includes(workspace.id)), [workspace.id]);
  const [svcId, setSvcId] = useState(wsServices[0]?.id ?? "");
  const [pool, setPool] = useState("1.20");
  const [rows, setRows] = useState<{ wallet: string; pct: string }[]>([{ wallet: "0xrev9a2c1e0b", pct: "70" }, { wallet: "0xrev4f1d77aa", pct: "30" }]);
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

  // group splits by batchId for the recent list
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
        <div className="ttl"><span className="sq soft"><CircleDollarSign width={15} height={15} /></span><div><h3>Revenue split console</h3><div className="sub">fan a service's earnings out to N wallets · one receipt per recipient · automated billing / revenue-share</div></div></div>
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

// ---------------------------------------------------------------------------
// QIE — Agent Wallet Console (QIE Wallet tab)
// ---------------------------------------------------------------------------
type QieWalletState = { address: string; balance: number; cap: number };
function AgentWalletConsole({ workspace }: { workspace: Workspace }) {
  const { emitReceipt, receipts } = useAppState();
  const [w, setW] = useLocalStore<QieWalletState>("qie.wallet", { address: "0xqw" + hashId("0xqw", workspace.id, 12), balance: 12.5, cap: 1.0 });
  const [topup, setTopup] = useState("5.00");
  const [to, setTo] = useState("0xmerch9a2c1e0bf3");
  const [amount, setAmount] = useState("0.40");
  const [memo, setMemo] = useState("API tool call");
  const [capDraft, setCapDraft] = useState(String(w.cap));
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const activity = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id && (r.kind === "qie.wallet.send" || r.kind === "qie.wallet.topup")).slice(0, 8), [receipts, workspace.id]);

  const doTopup = () => {
    const a = parseFloat(topup) || 0; if (a <= 0) return;
    setW((s) => ({ ...s, balance: Number((s.balance + a).toFixed(4)) }));
    emitReceipt({ workspaceId: workspace.id, serviceName: "QIE Wallet · Deposit", amount: a, currency: "USDC", network: workspace.networks[0] ?? "qie-testnet", kind: "qie.wallet.topup", payload: { to: w.address, txHash: "0x" + hashId("tx", "topup" + Date.now(), 12) } });
    setNotice({ ok: true, text: `Topped up $${a.toFixed(2)}` });
  };
  const doSend = () => {
    const a = parseFloat(amount) || 0; if (a <= 0) return;
    if (a > w.cap) { setNotice({ ok: false, text: `$${a.toFixed(2)} exceeds the per-tx cap $${w.cap.toFixed(2)} — human approval required` }); return; }
    if (a > w.balance) { setNotice({ ok: false, text: "insufficient balance — top up first" }); return; }
    const txHash = "0x" + hashId("tx", to + amount + Date.now(), 12);
    setW((s) => ({ ...s, balance: Number((s.balance - a).toFixed(4)) }));
    emitReceipt({ workspaceId: workspace.id, serviceName: "QIE Wallet · Transfer", amount: a, currency: "USDC", network: workspace.networks[0] ?? "qie-testnet", kind: "qie.wallet.send", payload: { to: to.trim(), memo: memo.trim(), txHash } });
    setNotice({ ok: true, text: `Sent $${a.toFixed(2)} → ${to.slice(0, 12)}… · ${txHash.slice(0, 12)}…` });
  };
  const saveCap = () => { const c = parseFloat(capDraft) || 0; setW((s) => ({ ...s, cap: c })); emitReceipt({ workspaceId: workspace.id, serviceName: "QIE Wallet · Cap", amount: 0, currency: "USDC", network: workspace.networks[0] ?? "qie-testnet", kind: "qie.wallet.cap", payload: { cap: c } }); setNotice({ ok: true, text: `Per-tx cap set to $${c.toFixed(2)}` }); };

  return (
    <div className="panel block svc-flavor">
      <div className="block-head"><div className="ttl"><span className="sq soft"><Wallet width={15} height={15} /></span><div><h3>Agent wallet console</h3><div className="sub">self-custodial QIE wallet for the merchant agent · top up · send · per-tx cap · every send leaves a receipt</div></div></div></div>
      <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", padding: "0 16px 12px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontSize: ".58rem", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted)", fontWeight: 800 }}>Balance</span><span style={{ fontSize: "1.5rem", fontWeight: 800 }}>${w.balance.toFixed(2)} <span style={{ fontSize: ".7rem", fontWeight: 600, color: "var(--muted)" }}>USDC</span></span></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontSize: ".58rem", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted)", fontWeight: 800 }}>Per-tx cap</span><span style={{ fontSize: ".95rem", fontWeight: 800 }}>${w.cap.toFixed(2)}</span></div>
        <div style={{ flex: 1, minWidth: 200, fontFamily: "var(--mono)", fontSize: ".74rem", color: "var(--muted)" }}>{w.address}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, padding: "0 16px 12px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "10px 12px", borderRadius: 12, border: "1px solid var(--line-2)", background: "var(--bg-2)" }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Top up</span>
          <div className="row sm" style={{ gap: 8 }}><input value={topup} onChange={(e) => setTopup(e.currentTarget.value)} inputMode="decimal" style={{ flex: 1, padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--field)", color: "var(--ink)", fontSize: ".8rem" }} /><button className="btn btn-acc btn-sm" type="button" onClick={doTopup}><Plus width={12} height={12} /> Deposit</button></div>
          <div className="row sm" style={{ gap: 8, marginTop: 4 }}><span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700, flex: 1 }}>Per-tx cap</span><input value={capDraft} onChange={(e) => setCapDraft(e.currentTarget.value)} inputMode="decimal" style={{ width: 70, padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--field)", color: "var(--ink)", fontSize: ".8rem" }} /><button className="btn btn-ghost btn-sm" type="button" onClick={saveCap}>Save</button></div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "10px 12px", borderRadius: 12, border: "1px solid var(--line-2)", background: "var(--bg-2)" }}>
          <span style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Send payment</span>
          <div className="row sm" style={{ gap: 8 }}>
            <input value={to} onChange={(e) => setTo(e.currentTarget.value)} placeholder="recipient 0x…" style={{ flex: 1, padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--field)", color: "var(--ink)", fontSize: ".78rem", fontFamily: "var(--mono)" }} />
            <input value={amount} onChange={(e) => setAmount(e.currentTarget.value)} inputMode="decimal" style={{ width: 70, padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--field)", color: "var(--ink)", fontSize: ".8rem" }} />
            <input value={memo} onChange={(e) => setMemo(e.currentTarget.value)} placeholder="memo" style={{ width: 130, padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--field)", color: "var(--ink)", fontSize: ".78rem" }} />
            <button className="btn btn-acc btn-sm" type="button" onClick={doSend}><Send width={12} height={12} /> Send</button>
          </div>
        </div>
      </div>
      {notice && <div style={{ margin: "0 16px 12px", padding: "7px 12px", borderRadius: 10, background: `color-mix(in srgb, ${notice.ok ? "var(--green)" : "var(--red)"} 12%, transparent)`, color: notice.ok ? "var(--green)" : "var(--red)", fontSize: ".76rem", fontWeight: 700 }}>{notice.ok ? <Check width={13} height={13} /> : <X width={13} height={13} />} {notice.text}</div>}
      <div style={{ padding: "0 16px 14px" }}>
        <div style={{ fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 800, color: "var(--muted)", padding: "6px 0" }}>Recent wallet activity · {activity.length}</div>
        <div className="svc-hist">
          {activity.length === 0 && <div className="muted sm">No activity yet — top up or send above.</div>}
          {activity.map((r) => { const isSend = r.kind === "qie.wallet.send"; const p = (r.payload ?? {}) as { to?: string; memo?: string }; return (
            <div className="svc-hist__row" key={r.id}><span className="svc-hist__dot" style={{ background: isSend ? "#ff9b00" : "#1fb58a" }} /><div className="svc-hist__main"><b>{isSend ? "Sent" : "Deposit"} ${r.amount.toFixed(2)}</b><span>{isSend ? `${(p.to ?? "").slice(0, 12)}… · ${p.memo ?? ""}` : "into wallet"} · {new Date(r.createdAt).toLocaleTimeString()}</span></div>{badgeFor(r.status)}</div>
          ); })}
        </div>
      </div>
    </div>
  );
}

export function AgentsPage({ agent, workspace, tabLabel, onTogglePause }: { agent: Agent; workspace: Workspace; tabLabel: string; onTogglePause: () => void }) {
  return (
    <>
      <LedeHead crumb={`${workspace.id} workspace · ${tabLabel.toLowerCase()}`} title="Agents & budget policy">
        An agent can never spend more than its policy allows: a per-request cap, a daily budget, an allowlist of services and an
        emergency pause. The gateway enforces all of it server-side — the client is never trusted.
      </LedeHead>
      <WalletLiveStrip />
      <div className="svc-grid svc-grid--3 mb">
        <AgentCard a={agent} onTogglePause={onTogglePause} />
        <SpendWeekCard agent={agent} workspace={workspace} />
        <NewAgentCard workspace={workspace} />
      </div>
      {workspace.id === "0g" && <AgentIdRegistry workspace={workspace} />}
      {workspace.id === "0g" && <RevenueSplitConsole workspace={workspace} />}
      {workspace.id === "0g" && <OpenClawSkillConsole workspace={workspace} />}
      {workspace.id === "qie" && <AgentWalletConsole workspace={workspace} />}
      {workspace.id === "mantle" && <MantleAgentIdentity workspace={workspace} />}
      {workspace.id === "mantle" && <MantleVaultPanel workspace={workspace} />}
      {workspace.id === "mantle" && <MantleBudgetPanel workspace={workspace} />}
      {workspace.id === "mantle" && <MantleEconomyLoop workspace={workspace} />}
      {workspace.id === "eazo" && tabLabel.toLowerCase().includes("companion") && <EazoCompanionPanel workspace={workspace} />}
      {workspace.id === "eazo" && tabLabel.toLowerCase().includes("budget") && <EazoBudgetTracker workspace={workspace} />}
      {workspace.id === "eazo" && tabLabel.toLowerCase().includes("approval") && <EazoApprovalRules workspace={workspace} />}
      <div className="panel block">
        <div className="block-head"><div className="ttl"><span className="sq soft"><Shield width={15} height={15} /></span><div><h3>Enforced on every paid request</h3><div className="sub">server-side — frontend is never the source of truth</div></div></div></div>
        <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 10 }}>
          {ENFORCED.map((r) => (
            <li key={r} className="row sm" style={{ fontFamily: "var(--mono)", fontSize: 12 }}>
              <Check width={13} height={13} style={{ color: "var(--acc)", flex: "none" }} /> {r}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// RECEIPTS
// ---------------------------------------------------------------------------

function ReceiptRow({ r, onClick, active }: { r: Receipt; onClick?: () => void; active?: boolean }) {
  const cat = serviceById(r.serviceId)?.category ?? "data";
  const Ico = CAT_ICON[cat] ?? CAT_ICON.data;
  return (
    <div
      className="log-row"
      onClick={onClick}
      style={{
        cursor: onClick ? "pointer" : undefined,
        background: active ? "var(--blue-100)" : undefined,
        paddingLeft: active ? 8 : undefined,
        paddingRight: active ? 8 : undefined,
        borderRadius: active ? 9 : undefined,
      }}
    >
      <span className="sq sm" style={{ background: catColor(cat) }}><Ico width={12} height={12} /></span>
      <div className="lr-main">
        <b>{r.serviceName}</b>
        <div className="lr-sub">{r.agentName} → {r.providerWallet} · {r.network} · {ago(r.createdAt)}</div>
      </div>
      {badgeFor(r.status)}
      <span className="lr-amt">{r.amount.toFixed(2)} <span className="muted" style={{ fontWeight: 500, fontSize: 11 }}>{r.currency}</span></span>
    </div>
  );
}

const RECEIPT_FILTERS: (ReceiptStatus | "all")[] = ["all", "verified", "paid", "failed", "replayed", "expired"];

export function ReceiptsPage({ receipts, workspace, tabLabel }: { receipts: Receipt[]; workspace: Workspace; tabLabel: string }) {
  const [filter, setFilter] = useState<ReceiptStatus | "all">("all");
  const [sel, setSel] = useState<Receipt | null>(null);
  const all = useMemo(() => receipts.filter((r) => r.workspaceId === workspace.id), [receipts, workspace.id]);
  const rows = useMemo(() => all.filter((r) => filter === "all" || r.status === filter), [all, filter]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    all.forEach((r) => { c[r.status] = (c[r.status] ?? 0) + 1; });
    return c;
  }, [all]);
  const revenue = all.filter((r) => r.status === "verified" || r.status === "paid").reduce((s, r) => s + r.amount, 0);
  const failed = (counts.failed ?? 0) + (counts.replayed ?? 0) + (counts.expired ?? 0);

  return (
    <>
      <LedeHead crumb={`${workspace.id} workspace · ${tabLabel.toLowerCase()}`} title="Receipts & usage">
        Every paid request leaves an immutable receipt: payer, provider, amount, network, tx hash and verification status.
        Failed payments stay visible; replay attempts are logged.
      </LedeHead>

      <div className="metrics mb">
        <div className="metric"><div className="label">Revenue (verified)</div><div className="v">${revenue.toFixed(2)}</div><div className="sub">{(counts.verified ?? 0) + (counts.paid ?? 0)} verified payments</div></div>
        <div className="metric"><div className="label">Receipts</div><div className="v">{all.length}</div><div className="sub">all statuses</div></div>
        <div className="metric"><div className="label">Failed</div><div className="v" style={{ color: failed ? "var(--red)" : undefined }}>{failed}</div><div className="sub">funds / expiry / replay</div></div>
        <div className="metric"><div className="label">Replay attempts</div><div className="v">{counts.replayed ?? 0}</div><div className="sub">blocked at gateway</div></div>
      </div>

      <div className="row wrap mb" style={{ gap: 8 }}>
        {RECEIPT_FILTERS.map((f) => (
          <button key={f} className={"pill click" + (filter === f ? " on" : "")} onClick={() => setFilter(f)} type="button">
            {f === "all" ? "ALL" : f.toUpperCase()} <span style={{ opacity: 0.6 }}>{f === "all" ? all.length : counts[f] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="grid-2">
        <div className="panel block">
          <div className="block-head"><div className="ttl"><span className="sq soft"><RIco width={15} height={15} /></span><div><h3>Ledger</h3><div className="sub">{rows.length} receipts</div></div></div></div>
          {rows.length === 0 ? (
            <div className="empty"><div className="ttl">Nothing here</div><div>No receipts match this filter.</div></div>
          ) : (
            <div className="log">{rows.map((r) => <ReceiptRow key={r.id} r={r} onClick={() => setSel(r)} active={sel?.id === r.id} />)}</div>
          )}
        </div>

        <div className="panel block">
          <div className="block-head"><div className="ttl"><span className="sq soft"><LinkIco width={15} height={15} /></span><h3>Receipt</h3></div>{sel ? badgeFor(sel.status) : null}</div>
          {!sel ? (
            <div className="empty">Select a receipt to inspect it.</div>
          ) : (
            <div className="receipt-paper zig">
              <div className="spread"><span className="label">TOLLGATE · RECEIPT</span><span className="num muted" style={{ fontSize: 12 }}>{sel.id}</span></div>
              <hr className="line" />
              <div className="kv"><span className="k">Service</span><span className="v">{sel.serviceName}</span></div>
              <div className="kv"><span className="k">Workspace</span><span className="v">{sel.workspaceId}</span></div>
              <div className="kv"><span className="k">Agent</span><span className="v">{sel.agentName}</span></div>
              <div className="kv"><span className="k">Payer</span><span className="v">{sel.payerWallet}</span></div>
              <div className="kv"><span className="k">Provider</span><span className="v">{sel.providerWallet}</span></div>
              <div className="kv"><span className="k">Network</span><span className="v">{sel.network}</span></div>
              {(() => {
                const onchainTx = (sel.payload as Record<string, unknown> | undefined)?.["onchainTxHash"] ?? (sel.payload as Record<string, unknown> | undefined)?.["anchorTx"];
                const realTx = typeof onchainTx === "string" && onchainTx.startsWith("0x") ? onchainTx : null;
                return realTx ? (
                  <div className="kv"><span className="k">Anchor tx</span><a className="v" href={`https://chainscan.0g.ai/tx/${realTx}`} target="_blank" rel="noreferrer" style={{ color: "#2f6bff", textDecoration: "underline" }}>{realTx.slice(0, 10)}…{realTx.slice(-4)} ↗</a></div>
                ) : sel.txHash ? (
                  <div className="kv"><span className="k">Tx hash</span><span className="v" style={{ color: "#9a9a9a", fontWeight: 600 }}>{sel.txHash} · demo</span></div>
                ) : null;
              })()}
              {sel.errorCode ? <div className="kv"><span className="k">Error</span><span className="v" style={{ color: "var(--red)" }}>{sel.errorCode}</span></div> : null}
              <div className="kv"><span className="k">Created</span><span className="v">{new Date(sel.createdAt).toLocaleString()}</span></div>
              <hr className="line" />
              <div className="spread" style={{ alignItems: "baseline" }}><span className="label">Amount</span><span className="num" style={{ fontSize: 22, fontWeight: 700 }}>{sel.amount.toFixed(2)} <span className="muted" style={{ fontSize: 12, fontWeight: 500 }}>{sel.currency}</span></span></div>
              <hr className="line" />
              <div className="row sm" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".03em", color: "#7a7a7a", lineHeight: 1.5 }}>
                {(() => {
                  const onchainTx = (sel.payload as Record<string, unknown> | undefined)?.["onchainTxHash"] ?? (sel.payload as Record<string, unknown> | undefined)?.["anchorTx"];
                  const realTx = typeof onchainTx === "string" && onchainTx.startsWith("0x");
                  return realTx
                    ? <><Check width={12} height={12} style={{ color: "var(--green)" }} /> ANCHORED ON 0G · PROOF SINGLE-USE</>
                    : <><Check width={12} height={12} style={{ color: "#d98f1c" }} /> DEMO RECEIPT · SIMULATED x402 HANDSHAKE — anchor it on-chain with the “Anchor on 0G” button on the Storage / Compute widgets</>;
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// GATEWAY / SDK PAGE
// ---------------------------------------------------------------------------

const SDK_SNIPPET = `import { TollGateClient } from "tollgate-sdk";

const client = new TollGateClient({
  agentId: "agent_yield_researcher",
  wallet: agentWallet,
  policy: {
    maxPerRequestUsd: 0.25,
    dailyLimitUsd: 10,
    allowedServiceIds: ["svc_wallet_risk"],
  },
});

// 1. Agent calls the paid endpoint
// 2. Gateway returns 402 Payment Required + challenge
// 3. SDK checks policy, pays if price ≤ maxPerRequestUsd
// 4. Gateway verifies proof → returns protected response + receiptId

const result = await client.fetchPaid(
  "https://tollgate.app/api/gateway/svc_wallet_risk",
  { query: { address: "0x91…", chain: "arbitrum" } },
);

console.log(result.data);      // { riskScore: 82, summary: "…" }
console.log(result.receiptId); // "rcpt_abc123"`;

const CHALLENGE_EXAMPLE = `HTTP/1.1 402 Payment Required
Content-Type: application/json

{
  "error": "payment_required",
  "challenge": {
    "challengeId": "ch_8f2a1b",
    "serviceId": "svc_wallet_risk",
    "amount": "0.05",
    "currency": "USDC",
    "network": "base-sepolia",
    "payTo": "0xProv…a91c",
    "expiresAt": "2026-05-11T14:00:00Z",
    "requestHash": "0x3f8c…"
  }
}`;

const PAID_REQUEST_EXAMPLE = `GET /api/gateway/svc_wallet_risk HTTP/1.1
X-Agent-Id: agent_yield_researcher
X-Payment-Challenge: ch_8f2a1b
X-Payment-Proof: 0xSig…

→ 200 OK
{
  "data": { "riskScore": 82, "summary": "…" },
  "receiptId": "rcpt_abc123"
}`;

const FLOW_STEPS = [
  { n: "1", label: "Agent calls paid endpoint", note: "No special headers — agent doesn't know price yet" },
  { n: "402", label: "Gateway returns Payment Required", note: "Challenge includes amount, network, provider wallet, expiry, request hash" },
  { n: "2", label: "SDK checks agent policy", note: "price ≤ maxPerRequestUsd? serviceId ∈ allowlist? budget left?" },
  { n: "3", label: "Agent pays via stablecoin / x402", note: "On-chain or facilitator-routed; proof is single-use" },
  { n: "4", label: "Agent retries with payment proof", note: "X-Payment-Challenge + X-Payment-Proof headers" },
  { n: "5", label: "Gateway verifies proof", note: "Checks recipient, amount, network, challenge binding, replay" },
  { n: "6", label: "Protected response + receipt", note: "Data unlocked. Receipt saved. Usage dashboard updated." },
];

// ---------------------------------------------------------------------------
// LIVE GATEWAY — talks to the real ../server (x402 over HTTP). Falls back to a
// note when the server isn't running; the in-app PaymentModal stays the demo path.
// ---------------------------------------------------------------------------

type LiveStep = "idle" | "pinging" | "loading-services" | "ready" | "unpaid" | "paying" | "unlocked" | "offline";

function LiveGatewayPanel({ workspace }: { workspace: Workspace }) {
  const { emitReceipt } = useAppState();
  const [step, setStep] = useState<LiveStep>("pinging");
  const [services, setServices] = useState<api.ServerService[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [challenge, setChallenge] = useState<api.X402Challenge | null>(null);
  const [unlocked, setUnlocked] = useState<api.UnlockedResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const selected = services.find((s) => s.id === selectedId) ?? null;

  const reload = useCallback(async () => {
    setErr(null); setChallenge(null); setUnlocked(null);
    setStep("pinging");
    const up = await api.ping();
    if (!up) { setStep("offline"); return; }
    setStep("loading-services");
    try {
      const r = await api.listServices(workspace.id);
      setServices(r.services);
      setSelectedId((prev) => (r.services.some((s) => s.id === prev) ? prev : r.services[0]?.id ?? ""));
      setStep("ready");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed to load services");
      setStep("offline");
    }
  }, [workspace.id]);

  useEffect(() => { void reload(); }, [reload]);

  const sendUnpaid = async () => {
    if (!selectedId) return;
    setErr(null); setUnlocked(null);
    setStep("unpaid");
    try {
      const r = await api.gatewayUnpaid(selectedId);
      setChallenge(r.challenge);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "request failed");
      setStep("ready");
    }
  };

  const payAndRetry = async () => {
    if (!selectedId) return;
    setErr(null);
    setStep("paying");
    try {
      const r = await api.gatewayPay(selectedId);
      setUnlocked(r);
      setStep("unlocked");
      // Mirror the server receipt into the in-app ledger so it shows in Payments/Receipts.
      emitReceipt({
        workspaceId: workspace.id,
        serviceId: r.serviceId,
        serviceName: r.name,
        amount: r.receipt.amount,
        currency: r.receipt.currency,
        network: r.receipt.network,
        agentName: r.receipt.agentId,
        payerWallet: r.receipt.payerWallet,
        providerWallet: r.receipt.providerWallet,
        kind: "x402.live",
        status: (r.receipt.status as Receipt["status"]) ?? "verified",
        payload: { challengeId: r.receipt.challengeId, requestHash: r.receipt.requestHash, serverReceiptId: r.receiptId, data: r.data },
      });
    } catch (e) {
      const ex = e as { status?: number; body?: unknown };
      setErr(ex?.body ? JSON.stringify(ex.body) : e instanceof Error ? e.message : "payment failed");
      setStep("unpaid");
    }
  };

  const reset = () => { setChallenge(null); setUnlocked(null); setErr(null); setStep("ready"); };

  if (step === "offline" || (!api.API_ENABLED)) {
    return (
      <div className="panel block mb">
        <div className="block-head"><div className="ttl"><span className="sq soft"><Zap width={15} height={15} /></span><div><h3>Live gateway</h3><div className="sub">real x402 over HTTP — server offline</div></div></div>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => void reload()}>Retry</button></div>
        <div className="gw-note">
          <Shield width={14} height={14} />
          <span>
            The local <code>server/</code> isn't reachable{api.API_ENABLED ? <> at <code>{api.API_BASE}</code></> : <> (<code>VITE_API_BASE</code> is empty)</>}. Start it with{" "}
            <code>cd server &amp;&amp; npm install &amp;&amp; npm run dev</code> to see a real <code>402 Payment Required</code> handshake.
            Until then the in-app PaymentModal simulation below is used.
          </span>
        </div>
        {err && <pre className="code-block" style={{ marginTop: 10, color: "var(--red)" }}>{err}</pre>}
      </div>
    );
  }

  const busy = step === "pinging" || step === "loading-services" || step === "paying";

  return (
    <div className="panel block mb">
      <div className="block-head"><div className="ttl"><span className="sq soft"><Zap width={15} height={15} /></span><div><h3>Live gateway</h3><div className="sub">real x402 over HTTP · <code>{api.API_BASE}</code></div></div></div>
        <span className="row sm" style={{ gap: 6 }}>
          <span className="badge ok" style={{ fontSize: 11 }}>server up</span>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => void reload()}>Reload</button>
        </span>
      </div>

      <div className="row sm" style={{ gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <label className="row sm" style={{ gap: 6, fontSize: 12 }}>
          <span style={{ color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", fontSize: 10 }}>Service</span>
          <select value={selectedId} onChange={(e) => { setSelectedId(e.currentTarget.value); reset(); }} disabled={busy}
            style={{ padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--bg-2)", color: "var(--ink)", fontSize: 12, maxWidth: 320 }}>
            {services.map((s) => <option key={s.id} value={s.id}>{s.name} — ${s.priceUsd} {s.currency}</option>)}
          </select>
        </label>
        <button className="btn btn-ghost btn-sm" type="button" onClick={sendUnpaid} disabled={busy || !selectedId}>
          <X width={12} height={12} /> Send unpaid request
        </button>
        <button className="btn btn-acc btn-sm" type="button" onClick={payAndRetry} disabled={busy || !selectedId}>
          {step === "paying" ? <><Loader2 width={12} height={12} className="wallet-spin" /> Paying…</> : <><Check width={12} height={12} /> Pay &amp; retry (dev-bypass)</>}
        </button>
      </div>

      {selected && (
        <div className="row sm" style={{ gap: 8, fontSize: 12, color: "var(--muted)", marginBottom: 10, flexWrap: "wrap" }}>
          <code>GET {api.API_BASE}{selected.gatewayUrl}</code> · {selected.category} · {selected.network} · {selected.description}
        </div>
      )}

      {challenge && !unlocked && (
        <div className="panel block" style={{ marginBottom: 10 }}>
          <div className="block-head"><div className="ttl"><span className="sq soft"><X width={14} height={14} /></span><div><h4 style={{ margin: 0 }}>HTTP 402 Payment Required</h4><div className="sub">the gateway's unpaid response — copy the challenge, pay, retry with <code>X-PAYMENT</code></div></div></div></div>
          <pre className="code-block">{JSON.stringify({ x402Version: 1, error: "payment_required", challenge }, null, 2)}</pre>
        </div>
      )}

      {unlocked && (
        <div className="panel block" style={{ marginBottom: 10 }}>
          <div className="block-head"><div className="ttl"><span className="sq soft" style={{ color: "var(--green)" }}><Check width={14} height={14} /></span><div><h4 style={{ margin: 0 }}>200 OK · unlocked</h4><div className="sub">receipt <code>{unlocked.receiptId}</code> · mirrored into the receipts ledger</div></div></div>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => { navigator.clipboard?.writeText(JSON.stringify(unlocked, null, 2)).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1400); }}>
              {copied ? <><Check width={12} height={12} /> Copied</> : <><Copy width={12} height={12} /> Copy</>}
            </button>
          </div>
          <pre className="code-block">{JSON.stringify({ data: unlocked.data, receiptId: unlocked.receiptId, receipt: unlocked.receipt, note: unlocked.note }, null, 2)}</pre>
        </div>
      )}

      {err && <pre className="code-block" style={{ color: "var(--red)" }}>{err}</pre>}

      <div className="gw-note">
        <Shield width={14} height={14} />
        <span>
          This calls the real <code>server/</code> — <code>{api.API_BASE}/api/gateway/&lt;id&gt;</code>. The challenge is single-use, bound to a request hash, and expires in 5&nbsp;min;
          replays return <code>402 challenge_invalid</code>. <code>dev-bypass</code> stands in for a settled stablecoin payment in dev — production verifies a real on-chain proof.
        </span>
      </div>
    </div>
  );
}

export function GatewayPage({ workspace, tabLabel }: { workspace: Workspace; tabLabel: string }) {
  const [tab, setTab] = useState<"flow" | "sdk">("flow");
  const tl = tabLabel.toLowerCase();
  const bespoke =
    tl.includes("playground") ? <PlaygroundInspector />
    : tl.includes("explainer") ? <TxExplainerPanel workspace={workspace} />
    : tl.includes("debugger") ? <AgentDebuggerPanel workspace={workspace} />
    : null;
  const head = bespoke
    ? (tl.includes("playground") ? { t: "402 Playground", d: <>Fire a paid tool call and watch every step of the <b>402 → pay → verify → unlock</b> flow — the same handshake every endpoint in this product uses.</> }
      : tl.includes("explainer") ? { t: "Transaction explainer", d: <>Decode a pending wallet action before you sign it: what it touches, what it changes, and whether it's <b>safe</b>, <b>caution</b> or <b>danger</b>.</> }
      : { t: "Agent debugger", d: <>Replay an agent's last run step by step — the request, the 402 challenge, the policy check, the payment, the proof and the settled receipt.</> })
    : { t: "x402 Gateway", d: <>The gateway is the heart of TollGate. Every paid API call goes through the same handshake:{" "}<b>402 Payment Required → agent pays → gateway verifies → data unlocks</b>. The core flow is identical across all workspaces; only the network adapter changes.</> };
  return (
    <>
      <LedeHead crumb={`${workspace.id} workspace · ${tabLabel.toLowerCase()}`} title={head.t}>
        {head.d}
      </LedeHead>

      {bespoke}

      {bespoke && <div className="gw-divider"><span>Reference: the protocol underneath</span></div>}

      <LiveGatewayPanel workspace={workspace} />

      <div className="seg mb" style={{ display: "inline-flex" }}>
        <button type="button" className={tab === "flow" ? "on" : ""} onClick={() => setTab("flow")}>Protocol flow</button>
        <button type="button" className={tab === "sdk" ? "on" : ""} onClick={() => setTab("sdk")}>SDK</button>
      </div>

      {tab === "flow" ? (
        <>
          <div className="panel block mb">
            <div className="block-head"><div className="ttl"><span className="sq soft"><Zap width={15} height={15} /></span><div><h3>Request / payment cycle</h3><div className="sub">same flow for every workspace and network</div></div></div></div>
            <div className="gw-steps">
              {FLOW_STEPS.map((s) => (
                <div key={s.n} className="gw-step">
                  <div className="gw-step__num">{s.n}</div>
                  <div>
                    <div className="gw-step__label">{s.label}</div>
                    <div className="gw-step__note">{s.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid-2 mb">
            <div className="panel block">
              <div className="block-head"><div className="ttl"><span className="sq soft"><X width={15} height={15} /></span><div><h3>402 challenge</h3><div className="sub">unpaid request response</div></div></div></div>
              <pre className="code-block">{CHALLENGE_EXAMPLE}</pre>
            </div>
            <div className="panel block">
              <div className="block-head"><div className="ttl"><span className="sq soft"><Check width={15} height={15} /></span><div><h3>Paid request</h3><div className="sub">agent retries with proof</div></div></div></div>
              <pre className="code-block">{PAID_REQUEST_EXAMPLE}</pre>
            </div>
          </div>

          <div className="panel block mb">
            <div className="block-head"><div className="ttl"><span className="sq soft"><Shield width={15} height={15} /></span><div><h3>Security guarantees</h3><div className="sub">gateway enforces all of these</div></div></div></div>
            <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 }}>
              {[
                "Challenge expires after a short window",
                "Challenge is bound to the request hash",
                "Challenge bound to service ID + amount",
                "Payment amount ≥ required amount",
                "Recipient must match provider wallet",
                "Network must match service network",
                "Proof cannot be replayed (single-use)",
                "Frontend is never the source of truth",
              ].map((r) => (
                <li key={r} className="row sm" style={{ fontFamily: "var(--mono)", fontSize: 12 }}>
                  <Check width={13} height={13} style={{ color: "var(--acc)", flex: "none" }} /> {r}
                </li>
              ))}
            </ul>
          </div>

          <div className="gw-note mb">
            <Shield width={14} height={14} />
            <span><b>Demo facilitator mode:</b> this workspace simulates the 402 handshake. The production path is designed for x402 facilitator verification.</span>
          </div>
        </>
      ) : (
        <>
          <div className="panel block mb">
            <div className="block-head"><div className="ttl"><span className="sq soft"><Code width={15} height={15} /></span><div><h3>TypeScript SDK</h3><div className="sub">install: npm i tollgate-sdk</div></div></div>
              <CopyButton text={SDK_SNIPPET} /></div>
            <pre className="code-block">{SDK_SNIPPET}</pre>
          </div>

          <div className="panel block mb">
            <div className="block-head"><div className="ttl"><span className="sq soft"><Globe width={15} height={15} /></span><div><h3>Middleware (Express / Hono)</h3><div className="sub">protect any existing endpoint</div></div></div></div>
            <pre className="code-block">{`import { x402Middleware } from "tollgate-sdk/middleware";

app.use("/api/premium", x402Middleware({
  serviceId: "svc_wallet_risk",
  priceUsd: 0.05,
  currency: "USDC",
  network: "base-sepolia",
  settleTo: process.env.PROVIDER_WALLET,
}));

app.get("/api/premium/wallet-risk", (req, res) => {
  // only reached after verified payment
  res.json({ riskScore: 82, summary: "…" });
});`}</pre>
          </div>

          <div className="grid-2 mb">
            <div className="panel block">
              <div className="block-head"><div className="ttl"><span className="sq soft"><Shield width={15} height={15} /></span><h3>Policy config</h3></div></div>
              <pre className="code-block">{`{
  "agentId": "agent_yield_researcher",
  "dailyLimitUsd": 10,
  "maxPerRequestUsd": 0.25,
  "allowedServiceIds": [
    "svc_wallet_risk",
    "svc_yield_signal"
  ],
  "networks": ["base-sepolia"],
  "autoPay": true
}`}</pre>
            </div>
            <div className="panel block">
              <div className="block-head"><div className="ttl"><span className="sq soft"><RIco width={15} height={15} /></span><h3>Receipt response</h3></div></div>
              <pre className="code-block">{`{
  "data": {
    "riskScore": 82,
    "summary": "High exposure…"
  },
  "receiptId": "rcpt_abc123",
  "verifiedAt": "2026-05-11T13:45:01Z",
  "network": "base-sepolia",
  "txHash": "0x3f8c…"
}`}</pre>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button className="btn btn-ghost btn-sm" type="button" onClick={() => {
      navigator.clipboard?.writeText(text).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }}>
      {copied ? <><Check width={12} height={12} /> Copied</> : <><Copy width={12} height={12} /> Copy</>}
    </button>
  );
}

// ---------------------------------------------------------------------------

export function WorkspaceDashboard({
  agent,
  paidServiceIds,
  receipts,
  services,
  theme,
  tweakStyle,
  workspace,
  onAddService,
  onAskAI,
  onBack,
  onOpenPayment,
  onToggleTheme,
}: WorkspaceDashboardProps) {
  const railItems = useMemo(() => buildRail(workspace), [workspace]);
  const defaultIndex = useMemo(() => {
    const cat = railItems.findIndex((it) => it.kind === "catalogue" || it.kind === "service");
    return cat >= 0 ? cat : 0;
  }, [railItems]);
  const [activeIndex, setActiveIndex] = useState<ProductRailIndex>(defaultIndex);
  const [agentPaused, setAgentPaused] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const safeIndex = activeIndex < railItems.length ? activeIndex : 0;
  const activeRailItem = railItems[safeIndex] ?? railItems[0];
  const activeTab = activeRailItem.label;
  const kind: RailKind = activeRailItem.kind;
  const initials = agent.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const effectiveAgent = agentPaused ? { ...agent, status: "Paused" as const } : agent;
  const workspaceReceiptCount = receipts.filter((receipt) => workspace.id === receipt.workspaceId).length;

  const goByKind = (...kinds: RailKind[]): boolean => {
    for (const k of kinds) {
      const i = railItems.findIndex((it) => it.kind === k);
      if (i >= 0) { setActiveIndex(i); return true; }
    }
    return false;
  };

  const goToReceipts = () => { goByKind("receipts", "overview"); };

  const goTab = (matcher: string): boolean => {
    const needle = matcher.toLowerCase();
    const idx = railItems.findIndex((item, i) => i !== safeIndex && item.label.toLowerCase().includes(needle));
    if (idx >= 0) { setActiveIndex(idx); return true; }
    if (["wallet", "agent", "budget", "policy", "companion"].some((w) => needle.includes(w))) return goByKind("agents");
    if (["payment", "receipt", "approval"].some((w) => needle.includes(w))) return goByKind("receipts");
    if (["gateway", "explainer", "debugger", "playground", "sdk"].some((w) => needle.includes(w))) return goByKind("gateway", "service", "catalogue");
    if (["privacy", "verif", "compliance", "proof"].some((w) => needle.includes(w))) return goByKind("verify", "service");
    if (["market", "catalog"].some((w) => needle.includes(w))) return goByKind("catalogue", "service");
    if (["data", "checkout", "trading", "compute", "storage", "analy", "tax", "service", "report"].some((w) => needle.includes(w))) return goByKind("service", "catalogue");
    return false;
  };

  return (
    <section className="dashboard-screen pay-stage">
      <aside className="ws-nav" aria-label="Workspace navigation">
        <button className="ws-rail__brand" type="button" onClick={onBack} aria-label="All workspaces">
          <span className="ws-mark" aria-hidden="true"><span /></span>
          <span className="ws-rail__tip">All workspaces</span>
        </button>
        <nav className="ws-rail__nav" aria-label="Workspace tabs">
          {railItems.map(({ label, Icon }, index) => (
            <button
              key={`r-${label}-${index}`}
              type="button"
              aria-label={label}
              className={"ws-rail__item" + (index === safeIndex ? " is-active" : "")}
              onClick={() => setActiveIndex(index)}
            >
              <Icon size={20} />
              <span className="ws-rail__tip">{label}</span>
            </button>
          ))}
        </nav>
        <button
          className="ws-rail__item ws-rail__theme"
          type="button"
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          onClick={onToggleTheme}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          <span className="ws-rail__tip">{theme === "dark" ? "Light theme" : "Dark theme"}</span>
        </button>
        <button className="ws-rail__avatar" type="button" aria-label={agent.name} onClick={onAskAI}>
          <span>{initials || "AP"}</span><i />
          <span className="ws-rail__tip">{agent.name}</span>
        </button>
      </aside>

      <main className="dashboard-main pay-panel">
        <header className="dashboard-topbar pay-topbar">
          <div className="pay-page-heading">
            <small>{activeTab}</small>
            <h1>Welcome back, builder.</h1>
          </div>
          <div className="pay-topbar__actions">
            <button className="pay-gateway-pill" type="button" onClick={onAskAI}>
              <span />
              Gateway online · {workspaceReceiptCount.toLocaleString()} paid
            </button>
            <ConnectWalletButton compact />
            <button className="pay-avatar" type="button" aria-label={agent.name}><span>{initials || "AP"}</span></button>
          </div>
        </header>

        <div className="ap402" style={tweakStyle}>
          {kind === "overview" ? (
            <OverviewPage agent={effectiveAgent} receipts={receipts} services={services} workspace={workspace} onGoTab={goTab} onOpenPayment={onOpenPayment} onGoReceipts={goToReceipts} />
          ) : kind === "receipts" ? (
            <ReceiptsPage receipts={receipts} workspace={workspace} tabLabel={activeTab} />
          ) : kind === "agents" ? (
            <AgentsPage agent={effectiveAgent} workspace={workspace} tabLabel={activeTab} onTogglePause={() => setAgentPaused((p) => !p)} />
          ) : kind === "gateway" ? (
            <GatewayPage workspace={workspace} tabLabel={activeTab} />
          ) : kind === "service" || kind === "verify" ? (
            <ServiceTabPage services={services} workspace={workspace} tabLabel={activeTab} receipts={receipts} variant={kind === "verify" ? "verify" : "service"} onOpenPayment={onOpenPayment} />
          ) : (
            <CataloguePage agent={effectiveAgent} paidServiceIds={paidServiceIds} services={services} workspace={workspace} tabLabel={activeTab} onOpenPayment={onOpenPayment} onCreateOpen={() => setCreateOpen(true)} />
          )}
          <div className="act-foot" style={{ marginTop: 30 }}>
            <a href="#" onClick={(e) => e.preventDefault()}><HelpCircle size={14} style={{ verticalAlign: "-2px" }} /> Help</a>
            <a href="#" onClick={(e) => e.preventDefault()}>Privacy</a>
            <a href="#" onClick={(e) => e.preventDefault()}>Terms</a>
            <a href="#" onClick={(e) => e.preventDefault()}>Fees</a>
          </div>
        </div>
      </main>

      {createOpen ? (
        <CreateServiceModal
          workspace={workspace}
          onClose={() => setCreateOpen(false)}
          onAdd={(s) => { onAddService(s); }}
        />
      ) : null}
    </section>
  );
}
