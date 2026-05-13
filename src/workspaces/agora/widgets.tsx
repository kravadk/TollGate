import type { ReactNode } from "react";
import { TrendingUp, CircleDollarSign, Zap } from "lucide-react";
import type { Service, Workspace } from "../../types";
import type { Receipt } from "../../types";
import type { SigBlock, CardDef, CardCtx } from "../_types";
import { Robot, Code, Receipt as RIco } from "../../icons402";
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
    nodes.push(<ArcMindSignalHubWidget key="signal" workspace={workspace} />);
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

// ── Overview extra (none for agora) ───────────────────────────────────────────
export function renderOverviewExtra(
  _workspace: Workspace,
  _onGoTab: (t: string) => boolean,
  _onGoReceipts: () => void,
): ReactNode | null {
  return null;
}
