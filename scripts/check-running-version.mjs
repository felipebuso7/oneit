import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sourceFingerprint } from "./source-version.mjs";

const base = process.argv[2] || "http://127.0.0.1:3000";
const response = await fetch(new URL("/api/version", base), { cache: "no-store" });
if (!response.ok) throw new Error(`A rota de versão respondeu HTTP ${response.status}`);
const actual = await response.json();
const expected = actual.environment === "development"
  ? sourceFingerprint(process.cwd())
  : JSON.parse(readFileSync(join(process.cwd(), "public", "build-info.json"), "utf8")).sourceFingerprint;
if (actual.sourceFingerprint !== expected) throw new Error(`Versão divergente: processo=${actual.sourceFingerprint}, fonte/build=${expected}`);
console.log(`Versão conferida em ${base}: ${actual.environment}, ${actual.deploymentId}, commit ${actual.commit.slice(0, 12)}, fonte ${expected.slice(0, 12)}`);
