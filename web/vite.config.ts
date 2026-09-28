import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The real /api/* backend is agent.py's aiohttp server (see WEB_PORT in .env,
// default 8787) — it owns approved.json / pending.json / inventory_status.json
// and the team login. This just proxies dev requests to it so `npm run dev`
// talks to one real source of truth instead of a second copy of the data.
const API_PORT = process.env.FELING_API_PORT || "8787";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: false,
    proxy: {
      "/api": {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
});
