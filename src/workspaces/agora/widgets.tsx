import { type ReactNode, useState, useEffect } from "react";
import { TrendingUp, Brain, Copy, Zap, ShieldCheck, Activity, Shield } from "lucide-react";
import type { Service, Workspace } from "../../types";
import type { Receipt } from "../../types";
import type { SigBlock, CardDef, CardCtx } from "../_types";
import { Receipt as RIco } from "../../icons402";
import { getAgoraConfig, getArcAgentStats } from "../../lib/agora";
import { useNetworkMode } from "../../hooks/useNetworkMode";
import { useLocalStore } from "../../lib/storage";
import { EcosystemLinksPanel } from "../../components/ui/EcosystemLinksPanel";
import { AgoraTradingWidget } from "../../components/widgets/agora/AgoraTradingWidget";
import {
  AgoraPortfolioWidget,
  AgoraCircleToolsWidget,
  AgoraX402Widget,
  AgoraLeaderboardWidget,
  AgoraCctpWidget,
} from "../../components/widgets/agora/AgoraExtraWidgets";
import {
  ArcMindCopyTradingWidget,
  ArcMindReasoningWidget,
  ArcMindSignalHubWidget,
  ArcMindKillSwitchWidget,
  ArcDecisionLogWidget,
} from "../../components/widgets/agora/ArcMindWidgets";

// ── Re-exports (kept for backward compat) ──────────────────────────────────────
export { AgoraTradingWidget } from "../../components/widgets/agora/AgoraTradingWidget";
export {
  AgoraPortfolioWidget,
  AgoraCircleToolsWidget,
  AgoraX402Widget,
  AgoraLeaderboardWidget,
  AgoraCctpWidget,
} from "../../components/widgets/agora/AgoraExtraWidgets";
export {
  ArcMindCopyTradingWidget,
  ArcMindReasoningWidget,
  ArcMindSignalHubWidget,
  ArcMindKillSwitchWidget,
  ArcDecisionLogWidget,
} from "../../components/widgets/agora/ArcMindWidgets";

// ── Signature block ────────────────────────────────────────────────────────────
export const signature: SigBlock = {
  title: "ArcMind — Slash-Bonded Trading Agent",
  sub: "Autonomous BUY/SELL/HOLD decisions recorded on Arc L1 · reasoning traces sold via Circle Gateway Nanopayments",
  headers: ["Layer", "Role", "Circle Tool", "Status"],
  rows: [
    ["Decision loop", "30-min autonomous signals", "ArcMindRegistry", "active"],
    ["Trace marketplace", "$0.01/view via Nanopayments", "Gateway x402", "active"],
    ["Copy-trade escrow", "USDC stake + slash-bond", "USDC · Contracts", "active"],
    ["Kill switch", "auto-exit on drawdown >15%", "ERC-8183 escrow", "active"],
  ],
  accentCol: 3,
};

// ── Cards ──────────────────────────────────────────────────────────────────────
export function cards({
  onGoTab,
  wsReceipts,
  onGoReceipts,
}: CardCtx & { onGoReceipts: () => void }): CardDef[] {
  return [
    {
      light: true,
      ico: Activity,
      title: "ArcMind Signal Hub",
      sub: "Live BUY/SELL/HOLD · real Hyperliquid OI · on-chain log",
      onClick: () => onGoTab("signal"),
    },
    {
      ico: Brain,
      title: "Buy Reasoning Traces",
      sub: "$0.01/trace via Circle Gateway Nanopayments",
      onClick: () => onGoTab("reasoning"),
    },
    {
      ico: Copy,
      title: "Copy-Trade with slash-bond",
      sub: "Stake USDC · auto-exit on drawdown >15%",
      onClick: () => onGoTab("copy"),
    },
    {
      ico: Shield,
      title: "Kill Switch monitor",
      sub: "EIP-191 signed · ERC-8183 auto-close",
      onClick: () => onGoTab("kill"),
    },
    {
      ico: TrendingUp,
      title: "Arb demo — Arc vs Base",
      sub: "ETH/USDC gap · CCTP · $0.05",
      onClick: () => onGoTab("arbitrage"),
    },
    {
      ico: RIco,
      title: "View all receipts",
      sub: `${wsReceipts.length} Arc payments`,
      onClick: () => onGoReceipts(),
    },
  ];
}

