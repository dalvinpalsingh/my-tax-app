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
    {
      name: "local-favicon-cache",
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          if (request.url?.split("?", 1)[0] === "/icon-192.png") {
            response.setHeader(
              "Cache-Control",
              "public, max-age=31536000, immutable",
            );
          }
          next();
        });
      },
    },
  ],
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
});
