import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const analyze = process.env.ANALYZE === "true";

export default defineConfig(async () => {
  const plugins = [react(), tailwindcss()];
  if (analyze) {
    const { visualizer } = await import("rollup-plugin-visualizer");
    plugins.push(visualizer({ open: true, gzipSize: true, filename: "dist/stats.html" }) as never);
  }
  return {
    plugins,
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
    test: {
      environment: "jsdom",
      globals: true,
      include: ["src/test/**/*.test.ts", "src/**/*.test.tsx"],
    },
  };
});
