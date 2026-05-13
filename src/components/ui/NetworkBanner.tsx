// Persistent banner that warns when the connected wallet is on the wrong
// chain for the active workspace, OR when the wallet account changed.
// Listens to `chainChanged` + `accountsChanged` MetaMask events.

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AlertTriangle, RotateCcw } from "lucide-react";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?:     (event: string, handler: (...a: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...a: unknown[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

// Map workspace id → required chain (hex) + human label.
const WORKSPACE_CHAIN: Record<string, { hex: string; label: string }> = {
  "0g":               { hex: "0x4115",  label: "0G Mainnet (16661)" },
  "mantle":           { hex: "0x1388",  label: "Mantle Mainnet (5000)" },
  "arbitrum":         { hex: "0x66eee", label: "Arbitrum Sepolia (421614)" },
  "qie":              { hex: "0x7bf",   label: "QIE Mainnet (1983)" },
};

function eqHex(a: string | null, b: string): boolean {
  if (!a) return false;
  return a.toLowerCase() === b.toLowerCase();
}

export function NetworkBanner() {
  const { wsId } = useParams<{ wsId?: string }>();
  const [chainHex, setChainHex] = useState<string | null>(null);
  const [accountChanged, setAccountChanged] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const expected = wsId ? WORKSPACE_CHAIN[wsId] : undefined;

  useEffect(() => {
    const eth = window.ethereum;
    if (!eth) return;

    let mounted = true;
    eth.request({ method: "eth_chainId" })
      .then((v) => { if (mounted && typeof v === "string") setChainHex(v); })
      .catch(() => { /* no wallet, no banner */ });

    const onChain = (...args: unknown[]) => {
      const v = args[0];
      if (typeof v === "string") setChainHex(v);
      setDismissed(false);
    };
    const onAcct = () => {
      setAccountChanged(true);
      setTimeout(() => setAccountChanged(false), 6000);
    };

    eth.on?.("chainChanged", onChain);
    eth.on?.("accountsChanged", onAcct);
    return () => {
      mounted = false;
      eth.removeListener?.("chainChanged", onChain);
      eth.removeListener?.("accountsChanged", onAcct);
    };
  }, []);

  async function switchTo(hex: string) {
    const eth = window.ethereum;
    if (!eth) return;
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
    } catch {
      // user rejected — fine
    }
  }

  if (dismissed) return null;
  if (!chainHex) return null; // no wallet connected
  if (!expected) return null; // workspace has no required chain (berkeley, sui…)
  if (eqHex(chainHex, expected.hex) && !accountChanged) return null;

  const isAccountBanner = accountChanged && eqHex(chainHex, expected.hex);
  const msg = isAccountBanner
    ? "Wallet account changed — balances and receipts will refresh."
    : `You're on ${chainHex}. This workspace expects ${expected.label}.`;

  return (
    <div
      role="alert"
      style={{
        position: "sticky", top: 0, zIndex: 50,
        background: isAccountBanner
          ? "color-mix(in srgb, #60a5fa 12%, var(--bg-2, #1a1a1d))"
          : "color-mix(in srgb, #f59e0b 12%, var(--bg-2, #1a1a1d))",
        borderBottom: `1px solid ${isAccountBanner ? "#60a5fa55" : "#f59e0b55"}`,
        padding: "8px 16px",
        display: "flex", alignItems: "center", gap: 10,
        fontSize: 13,
      }}
    >
      <AlertTriangle size={14} style={{ color: isAccountBanner ? "#60a5fa" : "#f59e0b", flexShrink: 0 }} />
      <span style={{ flex: 1, fontWeight: 600, color: "var(--ink, #e8e8ea)" }}>
        {msg}
      </span>
      {!isAccountBanner && (
        <button
          type="button"
          onClick={() => switchTo(expected.hex)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "5px 12px", borderRadius: 8, cursor: "pointer",
            background: "#f59e0b", color: "#0a0a0b",
            border: "none", fontWeight: 700, fontSize: 12,
          }}
        >
          <RotateCcw size={11} /> Switch
        </button>
      )}
      <button
        type="button"
        aria-label="Dismiss banner"
        onClick={() => setDismissed(true)}
        style={{
          background: "transparent", border: "none", color: "var(--muted, #888)",
          cursor: "pointer", fontSize: 18, padding: 0, lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}
