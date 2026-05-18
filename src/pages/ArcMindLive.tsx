import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Brain,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Copy,
  ExternalLink,
  Info,
  Link2,
  RotateCcw,
  Settings,
  Shield,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { buildArcTraceProduct } from "../lib/arcTrace";
import { buildArcShareCard } from "../lib/arcShare";

const RAW_SERVER_URL = (
  (import.meta.env as Record<string, string | undefined>)["VITE_SERVER_URL"]
  ?? (import.meta.env as Record<string, string | undefined>)["VITE_API_BASE"]
  ?? (import.meta.env.DEV ? "http://127.0.0.1:8787" : "")
).replace(/\/+$/, "");
const LOOP_MS = 30 * 60 * 1000;
const ARC_CHAIN_HEX = "0x4cef52";
const ARC_EXPLORER_TX = "https://testnet.arcscan.app/tx/";
const ARC_FAUCET = "https://faucet.circle.com";

type CopyGuardAction = "COPY" | "REDUCE" | "STOP" | "HOLD_USDC" | "MOVE_TO_USYC";
type RiskProfile = "conservative" | "balanced" | "aggressive";
type ExecutionMode = "live" | "walkthrough";
type FeedbackPrompt = "clarity" | "trust" | "willingness" | "confusion";

type LeaderScore = {
  id: string;
  name: string;
  qualityScore: number;
  degradationScore: number;
  decayFactors?: {
    drawdown: number;
    recentLosses: number;
    volatility: number;
    confidenceDrop: number;
    signalDivergence: number;
  };
  decaySummary?: string;
  weightPct: number;
  action: CopyGuardAction;
  reason: string;
  winRatePct?: number;
  sharpe?: number;
  maxDrawdownPct?: number;
  recentPnlPct?: number;
  liquidityUsd?: number;
  recentLosses?: number;
};

type Decision = {
  ts: string;
  decision: "BUY" | "SELL" | "HOLD";
  primaryAction?: CopyGuardAction;
  ethPrice: number;
  oiValue?: string;
  fundingRate?: string;
  txHash?: string | null;
  mode?: "paper" | "arc";
  decisionHash?: string;
  copyGuardHash?: string;
  leaderScores?: LeaderScore[];
  allocation?: Array<{ leaderId: string; name: string; weightPct: number; action: CopyGuardAction }>;
  reasoningTrace?: string;
};

type ArcStats = {
  testers: number;
  connectedWallets: number;
  traceUnlocks: number;
  protectedPortfolios: number;
  killSwitchViews: number;
  feedbackCount: number;
  decisionCount: number;
  testnetUsdcVolume: number;
  feedbackPrompts?: Record<FeedbackPrompt, number>;
  feedbackQuotes: string[];
  validationHighlights?: Array<{ prompt: FeedbackPrompt; label: string; quote: string; ts: string }>;
};

type ArcAlert = {
  id: string;
  type: "leader_stop" | "degradation_threshold" | "risk_off" | "arc_tx_recorded";
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  ts?: string;
};

type ArcAuditItem = {
  id: string;
  kind: "agent_registered" | "decision_recorded" | "portfolio_receipt" | "trace_unlock";
  title: string;
  detail: string;
  ts?: string;
  txHash?: string;
  explorerUrl?: string;
  status: "verified" | "paid" | "paper";
};

type ArcDecisionReplayEvent = {
  id: string;
  step: "signal_observed" | "leaders_scored" | "risk_checked" | "action_chosen" | "arc_proof";
  title: string;
  detail: string;
  ts?: string;
  status: "observed" | "scored" | "checked" | "chosen" | "verified" | "paper";
  txHash?: string;
  explorerUrl?: string;
};

type ArcDecisionReplay = {
  decisionHash?: string;
  ts?: string;
  mode?: string;
  events: ArcDecisionReplayEvent[];
};

type ArcLivePayload = {
  status: {
    server: string;
    mode: "paper" | "arc";
    network: string;
    nextLoopHintMinutes: number;
    payoutAddress?: string;
    agentId?: string;
    registrationTxHash?: string;
  };
  latestDecision: Decision | null;
  decisions: Decision[];
  stats: ArcStats;
  auditTrail?: ArcAuditItem[];
  alerts?: ArcAlert[];
  decisionReplay?: ArcDecisionReplay | null;
  ts: string;
};

type ProtectedPortfolio = {
  portfolioId: string;
  riskProfile: RiskProfile;
  amountUsd: number;
  mode: "paper" | "arc";
  copyAllocations: Array<{ leaderId: string; name: string; weightPct: number; notionalUsd: number; action: CopyGuardAction }>;
  blockedLeaders: Array<{ leaderId: string; name: string; action: CopyGuardAction }>;
  riskOff: { asset: "USDC" | "USYC"; weightPct: number; notionalUsd: number };
  requestHash: string;
};

type PortfolioSimulation = {
  readOnly: true;
  portfolio: ProtectedPortfolio;
  selectedLeader?: { leaderId: string; name: string; weightPct: number; action: CopyGuardAction };
  expectedStopThresholdPct: number;
  estimatedFeesUsd: number;
  summary: string;
};

type PortfolioReceipt = {
  id: string;
  amount: number;
  currency: string;
  network: string;
  status: string;
  txHash?: string | null;
};

const DECAY_FACTOR_ROWS: Array<[keyof NonNullable<LeaderScore["decayFactors"]>, string]> = [
  ["drawdown", "Drawdown"],
  ["recentLosses", "Recent losses"],
  ["volatility", "Volatility"],
  ["confidenceDrop", "Confidence drop"],
  ["signalDivergence", "Signal divergence"],
];

const FEEDBACK_PROMPTS: Array<{ id: FeedbackPrompt; label: string; placeholder: string }> = [
  { id: "clarity", label: "Clarity", placeholder: "What became clearer or still feels unclear?" },
  { id: "trust", label: "Trust", placeholder: "What would make you trust or distrust this agent?" },
  { id: "willingness", label: "Would copy?", placeholder: "Would you use this before copying a trader? Why?" },
  { id: "confusion", label: "Confusion", placeholder: "What confused you first?" },
];

type Verification = {
  ok: boolean;
  reason: string;
  txHash?: string;
  decisionHash?: string;
};

type ArcReadinessCheck = {
  id: string;
  label: string;
  ok: boolean;
  severity: "required" | "launch" | "traction" | "onchain";
  weight: number;
  detail: string;
  fix?: string;
};

type ArcReadinessReport = {
  status: "ready_onchain" | "ready_paper" | "needs_decisions";
  score: number;
  checks: ArcReadinessCheck[];
  missing: string[];
  recommendedActions: string[];
  ts: string;
};

type ArcSignalSourceStatus = "configured" | "needs_key" | "watchlist" | "blocked";

type ArcSignalSource = {
  id: string;
  name: string;
  provider: string;
  category: "social" | "news" | "research" | "market" | "compliance";
  status: ArcSignalSourceStatus;
  requiredEnv?: string;
  url: string;
  rfbFit: string[];
  userValue: string;
  judgeValue: string;
  signalContribution: string;
  riskLevel: "low" | "medium" | "high";
  riskNote: string;
};

type ArcSignalSourceRadar = {
  mode: "off" | "watchlist" | "live";
  sources: ArcSignalSource[];
  summary: {
    total: number;
    configured: number;
    needsKey: number;
    watchlist: number;
    blocked: number;
  };
  missing: string[];
  recommendedActions: string[];
  ts: string;
};

type Eip1193 = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

function serverUrl(path: string) {
  return `${RAW_SERVER_URL}${path}`;
}

