export { MantleAgentIdentity, MantleVaultPanel, MantleBudgetPanel } from "../../components/widgets/mantle/MantleOnchain";
export { StrategyDeployPanel, YieldProjectionCalc, WhaleAlertFeed, CreditScoreMeter, AlphaBotWidget, AgentCreditLine } from "../../components/widgets/mantle-extra/MantleExtraWidgets";
export { MantleEarnCalc, MantleAgentEconomyDashboard, MantlePortfolioRebalancer, MantleGasOptimizer, AlphaDesk, RwaRegistry, MantleEconomyLoop, YieldBoard, MantleDevToolsPanel } from "./inline-widgets";

import type { ReactNode } from "react";
import type { Service, Workspace } from "../../types";
import type { Receipt } from "../../types";
import type { SigBlock, CardDef, CardCtx } from "../_types";
import { ArrowUpRight, Bell, Database, Robot, Bolt, Receipt as RIco } from "../../icons402";
import { MantleAgentIdentity, MantleVaultPanel, MantleBudgetPanel } from "../../components/widgets/mantle/MantleOnchain";
import { StrategyDeployPanel, YieldProjectionCalc, WhaleAlertFeed, CreditScoreMeter, AlphaBotWidget, AgentCreditLine } from "../../components/widgets/mantle-extra/MantleExtraWidgets";
import { MantleEarnCalc, MantleAgentEconomyDashboard, MantlePortfolioRebalancer, MantleGasOptimizer, AlphaDesk, RwaRegistry, MantleEconomyLoop, YieldBoard, MantleDevToolsPanel } from "./inline-widgets";

export const signature: SigBlock = {
  title: "Yield board",
  sub: "the instruments your alpha & RWA endpoints track",
  headers: ["Instrument", "APY", "Duration", "7d trend"],
  rows: [
    ["mETH", "3.9%", "perpetual", "+0.2%"],
    ["USDY", "5.1%", "perpetual", "+0.0%"],
    ["T-BILL 90D", "4.83%", "84 days", "+0.1%"],
    ["RWA basket A-", "6.2%", "120 days", "-0.3%"],
  ],
  accentCol: 3,
};

export function cards({ onGoTab, onOpenPayment: _onOpenPayment, wsReceipts, def: _def, onGoReceipts }: CardCtx & { onGoReceipts: () => void }): CardDef[] {
  return [
    { light: true, ico: ArrowUpRight, title: "Run a strategy backtest", sub: "mETH · USDY · T-BILL · $0.15 / run", onClick: () => onGoTab("strategy") || onGoTab("sandbox") },
    { ico: Bell, title: "Browse the alpha feed", sub: "AI-scored signals · confidence 68-91%", onClick: () => onGoTab("alpha") },
    { ico: Database, title: "Fetch RWA risk data", sub: "basket · grade · duration · APY", onClick: () => onGoTab("rwa") },
    { ico: Robot, title: "Manage Alpha Strategist agent", sub: "daily limit $15 · auto-pay on", onClick: () => onGoTab("wallet") || onGoTab("agent") },
    { ico: Bolt, title: "mETH / USDY yield signals", sub: "rotation suggestion · rebalance band", onClick: () => onGoTab("meth") || onGoTab("yield") },
    { ico: RIco, title: "View all receipts", sub: `${wsReceipts.length} paid strategy runs`, onClick: () => onGoReceipts() },
  ];
}

export function renderTab(t: string, workspace: Workspace, _receipts: Receipt[], _onOpenPayment: (s: Service) => void): ReactNode | null {
  const nodes: ReactNode[] = [];
  if (t.includes("strateg") || t.includes("sandbox")) nodes.push(<StrategyDeployPanel key="strategy" workspace={workspace} />);
  if (t.includes("economy")) nodes.push(<MantleAgentEconomyDashboard key="economy" workspace={workspace} />);
  if (t.includes("alpha")) {
    nodes.push(<AlphaDesk key="alpha" workspace={workspace} />);
    nodes.push(<WhaleAlertFeed key="whale" workspace={workspace} />);
    nodes.push(<AlphaBotWidget key="alphabot" workspace={workspace} />);
  }
  if (t.includes("meth") || t.includes("usdy") || (t.includes("yield") && !t.includes("alpha"))) {
    nodes.push(<MantleEarnCalc key="earncalc" workspace={workspace} />);
    nodes.push(<MantlePortfolioRebalancer key="rebalancer" workspace={workspace} />);
    nodes.push(<YieldBoard key="yieldboard" workspace={workspace} />);
    nodes.push(<YieldProjectionCalc key="yield" workspace={workspace} />);
  }
  if (t.includes("rwa")) nodes.push(<RwaRegistry key="rwa" workspace={workspace} />);
  if (t.includes("devtool") || t.includes("dev tool")) {
    nodes.push(<MantleGasOptimizer key="gas" workspace={workspace} />);
    nodes.push(<MantleDevToolsPanel key="devtools" workspace={workspace} />);
  }
  if (t.includes("credit")) nodes.push(<CreditScoreMeter key="credit" workspace={workspace} />);
  return nodes.length > 0 ? <>{nodes}</> : null;
}

export function renderAgentExtra(workspace: Workspace): ReactNode | null {
  return (
    <>
      <MantleAgentIdentity workspace={workspace} />
      <MantleVaultPanel workspace={workspace} />
      <MantleBudgetPanel workspace={workspace} />
      <MantleEconomyLoop workspace={workspace} />
      <AgentCreditLine workspace={workspace} />
    </>
  );
}

export function renderOverviewExtra(_workspace: Workspace, _onGoTab: (t: string) => boolean, _onGoReceipts: () => void): ReactNode | null {
  return null;
}
