// Zero-dep toast notifications. Mount <Toaster /> once at App root,
// then call toast.success(msg) / toast.error(msg) / toast.info(msg) anywhere.

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Info, AlertTriangle, X } from "lucide-react";

type ToastKind = "success" | "error" | "info" | "warn";
type ToastItem = { id: number; kind: ToastKind; msg: string; ttl: number };

let nextId = 1;
const listeners = new Set<(items: ToastItem[]) => void>();
let items: ToastItem[] = [];

function push(kind: ToastKind, msg: string, ttl = 4000) {
  const id = nextId++;
  items = [...items, { id, kind, msg, ttl }];
  for (const l of listeners) l(items);
  if (ttl > 0) setTimeout(() => dismiss(id), ttl);
  return id;
}

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  for (const l of listeners) l(items);
}

export const toast = {
  success: (msg: string, ttl?: number) => push("success", msg, ttl),
  error:   (msg: string, ttl?: number) => push("error",   msg, ttl ?? 6000),
  info:    (msg: string, ttl?: number) => push("info",    msg, ttl),
  warn:    (msg: string, ttl?: number) => push("warn",    msg, ttl ?? 5000),
  dismiss,
};

const COLORS: Record<ToastKind, { bg: string; border: string; fg: string; Icon: typeof CheckCircle }> = {
  success: { bg: "color-mix(in srgb, #1fb58a 14%, var(--bg-2, #1a1a1d))", border: "#1fb58a55", fg: "#1fb58a", Icon: CheckCircle },
  error:   { bg: "color-mix(in srgb, #f87171 14%, var(--bg-2, #1a1a1d))", border: "#f8717155", fg: "#f87171", Icon: XCircle },
  info:    { bg: "color-mix(in srgb, #60a5fa 14%, var(--bg-2, #1a1a1d))", border: "#60a5fa55", fg: "#60a5fa", Icon: Info },
  warn:    { bg: "color-mix(in srgb, #f59e0b 14%, var(--bg-2, #1a1a1d))", border: "#f59e0b55", fg: "#f59e0b", Icon: AlertTriangle },
};

export function Toaster() {
  const [list, setList] = useState<ToastItem[]>(items);

  useEffect(() => {
    listeners.add(setList);
    return () => { listeners.delete(setList); };
  }, []);

  return (
    <div
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      style={{
        position: "fixed", top: 16, right: 16, zIndex: 9999,
        display: "flex", flexDirection: "column", gap: 8,
        pointerEvents: "none",
        maxWidth: "calc(100vw - 32px)",
      }}
    >
      {list.map((t) => {
        const c = COLORS[t.kind];
        return (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            style={{
              pointerEvents: "auto",
              display: "flex", alignItems: "flex-start", gap: 10,
              padding: "10px 14px", borderRadius: 10,
              background: c.bg, border: `1px solid ${c.border}`,
              color: "var(--ink, #e8e8ea)",
              minWidth: 240, maxWidth: 420,
              boxShadow: "0 10px 30px rgba(0,0,0,.3)",
              animation: "tg-toast-in .2s ease-out",
            }}
          >
            <c.Icon size={16} style={{ color: c.fg, flexShrink: 0, marginTop: 1 }} />
            <span style={{ flex: 1, fontSize: 13, lineHeight: 1.4, fontWeight: 500, wordBreak: "break-word" }}>
              {t.msg}
            </span>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismiss(t.id)}
              style={{
                background: "transparent", border: "none", color: "var(--muted, #888)",
                cursor: "pointer", padding: 0, marginTop: 1, flexShrink: 0,
              }}
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes tg-toast-in {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
