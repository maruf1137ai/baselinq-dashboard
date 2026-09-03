// A SECOND dev server for the same worktree, used only for measuring.
//
// Two vite servers sharing one `cacheDir` clobber each other's optimised
// deps — that is what produced the blank-white-screen incident earlier in
// this project. Each server therefore gets its own cache directory.
import base from "./vite.config";
import { defineConfig } from "vite";
export default defineConfig(async (env) => {
  const cfg = typeof base === "function" ? await (base as any)(env) : base;
  return { ...cfg, cacheDir: ".vite-cache-measure" };
});
