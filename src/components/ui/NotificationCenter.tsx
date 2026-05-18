import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck, Trash2, CheckCircle2, XCircle, Info, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { notifStore, type Notification, type NotifKind } from "../../lib/notificationStore";

function relTime(ms: number): string {
  const diff = (Date.now() - ms) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const KIND_ICON: Record<NotifKind, React.ReactNode> = {
  success: <CheckCircle2 size={14} style={{ color: "#10b981" }} />,
  error:   <XCircle     size={14} style={{ color: "#ef4444" }} />,
  info:    <Info        size={14} style={{ color: "#6366f1" }} />,
  warn:    <AlertTriangle size={14} style={{ color: "#f59e0b" }} />,
};

function NotifRow({ n, onNavigate }: { n: Notification; onNavigate: () => void }) {
  const navigate = useNavigate();
  const handleClick = () => {
    if (n.href) { navigate(n.href); onNavigate(); }
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        width: "100%", padding: "10px 14px",
        background: n.read ? "transparent" : "rgba(99,102,241,0.06)",
        border: "none", borderBottom: "1px solid rgba(255,255,255,0.05)",
        cursor: n.href ? "pointer" : "default", textAlign: "left",
        transition: "background 0.15s",
      }}
    >
      <span style={{ marginTop: 1, flexShrink: 0 }}>{KIND_ICON[n.kind]}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 12.5, color: "var(--ink, #fff)", lineHeight: 1.4 }}>{n.message}</span>
        <span style={{ fontSize: 10.5, color: "var(--muted, #888)" }}>{relTime(n.at)}</span>
      </span>
      {!n.read && (
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", marginTop: 4, flexShrink: 0 }} />
      )}
    </button>
  );
}

export function NotificationCenter() {
  const [items, setItems] = useState(notifStore.items);
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState<{ bottom: number; left: number } | null>(null);

  useEffect(() => notifStore.subscribe(setItems), []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const portalEl = document.getElementById("nc-portal");
      if (btnRef.current?.contains(target)) return;
      if (portalEl?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unread = items.filter((n) => !n.read).length;

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const panelW = 300;
      // Anchor left edge to button left; clamp so panel doesn't overflow viewport right
      const left = Math.min(r.left, window.innerWidth - panelW - 8);
      setAnchor({ bottom: window.innerHeight - r.top + 6, left });
    }
    if (!open) notifStore.markAllRead();
    setOpen((v) => !v);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-label="Notifications"
        title="Notifications"
        style={{
          position: "relative",
          background: "none", border: "none", cursor: "pointer",
          padding: 6, borderRadius: 8, color: "var(--muted, #888)",
          display: "grid", placeItems: "center",
          transition: "color 0.15s",
        }}
      >
        <Bell size={16} />
        {unread > 0 && (
          <span style={{
            position: "absolute", top: 2, right: 2,
            minWidth: unread > 9 ? 14 : 8, height: 8,
            borderRadius: 4, background: "#ef4444",
            fontSize: 8, fontWeight: 700, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            lineHeight: 1, padding: "0 2px",
          }}>
            {unread > 9 ? "9+" : ""}
          </span>
        )}
      </button>

      {anchor && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              id="nc-portal"
              key="nc"
              initial={{ opacity: 0, scale: 0.95, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 4 }}
              transition={{ duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
              className="glass-card"
              style={{
                position: "fixed",
                bottom: anchor.bottom,
                left: anchor.left,
                width: 300, maxHeight: 340,
                borderRadius: 12, overflow: "hidden",
                zIndex: 99990, display: "flex", flexDirection: "column",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px 8px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink, #fff)" }}>Notifications</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" title="Mark all read" onClick={() => notifStore.markAllRead()} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--muted, #888)", borderRadius: 6, display: "grid", placeItems: "center" }}>
                    <CheckCheck size={13} />
                  </button>
                  <button type="button" title="Clear all" onClick={() => notifStore.clear()} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--muted, #888)", borderRadius: 6, display: "grid", placeItems: "center" }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                {items.length === 0 ? (
                  <div style={{ padding: 24, textAlign: "center", fontSize: 12.5, color: "var(--muted, #888)" }}>
                    No notifications yet
                  </div>
                ) : (
                  items.map((n) => (
                    <NotifRow key={n.id} n={n} onNavigate={() => setOpen(false)} />
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
