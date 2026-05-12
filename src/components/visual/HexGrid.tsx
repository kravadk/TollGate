import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef } from "react";

/** SVG hex pattern + mouse-follow accent glow. Mount as an absolute backdrop layer. */
export function HexGrid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { damping: 25, stiffness: 150 });
  const smoothY = useSpring(mouseY, { damping: 25, stiffness: 150 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const { left, top } = el.getBoundingClientRect();
      mouseX.set(e.clientX - left);
      mouseY.set(e.clientY - top);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [mouseX, mouseY]);

  return (
    <div ref={containerRef} className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      <svg className="w-full h-full opacity-[0.035]" style={{ color: "var(--accent-primary, #b7fc72)" }}>
        <pattern id="ap-hex-grid" width="50" height="43.4" patternUnits="userSpaceOnUse" patternTransform="scale(1.5)">
          <path d="M25 0L50 14.4V43.4L25 57.8L0 43.4V14.4L25 0Z" fill="none" stroke="currentColor" strokeWidth="1" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#ap-hex-grid)" />
      </svg>
      <motion.div
        style={{
          left: smoothX,
          top: smoothY,
          background: "radial-gradient(circle, var(--accent-primary, #b7fc72) 0%, transparent 70%)",
        }}
        className="absolute w-[320px] h-[320px] -translate-x-1/2 -translate-y-1/2 opacity-[0.07] blur-[80px]"
      />
    </div>
  );
}
