import { defineConfig } from "vite";
import { createVuePlugin } from "vite-plugin-vue2";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: process.env.VITE_PAGES === "1" ? "/Experts/" : "/experts/",
  plugins: [createVuePlugin()],
  resolve: {
    alias: { "@": path.join(root, "src"), vue: "vue/dist/vue.esm.js" },
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173 },
});
