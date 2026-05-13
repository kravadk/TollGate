// x402 / TollGate server types. Mirrors src/types.ts on the frontend
// (kept minimal — only what the gateway needs).

export type WorkspaceId =
  | "0g" | "qie" | "arbitrum" | "mantle" | "sui" | "agora" | "polygon";

export type ServiceCategory =
  | "data" | "inference" | "storage" | "analytics" | "payment" | "game-intel" | "tax" | "trading";

export type Service = {
  id: string;
  workspaceIds: WorkspaceId[];
  name: string;
  provider: string;
  providerWallet: string;
  category: ServiceCategory | string;
  priceUsd: number;
  currency: string;
  network: string;
  description: string;
  sampleResponse: unknown;
  status: "active" | "paused";
};

export type AgentPolicy = {
  id: string;
  workspaceId: WorkspaceId;
  name: string;
  wallet: string;
  status: "active" | "paused";
  autoPay: boolean;
  dailyLimitUsd: number;
  maxPerRequestUsd: number;
  spentTodayUsd: number;
  allowlist: string[];
};

export type PaymentChallenge = {
  challengeId: string;
  serviceId: string;
  amount: string;
  currency: string;
  network: string;
  payTo: string;
  requestHash: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
};

export type X402PaymentProof = {
  challengeId?: string;
  payTo: string;
  amount: string;
  asset: string;
  network: string;
  txHash?: string;
  payer?: string;
};

export type ReceiptStatus = "paid" | "verified" | "failed" | "replayed" | "expired";

export type Receipt = {
  id: string;
  challengeId: string;
  workspaceId: WorkspaceId | "unknown";
  serviceId: string;
  serviceName: string;
  agentId: string;
  payerWallet: string;
  providerWallet: string;
  amount: number;
  currency: string;
  network: string;
  txHash?: string;
  requestHash: string;
  status: ReceiptStatus;
  errorCode?: string;
  createdAt: string;
  paidAt?: string;
  verifiedAt?: string;
};

export type X402CallLogEntry = {
  timestamp: number;
  endpoint: string;
  serviceId: string;
  caller: string;
  amount: number;
  asset: string;
  status: "paid" | "rejected";
  reason?: string;
};
