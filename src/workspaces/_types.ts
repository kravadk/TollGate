import type { ReceiptStatus, WorkspaceId } from "../types";

export type SRaw = {
  id: string;
  workspaceId: WorkspaceId;
  name: string;
  provider: string;
  providerWallet: string;
  category: string;
  priceUsd: number;
  currency: string;
  network: string;
  description: string;
  sampleIn: string;
  response: string;
  status: "active" | "paused";
  calls: number;
  lastPaid?: string;
};

export type AgentRaw = {
  id: string;
  workspaceId: WorkspaceId;
  name: string;
  wallet: string;
  autoPay: boolean;
  dailyLimitUsd: number;
  maxPerRequestUsd: number;
  spentTodayUsd: number;
  allowlist: string[];
};

export type SeedRow = {
  ws: WorkspaceId;
  svc: string;
  agent: string;
  mins: number;
  status: ReceiptStatus;
  err?: string;
  kind?: string;
  payload?: Record<string, unknown>;
  name?: string;
};
