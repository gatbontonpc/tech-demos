import { createReadStream, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function explainerPlugin(): Plugin {
  const file = resolve(__dirname, "explainer.html");
  return {
    name: "serve-explainer",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0];
        if (url !== "/explainer.html") {
          next();
          return;
        }
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        createReadStream(file).pipe(res);
      });
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "explainer.html",
        source: readFileSync(file),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), explainerPlugin()],
  server: {
    port: 5173,
    strictPort: false,
  },
});
