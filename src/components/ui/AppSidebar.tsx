import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowLeftRight, Moon, RefreshCw, Sun, X } from "lucide-react";
import type { Workspace } from "../../types";
import { agentFor } from "../../data";
import { useAppState } from "../../app-state";
import { useWallet, useErc20Balances, chainLabel, shortAddr, nativeSymbolForChain, tokensForChain } from "../../wallet";
import { getChain, isSingleChain } from "../../lib/chains";
import { useNetworkMode } from "../../hooks/useNetworkMode";
import { NetworkToggle } from "./NetworkToggle";
import { SectionLabel } from "../visual/SectionLabel";
import {
  buildRail,
  type RailItem,
  type RailKind,
} from "../WorkspaceDashboard";

type NavSection = "Dashboard" | "Management" | "Content";
const SECTIONS: readonly NavSection[] = ["Dashboard", "Management", "Content"];

function sectionFor(kind: RailKind, label: string): NavSection {
  const t = label.toLowerCase();
  if (/(life os|alerts?|posts?|pages?|content|playground|terminal)/.test(t)) return "Content";
  if (kind === "overview" || kind === "gateway" || kind === "verify") return "Dashboard";
  return "Management";
}

export function slugifyTab(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function BalanceRow({ symbol, value, accent }: { symbol: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between text-[11px] py-0.5">
      <span className={`uppercase tracking-wider ${accent ? "font-extrabold" : "text-text-muted font-bold"}`} style={accent ? { color: "var(--accent-primary)" } : undefined}>{symbol}</span>
      <span className="font-bold tabular-nums text-text-primary">{value}</span>
    </div>
  );
}

function BalanceDisplay({ workspace }: { workspace: Workspace }) {
  const w = useWallet();
  const erc20 = useErc20Balances(w.address, w.chainId);
  const [refreshing, setRefreshing] = useState(false);
  const { mode, toggle } = useNetworkMode(workspace.id);
  const target = getChain(workspace.id, mode);
  const singleChain = isSingleChain(workspace.id);

  const refreshAll = async () => {
    if (!w.address) { await w.connect(); return; }
    setRefreshing(true);
    try { await Promise.all([w.refresh(), erc20.refresh()]); }
    finally { setTimeout(() => setRefreshing(false), 450); }
  };

  if (!w.available) {
    return (
      <div className="flex items-center justify-between px-3 py-2.5 bg-surface-2 rounded-xl border border-border-default text-xs">
        <span className="text-text-muted">No wallet detected</span>
        <a href="https://metamask.io/download/" target="_blank" rel="noreferrer" className="text-primary font-bold hover:underline">Get one</a>
      </div>
    );
  }

  if (!w.address) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <NetworkToggle mode={mode} onToggle={toggle} hidden={singleChain} />
        </div>
        <button
          type="button"
          onClick={() => void w.connect()}
          disabled={w.connecting}
          className="flex items-center justify-center w-full px-3 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-60"
          style={{
            background: "color-mix(in srgb, var(--accent-primary) 14%, transparent)",
            border: "1px solid color-mix(in srgb, var(--accent-primary) 38%, transparent)",
            color: "var(--accent-primary)",
          }}
        >
          {w.connecting ? "Connecting…" : "Connect Wallet"}
        </button>
      </div>
    );
  }

  const nativeSym = nativeSymbolForChain(w.chainId);
  const all = tokensForChain(w.chainId);
  const stables = [...all].sort((a, b) => {
    const rank = (s: string) => (s === "USDC" ? 0 : s === "USDT" ? 1 : 2);
    return rank(a.symbol) - rank(b.symbol);
  });
  const balOf = (sym: string) => erc20.balances.find((b) => b.symbol === sym)?.display ?? (erc20.loading ? "…" : "0");
  const onTarget = !target.isNonEvm && w.chainId?.toLowerCase() === target.hex.toLowerCase();

  return (
    <div
      className="px-3 py-2.5 bg-surface-2 rounded-xl border transition-all duration-300"
      style={{ borderColor: "color-mix(in srgb, var(--accent-primary) 18%, var(--border-default))" }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--accent-primary)", boxShadow: "0 0 7px color-mix(in srgb, var(--accent-primary) 60%, transparent)" }} />
          <span className="text-[10px] text-text-muted uppercase tracking-wider truncate">{w.chainId ? chainLabel(w.chainId) : "—"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <NetworkToggle mode={mode} onToggle={toggle} hidden={singleChain} />
          <button
            type="button"
            onClick={refreshAll}
            aria-label="Refresh all balances"
            title="Refresh all balances"
            disabled={refreshing}
            className="p-1 rounded-lg hover:bg-surface-3 text-text-muted hover:text-primary transition-all duration-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 transition-transform duration-500 ${refreshing || erc20.loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>
      <div className="space-y-px">
        <BalanceRow symbol={nativeSym} value={w.balanceEth ?? (refreshing ? "…" : "—")} accent />
        <BalanceRow symbol="USDC" value={balOf("USDC")} />
        <BalanceRow symbol="USDT" value={balOf("USDT")} />
        {stables.filter((t) => t.symbol !== "USDC" && t.symbol !== "USDT").map((t) => (
          <BalanceRow key={t.symbol} symbol={t.symbol} value={balOf(t.symbol)} />
        ))}
      </div>
      {!onTarget && !target.isNonEvm && (
        <button
          type="button"
          onClick={() => void w.switchChain(target.hex)}
          className="mt-2 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
          style={{ background: "color-mix(in srgb, var(--accent-primary) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--accent-primary) 34%, transparent)", color: "var(--accent-primary)" }}
          title={`Switch wallet to ${target.name}`}
        >
          <ArrowLeftRight className="w-3 h-3" /> Switch to {target.name}
        </button>
      )}
    </div>
  );
}

