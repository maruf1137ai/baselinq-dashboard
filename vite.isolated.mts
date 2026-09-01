import base from "./vite.config";
import { defineConfig } from "vite";
export default defineConfig(async (env) => {
  const cfg = typeof base === "function" ? await (base as any)(env) : base;
  return { ...cfg, cacheDir: ".vite-cache" };
});
