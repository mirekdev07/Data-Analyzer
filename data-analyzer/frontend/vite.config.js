import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/analyzer/",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/analyzer/api": {
        target: "http://127.0.0.1:8101",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/analyzer/, ""),
      },
    },
  },
});
