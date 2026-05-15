import type { NetworkMode } from "../../hooks/useNetworkMode";

interface Props {
  mode: NetworkMode;
  onToggle: () => void;
  /** Hide the toggle entirely when mainnet === testnet for a workspace (e.g. QIE). */
  hidden?: boolean;
}

export function NetworkToggle({ mode, onToggle, hidden }: Props) {
  if (hidden) return null;
  const isMainnet = mode === "mainnet";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`Switch to ${isMainnet ? "testnet" : "mainnet"}`}
      title={isMainnet ? "Mainnet — click for testnet" : "Testnet — click for mainnet"}
      className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer"
      style={{
        background: isMainnet
          ? "color-mix(in srgb, var(--accent-primary) 16%, transparent)"
          : "color-mix(in srgb, #f59e0b 14%, transparent)",
        border: `1px solid ${
          isMainnet
            ? "color-mix(in srgb, var(--accent-primary) 36%, transparent)"
            : "color-mix(in srgb, #f59e0b 34%, transparent)"
        }`,
        color: isMainnet ? "var(--accent-primary)" : "#f59e0b",
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: isMainnet ? "var(--accent-primary)" : "#f59e0b" }}
      />
      {isMainnet ? "M" : "T"}
    </button>
  );
}
