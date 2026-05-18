import { motion } from "framer-motion";

type ToggleProps = {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  size?: "sm" | "md";
  disabled?: boolean;
};

export function Toggle({ checked, onChange, label, size = "md", disabled }: ToggleProps) {
  const w = size === "sm" ? 32 : 40;
  const h = size === "sm" ? 18 : 22;
  const knob = size === "sm" ? 12 : 16;
  const travel = w - h + 2;

  return (
    <label
      style={{ display: "flex", alignItems: "center", gap: 8, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        style={{ border: "none", padding: 0, background: "none", cursor: disabled ? "not-allowed" : "pointer", flexShrink: 0 }}
      >
        <motion.div
          animate={{ backgroundColor: checked ? "var(--accent-primary, #6366f1)" : "var(--surface-3, #3f3f46)" }}
          transition={{ duration: 0.2 }}
          style={{
            width: w, height: h,
            borderRadius: h / 2,
            display: "flex",
            alignItems: "center",
            padding: "0 3px",
          }}
        >
          <motion.div
            animate={{ x: checked ? travel : 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 35, mass: 0.8 }}
            style={{
              width: knob, height: knob,
              borderRadius: "50%",
              backgroundColor: "#fff",
              boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
              flexShrink: 0,
            }}
          />
        </motion.div>
      </button>
      {label && (
        <span style={{ fontSize: 13, color: "var(--ink, #fff)", userSelect: "none" }}>{label}</span>
      )}
    </label>
  );
}
