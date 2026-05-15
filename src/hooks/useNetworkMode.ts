import { useState, useCallback } from "react";
import type { NetworkMode } from "../lib/chains";

export type { NetworkMode };

export function useNetworkMode(workspaceId: string) {
  const key = `tollgate.network.${workspaceId}`;
  const [mode, setModeState] = useState<NetworkMode>(
    () => (localStorage.getItem(key) as NetworkMode | null) ?? "mainnet",
  );

  const setMode = useCallback(
    (m: NetworkMode) => {
      localStorage.setItem(key, m);
      setModeState(m);
    },
    [key],
  );

  const toggle = useCallback(
    () => setMode(mode === "mainnet" ? "testnet" : "mainnet"),
    [mode, setMode],
  );

  return { mode, setMode, toggle };
}
