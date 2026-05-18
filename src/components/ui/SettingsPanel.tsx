import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, Palette, Sliders, Info, Keyboard } from "lucide-react";
import { Toggle } from "./Toggle";
import { useSettings, ACCENT_CSS, type AccentColor } from "../../hooks/useSettings";
import { workspaces } from "../../data";

type SettingsPanelProps = {
  open: boolean;
  onClose: () => void;
};

const S: React.CSSProperties = {
  fontSize: 12,
  color: "var(--muted, #888)",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 10,
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const ROW: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 0",
  borderBottom: "1px solid rgba(255,255,255,0.05)",
};

const LABEL: React.CSSProperties = { fontSize: 13, color: "var(--ink, #fff)" };
const SUBLABEL: React.CSSProperties = { fontSize: 11, color: "var(--muted, #888)", marginTop: 1 };

const SHORTCUTS = [
  { keys: "⌘ K", action: "Open command palette" },
  { keys: "Esc", action: "Close any panel" },
  { keys: "↑ ↓", action: "Navigate palette" },
  { keys: "↵", action: "Select item" },
];

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { settings, setSetting } = useSettings();

  const ACCENTS: { id: AccentColor; label: string }[] = [
    { id: "indigo", label: "Indigo" },
    { id: "emerald", label: "Emerald" },
    { id: "amber", label: "Amber" },
  ];

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="settings-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            style={{ position: "fixed", inset: 0, zIndex: 49998, background: "rgba(0,0,0,0.3)" }}
          />
          <motion.aside
            key="settings-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 38, mass: 0.9 }}
            style={{
              position: "fixed", right: 0, top: 0, bottom: 0, zIndex: 49999,
              width: "min(340px, 92vw)",
              display: "flex", flexDirection: "column",
            }}
          >
            <div
              className="glass-card"
              style={{ flex: 1, display: "flex", flexDirection: "column", borderRadius: "16px 0 0 16px", overflow: "hidden" }}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "var(--ink, #fff)" }}>Settings</span>
                <button
                  type="button"
                  onClick={onClose}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--muted, #888)", borderRadius: 8 }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>

                {/* Appearance */}
                <div style={{ marginBottom: 24 }}>
                  <div style={S}><Palette size={12} /> Appearance</div>
                  <div style={ROW}>
                    <div>
                      <div style={LABEL}>Accent Color</div>
                      <div style={SUBLABEL}>Highlight color across the UI</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {ACCENTS.map(({ id, label }) => (
                        <button
                          key={id}
                          type="button"
                          title={label}
                          onClick={() => setSetting("accent", id)}
                          style={{
                            width: 22, height: 22,
                            borderRadius: "50%",
                            background: ACCENT_CSS[id],
                            border: settings.accent === id ? "2px solid #fff" : "2px solid transparent",
                            boxShadow: settings.accent === id ? `0 0 0 2px ${ACCENT_CSS[id]}` : "none",
                            cursor: "pointer", transition: "all 0.15s",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Defaults */}
                <div style={{ marginBottom: 24 }}>
                  <div style={S}><Sliders size={12} /> Defaults</div>
                  <div style={ROW}>
                    <div>
                      <div style={LABEL}>Auto-connect wallet</div>
                      <div style={SUBLABEL}>Connect MetaMask on load</div>
                    </div>
                    <Toggle size="sm" checked={settings.autoConnect} onChange={(v) => setSetting("autoConnect", v)} />
                  </div>
                  <div style={{ ...ROW, borderBottom: "none" }}>
                    <div>
                      <div style={LABEL}>Testnet warning</div>
                      <div style={SUBLABEL}>Show banner on test networks</div>
                    </div>
                    <Toggle size="sm" checked={settings.showTestnetWarning} onChange={(v) => setSetting("showTestnetWarning", v)} />
                  </div>
                  <div style={{ ...ROW, borderBottom: "none", flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
                    <div style={LABEL}>Default workspace</div>
                    <select
                      value={settings.defaultWorkspace}
                      onChange={(e) => setSetting("defaultWorkspace", e.target.value)}
                      style={{
                        width: "100%", padding: "6px 10px",
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.10)",
                        borderRadius: 8, color: "var(--ink, #fff)", fontSize: 13,
                      }}
                    >
                      <option value="">— None (show launcher) —</option>
                      {workspaces.map((w) => (
                        <option key={w.id} value={w.id}>{w.shortName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Keyboard Shortcuts */}
                <div>
                  <div style={S}><Keyboard size={12} /> Keyboard Shortcuts</div>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <tbody>
                      {SHORTCUTS.map(({ keys, action }) => (
                        <tr key={keys}>
                          <td style={{ padding: "6px 0", fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--muted, #888)" }}>
                            <kbd style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 4, padding: "2px 6px", fontSize: 11 }}>{keys}</kbd>
                          </td>
                          <td style={{ padding: "6px 0 6px 12px", fontSize: 12, color: "var(--ink, #fff)" }}>{action}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Info */}
                <div style={{ marginTop: 28, padding: "12px 14px", background: "rgba(255,255,255,0.04)", borderRadius: 10 }}>
                  <div style={S}><Info size={12} /> About</div>
                  <div style={{ fontSize: 12, color: "var(--muted, #888)", lineHeight: 1.6 }}>
                    <div>AgentPay Router · v2.0.0</div>
                    <div>x402 payment protocol · multi-chain</div>
                    <div style={{ marginTop: 6 }}>
                      <a href="https://dorahacks.io/hackathon/the-bags" target="_blank" rel="noreferrer" style={{ color: "var(--accent-primary, #6366f1)", textDecoration: "none" }}>DoraHacks submission ↗</a>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
