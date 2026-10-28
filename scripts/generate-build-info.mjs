import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gitCommit, sourceFingerprint } from "./source-version.mjs";

const root = process.cwd();
const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
const source = sourceFingerprint(root);
const builtAt = new Date().toISOString();
// Vercel/Next.js limita o deploymentId a 32 caracteres.
const deploymentId = process.env.ONEIT_DEPLOYMENT_ID || `oneit-${source.slice(0, 10)}-${builtAt.replace(/\D/g, "").slice(0, 14)}`;
// Vercel builds do not include the .git directory. Prefer the immutable commit
// SHA supplied by the provider and fall back to local git for VPS/self-hosted
// builds where that metadata is available.
const commit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || gitCommit(root);
const info = { version, commit, builtAt, environment: process.env.ONEIT_ENVIRONMENT || "production", deploymentId, sourceFingerprint: source };
writeFileSync(join(root, "public", "build-info.json"), JSON.stringify(info, null, 2) + "\n");
console.log(`OneIT build: ${deploymentId} (${source.slice(0, 12)})`);
