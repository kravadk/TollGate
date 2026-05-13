import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  confirmDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  confirmDanger = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="cd-backdrop"
          onClick={onCancel}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
          style={{
            position: "fixed", inset: 0, zIndex: 99998,
            background: "rgba(0,0,0,0.5)", backdropFilter: "blur(3px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16,
          }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 4 }}
            transition={{ duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
            style={{
              width: "min(400px, 100%)",
              background: "var(--bg, #141416)",
              border: "1px solid var(--line-2, #2a2a2d)",
              borderRadius: 14,
              padding: "20px 22px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
              <span style={{ color: confirmDanger ? "#f87171" : "#f5a623", marginTop: 1, flexShrink: 0 }}>
                <AlertTriangle size={18} />
              </span>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--ink)", marginBottom: 5 }}>{title}</div>
                {description && (
                  <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>{description}</div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={onCancel}
                style={{
                  padding: "7px 16px", borderRadius: 9, border: "1px solid var(--line-2)", cursor: "pointer",
                  background: "transparent", color: "var(--muted)", fontSize: 13, fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                style={{
                  padding: "7px 16px", borderRadius: 9, border: "none", cursor: "pointer",
                  background: confirmDanger ? "#f87171" : "var(--accent-primary, #7C5CF8)",
                  color: confirmDanger ? "#0a0a0b" : "#fff",
                  fontSize: 13, fontWeight: 700,
                }}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
