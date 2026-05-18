import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Zap, Database, Globe2, ChevronRight, TrendingUp, Brain, Users, ShieldOff } from "lucide-react";
import { workspaces } from "../../data";
import { slugifyTab } from "./AppSidebar";

type Cmd = {
  id: string;
  label: string;
  sub: string;
  group: string;
  icon: React.ReactNode;
  action: () => void;
};

function buildCommands(navigate: ReturnType<typeof useNavigate>): Cmd[] {
  const cmds: Cmd[] = [];

  for (const ws of workspaces) {
    cmds.push({
      id: `ws-${ws.id}`,
      label: ws.shortName,
      sub: ws.networks[0] ?? ws.id,
      group: "Workspaces",
      icon: ws.Icon ? <ws.Icon size={14} /> : <Globe2 size={14} />,
      action: () => navigate(`/app/${ws.id}`),
    });
    for (const tab of ws.tabs) {
      cmds.push({
        id: `ws-${ws.id}-${tab}`,
        label: tab,
        sub: `${ws.shortName} › ${tab}`,
        group: ws.shortName,
        icon: <ChevronRight size={12} />,
        action: () => navigate(`/app/${ws.id}/${slugifyTab(tab)}`),
      });
    }
  }

  cmds.push({
    id: "showcase",
    label: "Receipt Showcase",
    sub: "View all payment receipts",
    group: "Navigation",
    icon: <Database size={14} />,
    action: () => navigate("/showcase"),
  });

  cmds.push({
    id: "home",
    label: "Home",
    sub: "Project launcher",
    group: "Navigation",
    icon: <Zap size={14} />,
    action: () => navigate("/"),
  });

  const arcQuickActions: { tab: string; icon: React.ReactNode; sub: string }[] = [
    { tab: "Signal Hub", icon: <TrendingUp size={14} />, sub: "Live ETH/OI signals · Ask ArcMind" },
    { tab: "Reasoning Traces", icon: <Brain size={14} />, sub: "Buy step-by-step decision traces · $0.01" },
    { tab: "Copy Trading", icon: <Users size={14} />, sub: "Stake USDC alongside ArcMind agent" },
    { tab: "Kill Switch", icon: <ShieldOff size={14} />, sub: "Set drawdown threshold · auto-slash" },
  ];
  for (const { tab, icon, sub } of arcQuickActions) {
    cmds.push({
      id: `arcmind-${tab.toLowerCase().replace(/ /g, "-")}`,
      label: tab,
      sub,
      group: "ArcMind Quick Actions",
      icon,
      action: () => navigate(`/app/agora/${slugifyTab(tab)}`),
    });
  }

  return cmds;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState(0);

  const all = buildCommands(navigate);
  const q = query.toLowerCase().trim();
  const results = q
    ? all.filter((c) => c.label.toLowerCase().includes(q) || c.sub.toLowerCase().includes(q) || c.group.toLowerCase().includes(q))
    : all.slice(0, 12);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  useEffect(() => { setActive(0); }, [query]);

  function select(cmd: Cmd) {
    cmd.action();
    onClose();
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === "Enter" && results[active]) { select(results[active]); }
  }

  const groups = [...new Set(results.map((r) => r.group))];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="cp-backdrop"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{
            position: "fixed", inset: 0, zIndex: 99999,
            background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "flex-start", justifyContent: "center",
            paddingTop: "14vh",
          }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            style={{
              width: "min(560px, calc(100vw - 32px))",
              background: "var(--bg, #141416)",
              border: "1px solid var(--line-2, #2a2a2d)",
              borderRadius: 14,
              overflow: "hidden",
              boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid var(--line-2, #2a2a2d)" }}>
              <Search size={16} style={{ color: "var(--muted)", flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKey}
                placeholder="Search workspaces, tabs, pages…"
                style={{ flex: 1, border: "none", outline: "none", background: "transparent", color: "var(--ink)", fontSize: 14.5 }}
              />
              <kbd style={{ fontSize: 10, color: "var(--muted)", background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: 5, padding: "2px 6px" }}>esc</kbd>
            </div>

            <div style={{ maxHeight: 360, overflowY: "auto", padding: "6px 0" }}>
              {results.length === 0 && (
                <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                  No results for &ldquo;{query}&rdquo;
                </div>
              )}
              {groups.map((group) => (
                <div key={group}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", padding: "6px 14px 3px" }}>
                    {group}
                  </div>
                  {results.filter((r) => r.group === group).map((cmd) => {
                    const idx = results.indexOf(cmd);
                    return (
                      <button
                        key={cmd.id}
                        type="button"
                        onClick={() => select(cmd)}
                        onMouseEnter={() => setActive(idx)}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          width: "100%", padding: "8px 14px", border: "none",
                          background: idx === active ? "var(--bg-2, rgba(255,255,255,0.06))" : "transparent",
                          color: "var(--ink)", cursor: "pointer", textAlign: "left",
                        }}
                      >
                        <span style={{ color: "var(--muted)", flexShrink: 0 }}>{cmd.icon}</span>
                        <span style={{ flex: 1 }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{cmd.label}</span>
                          <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 8 }}>{cmd.sub}</span>
                        </span>
                        {idx === active && <ChevronRight size={12} style={{ color: "var(--muted)" }} />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div style={{ padding: "6px 14px", borderTop: "1px solid var(--line-2, #2a2a2d)", display: "flex", gap: 14, fontSize: 10.5, color: "var(--muted)" }}>
              <span><kbd style={{ fontSize: 9, marginRight: 4 }}>↑↓</kbd>Navigate</span>
              <span><kbd style={{ fontSize: 9, marginRight: 4 }}>↵</kbd>Open</span>
              <span><kbd style={{ fontSize: 9, marginRight: 4 }}>esc</kbd>Close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
