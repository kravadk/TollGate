import type { ReactNode } from "react";
import type { Service, Workspace } from "../../types";
import type { Receipt } from "../../types";
import { SuiDemoFlow, SuiLiveContractsPanel } from "./inline-widgets";
import type { SigBlock, CardDef, CardCtx } from "../_types";
import { Bolt, Code, Star, Robot, Shield, Receipt as RIco } from "../../icons402";
import {
  WalrusStorageWidget,
  MoveContractViewer,
  SuiNftMarket,
  ZkLoginPanel,
  SuiAgentWalletPanel,
  SuiAgentEconomyLoop,
  DeepBookYieldEscrow,
  AgentNftReputation,
  SuiPayButtonWidget,
  AgentMemoryNetwork,
  BattleArenaWidget,
  IntentEngineWidget,
} from "../../components/widgets/sui/SuiWidgets";

export {
  WalrusStorageWidget,
  MoveContractViewer,
  SuiNftMarket,
  ZkLoginPanel,
  SuiAgentWalletPanel,
  SuiAgentEconomyLoop,
  DeepBookYieldEscrow,
  AgentNftReputation,
  SuiPayButtonWidget,
  AgentMemoryNetwork,
  BattleArenaWidget,
  IntentEngineWidget,
};

export const signature: SigBlock = {
  title: "Sui agent economy",
  sub: "Walrus storage, Move contracts, NFT passes and zkLogin on Sui mainnet",
  headers: ["Layer", "Role", "Volume 24h", "Status"],
  rows: [
    ["Walrus Storage", "blob pinning & retrieval", "2,840 blobs", "healthy"],
    ["Move VM", "PTB execution & dry-run", "1,120 txs", "healthy"],
    ["Kiosk / NFT", "agent passes & access NFTs", "620 mints", "healthy"],
    ["zkLogin", "OAuth-to-Sui proofs", "1,100 proofs", "healthy"],
  ],
  accentCol: 3,
};

export function cards({ onGoTab, onOpenPayment: _onOpenPayment, wsReceipts, def: _def, onGoReceipts }: CardCtx): CardDef[] {
  return [
    { light: true, ico: Bolt, title: "Pin a blob to Walrus storage", sub: "decentralised · epoch-based · verifiable", onClick: () => { onGoTab("walrus") || onGoTab("storage"); } },
    { ico: Code, title: "Execute a Move PTB", sub: "dry-run or live · programmable tx blocks", onClick: () => { onGoTab("move") || onGoTab("contracts"); } },
    { ico: Star, title: "Mint an agent NFT pass", sub: "Kiosk-compatible · tier-gated access", onClick: () => { onGoTab("nft") || onGoTab("market"); } },
    { ico: Shield, title: "Generate a zkLogin proof", sub: "OAuth → Sui wallet · no seed phrase", onClick: () => { onGoTab("wallet") || onGoTab("agent"); } },
    { ico: Robot, title: "Sui Economy Agent settings", sub: "daily limit $10 · auto-pay on", onClick: () => { onGoTab("agent"); } },
    { ico: RIco, title: "View all receipts", sub: `${wsReceipts.length} Sui payments`, onClick: () => { onGoReceipts(); } },
  ];
}

export function renderTab(t: string, workspace: Workspace, _receipts: Receipt[], _onOpenPayment: (s: Service) => void): ReactNode | null {
  const tl = t.toLowerCase();
  if (tl.includes("walrus") || tl.includes("storage")) return <WalrusStorageWidget workspace={workspace} />;
  if (tl.includes("move") || tl.includes("contracts")) return <MoveContractViewer workspace={workspace} />;
  if (tl.includes("nft") || tl.includes("market")) return <SuiNftMarket workspace={workspace} />;
  if (tl.includes("wallet") || tl.includes("agent")) return <><SuiAgentWalletPanel workspace={workspace} /><ZkLoginPanel workspace={workspace} /><SuiAgentEconomyLoop workspace={workspace} /></>;
  if (tl.includes("yield") || tl.includes("escrow")) return <DeepBookYieldEscrow workspace={workspace} />;
  if (tl.includes("arena")) return <BattleArenaWidget workspace={workspace} />;
  if (tl.includes("pay widget") || tl.includes("pay button") || tl.includes("widget")) return <SuiPayButtonWidget workspace={workspace} />;
  if (tl.includes("memory") || tl.includes("memory network")) return <AgentMemoryNetwork workspace={workspace} />;
  if (tl.includes("intent")) return <IntentEngineWidget workspace={workspace} />;
  if (tl.includes("receipt")) return <AgentNftReputation workspace={workspace} />;
  return null;
}

export function renderAgentExtra(_workspace: Workspace): ReactNode | null {
  return null;
}

export function renderOverviewExtra(workspace: Workspace, onGoTab: (t: string) => boolean, onGoReceipts: () => void): ReactNode | null {
  return (
    <>
      <SuiDemoFlow workspace={workspace} onGoTab={onGoTab} onGoReceipts={onGoReceipts} />
      <SuiLiveContractsPanel />
    </>
  );
}