// ── Tab renderer ───────────────────────────────────────────────────────────────
export function renderTab(
  t: string,
  workspace: Workspace,
  _receipts: Receipt[],
  _onOpenPayment: (s: Service) => void,
): ReactNode | null {
  const nodes: ReactNode[] = [];
  const tab = t.toLowerCase();

  if (tab.includes("arbitrage") || tab.includes("arb")) {
    nodes.push(<AgoraTradingWidget key="trading" />);
  }
  if (tab.includes("portfolio")) {
    nodes.push(<AgoraPortfolioWidget key="portfolio" workspace={workspace} />);
  }
  if (tab.includes("x402") && !tab.includes("portfolio")) {
    nodes.push(<AgoraX402Widget key="x402" workspace={workspace} />);
  }
  if (tab.includes("circle")) {
    nodes.push(
      <AgoraCircleToolsWidget key="circle" workspace={workspace} />,
      <AgoraCctpWidget key="cctp" workspace={workspace} />,
    );
  }
  if (tab.includes("receipt")) {
    nodes.push(<AgoraLeaderboardWidget key="leaderboard" workspace={workspace} />);
  }
  if (tab.includes("copy")) {
    nodes.push(<ArcMindCopyTradingWidget key="copy" workspace={workspace} />);
  }
  if (tab.includes("reasoning") || tab.includes("trace")) {
    nodes.push(<ArcMindReasoningWidget key="reasoning" workspace={workspace} />);
  }
  if (tab.includes("signal") || tab.includes("hub")) {
    nodes.push(
      <ArcDecisionLogWidget key="declog" />,
      <ArcMindSignalHubWidget key="signal" workspace={workspace} />,
    );
  }
  if (tab.includes("kill") || tab.includes("risk")) {
    nodes.push(<ArcMindKillSwitchWidget key="kill" workspace={workspace} />);
  }

  return nodes.length > 0 ? <>{nodes}</> : null;
}

// ── Agent extra (none for agora) ───────────────────────────────────────────────
export function renderAgentExtra(_workspace: Workspace): ReactNode | null {
  return null;
}

// ── Arc Deployed Contracts panel ───────────────────────────────────────────────
function ArcContractsPanel({ workspace }: { workspace: Workspace }) {
  const { mode } = useNetworkMode("agora");
  const cfg = getAgoraConfig(mode);
  const [agentId] = useLocalStore<string | null>(`arcmind-agent-id-${workspace.id}`, null);
  const [reputation, setReputation] = useState<number | null>(null);

  useEffect(() => {
    if (!agentId) return;
    getArcAgentStats(agentId).then((s) => { if (s) setReputation(s.reputation); });
    const id = setInterval(() => {
      getArcAgentStats(agentId).then((s) => { if (s) setReputation(s.reputation); });
    }, 30_000);
    return () => clearInterval(id);
  }, [agentId]);

  const CONTRACTS = [
    { name: "ArcMindRegistry.sol", addr: cfg.registryAddress, note: "on-chain agent & service registry" },
    { name: "CopyTradeEscrow.sol", addr: cfg.escrowAddress, note: "ERC-8183 copy-trade escrow" },
  ];
  return (
    <div style={{ background: "var(--bg-2)", borderRadius: 14, border: "1px solid var(--line-2)", overflow: "hidden", marginTop: 14 }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--line-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: ".7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted)" }}>Deployed Contracts</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {reputation !== null && (
            <span style={{ fontSize: ".62rem", color: "#22c55e", fontWeight: 700, background: "#22c55e18", padding: "2px 7px", borderRadius: 5 }}>
              rep {reputation}
            </span>
          )}
          <span style={{ fontSize: ".62rem", color: "#1652F0", fontWeight: 700, background: "#1652F018", padding: "2px 7px", borderRadius: 5 }}>Arc L1 testnet · chainId 5042002</span>
        </div>
      </div>
      {CONTRACTS.map((c) => (
        <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", borderBottom: "1px solid var(--line-2)" }}>
          <ShieldCheck size={13} style={{ color: c.addr ? "#1652F0" : "var(--muted)", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: ".77rem", fontWeight: 700, color: "var(--ink)" }}>{c.name}</div>
            <div style={{ fontSize: ".62rem", color: "var(--muted)" }}>{c.note}</div>
          </div>
          {c.addr ? (
            <a href={`${cfg.explorerBase}/address/${c.addr}`} target="_blank" rel="noreferrer"
              style={{ fontSize: ".6rem", fontWeight: 700, color: "#1652F0", fontFamily: "monospace", textDecoration: "none", whiteSpace: "nowrap" }}>
              {c.addr.slice(0, 10)}…↗
            </a>
          ) : (
            <span style={{ fontSize: ".6rem", color: "var(--muted)" }}>not configured</span>
          )}
        </div>
      ))}
      <div style={{ padding: "8px 16px", fontSize: ".62rem", color: "var(--muted)" }}>
        Arc L1 mainnet not yet live · both modes use testnet chain
      </div>
    </div>
  );
}

