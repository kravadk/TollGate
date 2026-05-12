import type { ReactNode } from "react";

/* Uppercase mono caps label with dash decorations on either side. */
export function SectionLabel({
  children,
  color = "text-white/40",
  className = "",
}: {
  children: ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={`font-mono text-[10px] uppercase tracking-[0.35em] font-semibold ${color} inline-flex items-center gap-2 ${className}`}
    >
      <span className="w-6 h-px bg-current opacity-40" />
      {children}
      <span className="w-6 h-px bg-current opacity-40" />
    </span>
  );
}
