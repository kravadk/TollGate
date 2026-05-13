import { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { MatrixStream } from "./MatrixStream";

const KNOWN = new Set(["0g", "qie", "arbitrum", "mantle"]);

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
      {variant === "arbitrum" && <div className="ws-bg__rings" />}
      {variant === "mantle" && <div className="ws-bg__mesh" />}
      {variant === "qie" && <div className="ws-bg__rails" />}

      <motion.div style={{ left: sx, top: sy }} className="ws-bg__cursor" />
    </div>
  );
}
