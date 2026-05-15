import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

const TEXT = "TollGate";

export function Preloader() {
  const [phase, setPhase] = useState<"logo" | "text" | "sweep" | "done">("logo");

  useEffect(() => {
    if (sessionStorage.getItem("ap-preloaded") === "1") {
      setPhase("done");
      return;
    }
    const t1 = setTimeout(() => setPhase("text"), 900);
    const t2 = setTimeout(() => setPhase("sweep"), 1900);
    const t3 = setTimeout(() => {
      setPhase("done");
      sessionStorage.setItem("ap-preloaded", "1");
    }, 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <AnimatePresence>
      {phase !== "done" && (
        <motion.div
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-[10010] bg-bg-base flex flex-col items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
            className="relative mb-8"
          >
            <motion.div
              animate={phase === "sweep" ? { scale: [1, 1.1, 1], rotate: [0, 5, 0] } : {}}
              transition={{ duration: 0.4 }}
              className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden"
              style={{ boxShadow: "0 12px 40px -8px rgba(255,100,0,.5)" }}
            >
              <img src="/logo0g.png" alt="TollGate" className="w-full h-full object-cover" />
            </motion.div>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [0.8, 1.3, 1.3], opacity: [0, 0.4, 0] }}
              transition={{ duration: 1.4, delay: 0.3, ease: "easeOut" }}
              className="absolute inset-0 -m-4 rounded-3xl border-2 pointer-events-none"
              style={{ borderColor: "var(--accent-primary, #b7fc72)" }}
            />
          </motion.div>

          <div className="relative overflow-hidden">
            <div className="flex gap-0.5">
              {TEXT.split("").map((char, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 30, rotateX: -90 }}
                  animate={phase !== "logo" ? { opacity: 1, y: 0, rotateX: 0 } : {}}
                  transition={{ delay: i * 0.06, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                  className="text-3xl md:text-5xl font-extrabold text-text-primary tracking-tight inline-block"
                  style={{ transformOrigin: "bottom", fontFamily: "var(--font-display)" }}
                >
                  {char}
                </motion.span>
              ))}
            </div>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={phase === "sweep" || phase === "text" ? { scaleX: [0, 1] } : {}}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.76, 0, 0.24, 1] }}
              className="h-0.5 mt-3 origin-left"
              style={{ background: "linear-gradient(to right, transparent, var(--accent-primary, #b7fc72), transparent)" }}
            />
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={phase === "sweep" ? { opacity: 1 } : {}}
            transition={{ duration: 0.4 }}
            className="mt-5 text-[10px] uppercase tracking-[0.4em] text-text-muted font-bold"
          >
            x402 payment infrastructure
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
