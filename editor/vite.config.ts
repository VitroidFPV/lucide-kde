import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig({
  root: "editor",
  plugins: [svelte()],
  server: {
    host: "127.0.0.1",
    port: 3000,
    strictPort: true,
    proxy: {
      "/api": { target: "http://127.0.0.1:3001", changeOrigin: true },
      "/download": { target: "http://127.0.0.1:3001", changeOrigin: true },
    },
  },
  build: { outDir: "../dist/editor", emptyOutDir: true },
});
