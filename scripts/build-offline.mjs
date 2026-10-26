import { build } from "esbuild";
import { fileURLToPath } from "node:url";

await build({
  absWorkingDir: fileURLToPath(new URL("../", import.meta.url)),
  entryPoints: ["./src/offline/app.ts"], outfile: "public/offline-app.js",
  bundle: true, minify: true, format: "iife", platform: "browser", target: "es2020",
  sourcemap: false,
});
console.log("Standalone offline shell bundled.");
