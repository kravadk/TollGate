import { useEffect, useRef } from "react";

/** Faint "01abcdef" canvas rain in the accent colour. Mount as a fixed z-0 backdrop. */
export function MatrixStream() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const chars = "01abcdef".split("");
    const fontSize = 14;
    let columns = Math.ceil(width / fontSize);
    let drops: number[] = Array.from({ length: columns }, () => Math.random() * -100);

    const accent = () =>
      getComputedStyle(document.documentElement).getPropertyValue("--accent-primary").trim() || "#b7fc72";
    let accentColor = accent();
    const bgFade = () =>
      getComputedStyle(document.documentElement).getPropertyValue("--bg-base").trim() || "#0a0a0a";

    const draw = () => {
      ctx.fillStyle = bgFade();
      ctx.globalAlpha = 0.1;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 0.045;
      ctx.fillStyle = accentColor;
      ctx.font = `${fontSize}px monospace`;
      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    };

    const interval = window.setInterval(draw, 55);
    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      columns = Math.ceil(width / fontSize);
      drops = Array.from({ length: columns }, () => Math.random() * -100);
      accentColor = accent();
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true" />;
}