function AgoraEcosystemLinks() {
  const { mode } = useNetworkMode("agora");
  const isTestnet = mode === "testnet";
  const groups = isTestnet ? [
    { title: "Explorer", items: [{ label: "Arc Testnet Explorer", url: "https://explorer.testnet.arcchain.io" }] },
    { title: "Faucet", items: [{ label: "Arc Testnet Faucet", url: "https://faucet.testnet.arcchain.io" }] },
  ] : [
    { title: "Explorer", items: [{ label: "Arc Explorer", url: "https://explorer.arcchain.io" }] },
    { title: "Bridge", items: [{ label: "Arc Bridge", url: "https://bridge.arcchain.io" }] },
    { title: "Swap", items: [{ label: "Arc DEX", url: "https://dex.arcchain.io" }] },
    { title: "Dev", items: [{ label: "Arc Docs", url: "https://docs.arcchain.io" }, { label: "Circle CCTP", url: "https://developers.circle.com/stablecoins/cctp-getting-started" }] },
  ];
  return <EcosystemLinksPanel groups={groups} network={isTestnet ? "Arc Testnet · chainId 5042002" : "Arc Mainnet"} accent="#F59E0B" />;
}

// ── Live traction strip ────────────────────────────────────────────────────────
const SERVER_URL = (import.meta.env as Record<string, string | undefined>)["VITE_SERVER_URL"] ?? "";

function ArcMindTractionStrip() {
  const [decisions, setDecisions] = useState<number>(0);
  const [traces, setTraces] = useState<number>(0);
  const [volumeUsd, setVolumeUsd] = useState<number>(0);
  const [uptimeDays, setUptimeDays] = useState<number>(0);

  async function load() {
    try {
      const [decRes, recRes] = await Promise.all([
        fetch(`${SERVER_URL}/api/arc-decisions`, { signal: AbortSignal.timeout(6_000) }),
        fetch(`${SERVER_URL}/api/receipts?workspace=agora`, { signal: AbortSignal.timeout(6_000) }),
      ]);
      if (decRes.ok) {
        const d = await decRes.json() as { decisions: { ts: string }[] };
        setDecisions(d.decisions?.length ?? 0);
        if (d.decisions?.length) {
          const oldest = d.decisions[d.decisions.length - 1].ts;
          const days = (Date.now() - new Date(oldest).getTime()) / 86_400_000;
          setUptimeDays(Math.max(0, Math.round(days)));
        }
      }
      if (recRes.ok) {
        const r = await recRes.json() as { receipts: { amount: number }[]; count: number };
        const traceReceipts = r.receipts?.filter((rec: { amount: number }) => rec.amount <= 0.05) ?? [];
        setTraces(traceReceipts.length);
        setVolumeUsd(r.receipts?.reduce((s: number, rec: { amount: number }) => s + rec.amount, 0) ?? 0);
      }
    } catch { /* server may be down */ }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  const stats = [
    { label: "Decisions on-chain", value: decisions.toString(), accent: "#8b5cf6" },
    { label: "Traces sold", value: traces.toString(), accent: "#6366f1" },
    { label: "Total volume", value: `$${volumeUsd.toFixed(2)}`, accent: "#22c55e" },
    { label: "Uptime", value: uptimeDays > 0 ? `${uptimeDays}d` : "live", accent: "#f59e0b" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 14 }}>
      {stats.map((s) => (
        <div key={s.label} style={{ background: "var(--bg-2)", borderRadius: 10, border: "1px solid var(--line-2)", padding: "10px 14px" }}>
          <div style={{ fontSize: ".62rem", color: "var(--muted)", marginBottom: 3 }}>{s.label}</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 800, color: s.accent, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}

// ── Overview extra ─────────────────────────────────────────────────────────────
export function renderOverviewExtra(
  workspace: Workspace,
  _onGoTab: (t: string) => boolean,
  _onGoReceipts: () => void,
): ReactNode | null {
  return (
    <>
      <ArcMindTractionStrip />
      <ArcContractsPanel workspace={workspace} />
      <AgoraEcosystemLinks />
    </>
  );
}
