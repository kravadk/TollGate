import { Moon, Sun } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { Theme } from "../types";

type ThemeToggleProps = {
  theme: Theme;
  onToggle: () => void;
};

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isDark = theme === "dark";

  return (
    <motion.button
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="theme-toggle"
      type="button"
      onClick={onToggle}
      whileTap={{ scale: 0.96 }}
    >
      <span className="theme-toggle__track">
        <span className="theme-toggle__thumb" style={{ display: "grid", placeItems: "center", overflow: "hidden" }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={isDark ? "moon" : "sun"}
              initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
              transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
              style={{ display: "grid", placeItems: "center" }}
            >
              {isDark ? <Moon size={15} /> : <Sun size={15} />}
            </motion.span>
          </AnimatePresence>
        </span>
      </span>
      <span>{isDark ? "Dark" : "Light"}</span>
    </motion.button>
  );
}