function badgeForTab(item: RailItem): { text: string; tone: "neutral" | "alert" } | null {
  const t = item.label.toLowerCase();
  if (t.includes("approval")) return { text: "2", tone: "alert" };
  if (t.includes("alert")) return { text: "3", tone: "alert" };
  return null;
}

type AppSidebarProps = {
  workspace: Workspace;
  onClose?: () => void;
};

export function AppSidebar({ workspace, onClose }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const railItems = buildRail(workspace);
  const agent = agentFor(workspace.id);
  const w = useWallet();
  const { theme, toggleTheme } = useAppState();

  const grouped = SECTIONS.map((sec) => ({
    section: sec,
    items: railItems
      .map((it, i) => ({ it, i, slug: slugifyTab(it.label) }))
      .filter(({ it }) => sectionFor(it.kind, it.label) === sec),
  })).filter((g) => g.items.length > 0);

  const activeSlug = location.pathname.split("/")[3] ?? "";

  return (
    <aside
      className="relative w-[220px] h-screen glass-panel border-r border-border-default flex flex-col"
      style={{ backgroundImage: "radial-gradient(150% 50% at 50% -8%, color-mix(in srgb, var(--accent-primary) 9%, transparent), transparent 64%)" }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent-primary) 55%, transparent), transparent)" }}
      />
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border-default">
        <button
          type="button"
          onClick={() => navigate("/")}
          aria-label="Back to project launcher"
          className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
        >
          <span
            aria-hidden="true"
            className="relative grid place-items-center w-9 h-9 rounded-xl shrink-0"
            style={{
              background: "conic-gradient(from 205deg, #ff7a18, #ff3d8b, #9b4dff, #2f6bff, #06c2da, #11b886, #ffb01f, #ff7a18)",
              boxShadow: "0 4px 18px -4px color-mix(in srgb, var(--accent-primary) 50%, rgba(0,0,0,0.6)), 0 0 0 1px color-mix(in srgb, var(--accent-primary) 26%, transparent)",
            }}
          >
            <span
              className="w-3.5 h-3.5 bg-white/95"
              style={{ clipPath: "polygon(50% 0,60% 40%,100% 50%,60% 60%,50% 100%,40% 60%,0 50%,40% 40%)" }}
            />
          </span>
          <div className="flex flex-col min-w-0">
            <span className="text-[13px] font-extrabold tracking-tight leading-tight truncate">{workspace.shortName}</span>
            <span className="text-[10px] text-text-muted uppercase tracking-wider truncate">TollGate · x402</span>
          </div>
        </button>
        {onClose && (
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="md:hidden w-7 h-7 grid place-items-center rounded-md text-text-muted hover:text-text-primary"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-5">
        {grouped.map(({ section, items }) => (
          <div key={section} className="space-y-0.5">
            <div className="px-3.5 py-2">
              <SectionLabel color="text-text-dim">{section}</SectionLabel>
            </div>
            {items.map(({ it, i, slug }) => {
              const Icon = it.Icon;
              const isActive = activeSlug === slug;
              const badge = badgeForTab(it);
              return (
                <Link
                  key={`${section}-${i}`}
                  to={`/app/${workspace.id}/${slug}`}
                  className={`group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-200 ${
                    isActive ? "font-bold" : "text-text-secondary hover:text-text-primary hover:bg-surface-2 hover:translate-x-0.5"
                  }`}
                  style={
                    isActive
                      ? {
                          background: "color-mix(in srgb, var(--accent-primary) 15%, transparent)",
                          color: "var(--accent-primary)",
                          boxShadow: "inset 2px 0 0 var(--accent-primary), 0 0 24px -8px color-mix(in srgb, var(--accent-primary) 35%, transparent)",
                        }
                      : undefined
                  }
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-bar"
                      className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                      style={{ background: "var(--accent-primary)" }}
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${isActive ? "" : "text-inherit group-hover:text-primary/80"}`}
                      style={isActive ? { color: "var(--accent-primary)" } : undefined}
                    />
                    <span className="text-[13px] truncate leading-none">{it.label}</span>
                  </div>
                  {badge && (
                    <span
                      className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        badge.tone === "alert"
                          ? "bg-red-500/15 text-red-400"
                          : "bg-surface-3 text-text-muted"
                      }`}
                    >
                      {badge.text}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-border-default space-y-2.5">
        <BalanceDisplay workspace={workspace} />
        <div className="flex items-center gap-2 px-1">
          <div
            className="w-7 h-7 rounded-full grid place-items-center text-[11px] font-bold shrink-0"
            style={{
              background: "color-mix(in srgb, var(--accent-primary) 18%, var(--surface-3))",
              color: "var(--accent-primary)",
              boxShadow: "0 0 0 1px color-mix(in srgb, var(--accent-primary) 22%, transparent)",
            }}
          >
            {agent.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[12px] font-bold truncate">{agent.name}</span>
            <span className="text-[10px] text-text-muted truncate">
              {w.address ? shortAddr(w.address) : "Demo agent"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[11px] font-bold text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors uppercase tracking-wider"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            All projects
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            title={theme === "dark" ? "Light theme" : "Dark theme"}
            className="btn-shimmer shrink-0 w-8 h-8 grid place-items-center rounded-lg text-text-secondary hover:text-primary hover:bg-surface-2 transition-colors"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
