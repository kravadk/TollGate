import { useState, useCallback } from "react";
import type { NetworkMode } from "../lib/chains";

export type { NetworkMode };

export function useNetworkMode(workspaceId: string) {
  const key = `tollgate.network.${workspaceId}`;
  const forcedMode: NetworkMode | null = workspaceId === "agora" || workspaceId === "0g" ? "testnet" : null;
  const [mode, setModeState] = useState<NetworkMode>(
    () => forcedMode ?? (localStorage.getItem(key) as NetworkMode | null) ?? "mainnet",
  );

  const setMode = useCallback(
    (m: NetworkMode) => {
      const next = forcedMode ?? m;
      localStorage.setItem(key, next);
      setModeState(next);
    },
    [forcedMode, key],
  );

  const toggle = useCallback(
    () => setMode(mode === "mainnet" ? "testnet" : "mainnet"),
    [mode, setMode],
  );

  return { mode: forcedMode ?? mode, setMode, toggle };
}
