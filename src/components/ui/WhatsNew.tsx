import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";

const KEY = "codex:changelog-seen-v2";

const CHANGES = [
  { emoji: "⛓️", text: "Arc on-chain staking via ArcMindRegistry" },
  { emoji: "🔮", text: "QIE Oracle Feed — live price data API" },
  { emoji: "🧊", text: "Glassmorphism UI — frosted glass panels" },
  { emoji: "🔔", text: "Notification center — full event history" },
  { emoji: "🚀", text: "Onboarding tour — guided first visit" },
];

export function WhatsNew() {
  const seen = useRef(typeof window !== "undefined" && localStorage.getItem(KEY) === "true");
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(seen.current);

  const dismiss = () => {
    try { localStorage.setItem(KEY, "true"); } catch {}
    setDismissed(true);
    setOpen(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "3px 8px", borderRadius: 6,
          background: dismissed ? "transparent" : "rgba(99,102,241,0.12)",
          border: dismissed ? "none" : "1px solid rgba(99,102,241,0.25)",
          color: dismissed ? "var(--muted, #888)" : "#a5b4fc",
          fontSize: 10.5, fontWeight: 700, cursor: "pointer",
          transition: "all 0.2s",
        }}
      >
        <Sparkles size={10} />
        {!dismissed && "What's New"}
        {dismissed && "v2.0"}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="wn"
            initial={{ opacity: 0, scale: 0.96, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 4 }}
            transition={{ duration: 0.16 }}
            className="glass-card"
            style={{
              position: "absolute", bottom: "calc(100% + 8px)", left: 0,
              width: 260, borderRadius: 12,
              padding: 14, zIndex: 50001,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink, #fff)", display: "flex", alignItems: "center", gap: 5 }}>
                <Sparkles size={12} style={{ color: "#a5b4fc" }} /> What's New in v2.0
              </span>
              <button type="button" onClick={() => { setOpen(false); dismiss(); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--muted, #888)" }}>
                <X size={12} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {CHANGES.map(({ emoji, text }) => (
                <div key={text} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "var(--ink, #fff)", lineHeight: 1.4 }}>
                  <span style={{ flexShrink: 0 }}>{emoji}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={dismiss}
              style={{ marginTop: 12, width: "100%", padding: "6px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.05)", color: "var(--muted, #888)", fontSize: 11, cursor: "pointer" }}
            >
              Got it
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
