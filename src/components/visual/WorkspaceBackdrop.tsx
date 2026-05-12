import { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { MatrixStream } from "./MatrixStream";

const KNOWN = new Set(["liquify", "0g", "qie", "arbitrum", "mantle", "eazo", "berkeley", "deepsurge"]);

/** Per-project animated backdrop. The accent (`--accent-primary`) is already set
 *  per-workspace by AppLayout, so each variant tints itself in that project's colour. */
export function WorkspaceBackdrop({ workspaceId }: { workspaceId: string }) {
  const variant = KNOWN.has(workspaceId) ? workspaceId : "default";

  const mx = useMotionValue(-200);
  const my = useMotionValue(-200);
  const sx = useSpring(mx, { damping: 26, stiffness: 140 });
  const sy = useSpring(my, { damping: 26, stiffness: 140 });
  useEffect(() => {
    const on = (e: MouseEvent) => { mx.set(e.clientX); my.set(e.clientY); };
    window.addEventListener("mousemove", on);
    return () => window.removeEventListener("mousemove", on);
  }, [mx, my]);

  return (
    <div className={`ws-bg ws-bg--${variant}`} aria-hidden="true">
      <div className="ws-bg__pattern" />
      <div className="ws-bg__halo ws-bg__halo--a" />
      <div className="ws-bg__halo ws-bg__halo--b" />

      {variant === "0g" && <MatrixStream />}
      {variant === "deepsurge" && (
        <>
          <div className="ws-bg__stars ws-bg__stars--1" />
          <div className="ws-bg__stars ws-bg__stars--2" />
          <div className="ws-bg__planet" />
        </>
      )}
      {variant === "arbitrum" && <div className="ws-bg__rings" />}
      {variant === "liquify" && <div className="ws-bg__ticker" />}
      {variant === "mantle" && <div className="ws-bg__mesh" />}
      {variant === "qie" && <div className="ws-bg__rails" />}
      {variant === "berkeley" && <div className="ws-bg__circuit" />}
      {variant === "eazo" && (
        <>
          <div className="ws-bg__aurora ws-bg__aurora--1" />
          <div className="ws-bg__aurora ws-bg__aurora--2" />
          <div className="ws-bg__aurora ws-bg__aurora--3" />
        </>
      )}

      <motion.div style={{ left: sx, top: sy }} className="ws-bg__cursor" />
    </div>
  );
}
