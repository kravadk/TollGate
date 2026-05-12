import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { workspaces } from "../data";
import { ConnectWalletButton } from "../wallet";
import { ThemeToggle } from "../components/ThemeToggle";
import type { Theme } from "../types";
import { slugifyTab } from "../components/ui/AppSidebar";
import { DottedGlobe } from "../components/visual/DottedGlobe";
import { HexGrid } from "../components/visual/HexGrid";
import { fadeInUp, fadeInUpSmall, fadeInScale, staggerFast } from "../lib/motion";

type ProjectLauncherProps = {
  theme: Theme;
  onToggleTheme: () => void;
};

const RAINBOW = "conic-gradient(from 205deg, #ff7a18, #ff3d8b, #9b4dff, #2f6bff, #06c2da, #11b886, #ffb01f, #ff7a18)";
const STAR_CLIP = "polygon(50% 0,60% 40%,100% 50%,60% 60%,50% 100%,40% 60%,0 50%,40% 40%)";

function prettyChain(net: string): string {
  const base = net.replace(/-sepolia$/, "").replace(/-testnet$/, "");
  if (base === "0g") return "0G";
  if (base === "qie") return "QIE";
  if (base === "frontier") return "Frontier";
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export function ProjectLauncher({ theme, onToggleTheme }: ProjectLauncherProps) {
  const isDark = theme === "dark";
  const markerCss = isDark ? "#b7fc72" : "#ef6b78";
  const markerColor: [number, number, number] = isDark ? [0.72, 0.99, 0.45] : [0.94, 0.42, 0.47];
  const haloCss = isDark ? "rgba(183, 252, 114, 0.10)" : "rgba(239, 107, 120, 0.10)";

  return (
    <div className="relative min-h-screen bg-bg-base text-text-primary overflow-x-hidden">
      <HexGrid />

      {/* Header strip */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-10 py-5 border-b border-border-default backdrop-blur-sm bg-bg-base/60">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid place-items-center w-10 h-10 rounded-xl shrink-0"
            style={{ background: RAINBOW, boxShadow: "0 8px 28px -10px rgba(155,77,255,.55), inset 0 1px 0 rgba(255,255,255,.35)" }}
          >
            <span style={{ width: "44%", height: "44%", background: "rgba(255,255,255,.95)", clipPath: STAR_CLIP }} />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-base font-extrabold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>TollGate</span>
            <span className="text-[10px] text-text-muted uppercase tracking-[0.25em]">x402 launcher</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ConnectWalletButton compact />
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 md:px-10 pt-16 pb-24">
        {/* Atmospheric globe behind the hero */}
        <div className="pointer-events-none absolute -top-10 right-0 w-[640px] max-w-[55vw] opacity-50 hidden md:block">
          <DottedGlobe markerCss={markerCss} markerColor={markerColor} haloCss={haloCss} />
        </div>

        <motion.div variants={staggerFast} initial="hidden" animate="show" className="relative max-w-3xl">
          <motion.span
            variants={fadeInUpSmall}
            className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            x402 payment infrastructure
          </motion.span>
          <motion.h1 variants={fadeInUp} className="text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05] mb-4" style={{ fontFamily: "var(--font-display)" }}>
            One core, eight tracks.
            <br />
            <span className="gradient-text">Pick a project to launch.</span>
          </motion.h1>
          <motion.p variants={fadeInUpSmall} className="text-base md:text-lg text-text-secondary leading-relaxed max-w-2xl">
            Every project opens into a workspace with paid endpoints, agent budgets, a 402 → pay → unlock gateway, and verifiable receipts — ready to use.
          </motion.p>
        </motion.div>

        <motion.div
          variants={staggerFast}
          initial="hidden"
          animate="show"
          className="relative mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {workspaces.map((ws) => {
            const Icon = ws.Icon;
            const firstTabSlug = slugifyTab(ws.tabs[0] ?? "Overview");
            const chain = prettyChain(ws.networks[0] ?? "");
            return (
              <motion.div key={ws.id} variants={fadeInScale}>
                <Link
                  to={`/app/${ws.id}/${firstTabSlug}`}
                  className="launch-card group relative flex flex-col h-full p-5 rounded-2xl bg-surface-1 border border-border-default hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                  style={{ ["--ws-c" as string]: ws.accent }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <span
                      className="grid place-items-center w-11 h-11 rounded-xl"
                      style={{ background: `color-mix(in srgb, ${ws.accent} 16%, transparent)`, color: ws.accent }}
                    >
                      <Icon size={20} />
                    </span>
                    <span className="text-[10px] text-text-muted uppercase tracking-[0.2em] font-bold">{chain}</span>
                  </div>
                  <h3 className="text-[15px] font-extrabold leading-snug mb-2 group-hover:text-primary transition-colors" style={{ fontFamily: "var(--font-display)" }}>
                    {ws.name}
                  </h3>
                  <p className="text-[12.5px] text-text-secondary leading-relaxed line-clamp-3 mb-4 flex-1">{ws.pitch}</p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {ws.tracks.slice(0, 2).map((t) => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded-md bg-surface-2 border border-border-default text-text-muted font-medium">{t}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border-default">
                    <span className="text-[10px] text-text-muted font-mono uppercase tracking-wider">{ws.hackathon}</span>
                    <span className="inline-flex items-center gap-1 text-[12px] font-bold" style={{ color: ws.accent }}>
                      Open <ArrowUpRight size={14} />
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

        <div className="relative mt-14 flex justify-center">
          <Link
            to="/showcase"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-border-default bg-surface-1 text-text-secondary hover:text-text-primary hover:border-primary/30 text-[13px] font-bold transition-colors"
          >
            Receipts showcase
            <ArrowUpRight size={13} />
          </Link>
        </div>
      </main>
    </div>
  );
}
