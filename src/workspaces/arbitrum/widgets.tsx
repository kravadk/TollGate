export { ArbitrumEscrowPanel } from "../../components/widgets/arbitrum/ArbitrumEscrowPanel";
export { BatchPayoutConsole, StylusSnippetViewer, RobinhoodChainPanel } from "../../components/widgets/arbitrum-extra/ArbitrumExtraWidgets";
export { AgentIntentWidget } from "../../components/widgets/arbitrum-extra/AgentIntentWidget";
export { ArbAddressBook, ArbRecurringPayments, ArbAllowanceManager, ArbContractPaymentSim, ArbPaymentFlowDiagram, UsdcTransferWidget, AgentServiceRegistry, SpendRulesEditor, ArbitrumStylusDeployPanel } from "./inline-widgets";

import type { ReactNode } from "react";
import type { Service, Workspace } from "../../types";
import type { Receipt } from "../../types";
import type { SigBlock, CardDef, CardCtx } from "../_types";
import { Send, Shield, Globe, Robot, Lock, Receipt as RIco } from "../../icons402";
import { ArbitrumEscrowPanel } from "../../components/widgets/arbitrum/ArbitrumEscrowPanel";
import { BatchPayoutConsole, StylusSnippetViewer, RobinhoodChainPanel } from "../../components/widgets/arbitrum-extra/ArbitrumExtraWidgets";
import { AgentIntentWidget } from "../../components/widgets/arbitrum-extra/AgentIntentWidget";
import { ArbAddressBook, ArbRecurringPayments, ArbAllowanceManager, ArbContractPaymentSim, ArbPaymentFlowDiagram, UsdcTransferWidget, AgentServiceRegistry, SpendRulesEditor, ArbitrumStylusDeployPanel } from "./inline-widgets";

export const signature: SigBlock = {
  title: "Orbit & USDC settlement",
  sub: "chains feeding the gateway and the stablecoin flowing through them",
  headers: ["Chain", "USDC settled 24h", "Bridge", "Status"],
  rows: [
    ["Arbitrum One", "$184,200", "healthy", "verified"],
    ["Arbitrum Nova", "$31,040", "healthy", "verified"],
    ["Orbit · PaymentsL3", "$12,510", "degraded", "pending"],
    ["Orbit · GameChain", "$4,180", "healthy", "verified"],
  ],
  accentCol: 3,
};

export function cards({ onGoTab, onOpenPayment: _onOpenPayment, wsReceipts, def: _def, onGoReceipts }: CardCtx): CardDef[] {
  return [
    { light: true, ico: Send, title: "Send USDC on Arbitrum", sub: "live ERC-20 transfer · testnet USDC", onClick: () => { onGoTab("stablecoin") || onGoTab("payment"); } },
    { ico: Shield, title: "Create & manage escrow", sub: "release or refund on delivery proof", onClick: () => { onGoTab("escrow"); } },
    { ico: Globe, title: "Monitor Orbit chains", sub: "sequencer · bridge health · batch lag", onClick: () => { onGoTab("orbit"); } },
    { ico: Robot, title: "Treasury Agent budget policy", sub: "daily limit $12 · spend caps", onClick: () => { onGoTab("agent"); } },
    { ico: Lock, title: "Configure risk rules", sub: "spend caps · allowlists · enforced server-side", onClick: () => { onGoTab("risk"); } },
    { ico: RIco, title: "View all receipts", sub: `${wsReceipts.length} settled payments`, onClick: () => { onGoReceipts(); } },
  ];
}

export function renderTab(t: string, workspace: Workspace, _receipts: Receipt[], onOpenPayment: (s: Service) => void): ReactNode | null {
  const nodes: ReactNode[] = [];
  if (t.includes("escrow")) nodes.push(<ArbitrumEscrowPanel key="escrow" workspace={workspace} />);
  if (t.includes("orbit") || t.includes("monitor")) nodes.push(<RobinhoodChainPanel key="robinhood" workspace={workspace} />);
  if (t.includes("stablecoin") || t.includes("payment") || t.includes("usdc")) {
    nodes.push(<ArbPaymentFlowDiagram key="flow" />);
    nodes.push(<ArbAddressBook key="addrbook" />);
    nodes.push(<UsdcTransferWidget key="usdc" workspace={workspace} />);
    nodes.push(<BatchPayoutConsole key="batch" workspace={workspace} />);
    nodes.push(<ArbRecurringPayments key="recurring" workspace={workspace} />);
  }
  if (t.includes("agent") || t.includes("marketplace")) {
    nodes.push(<AgentServiceRegistry key="registry" workspace={workspace} onOpenPayment={onOpenPayment} />);
  }
  if (t.includes("stylus") || t.includes("rust")) {
    nodes.push(<StylusSnippetViewer key="stylus" workspace={workspace} />);
    nodes.push(<ArbitrumStylusDeployPanel key="deploy" workspace={workspace} />);
    nodes.push(<ArbContractPaymentSim key="sim" workspace={workspace} />);
  }
  if (t.includes("intent") || t.includes("cross")) nodes.push(<AgentIntentWidget key="intent" />);
  if (t.includes("risk") || t.includes("rule") || t.includes("protection")) {
    nodes.push(<ArbAllowanceManager key="allowance" workspace={workspace} />);
    nodes.push(<SpendRulesEditor key="rules" workspace={workspace} services={[]} />);
  }
  return nodes.length > 0 ? <>{nodes}</> : null;
}

export function renderAgentExtra(_workspace: Workspace): ReactNode | null {
  return null;
}

export function renderOverviewExtra(_workspace: Workspace, _onGoTab: (t: string) => boolean, _onGoReceipts: () => void): ReactNode | null {
  return null;
}
