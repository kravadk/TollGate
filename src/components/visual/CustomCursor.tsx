import { useEffect, useState } from "react";
import { motion, useSpring } from "framer-motion";

/** Accent dot + outer ring spring-following the pointer. Hidden on touch devices. */
export function CustomCursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [isTouch, setIsTouch] = useState(true);

  useEffect(() => {
    setIsTouch("ontouchstart" in window || navigator.maxTouchPoints > 0);
    const onMove = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const dotX = useSpring(pos.x - 3, { damping: 25, stiffness: 280 });
  const dotY = useSpring(pos.y - 3, { damping: 25, stiffness: 280 });
  const ringX = useSpring(pos.x - 14, { damping: 20, stiffness: 150 });
  const ringY = useSpring(pos.y - 14, { damping: 20, stiffness: 150 });

  if (isTouch) return null;

  return (
    <>
      <motion.div
        style={{ x: dotX, y: dotY, background: "var(--accent-primary, #b7fc72)" }}
        className="fixed top-0 left-0 w-1.5 h-1.5 rounded-full z-[10000] pointer-events-none opacity-40"
        aria-hidden="true"
      />
      <motion.div
        style={{ x: ringX, y: ringY, borderColor: "var(--accent-primary, #b7fc72)" }}
        className="fixed top-0 left-0 w-7 h-7 border rounded-full z-[10000] pointer-events-none opacity-[0.16]"
        aria-hidden="true"
      />
    </>
  );
}