function sessionId(): string {
  const key = "arcmind-copyguard-session";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const next = `sess_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
  window.localStorage.setItem(key, next);
  return next;
}

async function track(type: string, extra: Record<string, unknown> = {}) {
  try {
    await fetch(serverUrl("/api/arc-traction/event"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, sessionId: sessionId(), ...extra }),
      signal: AbortSignal.timeout(4_000),
    });
  } catch {
    // Telemetry should never block the product path.
  }
}

function getEth(): Eip1193 | null {
  return typeof window !== "undefined" ? (window as unknown as { ethereum?: Eip1193 }).ethereum ?? null : null;
}

function short(v?: string | null, head = 6, tail = 4) {
  if (!v) return "n/a";
  if (v.length <= head + tail + 3) return v;
  return `${v.slice(0, head)}...${v.slice(-tail)}`;
}

function timeAgo(ts?: string) {
  if (!ts) return "pending";
  const diff = Math.max(0, (Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function actionColor(action: string) {
  if (action === "COPY" || action === "BUY") return "#10B981";
  if (action === "STOP" || action === "SELL") return "#EF4444";
  if (action === "REDUCE" || action === "HOLD") return "#F59E0B";
  return "#60A5FA";
}

function actionLabel(action?: string) {
  return (action ?? "HOLD").replace(/_/g, " ");
}

function secondsUntilNextDecision(ts?: string) {
  if (!ts) return null;
  const nextAt = new Date(ts).getTime() + LOOP_MS;
  return Math.max(0, Math.floor((nextAt - Date.now()) / 1000));
}

function formatBalance(hexWei: string) {
  try {
    const raw = BigInt(hexWei);
    const whole = raw / 10n ** 18n;
    const frac = (raw % (10n ** 18n)).toString().padStart(18, "0").slice(0, 4);
    return `${whole}.${frac}`.replace(/\.?0+$/, "");
  } catch {
    return "0";
  }
}

function usdToWeiHex(amountUsd: number) {
  const safe = Math.max(0, Math.min(1_000_000, Number.isFinite(amountUsd) ? amountUsd : 0));
  const [whole, frac = ""] = safe.toFixed(6).split(".");
  const wei = BigInt(whole) * 10n ** 18n + BigInt(frac.padEnd(18, "0").slice(0, 18));
  return `0x${wei.toString(16)}`;
}

function alertColor(severity: ArcAlert["severity"]) {
  if (severity === "critical") return "#EF4444";
  if (severity === "warning") return "#F59E0B";
  return "#60A5FA";
}

function replayStatusColor(status: ArcDecisionReplayEvent["status"]) {
  if (status === "verified" || status === "chosen") return "#10B981";
  if (status === "paper") return "#F59E0B";
  return "#60A5FA";
}

function readinessColor(status?: ArcReadinessReport["status"]) {
  if (status === "ready_onchain") return "#10B981";
  if (status === "ready_paper") return "#F59E0B";
  return "#EF4444";
}

function readinessLabel(status?: ArcReadinessReport["status"]) {
  if (status === "ready_onchain") return "Onchain ready";
  if (status === "ready_paper") return "Paper ready";
  return "Needs setup";
}

function signalStatusColor(status: ArcSignalSourceStatus) {
  if (status === "configured") return "#10B981";
  if (status === "needs_key") return "#F59E0B";
  if (status === "blocked") return "#EF4444";
  return "#60A5FA";
}

function signalStatusLabel(status: ArcSignalSourceStatus) {
  if (status === "configured") return "configured";
  if (status === "needs_key") return "needs key";
  if (status === "blocked") return "blocked";
  return "watchlist";
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="am-stat" style={{ borderColor: `${accent}33` }}>
      <div style={{ color: accent }} className="am-stat__value">{value}</div>
      <div className="am-stat__label">{label}</div>
    </div>
  );
}

function DecayFactorBar({ label, value }: { label: string; value: number }) {
  const safeValue = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div className="am-factor-row">
      <div>
        <span>{label}</span>
        <b>{safeValue.toFixed(1)}</b>
      </div>
      <div className="am-factor-track"><span style={{ width: `${safeValue}%`, background: actionColor(safeValue >= 70 ? "STOP" : safeValue >= 48 ? "REDUCE" : "COPY") }} /></div>
    </div>
  );
}

function Section({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <div className="am-panel" style={accent ? { borderColor: `${accent}44` } : undefined}>
      {children}
    </div>
  );
}

export function ArcMindLive() {
  const urlParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const initialProfile = (["conservative", "balanced", "aggressive"].includes(urlParams.get("profile") ?? "")
    ? urlParams.get("profile")
    : window.localStorage.getItem("arcmind-default-risk") ?? "balanced") as RiskProfile;
  const initialStake = Number(urlParams.get("stake") ?? window.localStorage.getItem("arcmind-stake") ?? 100);

  const [payload, setPayload] = useState<ArcLivePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alertItems, setAlertItems] = useState<ArcAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [readAlertIds, setReadAlertIds] = useState<string[]>(() => {
    try {
      return JSON.parse(window.localStorage.getItem("arcmind-read-alerts") ?? "[]") as string[];
    } catch {
      return [];
    }
  });
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [secsLeft, setSecsLeft] = useState<number | null>(null);
  const [traceOpen, setTraceOpen] = useState(false);
  const [traceBusy, setTraceBusy] = useState(false);
  const [traceReceipt, setTraceReceipt] = useState<PortfolioReceipt | null>(null);
  const [traceError, setTraceError] = useState<string | null>(null);
  const [riskProfile, setRiskProfile] = useState<RiskProfile>(initialProfile);
  const [amountUsd, setAmountUsd] = useState(Number.isFinite(initialStake) ? initialStake : 100);
  const [portfolio, setPortfolio] = useState<ProtectedPortfolio | null>(null);
  const [portfolioReceipt, setPortfolioReceipt] = useState<PortfolioReceipt | null>(null);
  const [portfolioBusy, setPortfolioBusy] = useState(false);
  const [simulation, setSimulation] = useState<PortfolioSimulation | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [simLeaderId, setSimLeaderId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletChain, setWalletChain] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [judgeOpen, setJudgeOpen] = useState(false);
  const [executionMode, setExecutionMode] = useState<ExecutionMode>(() => {
    const saved = window.localStorage.getItem("arcmind-execution-mode");
    return saved === "live" || saved === "walkthrough" ? saved : "walkthrough";
  });
  const [softMotion, setSoftMotion] = useState(() => window.localStorage.getItem("arcmind-motion") !== "off");
  const [compactMode, setCompactMode] = useState(() => window.localStorage.getItem("arcmind-compact") === "on");
  const [alertThreshold, setAlertThreshold] = useState(() => Number(window.localStorage.getItem("arcmind-alert-threshold") ?? 50));
  const [maxAllocationPct, setMaxAllocationPct] = useState(() => Number(window.localStorage.getItem("arcmind-max-allocation") ?? 35));
  const [maxDrawdownPct, setMaxDrawdownPct] = useState(() => Number(window.localStorage.getItem("arcmind-max-drawdown") ?? 12));
  const [manualApproval, setManualApproval] = useState(() => window.localStorage.getItem("arcmind-manual-approval") !== "off");
  const [notifyPayment, setNotifyPayment] = useState(() => window.localStorage.getItem("arcmind-notify-payment") !== "off");
  const [notifyLeaderRisk, setNotifyLeaderRisk] = useState(() => window.localStorage.getItem("arcmind-notify-leader-risk") !== "off");
  const [notifyNewTrace, setNotifyNewTrace] = useState(() => window.localStorage.getItem("arcmind-notify-new-trace") === "on");
  const [notifyProviderOutage, setNotifyProviderOutage] = useState(() => window.localStorage.getItem("arcmind-notify-provider-outage") !== "off");
  const [browserNotifyEnabled, setBrowserNotifyEnabled] = useState(() => window.localStorage.getItem("arcmind-browser-notify") === "on");
  const [selectedLeader, setSelectedLeader] = useState<LeaderScore | null>(null);
  const [scenario, setScenario] = useState<"none" | "funding" | "drawdown" | "calm" | "liquidity">("none");
  const [verification, setVerification] = useState<Verification | null>(null);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [readiness, setReadiness] = useState<ArcReadinessReport | null>(null);
  const [readinessError, setReadinessError] = useState<string | null>(null);
  const [sourceRadar, setSourceRadar] = useState<ArcSignalSourceRadar | null>(null);
  const [sourceRadarError, setSourceRadarError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [feedbackPrompt, setFeedbackPrompt] = useState<FeedbackPrompt>("clarity");
  const [, setClockTick] = useState(0);

  async function load() {
    try {
      const res = await fetch(serverUrl("/api/arc-live"), { signal: AbortSignal.timeout(8_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const nextPayload = await res.json() as ArcLivePayload;
      setPayload(nextPayload);
      setSecsLeft(secondsUntilNextDecision(nextPayload.latestDecision?.ts) ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "server unavailable");
    } finally {
      setLoading(false);
    }
  }

  async function loadAlerts() {
    setAlertsLoading(true);
    try {
      const res = await fetch(serverUrl(`/api/arc-alerts?threshold=${encodeURIComponent(String(alertThreshold))}`), { signal: AbortSignal.timeout(8_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { alerts: ArcAlert[] };
      setAlertItems(data.alerts ?? []);
      setAlertsError(null);
    } catch (err) {
      setAlertsError(err instanceof Error ? err.message : "alerts unavailable");
    } finally {
      setAlertsLoading(false);
    }
  }

  async function loadReadiness() {
    try {
      const res = await fetch(serverUrl("/api/arc-readiness"), { signal: AbortSignal.timeout(8_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as ArcReadinessReport;
      setReadiness(data);
      setReadinessError(null);
    } catch (err) {
      setReadinessError(err instanceof Error ? err.message : "readiness unavailable");
    }
  }

  async function loadSourceRadar() {
    try {
      const res = await fetch(serverUrl("/api/arc-signal-sources"), { signal: AbortSignal.timeout(8_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as ArcSignalSourceRadar;
      setSourceRadar(data);
      setSourceRadarError(null);
    } catch (err) {
      setSourceRadarError(err instanceof Error ? err.message : "signal sources unavailable");
    }
  }

  async function loadSimulation(selectedLeaderId = simLeaderId) {
    try {
      const res = await fetch(serverUrl("/api/arc-portfolio/simulate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId(),
          riskProfile,
          amountUsd,
          maxDrawdownPct,
          selectedLeaderId,
        }),
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { simulation: PortfolioSimulation };
      setSimulation(data.simulation);
      setSimulationError(null);
    } catch (err) {
      setSimulationError(err instanceof Error ? err.message : "simulation unavailable");
    }
  }

  async function refreshWallet(address = walletAddress) {
    const eth = getEth();
    if (!eth || !address) return;
    try {
      const [chain, balance] = await Promise.all([
        eth.request({ method: "eth_chainId" }) as Promise<string>,
        eth.request({ method: "eth_getBalance", params: [address, "latest"] }) as Promise<string>,
      ]);
      setWalletChain(chain);
      setWalletBalance(formatBalance(balance));
    } catch (err) {
      setWalletError(err instanceof Error ? err.message : "wallet refresh failed");
    }
  }

  async function connectWallet(): Promise<string | null> {
    const eth = getEth();
    if (!eth) {
      setWalletError("No wallet detected. Install MetaMask to make Arc payments.");
      return null;
    }
    try {
      setWalletError(null);
      const accounts = await eth.request({ method: "eth_requestAccounts" }) as string[];
      const address = accounts[0] ?? null;
      setWalletAddress(address);
      if (address) {
        await refreshWallet(address);
        await track("wallet_connect", { wallet: address });
      }
      return address;
    } catch (err) {
      setWalletError(err instanceof Error ? err.message : "wallet rejected");
      return null;
    }
  }

  async function detectWallet() {
    const eth = getEth();
    if (!eth) return;
    try {
      const accounts = await eth.request({ method: "eth_accounts" }) as string[];
      const address = accounts[0] ?? null;
      if (address) {
        setWalletAddress(address);
        await refreshWallet(address);
      }
    } catch {
      // Silent detection only; explicit connect handles user-facing errors.
    }
  }

  async function switchToArc() {
    const eth = getEth();
    if (!eth) return setWalletError("No wallet detected.");
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: ARC_CHAIN_HEX }] });
    } catch {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: ARC_CHAIN_HEX,
          chainName: "Arc L1 Testnet",
          nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
          rpcUrls: ["https://rpc.testnet.arc.network"],
          blockExplorerUrls: ["https://testnet.arcscan.app"],
        }],
      });
    }
    await refreshWallet();
  }

  async function ensureArcWallet(): Promise<string | null> {
    const address = walletAddress ?? await connectWallet();
    if (!address) return null;
    const eth = getEth();
    if (!eth) {
      setWalletError("No wallet detected. Install MetaMask to make Arc payments.");
      return null;
    }
    const chain = await eth.request({ method: "eth_chainId" }) as string;
    if (chain.toLowerCase() !== ARC_CHAIN_HEX) await switchToArc();
    return address;
  }

  async function sendArcPayment(amount: number, address: string): Promise<string> {
    const eth = getEth();
    const payoutAddress = payload?.status.payoutAddress;
    if (!eth) throw new Error("wallet_required");
    if (!payoutAddress) throw new Error("payout_address_missing");
    const txHash = await eth.request({
      method: "eth_sendTransaction",
      params: [{
        from: address,
        to: payoutAddress,
        value: usdToWeiHex(amount),
      }],
    }) as string;
    return txHash;
  }

  useEffect(() => {
    void track("page_open");
    void load();
    void loadAlerts();
    void loadReadiness();
    void loadSourceRadar();
    void detectWallet();
    const id = window.setInterval(() => {
      void load();
      void loadAlerts();
      void loadReadiness();
      void loadSourceRadar();
    }, 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    void loadAlerts();
  }, [alertThreshold]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const latest = payload?.latestDecision;
      if (latest?.ts) setSecsLeft(secondsUntilNextDecision(latest.ts) ?? null);
      setClockTick((v) => v + 1);
    }, 1_000);
    return () => window.clearInterval(id);
  }, [payload?.latestDecision]);

  useEffect(() => {
    window.localStorage.setItem("arcmind-default-risk", riskProfile);
    window.localStorage.setItem("arcmind-stake", String(amountUsd));
    const params = new URLSearchParams(window.location.search);
    params.set("profile", riskProfile);
    params.set("stake", String(amountUsd));
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [riskProfile, amountUsd]);

  useEffect(() => {
    window.localStorage.setItem("arcmind-motion", softMotion ? "on" : "off");
    window.localStorage.setItem("arcmind-compact", compactMode ? "on" : "off");
    window.localStorage.setItem("arcmind-alert-threshold", String(alertThreshold));
    window.localStorage.setItem("arcmind-max-allocation", String(maxAllocationPct));
    window.localStorage.setItem("arcmind-max-drawdown", String(maxDrawdownPct));
    window.localStorage.setItem("arcmind-manual-approval", manualApproval ? "on" : "off");
    window.localStorage.setItem("arcmind-notify-payment", notifyPayment ? "on" : "off");
    window.localStorage.setItem("arcmind-notify-leader-risk", notifyLeaderRisk ? "on" : "off");
    window.localStorage.setItem("arcmind-notify-new-trace", notifyNewTrace ? "on" : "off");
    window.localStorage.setItem("arcmind-notify-provider-outage", notifyProviderOutage ? "on" : "off");
    window.localStorage.setItem("arcmind-browser-notify", browserNotifyEnabled ? "on" : "off");
  }, [
    softMotion,
    compactMode,
    alertThreshold,
    maxAllocationPct,
    maxDrawdownPct,
    manualApproval,
    notifyPayment,
    notifyLeaderRisk,
    notifyNewTrace,
    notifyProviderOutage,
    browserNotifyEnabled,
  ]);

  useEffect(() => {
    window.localStorage.setItem("arcmind-read-alerts", JSON.stringify(readAlertIds.slice(-100)));
  }, [readAlertIds]);

  useEffect(() => {
    window.localStorage.setItem("arcmind-execution-mode", executionMode);
  }, [executionMode]);

  useEffect(() => {
    void loadSimulation(simLeaderId);
  }, [riskProfile, amountUsd, maxDrawdownPct, simLeaderId, payload?.latestDecision?.decisionHash]);

  const latest = payload?.latestDecision ?? null;
  const leaders = latest?.leaderScores ?? [];
  const stoppedLeader = leaders.find((leader) => leader.action === "STOP");
  const topCopy = leaders.find((leader) => leader.action === "COPY");
  const stats = payload?.stats;
  const feedbackPlaceholder = FEEDBACK_PROMPTS.find((item) => item.id === feedbackPrompt)?.placeholder ?? "Leave one useful note";
  const validationHighlights = stats?.validationHighlights ?? [];
  const alerts = useMemo(() => {
    const base = alertItems.length > 0 ? alertItems : payload?.alerts ?? [];
    return base.filter((alert) => {
      if (alert.type !== "degradation_threshold" && alert.type !== "leader_stop") return true;
      const score = Number(alert.detail.match(/\d+(\.\d+)?/)?.[0] ?? 0);
      return score >= alertThreshold;
    });
  }, [alertItems, payload?.alerts, alertThreshold]);
  const unreadAlerts = useMemo(() => alerts.filter((alert) => !readAlertIds.includes(alert.id)), [alerts, readAlertIds]);
  const visibleAlerts = unreadOnly ? unreadAlerts : alerts;
  const auditTrail = payload?.auditTrail ?? [];
  const decisionReplay = payload?.decisionReplay ?? null;
  const visibleSources = sourceRadar?.sources.filter((source) => source.status !== "blocked").slice(0, 6) ?? [];
  const blockedSources = sourceRadar?.sources.filter((source) => source.status === "blocked") ?? [];
  const mm = secsLeft !== null ? String(Math.floor(secsLeft / 60)).padStart(2, "0") : "--";
  const ss = secsLeft !== null ? String(secsLeft % 60).padStart(2, "0") : "--";
  const progress = secsLeft !== null ? Math.max(0, Math.min(100, (1 - secsLeft / (LOOP_MS / 1000)) * 100)) : 0;
  const mode = payload?.status.mode ?? "paper";
  const isArcWallet = walletChain?.toLowerCase() === ARC_CHAIN_HEX;
  const motionClass = softMotion ? "am-motion" : "am-no-motion";
  const compactClass = compactMode ? "am-compact" : "";
  const isWalkthrough = executionMode === "walkthrough";

  const traceProduct = useMemo(() => buildArcTraceProduct({
    latestDecision: latest,
    unlocked: traceOpen,
    receipt: traceReceipt,
  }), [latest, traceOpen, traceReceipt]);
  const shareCard = useMemo(() => buildArcShareCard({
    latestDecision: latest,
    shareUrl: typeof window !== "undefined" ? window.location.href : "",
    payoutAddress: payload?.status.payoutAddress,
  }), [latest, payload?.status.payoutAddress]);
  const judgeBrief = useMemo(() => {
    const lines = [
      "ArcMind CopyGuard is an AI risk layer for copy-traders on Arc.",
      "It detects leader strategy decay, decides COPY/REDUCE/STOP/HOLD_USDC/MOVE_TO_USYC, and exposes paid reasoning traces plus protected USDC portfolio receipts.",
      "RFB fit: RFB 06 Social Trading Intelligence primary; RFB 04 Adaptive Portfolio Manager and RFB 02 Trader Intelligence secondary.",
      `Readiness: ${readiness ? `${readinessLabel(readiness.status)} ${readiness.score}/100` : "pending"}.`,
      `Live metrics: ${stats?.testers ?? 0} testers, ${stats?.connectedWallets ?? 0} connected wallets, ${stats?.feedbackCount ?? 0} feedback notes, ${stats?.traceUnlocks ?? 0} trace unlocks, ${stats?.protectedPortfolios ?? 0} protected portfolios, $${(stats?.testnetUsdcVolume ?? 0).toFixed(2)} testnet USDC volume.`,
      `Latest decision: ${latest ? `${latest.primaryAction ?? latest.decision} at ${timeAgo(latest.ts)}` : "waiting for agent loop"}.`,
      "Demo boundary: read-only walkthrough never creates fake local receipts; live trace and portfolio actions require Arc wallet payment plus backend verification.",
    ];
    return lines.join("\n");
  }, [latest, readiness, stats]);

  const profilePreview = useMemo(() => {
    const baseCopy = leaders.filter((leader) => leader.action === "COPY").reduce((sum, leader) => sum + leader.weightPct, 0);
    return [
      { profile: "conservative", copy: Math.round(baseCopy * 0.68), riskOff: Math.round(100 - baseCopy * 0.68), asset: "USYC" },
      { profile: "balanced", copy: Math.round(baseCopy), riskOff: Math.round(100 - baseCopy), asset: "USDC/USYC" },
      { profile: "aggressive", copy: Math.round(Math.min(70, baseCopy * 1.25)), riskOff: Math.round(100 - Math.min(70, baseCopy * 1.25)), asset: "USDC" },
    ];
  }, [leaders]);

  const scenarioText = {
    none: "No shock selected. CopyGuard uses live market and leader decay signals.",
    funding: "Funding spike would raise crowding risk and can turn COPY into REDUCE for momentum leaders.",
    drawdown: "Leader drawdown shock pushes weak leaders toward STOP and increases USYC risk-off allocation.",
    calm: "Market calm lowers volatility penalty and may allow reduced leaders back into COPY with capped weights.",
    liquidity: "Liquidity drain punishes small leaders first, even when their win rate still looks high.",
  }[scenario];

  async function buyTrace() {
    if (isWalkthrough) {
      const message = "Read-only walkthrough is active. Switch to Live execution to create an Arc payment and receipt.";
      setTraceError(message);
      setWalletError(message);
      return;
    }
    setTraceBusy(true);
    setTraceError(null);
    try {
      const address = await ensureArcWallet();
      if (!address) throw new Error("Connect an Arc wallet to unlock the trace.");
      const txHash = await sendArcPayment(0.01, address);
      const res = await fetch(serverUrl("/api/arc-trace/unlock"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionId(), wallet: address, txHash }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { reason?: string; error?: string };
        throw new Error(err.reason ?? err.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as { receipt: PortfolioReceipt };
      setTraceReceipt(data.receipt);
      setTraceOpen(true);
      setTraceError(null);
      void load();
    } catch (err) {
      const message = err instanceof Error ? err.message.replace(/_/g, " ") : "trace unlock failed";
      setTraceError(message);
      setWalletError(message);
    } finally {
      setTraceBusy(false);
    }
  }

  async function startPortfolio() {
    if (isWalkthrough) {
      setWalletError("Read-only walkthrough is active. Switch to Live execution to create a protected portfolio receipt.");
      return;
    }
    setPortfolioBusy(true);
    try {
      const address = await ensureArcWallet();
      if (!address) throw new Error("Connect an Arc wallet to create a protected portfolio.");
      const txHash = await sendArcPayment(amountUsd, address);
      const res = await fetch(serverUrl("/api/arc-portfolio/start"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId(),
          riskProfile,
          amountUsd,
          wallet: address,
          txHash,
          settings: {
            maxAllocationPct,
            maxDrawdownPct,
            manualApproval,
            notifications: {
              payment: notifyPayment,
              leaderRisk: notifyLeaderRisk,
              newTrace: notifyNewTrace,
              providerOutage: notifyProviderOutage,
            },
          },
        }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { reason?: string; error?: string };
        throw new Error(err.reason ?? err.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as { portfolio: ProtectedPortfolio; receipt: PortfolioReceipt };
      setPortfolio(data.portfolio);
      setPortfolioReceipt(data.receipt);
      void load();
    } catch (err) {
      setWalletError(err instanceof Error ? err.message.replace(/_/g, " ") : "portfolio start failed");
    } finally {
      setPortfolioBusy(false);
    }
  }

  async function showKillSwitch() {
    await track("kill_switch_seen");
    setAlertsOpen(true);
    void load();
  }

  async function submitFeedback() {
    const clean = feedback.trim();
    if (!clean) return;
    await track("feedback_submit", { feedback: clean, feedbackPrompt, wallet: walletAddress ?? undefined });
    setFeedback("");
    setFeedbackSent(true);
    void load();
  }

  async function verifyLatestDecision() {
    setVerifyBusy(true);
    try {
      const res = await fetch(serverUrl("/api/arc-verify/latest"), { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { verification: Verification };
      setVerification(data.verification);
    } catch (err) {
      setVerification({ ok: false, reason: err instanceof Error ? err.message : "verification_failed" });
    } finally {
      setVerifyBusy(false);
    }
  }

  async function writeClipboard(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  }

  async function copyShareLink() {
    await writeClipboard(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function copyText(value?: string | null) {
    if (!value) return;
    await writeClipboard(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function whyAlertFired(alert: ArcAlert) {
    if (alert.type === "leader_stop") return "CopyGuard saw a leader cross the stop/copy-risk boundary, so new allocation is blocked until the next decision cycle improves.";
    if (alert.type === "degradation_threshold") return `The leader decay score crossed your ${alertThreshold} alert threshold based on drawdown, losses, volatility, and signal divergence.`;
    if (alert.type === "risk_off") return "ArcMind moved capital toward USDC/USYC because the current signal mix is not strong enough for copy allocation.";
    if (alert.type === "arc_tx_recorded") return "A new Arc decision transaction or receipt was recorded and can be checked in the audit trail.";
    return "ArcMind generated this alert from the latest decision state.";
  }

  function markAlertRead(id: string) {
    setReadAlertIds((prev) => prev.includes(id) ? prev : [...prev, id].slice(-100));
  }

  function markAllAlertsRead() {
    setReadAlertIds((prev) => Array.from(new Set([...prev, ...alerts.map((alert) => alert.id)])).slice(-100));
  }

  async function toggleBrowserNotifications() {
    if (!("Notification" in window)) {
      setWalletError("Browser notifications are not supported here.");
      return;
    }
    if (browserNotifyEnabled) {
      setBrowserNotifyEnabled(false);
      return;
    }
    const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
    if (permission === "granted") {
      setBrowserNotifyEnabled(true);
      new Notification("ArcMind alerts enabled", { body: "You will see local browser alerts for critical CopyGuard events." });
    } else {
      setBrowserNotifyEnabled(false);
      setWalletError("Browser notification permission was not granted.");
    }
  }

  const judgeChecks = [
    {
      label: "Agent mode",
      ok: mode === "arc",
      detail: mode === "arc" ? "Arc signing configured" : "Paper mode until Arc env is configured",
      copy: payload?.status.agentId,
    },
    {
      label: "Latest decision",
      ok: Boolean(latest),
      detail: latest ? `${latest.decision} ETH at $${latest.ethPrice?.toLocaleString() ?? "n/a"}` : "Waiting for agent loop",
      copy: latest?.decisionHash,
    },
    {
      label: "Arc tx",
      ok: Boolean(latest?.txHash),
      detail: latest?.txHash ? short(latest.txHash, 10, 8) : "No tx hash on latest decision",
      copy: latest?.txHash,
    },
    {
      label: "Paid trace",
      ok: Boolean(traceReceipt),
      detail: traceReceipt ? `Verified ${short(traceReceipt.txHash ?? traceReceipt.id, 10, 6)}` : "$0.01 unlock requires wallet payment",
      copy: traceReceipt?.txHash ?? traceReceipt?.id,
    },
    {
      label: "Protected portfolio",
      ok: Boolean(portfolioReceipt),
      detail: portfolioReceipt ? `${portfolioReceipt.status} receipt` : "Requires Arc wallet payment",
      copy: portfolioReceipt?.txHash ?? portfolioReceipt?.id,
    },
    {
      label: "Traction",
      ok: Boolean(stats && (stats.testers > 0 || stats.connectedWallets > 0 || stats.feedbackCount > 0)),
      detail: stats ? `${stats.testers} testers, ${stats.connectedWallets} wallets, ${stats.feedbackCount} feedback` : "Stats loading",
    },
  ];

  return (
    <div className={`am-page ${motionClass} ${compactClass}`}>
      <header className="am-topbar">
        <div className="am-brand"><Shield size={18} /><strong>ArcMind CopyGuard</strong></div>
        <span className="am-badge am-badge--green">{mode === "arc" ? "ARC LIVE" : "PAPER LIVE"}</span>
        <div className="am-mode-switch" aria-label="Execution mode">
          <button className={executionMode === "walkthrough" ? "is-active" : ""} onClick={() => setExecutionMode("walkthrough")}>Read-only walkthrough</button>
          <button className={executionMode === "live" ? "is-active" : ""} onClick={() => setExecutionMode("live")}>Live execution</button>
        </div>
        <div className="am-topbar__spacer" />
        <button className="am-iconbtn" onClick={() => setAlertsOpen(true)} title="Alerts" aria-label="Alerts">
          <Bell size={16} /><span className="am-count">{unreadAlerts.length}</span>
        </button>
        <button className="am-judgebtn" onClick={() => setJudgeOpen(true)}>
          <CheckCircle2 size={15} /> Judge Walkthrough
        </button>
        <button className="am-iconbtn" onClick={copyShareLink} title="Copy share link"><Link2 size={16} /></button>
        <button className="am-iconbtn" onClick={() => setSettingsOpen(true)} title="Settings" aria-label="Settings"><Settings size={16} /></button>
        <button className="am-walletbtn" onClick={() => { void (walletAddress ? refreshWallet() : connectWallet()); }}>
          <Wallet size={15} /> {walletAddress ? short(walletAddress) : "Connect Wallet"}
        </button>
      </header>

      {copied && <div className="am-toast">Share link copied</div>}

      <main className="am-main">
        <div className={`am-mode-note ${isWalkthrough ? "is-readonly" : "is-live"}`}>
          <Info size={15} />
          <span>
            {isWalkthrough
              ? "Read-only walkthrough is active. You can inspect decisions, alerts, proofs and example outcomes; paid actions will not create local receipts."
              : "Live execution is active. Paid actions require an Arc wallet transaction and backend verification before any receipt appears."}
          </span>
        </div>

        <section className="am-hero-grid">
          <Section>
            <div className="am-eyebrow">Protected copy-trading agent</div>
            <h1>Stop copying leaders after their alpha decays.</h1>
            <p className="am-copy">
              ArcMind watches live market signals and copy-leader decay, then decides who to copy, how much to allocate, and when to stop. Reasoning traces are paid and auditable; settlement is designed around USDC on Arc.
            </p>

            <div className="am-controls">
              <div className="am-segment">
                {(["conservative", "balanced", "aggressive"] as RiskProfile[]).map((profile) => (
                  <button key={profile} type="button" onClick={() => setRiskProfile(profile)} className={riskProfile === profile ? "is-active" : ""}>
                    {profile}
                  </button>
                ))}
              </div>
              <label className="am-input">
                <span>USDC stake</span>
                <input value={amountUsd} min={1} max={10000} step={1} type="number" onChange={(e) => setAmountUsd(Number(e.currentTarget.value))} />
              </label>
            </div>

            <div className="am-actions">
              <button onClick={startPortfolio} disabled={portfolioBusy || isWalkthrough} className="am-primary" title={isWalkthrough ? "Switch to Live execution to create an Arc receipt" : undefined}>
                <Copy size={15} /> {isWalkthrough ? "Live execution required" : portfolioBusy ? "Waiting for Arc payment..." : portfolio ? "Portfolio Created" : "Create Protected Portfolio"}
              </button>
              <button onClick={buyTrace} disabled={traceBusy || isWalkthrough} className="am-secondary" title={isWalkthrough ? "Switch to Live execution to unlock a paid trace" : undefined}><Brain size={15} /> {isWalkthrough ? "Trace locked in walkthrough" : traceBusy ? "Paying..." : "Unlock Trace - $0.01"}</button>
              <a href="/app/agora" className="am-ghost"><ExternalLink size={15} /> Full Console</a>
            </div>
            {isWalkthrough && (
              <p className="am-readonly-hint">
                Read-only example: this screen shows how the product behaves after verified payments, but it will not send transactions or write receipts until you switch to Live execution.
              </p>
            )}
          </Section>

          <Section>
            <div className="am-panel-title"><Clock size={16} /> Next autonomous decision</div>
            <div className="am-countdown">{mm}:{ss}</div>
            <div className="am-progress"><span style={{ width: `${progress}%` }} /></div>
            <p className="am-muted">{loading ? "Loading live agent state..." : error ? `Backend unavailable: ${error}` : `Server online. Latest decision ${timeAgo(latest?.ts)}.`}</p>
            <div className="am-wallet-card">
              <div><b>{walletAddress ? "Wallet connected" : "Read-only without wallet"}</b><span>{walletAddress ? short(walletAddress, 8, 6) : "Connect wallet for paid Arc receipts"}</span></div>
              <div><b>{isArcWallet ? "Arc Testnet" : "Needs Arc"}</b><span>{walletBalance ? `${walletBalance} USDC` : walletError ?? "Connect to show balance"}</span></div>
              <div><b>Mode</b><span>{isWalkthrough ? "Read-only walkthrough" : "Live execution"}</span></div>
              <div><b>Submission</b><span style={{ color: readinessColor(readiness?.status) }}>{readiness ? `${readinessLabel(readiness.status)} - ${readiness.score}/100` : readinessError ?? "Checking..."}</span></div>
              <div><b>Controls</b><span>{manualApproval ? "Manual approval" : "Auto after wallet"} - max {maxAllocationPct}% / leader</span></div>
              <div><b>Stop rule</b><span>{maxDrawdownPct}% max drawdown</span></div>
              <div><b>Payout</b><span>{short(payload?.status.payoutAddress, 8, 6)}</span></div>
              <div><b>Agent</b><span>{short(payload?.status.agentId, 8, 6)}</span></div>
              {!isArcWallet && walletAddress && <button onClick={switchToArc}>Switch to Arc</button>}
              <a href={ARC_FAUCET} target="_blank" rel="noreferrer">Get testnet USDC <ExternalLink size={12} /></a>
            </div>
          </Section>
        </section>

        <section className="am-two-col">
          <Section>
            <div className="am-block-head">
              <div><h2><Activity size={18} /> Latest CopyGuard Decision</h2><p>{latest ? `${timeAgo(latest.ts)} - ETH $${latest.ethPrice?.toLocaleString() ?? "n/a"} - OI ${latest.oiValue ?? "n/a"}` : "Waiting for agent loop"}</p></div>
              {latest?.txHash && <a href={`${ARC_EXPLORER_TX}${latest.txHash}`} target="_blank" rel="noreferrer">Arc tx <ExternalLink size={13} /></a>}
            </div>

            <div className="am-stat-grid">
              <MiniStat label="Primary action" value={actionLabel(latest?.primaryAction ?? latest?.decision)} accent={actionColor(latest?.primaryAction ?? latest?.decision ?? "HOLD")} />
              <MiniStat label="Top copy target" value={topCopy ? `${topCopy.weightPct}%` : "0%"} accent="#10B981" />
              <MiniStat label="Stopped leader" value={stoppedLeader ? "1" : "0"} accent="#EF4444" />
            </div>

            {latest?.decisionHash && (
              <div className="am-hash-grid">
                <div><span>Decision hash</span><code>{latest.decisionHash}</code></div>
                <div><span>CopyGuard hash</span><code>{latest.copyGuardHash ?? latest.decisionHash}</code></div>
              </div>
            )}

            <div className="am-share-card">
              <div>
                <span>Shareable decision card</span>
                <b>{shareCard.title}</b>
                {shareCard.lines.slice(0, 3).map((line) => <p key={line}>{line}</p>)}
              </div>
              <button onClick={() => { void copyText(shareCard.shareText); }}><Copy size={14} /> Copy share text</button>
            </div>

            <div className="am-leader-table">
              <div className="am-leader-head"><span>Leader</span><span>Action</span><span>Weight</span><span>Decay</span><span>Reason</span></div>
              {leaders.map((leader) => (
                <button key={leader.id} className="am-leader-row" onClick={() => setSelectedLeader(leader)}>
                  <strong>{leader.name}</strong>
                  <span style={{ color: actionColor(leader.action) }}>{actionLabel(leader.action)}</span>
                  <span>{leader.weightPct}%</span>
                  <span>{leader.degradationScore.toFixed(1)}</span>
                  <span>{leader.decaySummary ?? leader.reason}</span>
                </button>
              ))}
            </div>
          </Section>

          <aside className="am-side">
            <Section accent="#EF4444">
              <div className="am-panel-title"><AlertTriangle size={17} /> Strategy Decay Alert</div>
              <p className="am-danger">{stoppedLeader ? `${stoppedLeader.name} is blocked from allocation. ${stoppedLeader.reason}` : "No leader is currently blocked."}</p>
              <button onClick={showKillSwitch} className="am-danger-btn">View Kill Switch Logic</button>
            </Section>

            {portfolio && (
              <Section accent="#10B981">
                <div className="am-panel-title"><Wallet size={17} /> Protected Portfolio Receipt</div>
                <div className="am-kv"><span>Portfolio</span><b>{portfolio.portfolioId}</b></div>
                <div className="am-kv"><span>Stake</span><b>${portfolio.amountUsd.toFixed(2)} USDC</b></div>
                <div className="am-kv"><span>Risk-off</span><b>{portfolio.riskOff.weightPct}% to {portfolio.riskOff.asset}</b></div>
                <div className="am-kv"><span>User guardrails</span><b>{maxAllocationPct}% max / {maxDrawdownPct}% stop</b></div>
                <div className="am-kv"><span>Receipt</span><b>{portfolioReceipt?.status ?? portfolio.mode}</b></div>
                <code className="am-inlinehash">{portfolio.requestHash}</code>
              </Section>
            )}
            {isWalkthrough && !portfolio && (
              <Section accent="#60A5FA">
                <div className="am-panel-title"><Info size={17} /> Read-only portfolio example</div>
                <p className="am-muted">
                  A verified portfolio will show allocation rows, risk-off USYC/USDC weight, request hash, and receipt status here. Walkthrough mode never creates that receipt locally.
                </p>
                <div className="am-kv"><span>Example copy allocation</span><b>{topCopy ? `${topCopy.name} - ${topCopy.weightPct}%` : "Waiting for COPY leader"}</b></div>
                <div className="am-kv"><span>Example risk-off</span><b>{riskProfile === "conservative" ? "USYC heavy" : riskProfile === "aggressive" ? "USDC flexible" : "USDC/USYC split"}</b></div>
                <div className="am-kv"><span>Your guardrails</span><b>{maxAllocationPct}% max / {maxDrawdownPct}% stop</b></div>
              </Section>
            )}

            <Section>
              <div className="am-panel-title"><CircleDollarSign size={17} /> Arc/Circle Proof</div>
              {[
                ["USDC settlement", "Arc Testnet native USDC"],
                ["Reasoning trace", "$0.01 x402/Gateway-style unlock"],
                ["Contracts", "ArcMindRegistry + CopyTradeEscrow"],
                ["Risk-off", "USYC allocation preview"],
              ].map(([label, value]) => <div key={label} className="am-kv"><span>{label}</span><b>{value}</b></div>)}
            </Section>
          </aside>
        </section>

        <section className="am-three-col">
          <Section>
            <div className="am-panel-title"><Brain size={18} /> Paid Reasoning Trace <strong>{isWalkthrough ? "read-only preview" : "$0.01"}</strong></div>
            {!traceOpen ? (
              <div className="am-trace-preview">
                <div><span>Signals</span><b>{traceProduct.lockedPreview.signalSummary}</b></div>
                <div><span>Decision</span><b>{actionLabel(traceProduct.lockedPreview.decisionType)}</b></div>
                <div><span>Timestamp</span><b>{timeAgo(traceProduct.lockedPreview.timestamp)}</b></div>
                <p>{traceProduct.lockedPreview.expectedContents}</p>
              </div>
            ) : (
              <div className="am-trace-sections">
                {traceProduct.sections.map((section) => (
                  <div key={section.title}>
                    <b>{section.title}</b>
                    <pre>{section.body}</pre>
                  </div>
                ))}
              </div>
            )}
            {traceError && <p className="am-danger">{traceError}</p>}
            {traceReceipt && <p className="am-ok">Trace receipt verified: {short(traceReceipt.txHash ?? traceReceipt.id, 12, 6)}</p>}
            {traceProduct.receiptExplorerUrl && <a className="am-trace-link" href={traceProduct.receiptExplorerUrl} target="_blank" rel="noreferrer">Open receipt on Arc <ExternalLink size={13} /></a>}
            {isWalkthrough && <p className="am-readonly-hint">Read-only example: full trace remains locked and no local receipt is created.</p>}
            {!traceOpen && <button onClick={buyTrace} disabled={traceBusy || isWalkthrough} className="am-secondary"><Zap size={14} /> {isWalkthrough ? "Switch to Live execution" : traceBusy ? "Waiting for wallet..." : "Unlock Trace"}</button>}
            {traceOpen && traceProduct.fullTraceJson && <button onClick={() => { void copyText(traceProduct.fullTraceJson); }} className="am-secondary"><Copy size={14} /> Copy trace JSON</button>}
          </Section>

          <Section>
            <div className="am-panel-title"><Bell size={18} /> Notification Center <span>{unreadAlerts.length} unread</span></div>
            {alertsError && <p className="am-danger">Alerts unavailable: {alertsError}</p>}
            <div className="am-alert-list">
              {(unreadAlerts.length ? unreadAlerts : alerts).slice(0, 4).map((alert) => (
                <div key={alert.id} className={`am-alert ${readAlertIds.includes(alert.id) ? "is-read" : ""}`} style={{ borderColor: `${alertColor(alert.severity)}55` }}>
                  <span style={{ background: alertColor(alert.severity) }} />
                  <div><b>{alert.title}</b><p>{alert.detail}</p><small>{whyAlertFired(alert)}</small></div>
                </div>
              ))}
              {!alerts.length && !alertsError && <p className="am-muted">{alertsLoading ? "Loading alerts..." : "No active alerts."}</p>}
            </div>
            <div className="am-delivery">
              <span>In-app active</span><span>{browserNotifyEnabled ? "Browser on" : "Browser opt-in"}</span><span>Webhook next</span>
            </div>
          </Section>

          <Section>
            <div className="am-panel-title"><CheckCircle2 size={18} /> Decision Replay + Arc Audit</div>
            <div className="am-replay">
              {decisionReplay?.events.length ? decisionReplay.events.map((event, index) => {
                const content = (
                  <>
                    <span style={{ borderColor: replayStatusColor(event.status), color: replayStatusColor(event.status) }}>{index + 1}</span>
                    <div>
                      <b>{event.title}</b>
                      <p>{event.detail}</p>
                      <small>{event.status.replace(/_/g, " ")} {event.txHash ? `- ${short(event.txHash, 10, 6)}` : ""}</small>
                    </div>
                  </>
                );
                return event.explorerUrl ? (
                  <a key={event.id} href={event.explorerUrl} target="_blank" rel="noreferrer" className="am-replay-step">{content}</a>
                ) : (
                  <div key={event.id} className="am-replay-step">{content}</div>
                );
              }) : (
                <p className="am-muted">Waiting for the first replayable CopyGuard decision.</p>
              )}
            </div>
            <button className="am-verify" onClick={verifyLatestDecision} disabled={verifyBusy}>
              {verifyBusy ? "Verifying..." : verification?.ok ? "Verified on Arc" : "Verify latest decision"}
            </button>
            {verification && <p className={verification.ok ? "am-ok" : "am-danger"}>{verification.reason.replace(/_/g, " ")}</p>}
            <div className="am-timeline">
              {auditTrail.slice(0, 5).map((item) => (
                <a key={item.id} href={item.explorerUrl ?? "#"} target={item.explorerUrl ? "_blank" : undefined} rel="noreferrer">
                  <span className={`am-dot am-dot--${item.status}`} />
                  <div><b>{item.title}</b><p>{item.detail}</p></div>
                </a>
              ))}
            </div>
          </Section>
        </section>

        <section className="am-two-col">
          <Section>
            <div className="am-panel-title"><SlidersHorizontal size={18} /> What-If Simulator</div>
            <div className="am-sim-buttons">
              {([
                { id: "funding", label: "Funding spike", Icon: TrendingUp },
                { id: "drawdown", label: "Leader drawdown", Icon: TrendingDown },
                { id: "calm", label: "Market calm", Icon: CheckCircle2 },
                { id: "liquidity", label: "Liquidity drain", Icon: AlertTriangle },
                { id: "none", label: "Reset", Icon: RotateCcw },
              ] as const).map(({ id, label, Icon }) => (
                <button key={id} onClick={() => setScenario(id)} className={scenario === id ? "is-active" : ""}><Icon size={14} /> {label}</button>
              ))}
            </div>
            <p className="am-copy am-small">{scenarioText}</p>
            <div className="am-sim-controls">
              <label className="am-slider"><span>Stop threshold: {maxDrawdownPct}%</span><input type="range" min={5} max={40} step={1} value={maxDrawdownPct} onChange={(e) => setMaxDrawdownPct(Number(e.currentTarget.value))} /></label>
              <div className="am-sim-leaders">
                {leaders.map((leader) => (
                  <button key={leader.id} onClick={() => setSimLeaderId(leader.id)} className={(simLeaderId ?? simulation?.selectedLeader?.leaderId) === leader.id ? "is-active" : ""}>
                    {leader.name}
                    <span>{actionLabel(leader.action)}</span>
                  </button>
                ))}
              </div>
            </div>
            {simulationError && <p className="am-danger">Simulator unavailable: {simulationError}</p>}
            {simulation && (
              <div className="am-sim-result">
                <MiniStat label="Copy notional" value={`$${simulation.portfolio.copyAllocations.reduce((sum, row) => sum + row.notionalUsd, 0).toFixed(2)}`} accent="#10B981" />
                <MiniStat label="Risk-off" value={`$${simulation.portfolio.riskOff.notionalUsd.toFixed(2)} ${simulation.portfolio.riskOff.asset}`} accent="#60A5FA" />
                <MiniStat label="Stop" value={`${simulation.expectedStopThresholdPct}%`} accent="#EF4444" />
                <MiniStat label="Arc fee est." value={`$${simulation.estimatedFeesUsd.toFixed(2)}`} accent="#F59E0B" />
                <p>{simulation.summary}</p>
              </div>
            )}
            <p className="am-readonly-hint">Simulation is read-only. It calls backend portfolio logic but never creates a receipt or requests wallet payment.</p>
            <div className="am-profile-grid">
              {profilePreview.map((row) => (
                <div key={row.profile} className={riskProfile === row.profile ? "is-active" : ""}>
                  <b>{row.profile}</b><span>{row.copy}% copy</span><span>{row.riskOff}% {row.asset}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section>
            <div className="am-panel-title"><BarChart3 size={18} /> Live Traction</div>
            <div className="am-traction-grid">
              <MiniStat label="Testers" value={String(stats?.testers ?? 0)} accent="#4B7BFF" />
              <MiniStat label="Wallets" value={String(stats?.connectedWallets ?? 0)} accent="#10B981" />
              <MiniStat label="Traces" value={String(stats?.traceUnlocks ?? 0)} accent="#c4b5fd" />
              <MiniStat label="Portfolios" value={String(stats?.protectedPortfolios ?? 0)} accent="#F59E0B" />
              <MiniStat label="Decisions" value={String(stats?.decisionCount ?? 0)} accent="#60A5FA" />
              <MiniStat label="Verified volume" value={`$${(stats?.testnetUsdcVolume ?? 0).toFixed(2)}`} accent="#10B981" />
              <MiniStat label="Feedback" value={String(stats?.feedbackCount ?? 0)} accent="#EF4444" />
            </div>
            <div className="am-feedback-prompts">
              {FEEDBACK_PROMPTS.map((item) => (
                <button key={item.id} onClick={() => { setFeedbackPrompt(item.id); setFeedbackSent(false); }} className={feedbackPrompt === item.id ? "is-active" : ""}>
                  {item.label}
                  <span>{stats?.feedbackPrompts?.[item.id] ?? 0}</span>
                </button>
              ))}
            </div>
            <div className="am-feedback">
              <input value={feedback} onChange={(e) => { setFeedback(e.currentTarget.value); setFeedbackSent(false); }} placeholder={feedbackSent ? "Feedback recorded" : feedbackPlaceholder} maxLength={180} />
              <button onClick={submitFeedback} disabled={!feedback.trim()}>Send</button>
            </div>
            <div className="am-validation-list">
              {validationHighlights.slice(0, 4).map((item) => (
                <div key={`${item.ts}-${item.quote}`}>
                  <b>{item.label}</b>
                  <p>"{item.quote}"</p>
                  <small>{timeAgo(item.ts)}</small>
                </div>
              ))}
              {!validationHighlights.length && (stats?.feedbackQuotes?.length ?? 0) > 0 && <p className="am-muted">Latest quote: "{stats?.feedbackQuotes[0]}"</p>}
              {!validationHighlights.length && !(stats?.feedbackQuotes?.length ?? 0) && <p className="am-muted">No user validation notes yet. Feedback submitted here is stored as traction, not mocked.</p>}
            </div>
          </Section>
        </section>

        <section className="am-two-col">
          <Section>
            <div className="am-panel-title">
              <Zap size={18} /> Signal Source Radar
              <strong>{sourceRadar ? `${sourceRadar.summary.configured}/${sourceRadar.summary.total} configured` : "checking"}</strong>
            </div>
            <p className="am-muted">
              Curated from API Mega List for the next live data layer. Sources never pretend to be active: missing providers show as needs key or watchlist, and risky paywall-bypass actors stay blocked.
            </p>
            {sourceRadarError && <p className="am-danger">Source radar unavailable: {sourceRadarError}</p>}
            <div className="am-source-grid">
              {visibleSources.map((source) => (
                <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="am-source-card">
                  <div className="am-source-top">
                    <b>{source.name}</b>
                    <span style={{ color: signalStatusColor(source.status), borderColor: `${signalStatusColor(source.status)}55` }}>
                      {signalStatusLabel(source.status)}
                    </span>
                  </div>
                  <p>{source.signalContribution}</p>
                  <small>{source.rfbFit.join(" + ") || source.category} - {source.provider}{source.requiredEnv ? ` - ${source.requiredEnv}` : ""}</small>
                </a>
              ))}
              {!visibleSources.length && !sourceRadarError && <p className="am-muted">Loading source candidates...</p>}
            </div>
          </Section>

          <Section>
            <div className="am-panel-title"><Shield size={18} /> Source Policy</div>
            <div className="am-source-summary">
              <MiniStat label="Mode" value={sourceRadar?.mode ?? "pending"} accent="#60A5FA" />
              <MiniStat label="Needs key" value={String(sourceRadar?.summary.needsKey ?? 0)} accent="#F59E0B" />
              <MiniStat label="Blocked" value={String(sourceRadar?.summary.blocked ?? 0)} accent="#EF4444" />
            </div>
            <div className="am-source-actions">
              {(sourceRadar?.recommendedActions ?? [
                "Load the backend source radar.",
              ]).slice(0, 4).map((action) => <p key={action}><Info size={13} /> {action}</p>)}
            </div>
            {blockedSources.slice(0, 1).map((source) => (
              <div key={source.id} className="am-blocked-source">
                <b>{source.name}</b>
                <p>{source.riskNote}</p>
              </div>
            ))}
          </Section>
        </section>

        <footer className="am-footer">
          <span>Built for Agora Agents - Canteen x Circle x Arc</span>
          <span><Wallet size={13} /> Wallet optional; Arc proof visible</span>
        </footer>
      </main>

      {selectedLeader && (
        <div className="am-drawer" role="dialog" aria-modal="true">
          <div className="am-drawer__backdrop" onClick={() => setSelectedLeader(null)} />
          <div className="am-drawer__panel">
            <button className="am-close" onClick={() => setSelectedLeader(null)}><X size={16} /></button>
            <h2>{selectedLeader.name}</h2>
            <p className="am-muted">{selectedLeader.decaySummary ?? selectedLeader.reason}</p>
            <div className="am-metric-grid">
              <MiniStat label="Quality" value={selectedLeader.qualityScore.toFixed(1)} accent="#10B981" />
              <MiniStat label="Degradation" value={selectedLeader.degradationScore.toFixed(1)} accent={actionColor(selectedLeader.action)} />
              <MiniStat label="Weight" value={`${selectedLeader.weightPct}%`} accent="#60A5FA" />
              <MiniStat label="Action" value={actionLabel(selectedLeader.action)} accent={actionColor(selectedLeader.action)} />
            </div>
            <h3>Decay Factor Breakdown</h3>
            {selectedLeader.decayFactors ? (
              <div className="am-factor-list">
                {DECAY_FACTOR_ROWS.map(([key, label]) => (
                  <DecayFactorBar key={key} label={label} value={selectedLeader.decayFactors?.[key] ?? 0} />
                ))}
              </div>
            ) : (
              <p className="am-muted">Waiting for the next backend-scored decision with factor breakdown.</p>
            )}
            <div className="am-decision-note">
              <b>Why this action?</b>
              <p>{selectedLeader.reason}</p>
            </div>
            <h3>What would change it?</h3>
            <ul className="am-explain">
              <li><Info size={14} /> Recent losses below 3 can move STOP into REDUCE.</li>
              <li><Info size={14} /> Liquidity above $500k increases safe allocation capacity.</li>
              <li><Info size={14} /> Lower funding crowding reduces degradation pressure.</li>
              <li><Info size={14} /> Conservative profile routes more idle capital into USYC.</li>
            </ul>
          </div>
        </div>
      )}

      {judgeOpen && (
        <div className="am-drawer" role="dialog" aria-modal="true">
          <div className="am-drawer__backdrop" onClick={() => setJudgeOpen(false)} />
          <div className="am-drawer__panel">
            <button className="am-close" onClick={() => setJudgeOpen(false)}><X size={16} /></button>
            <h2>Judge Walkthrough</h2>
            <p className="am-muted">
              Fast path for async review: inspect the live agent state, verify Arc evidence, then try paid actions with a wallet. Read-only rows do not create receipts.
            </p>

            <div className="am-checklist">
              {judgeChecks.map((item) => (
                <div key={item.label} className={item.ok ? "is-ok" : ""}>
                  <span>{item.ok ? <CheckCircle2 size={15} /> : <Clock size={15} />}</span>
                  <div>
                    <b>{item.label}</b>
                    <p>{item.detail}</p>
                  </div>
                  {item.copy && <button onClick={() => { void copyText(item.copy); }}>Copy</button>}
                </div>
              ))}
            </div>

            <div className={`am-mode-note ${isWalkthrough ? "is-readonly" : "is-live"}`}>
              <Info size={15} />
              <span>
                {isWalkthrough
                  ? "Current mode is read-only. Judges can inspect proof and UX without triggering payments."
                  : "Current mode is live. Paid actions require wallet confirmation and server-side Arc verification."}
              </span>
            </div>

            <h3>Submission Readiness</h3>
            <div className="am-readiness-card" style={{ borderColor: `${readinessColor(readiness?.status)}55` }}>
              <div className="am-readiness-score">
                <span style={{ color: readinessColor(readiness?.status) }}>{readiness?.score ?? "--"}</span>
                <div>
                  <b>{readiness ? readinessLabel(readiness.status) : "Checking readiness"}</b>
                  <p>{readinessError ? `Readiness unavailable: ${readinessError}` : "Weighted Arc/Circle, traction, production and on-chain checks."}</p>
                </div>
              </div>
              {readiness?.recommendedActions.length ? (
                <div className="am-readiness-actions">
                  {readiness.recommendedActions.slice(0, 3).map((action) => <p key={action}><AlertTriangle size={13} /> {action}</p>)}
                </div>
              ) : (
                <p className="am-ok">No readiness blockers detected.</p>
              )}
              <div className="am-readiness-checks">
                {readiness?.checks.slice(0, 8).map((check) => (
                  <div key={check.id} className={check.ok ? "is-ok" : ""}>
                    <span>{check.ok ? <CheckCircle2 size={14} /> : <Clock size={14} />}</span>
                    <div>
                      <b>{check.label}</b>
                      <small>{check.detail}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <h3>Copy Judge Brief</h3>
            <div className="am-brief-card">
              <p>Uses current live metrics and readiness. Good for the submission form, Discord update, or video notes.</p>
              <pre>{judgeBrief}</pre>
              <button onClick={() => { void copyText(judgeBrief); }}><Copy size={14} /> Copy brief</button>
            </div>

            <h3>Review Links</h3>
            <div className="am-link-list">
              <a href="/app/agora" target="_blank" rel="noreferrer"><ExternalLink size={14} /> Full Agora console</a>
              <a href="/app/agora/receipts" target="_blank" rel="noreferrer"><ExternalLink size={14} /> Receipts and usage</a>
              <a href="/app/agora/reasoning-traces" target="_blank" rel="noreferrer"><ExternalLink size={14} /> Reasoning traces</a>
              {latest?.txHash && <a href={`${ARC_EXPLORER_TX}${latest.txHash}`} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Latest Arc transaction</a>}
              {payload?.status.registrationTxHash && <a href={`${ARC_EXPLORER_TX}${payload.status.registrationTxHash}`} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Agent registration transaction</a>}
              <a href={ARC_FAUCET} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Arc testnet USDC faucet</a>
            </div>

            <h3>Copyable Proof</h3>
            <div className="am-proof-list">
              <button onClick={() => { void copyText(payload?.status.payoutAddress); }}><Copy size={14} /> Payout {short(payload?.status.payoutAddress, 10, 8)}</button>
              <button onClick={() => { void copyText(payload?.status.agentId); }}><Copy size={14} /> Agent {short(payload?.status.agentId, 10, 8)}</button>
              <button onClick={() => { void copyText(latest?.txHash ?? latest?.decisionHash); }}><Copy size={14} /> Latest proof {short(latest?.txHash ?? latest?.decisionHash, 10, 8)}</button>
            </div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="am-drawer" role="dialog" aria-modal="true">
          <div className="am-drawer__backdrop" onClick={() => setSettingsOpen(false)} />
          <div className="am-drawer__panel">
            <button className="am-close" onClick={() => setSettingsOpen(false)}><X size={16} /></button>
            <h2>Settings</h2>
            <p className="am-muted">These settings shape portfolio requests and alerts. They are stored locally and sent with live portfolio creation; read-only walkthrough still creates no receipt.</p>
            <h3>Risk Profile</h3>
            <div className="am-segment">
              {(["conservative", "balanced", "aggressive"] as RiskProfile[]).map((profile) => <button key={profile} onClick={() => setRiskProfile(profile)} className={riskProfile === profile ? "is-active" : ""}>{profile}</button>)}
            </div>
            <div className="am-setting-grid">
              <label className="am-field">
                <span>Max allocation per leader</span>
                <input type="number" min={5} max={70} step={1} value={maxAllocationPct} onChange={(e) => setMaxAllocationPct(Math.max(5, Math.min(70, Number(e.currentTarget.value) || 5)))} />
                <small>{maxAllocationPct}% cap per copied leader</small>
              </label>
              <label className="am-field">
                <span>Max drawdown before stop</span>
                <input type="number" min={3} max={35} step={1} value={maxDrawdownPct} onChange={(e) => setMaxDrawdownPct(Math.max(3, Math.min(35, Number(e.currentTarget.value) || 3)))} />
                <small>{maxDrawdownPct}% personal kill threshold</small>
              </label>
            </div>
            <label className="am-slider"><span>Drawdown slider: {maxDrawdownPct}%</span><input type="range" min={3} max={35} step={1} value={maxDrawdownPct} onChange={(e) => setMaxDrawdownPct(Number(e.currentTarget.value))} /></label>
            <label className="am-toggle"><span>Require manual approval before live portfolio start</span><input type="checkbox" checked={manualApproval} onChange={(e) => setManualApproval(e.currentTarget.checked)} /></label>

            <h3>Notifications</h3>
            <label className="am-toggle"><span>Payment and receipt status</span><input type="checkbox" checked={notifyPayment} onChange={(e) => setNotifyPayment(e.currentTarget.checked)} /></label>
            <label className="am-toggle"><span>Leader risk and decay alerts</span><input type="checkbox" checked={notifyLeaderRisk} onChange={(e) => setNotifyLeaderRisk(e.currentTarget.checked)} /></label>
            <label className="am-toggle"><span>New reasoning trace available</span><input type="checkbox" checked={notifyNewTrace} onChange={(e) => setNotifyNewTrace(e.currentTarget.checked)} /></label>
            <label className="am-toggle"><span>Provider outage or unavailable data</span><input type="checkbox" checked={notifyProviderOutage} onChange={(e) => setNotifyProviderOutage(e.currentTarget.checked)} /></label>

            <h3>Interface</h3>
            <label className="am-toggle"><span>Motion</span><input type="checkbox" checked={softMotion} onChange={(e) => setSoftMotion(e.currentTarget.checked)} /></label>
            <label className="am-toggle"><span>Compact mode</span><input type="checkbox" checked={compactMode} onChange={(e) => setCompactMode(e.currentTarget.checked)} /></label>
            <label className="am-slider"><span>Alert threshold: {alertThreshold}</span><input type="range" min={35} max={80} step={5} value={alertThreshold} onChange={(e) => setAlertThreshold(Number(e.currentTarget.value))} /></label>
            <div className="am-settings-summary">
              <b>Current policy</b>
              <span>{riskProfile} - {maxAllocationPct}% max leader allocation - {maxDrawdownPct}% stop - {manualApproval ? "manual approval" : "wallet-confirmed live execution"}</span>
            </div>
            <button className="am-ghost" onClick={copyShareLink}><Link2 size={14} /> Copy shareable state</button>
          </div>
        </div>
      )}

      {alertsOpen && (
        <div className="am-drawer" role="dialog" aria-modal="true">
          <div className="am-drawer__backdrop" onClick={() => setAlertsOpen(false)} />
          <div className="am-drawer__panel">
            <button className="am-close" onClick={() => setAlertsOpen(false)}><X size={16} /></button>
            <h2>Alerts</h2>
            <p className="am-muted">CopyGuard alerts are pulled from `/api/arc-alerts` and kept as local read/unread state on this device.</p>
            <div className="am-alert-toolbar">
              <button onClick={() => { void loadAlerts(); }} disabled={alertsLoading}>{alertsLoading ? "Refreshing..." : "Refresh"}</button>
              <button onClick={() => setUnreadOnly((v) => !v)} className={unreadOnly ? "is-active" : ""}>{unreadOnly ? "Showing unread" : "Show unread"}</button>
              <button onClick={markAllAlertsRead} disabled={!alerts.length}>Mark all read</button>
            </div>
            <label className="am-toggle"><span>Browser notifications for critical alerts</span><input type="checkbox" checked={browserNotifyEnabled} onChange={() => { void toggleBrowserNotifications(); }} /></label>
            {alertsError && <div className="am-alert-error">Alert provider unavailable: {alertsError}</div>}
            <div className="am-alert-list">
              {visibleAlerts.map((alert) => {
                const isRead = readAlertIds.includes(alert.id);
                return (
                <div key={alert.id} className={`am-alert ${isRead ? "is-read" : ""}`} style={{ borderColor: `${alertColor(alert.severity)}55` }}>
                  <span style={{ background: alertColor(alert.severity) }} />
                  <div>
                    <div className="am-alert-title"><b>{alert.title}</b><em>{alert.severity}</em></div>
                    <p>{alert.detail}</p>
                    <small>{timeAgo(alert.ts)} - {whyAlertFired(alert)}</small>
                    {!isRead && <button className="am-mark-read" onClick={() => markAlertRead(alert.id)}>Mark read</button>}
                  </div>
                </div>
                );
              })}
              {!visibleAlerts.length && !alertsError && <p className="am-muted">{alertsLoading ? "Loading alerts..." : unreadOnly ? "No unread alerts." : "No active alerts."}</p>}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .am-page { min-height: 100vh; background: #070b11; color: #f5f7fb; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
        .am-topbar { position: sticky; top: 0; z-index: 20; border-bottom: 1px solid #182233; background: rgba(9,14,22,.92); backdrop-filter: blur(14px); padding: 14px 22px; display: flex; align-items: center; gap: 10px; }
        .am-brand, .am-panel-title, .am-block-head h2, .am-footer span { display: inline-flex; align-items: center; gap: 9px; }
        .am-badge { border: 1px solid #26364d; background: #101827; border-radius: 999px; padding: 4px 9px; font-size: .68rem; font-weight: 900; }
        .am-badge--green { color: #10B981; border-color: #10B98155; background: #10B98116; }
        .am-mode-switch { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; border: 1px solid #26364d; background: #08111e; border-radius: 12px; padding: 4px; min-width: min(390px, 42vw); }
        .am-mode-switch button { border: 0; border-radius: 8px; background: transparent; color: #9fb2cc; padding: 8px 10px; font-weight: 900; font-size: .74rem; cursor: pointer; }
        .am-mode-switch button.is-active { background: #1652F0; color: white; }
        .am-topbar__spacer { flex: 1; }
        .am-iconbtn, .am-walletbtn, .am-judgebtn, .am-ghost, .am-secondary, .am-primary, .am-danger-btn, .am-verify, .am-sim-buttons button, .am-wallet-card button { border-radius: 10px; border: 1px solid #26364d; background: #101827; color: #d8e4f6; padding: 10px 12px; font-weight: 900; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; text-decoration: none; line-height: 1.2; }
        .am-iconbtn:disabled, .am-walletbtn:disabled, .am-judgebtn:disabled, .am-ghost:disabled, .am-secondary:disabled, .am-primary:disabled, .am-danger-btn:disabled, .am-verify:disabled, .am-sim-buttons button:disabled { opacity: .62; cursor: not-allowed; transform: none; }
        .am-iconbtn { position: relative; width: 38px; justify-content: center; padding: 10px; }
        .am-judgebtn { border-color: #10B98155; background: #10B98118; color: #a7f3d0; white-space: nowrap; }
        .am-count { position: absolute; top: -5px; right: -5px; min-width: 17px; height: 17px; border-radius: 999px; background: #EF4444; color: #fff; font-size: 10px; display: grid; place-items: center; }
        .am-main { width: min(1120px, calc(100vw - 32px)); margin: 0 auto; padding: 28px 0 42px; }
        .am-mode-note { display: flex; align-items: flex-start; gap: 9px; border: 1px solid #1b2a40; border-radius: 13px; padding: 11px 13px; margin-bottom: 18px; color: #b8c7dc; line-height: 1.45; font-size: .82rem; }
        .am-mode-note.is-readonly { border-color: #60A5FA55; background: #60A5FA12; }
        .am-mode-note.is-live { border-color: #10B98155; background: #10B98112; }
        .am-hero-grid, .am-two-col, .am-three-col { display: grid; gap: 18px; margin-top: 18px; align-items: start; }
        .am-hero-grid { grid-template-columns: minmax(0,1.35fr) minmax(320px,.65fr); margin-top: 0; }
        .am-two-col { grid-template-columns: minmax(0,1fr) 360px; }
        .am-three-col { grid-template-columns: repeat(3, minmax(0,1fr)); }
        .am-panel { border: 1px solid #1b2a40; background: linear-gradient(145deg, #0e1623, #0a1019); border-radius: 18px; padding: 20px; min-width: 0; box-shadow: 0 16px 48px -32px rgba(31, 97, 255, .55); }
        .am-panel-title { line-height: 1.35; flex-wrap: wrap; justify-content: space-between; margin-bottom: 12px; }
        .am-eyebrow { color: #8fa7c4; font-size: .72rem; text-transform: uppercase; letter-spacing: .12em; font-weight: 900; margin-bottom: 12px; }
        h1 { font-size: clamp(2rem, 4.4vw, 3.9rem); line-height: 1.02; margin: 0; letter-spacing: 0; max-width: 760px; }
        h2, h3, p { margin-top: 0; }
        .am-copy, .am-muted { color: #9fb2cc; line-height: 1.65; }
        .am-small { font-size: .86rem; }
        .am-controls { display: grid; grid-template-columns: 1fr 160px; gap: 10px; margin-top: 20px; max-width: 650px; }
        .am-segment { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; border: 1px solid #1b2a40; background: #08111e; border-radius: 12px; padding: 6px; }
        .am-segment button { border: 0; border-radius: 8px; background: transparent; color: #9fb2cc; padding: 9px 10px; font-weight: 900; text-transform: capitalize; cursor: pointer; }
        .am-segment .is-active, .am-sim-buttons .is-active { background: #1652F0; color: white; }
        .am-input { border: 1px solid #1b2a40; background: #08111e; border-radius: 12px; padding: 7px 10px; display: flex; flex-direction: column; gap: 3px; }
        .am-input span { color: #7890ad; font-size: .62rem; text-transform: uppercase; letter-spacing: .08em; font-weight: 900; }
        .am-input input, .am-feedback input { width: 100%; border: 0; outline: 0; background: transparent; color: #fff; font-weight: 900; }
        .am-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 24px; }
        .am-readonly-hint { margin: 14px 0 0; color: #93c5fd; border: 1px solid #60A5FA33; background: #60A5FA12; border-radius: 10px; padding: 10px 12px; line-height: 1.5; font-size: .8rem; }
        .am-primary { border: none; background: #1652F0; color: #fff; }
        .am-secondary { border-color: #8B5CF655; background: #8B5CF61f; color: #c4b5fd; }
        .am-danger-btn { width: 100%; justify-content: center; border-color: #EF444455; background: #EF444414; color: #fca5a5; }
        .am-countdown { font-variant-numeric: tabular-nums; font-size: 3rem; font-weight: 950; color: #4B7BFF; margin: 14px 0 8px; }
        .am-progress { height: 7px; border-radius: 999px; background: #1a2638; overflow: hidden; }
        .am-progress span { display: block; height: 100%; background: #4B7BFF; transition: width 1s linear; }
        .am-wallet-card { display: grid; gap: 10px; margin-top: 20px; padding: 14px; border: 1px solid #1b2a40; border-radius: 14px; background: #08111e; }
        .am-wallet-card div { display: flex; justify-content: space-between; gap: 12px; font-size: .78rem; line-height: 1.45; }
        .am-wallet-card span, .am-kv span, .am-stat__label { color: #7890ad; }
        .am-wallet-card a { color: #60A5FA; display: inline-flex; align-items: center; gap: 6px; text-decoration: none; }
        .am-block-head { display: flex; justify-content: space-between; gap: 14px; margin-bottom: 18px; }
        .am-block-head h2 { margin: 0; font-size: 1.05rem; }
        .am-block-head p { color: #7890ad; font-size: .75rem; margin: 4px 0 0; }
        .am-stat-grid, .am-traction-grid, .am-metric-grid { display: grid; gap: 10px; }
        .am-stat-grid { grid-template-columns: repeat(3, 1fr); }
        .am-traction-grid { grid-template-columns: repeat(4, 1fr); }
        .am-metric-grid { grid-template-columns: repeat(2, 1fr); }
        .am-stat { border: 1px solid; background: #0e1522; border-radius: 12px; padding: 13px 14px; min-width: 0; }
        .am-stat__value { font-weight: 900; font-size: 1.2rem; line-height: 1; overflow-wrap: anywhere; }
        .am-stat__label { font-size: .68rem; margin-top: 6px; }
        .am-hash-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 10px; margin: 16px 0; }
        .am-hash-grid div { border: 1px solid #1b2a40; background: #08111e; border-radius: 12px; padding: 10px 12px; min-width: 0; }
        .am-hash-grid span { color: #7890ad; font-size: .66rem; text-transform: uppercase; letter-spacing: .08em; font-weight: 900; }
        code, .am-inlinehash { display: block; color: #dbeafe; font-size: .72rem; margin-top: 6px; white-space: normal; overflow-wrap: anywhere; word-break: break-word; line-height: 1.45; }
        .am-share-card { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 12px; align-items: center; border: 1px solid #10B98144; background: #10B98110; border-radius: 13px; padding: 12px; margin: 14px 0; }
        .am-share-card span { display: block; color: #86efac; font-size: .64rem; text-transform: uppercase; letter-spacing: .08em; font-weight: 900; margin-bottom: 4px; }
        .am-share-card b { display: block; color: #dbeafe; margin-bottom: 6px; }
        .am-share-card p { color: #9fb2cc; margin: 2px 0; font-size: .75rem; line-height: 1.35; overflow-wrap: anywhere; }
        .am-share-card button { border: 1px solid #10B98155; background: #10B98122; color: #86efac; border-radius: 10px; padding: 10px 12px; font-weight: 900; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; white-space: nowrap; }
        .am-leader-table { overflow: hidden; border: 1px solid #1b2a40; border-radius: 12px; }
        .am-leader-head, .am-leader-row { display: grid; grid-template-columns: 1.2fr .7fr .7fr .7fr minmax(220px, 1.7fr); gap: 10px; align-items: center; }
        .am-leader-head { padding: 10px 12px; color: #7890ad; font-size: .68rem; text-transform: uppercase; letter-spacing: .08em; background: #101827; }
        .am-leader-row { width: 100%; border: 0; border-top: 1px solid #1b2a40; background: transparent; color: #f5f7fb; padding: 14px 12px; text-align: left; font-size: .78rem; cursor: pointer; line-height: 1.45; }
        .am-leader-row:hover { background: #101827; }
        .am-side { display: flex; flex-direction: column; gap: 18px; }
        .am-danger { color: #fca5a5; line-height: 1.55; }
        .am-ok { color: #86efac; }
        .am-kv { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-top: 1px solid #1b2a40; font-size: .78rem; }
        .am-trace { margin: 0 0 12px; white-space: pre-wrap; color: #9fb2cc; background: #08111e; border: 1px solid #1b2a40; border-radius: 12px; padding: 14px; min-height: 126px; font-size: .76rem; line-height: 1.55; }
        .am-trace-preview, .am-trace-sections { display: grid; gap: 10px; margin-bottom: 12px; }
        .am-trace-preview div, .am-trace-sections div { border: 1px solid #1b2a40; background: #08111e; border-radius: 12px; padding: 10px 12px; min-width: 0; }
        .am-trace-preview span { display: block; color: #7890ad; font-size: .64rem; text-transform: uppercase; letter-spacing: .08em; font-weight: 900; margin-bottom: 4px; }
        .am-trace-preview b { color: #dbeafe; line-height: 1.35; overflow-wrap: anywhere; }
        .am-trace-preview p { color: #9fb2cc; border: 1px solid #60A5FA33; background: #60A5FA12; border-radius: 10px; padding: 10px 12px; margin: 0; font-size: .78rem; line-height: 1.5; }
        .am-trace-sections b { color: #dbeafe; }
        .am-trace-sections pre { margin: 7px 0 0; white-space: pre-wrap; color: #9fb2cc; font-family: inherit; font-size: .75rem; line-height: 1.48; overflow-wrap: anywhere; }
        .am-trace-link { display: inline-flex; align-items: center; gap: 6px; color: #93c5fd; text-decoration: none; font-size: .78rem; font-weight: 900; margin: 0 0 10px; }
        .am-alert-list, .am-timeline, .am-replay { display: grid; gap: 10px; }
        .am-alert { display: grid; grid-template-columns: 8px 1fr; gap: 10px; border: 1px solid #1b2a40; border-radius: 12px; background: #08111e; padding: 10px; }
        .am-alert.is-read { opacity: .66; }
        .am-alert > span { width: 8px; border-radius: 8px; }
        .am-alert p, .am-timeline p { color: #9fb2cc; margin: 3px 0 0; font-size: .74rem; line-height: 1.4; }
        .am-alert small { display: block; color: #7890ad; margin-top: 6px; line-height: 1.45; }
        .am-alert-title { display: flex; justify-content: space-between; gap: 10px; align-items: center; }
        .am-alert-title em { color: #7890ad; font-size: .62rem; text-transform: uppercase; font-style: normal; letter-spacing: .08em; font-weight: 900; }
        .am-alert-toolbar { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
        .am-alert-toolbar button, .am-mark-read { border: 1px solid #26364d; background: #101827; color: #d8e4f6; border-radius: 9px; padding: 8px 10px; font-weight: 900; cursor: pointer; }
        .am-alert-toolbar button.is-active { border-color: #60A5FA66; color: #bfdbfe; background: #60A5FA18; }
        .am-alert-toolbar button:disabled, .am-mark-read:disabled { opacity: .55; cursor: not-allowed; }
        .am-mark-read { margin-top: 8px; font-size: .72rem; }
        .am-alert-error { border: 1px solid #EF444455; background: #EF444414; color: #fca5a5; border-radius: 10px; padding: 10px 12px; margin: 12px 0; line-height: 1.45; }
        .am-delivery { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
        .am-delivery span { border: 1px solid #1b2a40; border-radius: 999px; padding: 5px 8px; color: #9fb2cc; font-size: .68rem; }
        .am-replay { margin-bottom: 12px; }
        .am-replay-step { display: grid; grid-template-columns: 28px 1fr; gap: 10px; border: 1px solid #1b2a40; background: #08111e; border-radius: 12px; padding: 10px; color: inherit; text-decoration: none; }
        .am-replay-step > span { width: 24px; height: 24px; border-radius: 999px; border: 1px solid; display: grid; place-items: center; font-size: .72rem; font-weight: 950; }
        .am-replay-step p { color: #9fb2cc; margin: 3px 0 0; font-size: .74rem; line-height: 1.45; }
        .am-replay-step small { display: block; color: #7890ad; margin-top: 5px; font-size: .66rem; text-transform: uppercase; letter-spacing: .05em; }
        .am-verify { width: 100%; justify-content: center; margin-bottom: 10px; }
        .am-timeline a { display: grid; grid-template-columns: 12px 1fr; gap: 10px; text-decoration: none; color: inherit; }
        .am-dot { width: 10px; height: 10px; border-radius: 999px; margin-top: 4px; background: #64748b; }
        .am-dot--verified { background: #10B981; }
        .am-dot--paid { background: #60A5FA; }
        .am-sim-buttons { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
        .am-sim-controls { display: grid; gap: 12px; margin: 12px 0; }
        .am-sim-leaders { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
        .am-sim-leaders button { border: 1px solid #1b2a40; background: #08111e; color: #dbeafe; border-radius: 10px; padding: 10px; display: grid; gap: 4px; text-align: left; cursor: pointer; font-weight: 900; line-height: 1.25; }
        .am-sim-leaders button span { color: #7890ad; font-size: .68rem; }
        .am-sim-leaders button.is-active { border-color: #10B98155; background: #10B98112; color: #a7f3d0; }
        .am-sim-result { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 12px 0; }
        .am-sim-result p { grid-column: 1 / -1; color: #dbeafe; border: 1px solid #26364d; background: #101827; border-radius: 12px; padding: 11px 12px; margin: 0; line-height: 1.5; }
        .am-profile-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
        .am-profile-grid div { border: 1px solid #1b2a40; border-radius: 12px; padding: 12px; display: grid; gap: 5px; }
        .am-profile-grid .is-active { border-color: #1652F0; background: #1652F018; }
        .am-feedback-prompts { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-top: 14px; }
        .am-feedback-prompts button { border: 1px solid #1b2a40; background: #08111e; color: #dbeafe; border-radius: 10px; padding: 9px 10px; font-weight: 900; cursor: pointer; display: flex; justify-content: space-between; gap: 8px; align-items: center; line-height: 1.2; }
        .am-feedback-prompts button span { color: #7890ad; font-size: .68rem; font-variant-numeric: tabular-nums; }
        .am-feedback-prompts button.is-active { border-color: #10B98155; background: #10B98118; color: #a7f3d0; }
        .am-feedback { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 10px; margin-top: 14px; }
        .am-feedback input { border: 1px solid #1b2a40; background: #08111e; color: #dbeafe; border-radius: 10px; padding: 10px 12px; }
        .am-feedback button { border: 1px solid #10B98155; background: #10B98122; color: #86efac; border-radius: 10px; padding: 10px 12px; font-weight: 900; }
        .am-validation-list { display: grid; gap: 9px; margin-top: 12px; }
        .am-validation-list div { border: 1px solid #1b2a40; background: #08111e; border-radius: 11px; padding: 10px 12px; }
        .am-validation-list p { color: #9fb2cc; margin: 4px 0 0; font-size: .76rem; line-height: 1.45; }
        .am-validation-list small { display: block; color: #7890ad; margin-top: 5px; font-size: .66rem; }
        .am-source-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 14px; }
        .am-source-card { border: 1px solid #1b2a40; background: #08111e; border-radius: 12px; padding: 12px; color: inherit; text-decoration: none; min-width: 0; }
        .am-source-top { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; }
        .am-source-top b { color: #dbeafe; line-height: 1.3; font-size: .82rem; }
        .am-source-top span { border: 1px solid; border-radius: 999px; padding: 4px 7px; font-size: .62rem; text-transform: uppercase; letter-spacing: .05em; font-weight: 950; white-space: nowrap; }
        .am-source-card p { color: #9fb2cc; margin: 9px 0 8px; font-size: .76rem; line-height: 1.45; }
        .am-source-card small { color: #7890ad; font-size: .66rem; line-height: 1.35; overflow-wrap: anywhere; }
        .am-source-summary { display: grid; grid-template-columns: 1fr; gap: 10px; margin: 12px 0; }
        .am-source-actions { display: grid; gap: 8px; margin: 12px 0; }
        .am-source-actions p { display: flex; gap: 8px; margin: 0; color: #bfdbfe; font-size: .76rem; line-height: 1.45; }
        .am-blocked-source { border: 1px solid #EF444455; background: #EF444414; border-radius: 12px; padding: 12px; margin-top: 12px; }
        .am-blocked-source b { color: #fecaca; }
        .am-blocked-source p { color: #fca5a5; margin: 6px 0 0; font-size: .76rem; line-height: 1.45; }
        .am-footer { display: flex; justify-content: space-between; gap: 12px; align-items: center; color: #7890ad; font-size: .72rem; margin-top: 24px; }
        .am-toast { position: fixed; right: 22px; top: 70px; z-index: 40; background: #0f2d22; color: #86efac; border: 1px solid #10B98155; border-radius: 12px; padding: 10px 12px; }
        .am-drawer { position: fixed; inset: 0; z-index: 50; display: grid; justify-items: end; }
        .am-drawer__backdrop { position: absolute; inset: 0; background: rgba(0,0,0,.55); }
        .am-drawer__panel { position: relative; width: min(460px, calc(100vw - 24px)); min-height: 100%; background: #0b1019; border-left: 1px solid #1b2a40; padding: 28px 24px; overflow: auto; }
        .am-drawer__panel h2 { padding-right: 42px; line-height: 1.25; }
        .am-drawer__panel h3 { margin: 22px 0 10px; font-size: .9rem; line-height: 1.35; }
        .am-close { position: absolute; right: 18px; top: 18px; border: 1px solid #26364d; background: #101827; color: #d8e4f6; border-radius: 9px; padding: 8px; }
        .am-factor-list { display: grid; gap: 10px; border: 1px solid #1b2a40; background: #08111e; border-radius: 13px; padding: 12px; }
        .am-factor-row { display: grid; gap: 7px; }
        .am-factor-row > div:first-child { display: flex; justify-content: space-between; gap: 12px; color: #9fb2cc; font-size: .76rem; line-height: 1.35; }
        .am-factor-row b { color: #dbeafe; font-variant-numeric: tabular-nums; }
        .am-factor-track { height: 7px; border-radius: 999px; background: #172337; overflow: hidden; }
        .am-factor-track span { display: block; height: 100%; border-radius: inherit; }
        .am-decision-note { border: 1px solid #26364d; background: #101827; border-radius: 13px; padding: 12px; margin-top: 12px; }
        .am-decision-note p { color: #9fb2cc; margin: 6px 0 0; line-height: 1.5; font-size: .8rem; }
        .am-explain { padding: 0; list-style: none; display: grid; gap: 10px; }
        .am-explain li { display: flex; gap: 8px; color: #9fb2cc; line-height: 1.45; }
        .am-checklist, .am-link-list, .am-proof-list { display: grid; gap: 10px; margin: 16px 0 20px; }
        .am-checklist > div { display: grid; grid-template-columns: 24px minmax(0,1fr) auto; gap: 10px; align-items: center; border: 1px solid #1b2a40; background: #08111e; border-radius: 12px; padding: 12px; }
        .am-checklist > div.is-ok { border-color: #10B98155; background: #10B9810d; }
        .am-checklist p { color: #9fb2cc; margin: 3px 0 0; font-size: .76rem; line-height: 1.45; }
        .am-checklist button, .am-proof-list button { border: 1px solid #26364d; background: #101827; color: #d8e4f6; border-radius: 9px; padding: 8px 10px; font-weight: 900; cursor: pointer; }
        .am-link-list a, .am-proof-list button { display: flex; align-items: center; gap: 8px; text-decoration: none; color: #dbeafe; text-align: left; }
        .am-link-list a { border: 1px solid #1b2a40; background: #08111e; border-radius: 10px; padding: 10px 12px; }
        .am-readiness-card { border: 1px solid #1b2a40; background: #08111e; border-radius: 14px; padding: 13px; margin: 12px 0 20px; }
        .am-readiness-score { display: grid; grid-template-columns: 58px minmax(0, 1fr); gap: 12px; align-items: center; }
        .am-readiness-score > span { width: 58px; height: 58px; border: 1px solid #26364d; border-radius: 16px; display: grid; place-items: center; background: #101827; font-size: 1.35rem; font-weight: 950; font-variant-numeric: tabular-nums; }
        .am-readiness-score p { margin: 3px 0 0; color: #9fb2cc; font-size: .76rem; line-height: 1.45; }
        .am-readiness-actions { display: grid; gap: 7px; margin: 12px 0; }
        .am-readiness-actions p { display: flex; gap: 7px; margin: 0; color: #fbbf24; font-size: .76rem; line-height: 1.45; }
        .am-readiness-checks { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }
        .am-readiness-checks > div { display: grid; grid-template-columns: 20px minmax(0, 1fr); gap: 7px; border: 1px solid #1b2a40; border-radius: 10px; padding: 9px; background: #0d1624; }
        .am-readiness-checks > div.is-ok { border-color: #10B98144; background: #10B9810d; }
        .am-readiness-checks b { display: block; font-size: .72rem; line-height: 1.25; }
        .am-readiness-checks small { display: block; color: #7890ad; font-size: .66rem; line-height: 1.35; margin-top: 3px; overflow-wrap: anywhere; }
        .am-brief-card { border: 1px solid #60A5FA44; background: #60A5FA10; border-radius: 14px; padding: 13px; margin: 12px 0 20px; }
        .am-brief-card p { color: #bfdbfe; margin: 0 0 10px; font-size: .78rem; line-height: 1.45; }
        .am-brief-card pre { white-space: pre-wrap; overflow-wrap: anywhere; margin: 0 0 12px; color: #dbeafe; border: 1px solid #1b2a40; background: #08111e; border-radius: 11px; padding: 10px 12px; font-family: inherit; font-size: .73rem; line-height: 1.5; max-height: 210px; overflow: auto; }
        .am-brief-card button { border: 1px solid #60A5FA55; background: #60A5FA18; color: #bfdbfe; border-radius: 10px; padding: 9px 11px; font-weight: 900; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; }
        .am-setting-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 12px 0; }
        .am-field { display: grid; gap: 6px; border: 1px solid #1b2a40; background: #08111e; border-radius: 12px; padding: 12px; }
        .am-field span { color: #dbeafe; font-weight: 900; font-size: .78rem; }
        .am-field input { width: 100%; border: 1px solid #26364d; background: #101827; color: #fff; border-radius: 9px; padding: 9px 10px; font-weight: 900; }
        .am-field small { color: #7890ad; line-height: 1.35; }
        .am-settings-summary { display: grid; gap: 5px; border: 1px solid #10B98144; background: #10B98110; border-radius: 12px; padding: 12px; margin: 14px 0; color: #dbeafe; }
        .am-settings-summary span { color: #9fb2cc; line-height: 1.45; }
        .am-toggle, .am-slider { display: flex; justify-content: space-between; align-items: center; gap: 14px; border-bottom: 1px solid #1b2a40; padding: 14px 0; color: #dbeafe; }
        .am-toggle input { width: 38px; height: 22px; accent-color: #1652F0; flex-shrink: 0; }
        .am-slider input { min-width: 150px; accent-color: #1652F0; }
        .am-motion .am-panel, .am-motion button, .am-motion a { transition: transform .18s ease, border-color .18s ease, background .18s ease; }
        .am-motion button:hover, .am-motion a:hover { transform: translateY(-1px); }
        .am-compact .am-panel { padding: 14px; }
        .am-compact h1 { font-size: clamp(1.8rem, 4vw, 3.6rem); }
        @media (max-width: 960px) { .am-hero-grid, .am-two-col, .am-three-col { grid-template-columns: 1fr; } .am-main { width: min(100vw - 20px, 1120px); } }
        @media (max-width: 560px) {
          .am-topbar { flex-wrap: wrap; }
          .am-mode-switch { min-width: 100%; order: 5; }
          .am-judgebtn, .am-walletbtn { flex: 1 1 auto; justify-content: center; }
          .am-controls, .am-hash-grid, .am-stat-grid, .am-traction-grid, .am-profile-grid, .am-setting-grid, .am-feedback-prompts, .am-sim-leaders, .am-sim-result, .am-readiness-checks, .am-source-grid { grid-template-columns: 1fr; }
          .am-share-card { grid-template-columns: 1fr; }
          .am-share-card button { justify-content: center; }
          .am-segment { grid-template-columns: 1fr; }
          .am-leader-head, .am-leader-row { grid-template-columns: 1fr; }
          .am-footer { align-items: flex-start; flex-direction: column; }
        }
      `}</style>
    </div>
  );
}
