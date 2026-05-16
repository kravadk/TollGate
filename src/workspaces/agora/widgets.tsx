import { type ReactNode, useState, useEffect } from "react";
import { TrendingUp, CircleDollarSign, Zap, ShieldCheck } from "lucide-react";
import type { Service, Workspace } from "../../types";
import type { Receipt } from "../../types";
import type { SigBlock, CardDef, CardCtx } from "../_types";
import { Robot, Code, Receipt as RIco } from "../../icons402";
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
  title: "Arc L1 agent commerce",
  sub: "Circle tools powering autonomous cross-chain arbitrage on Arc mainnet",
  headers: ["Tool", "Role", "Latency", "Status"],
  rows: [
    ["USDC", "settlement currency", "<1s", "active"],
    ["CCTP", "Arc ↔ Base cross-chain", "<500ms", "active"],
    ["Paymaster", "gas sponsorship", "free", "active"],
    ["Nanopayments", "streaming receipts", "real-time", "active"],
  ],
  accentCol: 3,
};

// ── Cards ──────────────────────────────────────────────────────────────────────
export function cards({
  onGoTab,
  onOpenPayment,
  wsReceipts,
  def,
  onGoReceipts,
}: CardCtx & { onGoReceipts: () => void }): CardDef[] {
  return [
    {
      light: true,
      ico: TrendingUp,
      title: "Run cross-chain arb demo",
      sub: "ETH/USDC gap Arc vs Base · $0.05 · CCTP",
      onClick: () => { onGoTab("arbitrage") || onGoTab("arb"); },
    },
    {
      ico: CircleDollarSign,
      title: "Adaptive portfolio rebalancer",
      sub: "multi-asset · USDC settlement · Paymaster",
      onClick: () => onGoTab("portfolio"),
    },
    {
      ico: Zap,
      title: "Pay-per-inference on Arc",
      sub: "x402 → USDC → instant settlement",
      onClick: () => { if (def) onOpenPayment(def); },
    },
    {
      ico: Robot,
      title: "ArcArb Agent settings",
      sub: "daily limit $20 · auto-pay on · CCTP",
      onClick: () => onGoTab("agent"),
    },
    {
      ico: Code,
      title: "Circle Tools — CCTP & Nanopayments",
      sub: "CCTP bridge · Gateway · Paymaster",
      onClick: () => { onGoTab("circle") || onGoTab("gateway"); },
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

// ── Overview extra ─────────────────────────────────────────────────────────────
export function renderOverviewExtra(
  workspace: Workspace,
  _onGoTab: (t: string) => boolean,
  _onGoReceipts: () => void,
): ReactNode | null {
  return (
    <>
      <ArcContractsPanel workspace={workspace} />
      <AgoraEcosystemLinks />
    </>
  );
}
