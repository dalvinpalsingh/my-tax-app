import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { localStateRoot } from "./scripts/local-state";

export default defineConfig({
  cacheDir: ".cloudflare/vite",
  plugins: [
    react(),
    tailwindcss(),
    cloudflare({ persistState: { path: localStateRoot() } }),
  ],
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
});
