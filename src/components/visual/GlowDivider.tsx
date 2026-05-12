/* Section divider — thin gradient line with an accent-tinted halo glow at center. */
export function GlowDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`relative w-full h-px overflow-visible ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-px blur-[1px]"
        style={{ background: "linear-gradient(to right, transparent, color-mix(in srgb, var(--accent-primary, #b7fc72) 60%, transparent), transparent)" }}
      />
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-2 rounded-full blur-xl"
        style={{ background: "color-mix(in srgb, var(--accent-primary, #b7fc72) 10%, transparent)" }}
      />
    </div>
  );
}
