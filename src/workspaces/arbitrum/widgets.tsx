export { ArbitrumEscrowPanel } from "../../components/widgets/arbitrum/ArbitrumEscrowPanel";
export { BatchPayoutConsole, StylusSnippetViewer, RobinhoodChainPanel } from "../../components/widgets/arbitrum-extra/ArbitrumExtraWidgets";
export { AgentIntentWidget } from "../../components/widgets/arbitrum-extra/AgentIntentWidget";
export { ArbAddressBook, ArbRecurringPayments, ArbAllowanceManager, ArbContractPaymentSim, ArbPaymentFlowDiagram, UsdcTransferWidget, AgentServiceRegistry, SpendRulesEditor, ArbitrumStylusDeployPanel, ArbBudgetPanel, ArbOnChainRegistry, ArbDisputePanel, ArbAgentReputation } from "./inline-widgets";

import type { ReactNode } from "react";
import type { Service, Workspace } from "../../types";
import type { Receipt } from "../../types";
import type { SigBlock, CardDef, CardCtx } from "../_types";
import { Send, Shield, Globe, Robot, Lock, Receipt as RIco } from "../../icons402";
import { ArbitrumEscrowPanel } from "../../components/widgets/arbitrum/ArbitrumEscrowPanel";
import { BatchPayoutConsole, StylusSnippetViewer, RobinhoodChainPanel } from "../../components/widgets/arbitrum-extra/ArbitrumExtraWidgets";
import { AgentIntentWidget } from "../../components/widgets/arbitrum-extra/AgentIntentWidget";
import { ArbAddressBook, ArbRecurringPayments, ArbAllowanceManager, ArbContractPaymentSim, ArbPaymentFlowDiagram, UsdcTransferWidget, AgentServiceRegistry, SpendRulesEditor, ArbitrumStylusDeployPanel, ArbBudgetPanel, ArbOnChainRegistry, ArbDisputePanel, ArbAgentReputation } from "./inline-widgets";

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
  if (t.includes("escrow")) {
    nodes.push(<ArbitrumEscrowPanel key="escrow" workspace={workspace} />);
    nodes.push(<ArbDisputePanel key="dispute" workspace={workspace} />);
  }
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
    nodes.push(<ArbBudgetPanel key="budget" workspace={workspace} />);
    nodes.push(<ArbOnChainRegistry key="onchain-reg" workspace={workspace} />);
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
    nodes.push(<ArbAgentReputation key="reputation" workspace={workspace} />);
  }
  return nodes.length > 0 ? <>{nodes}</> : null;
}

export function renderAgentExtra(_workspace: Workspace): ReactNode | null {
  return null;
}

const ARB_CONTRACTS = [
  { label: "AgentEscrow (Sepolia)",      addr: (import.meta.env as Record<string,string|undefined>)["VITE_ARBITRUM_ESCROW_ADDRESS"] ?? "0x990Fe8e3f7d59148593D9B174a70F2Cd79C7bBc7", explorer: "https://sepolia.arbiscan.io" },
  { label: "AgentEscrow (One)",          addr: (import.meta.env as Record<string,string|undefined>)["VITE_ARBITRUM_MAINNET_ESCROW_ADDRESS"] ?? "0x1dF5382BDb63537cd731A8e3Ee09eF10EA4179a3", explorer: "https://arbiscan.io" },
  { label: "ServiceRegistry (One)",      addr: (import.meta.env as Record<string,string|undefined>)["VITE_ARB_MAINNET_SERVICE_REGISTRY_ADDRESS"] ?? "0x8403F655Cb8750012D443c135840185691039236", explorer: "https://arbiscan.io" },
  { label: "AgentBudget (One)",          addr: (import.meta.env as Record<string,string|undefined>)["VITE_ARB_MAINNET_AGENT_BUDGET_ADDRESS"] ?? "0x68c17e2e69DD79651457D440B5f5DCE77B9ad732", explorer: "https://arbiscan.io" },
  { label: "AgentIntentSettler (Sep.)",  addr: (import.meta.env as Record<string,string|undefined>)["VITE_ARB_INTENT_SETTLER_ADDRESS"] ?? "0x5E870A75059AfEF6D310bcCD8EdC7BaAa2535620", explorer: "https://sepolia.arbiscan.io" },
] as const;

export function renderOverviewExtra(_workspace: Workspace, _onGoTab: (t: string) => boolean, _onGoReceipts: () => void): ReactNode | null {
  return (
    <div style={{ background: "var(--bg-2)", borderRadius: 14, border: "1px solid var(--line-2)", overflow: "hidden" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--line-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: ".7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--muted)" }}>Deployed Contracts</span>
        <span style={{ fontSize: ".63rem", color: "#1B4ADD", fontWeight: 700, background: "#1B4ADD18", padding: "2px 7px", borderRadius: 5 }}>Arbitrum One + Sepolia</span>
      </div>
      {ARB_CONTRACTS.map((c) => {
        const short = `${c.addr.slice(0, 8)}…${c.addr.slice(-6)}`;
        return (
          <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", borderBottom: "1px solid var(--line-2)" }}>
            <Shield width={13} height={13} style={{ color: "#5C7CFF", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: ".77rem", fontWeight: 700, color: "var(--ink)" }}>{c.label}</div>
              <div style={{ fontSize: ".62rem", color: "var(--muted)", fontFamily: "monospace" }}>{c.addr}</div>
            </div>
            <a href={`${c.explorer}/address/${c.addr}`} target="_blank" rel="noreferrer"
              style={{ fontSize: ".6rem", color: "#5C7CFF", fontWeight: 700, textDecoration: "none", background: "#5C7CFF14", padding: "3px 7px", borderRadius: 5, whiteSpace: "nowrap" }}
            >{short} ↗</a>
          </div>
        );
      })}
    </div>
  );
}
