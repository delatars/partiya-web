import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tanstackRouter({ target: "react", autoCodeSplitting: true }), react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  build: { target: "es2022" },
  server: {
    port: 3000,
    // partiya-api (axum) слушает :8000
    proxy: { "/api": process.env.BACKEND_URL ?? "http://localhost:8000" },
    // Репозиторий на диске Windows под WSL (/mnt/*): inotify туда не доходит, без опроса HMR молчит.
    // На ext4 выключается: VITE_POLL=0
    watch: process.env.VITE_POLL === "0" ? undefined : { usePolling: true, interval: 300 },
  },
  test: {
    // jsdom нужен сторам: persist пишет в localStorage
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    restoreMocks: true,
  },
});
