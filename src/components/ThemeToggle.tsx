import { Moon, Sun } from "lucide-react";
import type { Theme } from "../types";

type ThemeToggleProps = {
  theme: Theme;
  onToggle: () => void;
};

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isDark = theme === "dark";

  return (
    <button
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="theme-toggle"
      type="button"
      onClick={onToggle}
    >
      <span className="theme-toggle__track">
        <span className="theme-toggle__thumb">
          {isDark ? <Moon size={15} /> : <Sun size={15} />}
        </span>
      </span>
      <span>{isDark ? "Dark" : "Light"}</span>
    </button>
  );
}
