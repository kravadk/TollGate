import { createContext, useContext } from "react";
import type { Receipt, Service, Theme, WorkspaceId } from "./types";

export type EmitReceiptInput = {
  workspaceId: WorkspaceId;
  serviceId?: string;
  serviceName: string;
  amount: number;
  currency?: string;
  network: string;
  agentName?: string;
  payerWallet?: string;
  providerWallet?: string;
  kind: string;
  payload?: Record<string, unknown>;
  status?: Receipt["status"];
};

export type AppState = {
  receipts: Receipt[];
  approvePayment: (service: Service, onchainTxHash?: string) => void;
  emitReceipt: (input: EmitReceiptInput) => Receipt;
  paidServiceIds: Record<string, string>;
  extraServices: Service[];
  addService: (service: Service) => void;
  selectedService: Service | null;
  setSelectedService: (service: Service | null) => void;
  assistantOpen: boolean;
  setAssistantOpen: (open: boolean) => void;
  theme: Theme;
  toggleTheme: () => void;
};

export const AppStateContext = createContext<AppState | null>(null);

export function useAppState(): AppState {
  const v = useContext(AppStateContext);
  if (!v) throw new Error("useAppState must be used within <AppStateContext.Provider>");
  return v;
}
