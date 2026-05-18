import { useState, useCallback } from "react";

const KEY = "codex:settings";

export type AccentColor = "indigo" | "emerald" | "amber";

export type Settings = {
  accent: AccentColor;
  autoConnect: boolean;
  showTestnetWarning: boolean;
  defaultWorkspace: string;
};

const DEFAULTS: Settings = {
  accent: "indigo",
  autoConnect: false,
  showTestnetWarning: true,
  defaultWorkspace: "",
};

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
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

  return { settings, setSetting };
}

export const ACCENT_CSS: Record<AccentColor, string> = {
  indigo: "#6366f1",
  emerald: "#10b981",
  amber: "#f59e0b",
};
