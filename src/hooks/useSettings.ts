import { useState, useCallback } from "react";
import type { WorkspaceId } from "../types";

const KEY = "codex:settings";

export type AccentColor = "indigo" | "emerald" | "amber";

export type WorkspaceSettings = {
  enabled: boolean;
  primaryMode: string;
  settlement: string;
  spendLimitUsd: number;
  riskThreshold: number;
  alerts: boolean;
  automation: boolean;
};

export type Settings = {
  accent: AccentColor;
  autoConnect: boolean;
  showTestnetWarning: boolean;
  defaultWorkspace: "" | WorkspaceId;
  workspace: Record<WorkspaceId, WorkspaceSettings>;
};

export const WORKSPACE_SETTING_DEFAULTS: Record<WorkspaceId, WorkspaceSettings> = {
  agora: {
    enabled: true,
    primaryMode: "signalguard",
    settlement: "arc-testnet-usdc",
    spendLimitUsd: 20,
    riskThreshold: 60,
    alerts: true,
    automation: true,
  },
  "0g": {
    enabled: true,
    primaryMode: "private-compute",
    settlement: "0g-galileo",
    spendLimitUsd: 8,
    riskThreshold: 75,
    alerts: false,
    automation: true,
  },
  arbitrum: {
    enabled: true,
    primaryMode: "usdc-payments",
    settlement: "arbitrum-one-usdc",
    spendLimitUsd: 12,
    riskThreshold: 70,
    alerts: true,
    automation: false,
  },
  mantle: {
    enabled: true,
    primaryMode: "yield-balanced",
    settlement: "mantle-usdc",
    spendLimitUsd: 15,
    riskThreshold: 55,
    alerts: true,
    automation: true,
  },
  sui: {
    enabled: true,
    primaryMode: "wallet-zklogin",
    settlement: "sui-testnet",
    spendLimitUsd: 10,
    riskThreshold: 65,
    alerts: false,
    automation: true,
  },
  qie: {
    enabled: true,
    primaryMode: "merchant-pos",
    settlement: "qie-testnet",
    spendLimitUsd: 6,
    riskThreshold: 50,
    alerts: true,
    automation: true,
  },
  polygon: {
    enabled: true,
    primaryMode: "merchant-finance",
    settlement: "polygon-zkevm-usdc",
    spendLimitUsd: 15,
    riskThreshold: 60,
    alerts: true,
    automation: true,
  },
};

const DEFAULTS: Settings = {
  accent: "indigo",
  autoConnect: true,
  showTestnetWarning: true,
  defaultWorkspace: "",
  workspace: WORKSPACE_SETTING_DEFAULTS,
};

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      ...DEFAULTS,
      ...parsed,
      workspace: {
        ...WORKSPACE_SETTING_DEFAULTS,
        ...(parsed.workspace ?? {}),
      },
    };
  } catch {
    return DEFAULTS;
  }
}

export function useSettings() {
  const [settings, setSettingsState] = useState<Settings>(load);

  const setSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettingsState((prev) => {
      const next = { ...prev, [key]: value };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const setWorkspaceSetting = useCallback(<K extends keyof WorkspaceSettings>(workspaceId: WorkspaceId, key: K, value: WorkspaceSettings[K]) => {
    setSettingsState((prev) => {
      const current = prev.workspace[workspaceId] ?? WORKSPACE_SETTING_DEFAULTS[workspaceId];
      const next = {
        ...prev,
        workspace: {
          ...prev.workspace,
          [workspaceId]: {
            ...current,
            [key]: value,
          },
        },
      };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const resetWorkspaceSettings = useCallback((workspaceId: WorkspaceId) => {
    setSettingsState((prev) => {
      const next = {
        ...prev,
        workspace: {
          ...prev.workspace,
          [workspaceId]: WORKSPACE_SETTING_DEFAULTS[workspaceId],
        },
      };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return { settings, setSetting, setWorkspaceSetting, resetWorkspaceSettings };
}

export const ACCENT_CSS: Record<AccentColor, string> = {
  indigo: "#6366f1",
  emerald: "#10b981",
  amber: "#f59e0b",
};
