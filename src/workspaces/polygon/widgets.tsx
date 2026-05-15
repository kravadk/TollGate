import type { ReactNode } from "react";
import type { Service, Workspace } from "../../types";
import type { Receipt } from "../../types";
import type { SigBlock, CardDef, CardCtx } from "../_types";
import { Bolt, Link as LinkIco, Send, Robot, Shield, Receipt as RIco } from "../../icons402";
import { useNetworkMode } from "../../hooks/useNetworkMode";
import { EcosystemLinksPanel } from "../../components/ui/EcosystemLinksPanel";
import {
  PolygonTradeFinanceWidget,
  PolygonUsdcPaymentsWidget,
  PolygonAgentMarketplaceWidget,
  PolygonStatsWidget,
  PolygonMerchantOnboardingWidget,
} from "../../components/widgets/polygon/PolygonWidgets";

export {
  PolygonTradeFinanceWidget,
  PolygonUsdcPaymentsWidget,
  PolygonAgentMarketplaceWidget,
  PolygonStatsWidget,
  PolygonMerchantOnboardingWidget,
};

export const signature: SigBlock = {
  title: "Polygon zkEVM commerce",
  sub: "UAE trade finance & merchant micropayments settled in USDC on Polygon",
  headers: ["Corridor", "Volume 24h", "Fee", "Status"],
  rows: [
    ["AED → USDC", "$142,000", "$0.05/call", "active"],
    ["SME trade invoices", "18 tokenised", "0.1%", "active"],
    ["Merchant checkouts", "3,410 calls", "$0.01/call", "active"],
    ["Cross-border remittance", "$38,200", "0.2%", "active"],
  ],
  accentCol: 3,
};

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
      ico: Bolt,
      title: "Publish a paid API in 30 sec",
      sub: "paste endpoint · get TollGate URL · earn USDC",
      onClick: () => { onGoTab("merchant"); },
    },
    {
      ico: LinkIco,
      title: "Tokenise a trade invoice",
      sub: "90% advance · USDC on Polygon zkEVM",
      onClick: () => { onGoTab("trade") || onGoTab("finance"); },
    },
    {
      ico: Send,
      title: "Cross-border remittance",
      sub: "AED ↔ USDC · UAE corridors · $0.05/call",
      onClick: () => { if (def) onOpenPayment(def); },
    },
    {
      ico: Robot,
      title: "Polygon Merchant Agent settings",
      sub: "daily limit $15 · auto-pay on",
      onClick: () => { onGoTab("agent"); },
    },
    {
      ico: Shield,
      title: "Agent marketplace discovery",
      sub: "find & pay Polygon services via x402",
      onClick: () => { onGoTab("marketplace") || onGoTab("discovery"); },
    },
    {
      ico: RIco,
      title: "View all receipts",
      sub: `${wsReceipts.length} Polygon payments`,
      onClick: () => onGoReceipts(),
    },
  ];
}

export function renderTab(
  t: string,
  workspace: Workspace,
  _receipts: Receipt[],
  _onOpenPayment: (s: Service) => void,
): ReactNode | null {
  const nodes: ReactNode[] = [];
  if (t.includes("merchant") || t.includes("mode")) {
    nodes.push(<PolygonMerchantOnboardingWidget key="merchant" workspace={workspace} />);
  }
  if (t.includes("trade") || t.includes("finance")) {
    nodes.push(<PolygonTradeFinanceWidget key="trade" workspace={workspace} />);
  }
  if (t.includes("marketplace") || t.includes("agent")) {
    nodes.push(<PolygonAgentMarketplaceWidget key="marketplace" workspace={workspace} />);
  }
  if (t.includes("usdc") || t.includes("payment") || t.includes("remittance")) {
    nodes.push(<PolygonUsdcPaymentsWidget key="usdc" workspace={workspace} />);
  }
  if (t.includes("overview")) {
    nodes.push(<PolygonStatsWidget key="stats" workspace={workspace} />);
  }
  return nodes.length > 0 ? <>{nodes}</> : null;
}

export function renderAgentExtra(_workspace: Workspace): ReactNode | null {
  return null;
}

function PolygonEcosystemLinks() {
  const { mode } = useNetworkMode("polygon");
  const isTestnet = mode === "testnet";
  const groups = isTestnet ? [
    { title: "Explorer", items: [{ label: "Cardona Testnet Explorer", url: "https://cardona-zkevm.polygonscan.com" }] },
    { title: "Faucet", items: [{ label: "Polygon zkEVM Faucet", url: "https://faucet.polygon.technology" }] },
    { title: "Bridge", items: [{ label: "zkEVM Bridge (Testnet)", url: "https://bridge-ui.zkevm-rpc.com" }] },
  ] : [
    { title: "Explorer", items: [{ label: "PolygonScan zkEVM", url: "https://zkevm.polygonscan.com" }] },
    { title: "Bridge", items: [{ label: "Polygon Bridge", url: "https://bridge.polygon.technology" }] },
    { title: "Swap", items: [{ label: "QuickSwap", url: "https://quickswap.exchange" }, { label: "Uniswap (Polygon)", url: "https://app.uniswap.org/#/swap?chain=polygon_zkevm" }] },
    { title: "Dev", items: [{ label: "Polygon Docs", url: "https://docs.polygon.technology/zkEVM" }, { label: "AggLayer", url: "https://agglayer.polygon.technology" }] },
  ];
  return <EcosystemLinksPanel groups={groups} network={isTestnet ? "Polygon zkEVM Cardona Testnet" : "Polygon zkEVM Mainnet · chainId 1101"} accent="#8247E5" />;
}

export function renderOverviewExtra(
  _workspace: Workspace,
  _onGoTab: (t: string) => boolean,
  _onGoReceipts: () => void,
): ReactNode | null {
  return <PolygonEcosystemLinks />;
}
