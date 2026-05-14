import { Agentation } from "agentation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { AppStateContext, type AppState, type EmitReceiptInput } from "./app-state";
import { ProjectLauncher } from "./pages/ProjectLauncher";
import { WorkspacePage } from "./pages/WorkspacePage";
import { NotFound } from "./pages/NotFound";
import { AppLayout } from "./layouts/AppLayout";
import { ReceiptsShowcase } from "./components/ReceiptsShowcase";
import { FleetView } from "./pages/FleetView";
import { Preloader } from "./components/visual/Preloader";
import { CustomCursor } from "./components/visual/CustomCursor";
import { Toaster, toast } from "./components/ui/Toast";
import { CommandPalette } from "./components/ui/CommandPalette";
import { agentFor, initialReceipts, makeReceiptId, makeTxHash } from "./data";
import type { Receipt, Service, Theme } from "./types";

const THEME_STORAGE_KEY = "tollgate-theme";

function readInitialTheme(): Theme {
  const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);
  const [receipts, setReceipts] = useState<Receipt[]>(initialReceipts);
  const [cmdOpen, setCmdOpen] = useState(false);
  const disconnectShownRef = useRef(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [paidServiceIds, setPaidServiceIds] = useState<Record<string, string>>({});
  const [extraServices, setExtraServices] = useState<Service[]>([]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  // Cmd+K / Ctrl+K → open command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // MetaMask disconnect → show toast
  useEffect(() => {
    const eth = (window as unknown as { ethereum?: { on?: (e: string, h: () => void) => void; removeListener?: (e: string, h: () => void) => void } }).ethereum;
    if (!eth?.on) return;
    const onDisconnect = () => {
      if (disconnectShownRef.current) return;
      disconnectShownRef.current = true;
      toast.warn("Wallet disconnected — reconnect to sign on-chain receipts.");
      setTimeout(() => { disconnectShownRef.current = false; }, 10_000);
    };
    eth.on("disconnect", onDisconnect);
    return () => eth.removeListener?.("disconnect", onDisconnect);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  const addService = useCallback((service: Service) => {
    setExtraServices((prev) => [...prev, service]);
  }, []);

  const approvePayment = useCallback((service: Service, onchainTxHash?: string) => {
    setReceipts((prev) => {
      const workspaceId = service.workspaceIds[0];
      const agent = agentFor(workspaceId);
      const receipt: Receipt = {
        id: makeReceiptId(),
        workspaceId,
        serviceId: service.id,
        serviceName: service.name,
        agentName: agent.name,
        payerWallet: agent.wallet,
        providerWallet: service.providerWallet,
        amount: service.priceUsd,
        currency: service.currency,
        network: service.network,
        txHash: onchainTxHash ?? makeTxHash(),
        status: "verified",
        createdAt: new Date().toISOString(),
        kind: "x402.pay",
        payload: onchainTxHash ? { onchainTxHash, x402: true } : { x402: true },
      };
      return [receipt, ...prev];
    });
    setPaidServiceIds((prev) => ({ ...prev, [service.id]: "just now" }));
  }, []);

  const emitReceipt = useCallback((input: EmitReceiptInput): Receipt => {
    const agent = agentFor(input.workspaceId);
    const receipt: Receipt = {
      id: makeReceiptId(),
      workspaceId: input.workspaceId,
      serviceId: input.serviceId ?? `${input.kind}-${Date.now()}`,
      serviceName: input.serviceName,
      agentName: input.agentName ?? agent.name,
      payerWallet: input.payerWallet ?? agent.wallet,
      providerWallet: input.providerWallet ?? "0x0E437c109A4C1e15172c4dA557E77724D7243F71",
      amount: input.amount,
      currency: input.currency ?? "USDC",
      network: input.network,
      txHash: makeTxHash(),
      status: input.status ?? "verified",
      createdAt: new Date().toISOString(),
      kind: input.kind,
      payload: input.payload,
    };
    setReceipts((prev) => [receipt, ...prev]);
    return receipt;
  }, []);

  const value = useMemo<AppState>(
    () => ({
      receipts,
      approvePayment,
      emitReceipt,
      paidServiceIds,
      extraServices,
      addService,
      selectedService,
      setSelectedService,
      assistantOpen,
      setAssistantOpen,
      theme,
      toggleTheme,
    }),
    [receipts, approvePayment, emitReceipt, paidServiceIds, extraServices, addService, selectedService, assistantOpen, theme, toggleTheme],
  );

  return (
    <AppStateContext.Provider value={value}>
      <Preloader />
      <CustomCursor />
      <Toaster />
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      <Routes>
        <Route path="/" element={<ProjectLauncher theme={theme} onToggleTheme={toggleTheme} />} />
        <Route path="/app/:wsId" element={<AppLayout />}>
          <Route index element={<WorkspacePage />} />
          <Route path=":tabSlug" element={<WorkspacePage />} />
        </Route>
        <Route path="/fleet" element={<FleetView />} />
        <Route
          path="/showcase"
          element={<ReceiptsShowcase onBack={() => { window.history.back(); }} />}
        />
        <Route path="*" element={<NotFound />} />
      </Routes>

      {import.meta.env.DEV ? (
        <Agentation
          endpoint="http://localhost:4747"
          onSessionCreated={(sessionId) => {
            console.info("Agentation session started:", sessionId);
          }}
        />
      ) : null}
    </AppStateContext.Provider>
  );
}
