/* Shared framer-motion primitives — keep motion code DRY across the dashboard. */
import { AnimatePresence, motion } from "framer-motion";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { easeSmooth, fadeInUpSmall, staggerCards } from "../../lib/motion";

/**
 * Small "what this widget does" plaque shown at the top of an action widget so the
 * user knows what to enter, what comes back, and whether the result is real or a demo.
 */
export function WidgetMeta({
  live,
  what,
  enter,
  liveText = "real on-chain / gateway call",
  demoText = "result is a deterministic demo — wire the env var below to make it real",
}: {
  live: boolean;
  /** One short sentence: what you get back. */
  what: ReactNode;
  /** Optional: what the user should type/select. */
  enter?: ReactNode;
  liveText?: ReactNode;
  demoText?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 5,
        padding: "9px 11px",
        marginBottom: 12,
        borderRadius: 9,
        background: "var(--surface-2, rgba(255,255,255,0.04))",
        border: "1px solid var(--border-default, rgba(255,255,255,0.09))",
        fontSize: "11.5px",
        lineHeight: 1.5,
        color: "var(--text-secondary, #8a8a8a)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 7, flexWrap: "wrap" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 9.5,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            padding: "2.5px 7px",
            borderRadius: 999,
            flexShrink: 0,
            background: live ? "color-mix(in srgb, #1fb58a 18%, transparent)" : "color-mix(in srgb, #f5a623 20%, transparent)",
            color: live ? "#1fb58a" : "#d98f1c",
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: 999, background: live ? "#1fb58a" : "#f5a623" }} />
          {live ? "Live" : "Demo"}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>{live ? liveText : demoText}</span>
      </div>
      <div>
        <b style={{ color: "var(--text-primary, inherit)" }}>You get:</b> {what}
      </div>
      {enter ? (
        <div>
          <b style={{ color: "var(--text-primary, inherit)" }}>Enter:</b> {enter}
        </div>
      ) : null}
    </div>
  );
}

type MotionDivProps = ComponentProps<typeof motion.div>;
type MotionTrProps = ComponentProps<typeof motion.tr>;

/** `.panel .block` wrapper: soft fade-in when it scrolls into view + a small lift on hover. */
export function MotionPanel({ children, ...rest }: MotionDivProps) {
  return (
    <motion.div
      variants={fadeInUpSmall}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.12 }}
      whileHover={{ y: -2 }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Grid/list container that staggers its `<StaggerItem>` children in. */
export function StaggerGrid({ children, ...rest }: MotionDivProps) {
  return (
    <motion.div
      variants={staggerCards}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.08 }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** One item inside a `<StaggerGrid>`. Pass `whileHover` to make it interactive. */
export function StaggerItem({ children, ...rest }: MotionDivProps) {
  return (
    <motion.div variants={fadeInUpSmall} {...rest}>
      {children}
    </motion.div>
  );
}

/** Table row with a capped per-row entrance delay (so long tables don't crawl in). */
export function MotionRow({
  children,
  index = 0,
  ...rest
}: MotionTrProps & { index?: number }) {
  return (
    <motion.tr
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: easeSmooth, delay: Math.min(index, 12) * 0.03 }}
      {...rest}
    >
      {children}
    </motion.tr>
  );
}

/** Crossfade/slide the active tab's content on `tabKey` change. */
export function TabFade({ tabKey, children }: { tabKey: string; children: ReactNode }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tabKey}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.24, ease: easeSmooth }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** Inline loading spinner (reuses the `.wallet-spin` keyframe). */
export function Spinner({ size = 15, className = "" }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={`wallet-spin ${className}`.trim()} />;
}

/** Shimmer skeleton placeholder. Width/height are CSS sizes (default: full width, 14px tall). */
export function Skeleton({
  width = "100%",
  height = 14,
  radius = 6,
  className = "",
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`skel ${className}`.trim()}
      style={{ display: "inline-block", width, height, borderRadius: radius, ...style }}
    />
  );
}
