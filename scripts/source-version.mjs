import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const roots = ["src", "public", "scripts"];
const files = ["package.json", "package-lock.json", "next.config.ts"];
const excluded = new Set(["public/build-info.json", "public/offline-app.js"]);

function walk(root, directory, output) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    const name = relative(root, path).replaceAll("\\", "/");
    if (entry.isDirectory()) walk(root, path, output);
    else if (entry.isFile() && !excluded.has(name)) output.push(name);
  }
}

export function sourceFingerprint(root) {
  const names = [...files];
  for (const directory of roots) walk(root, join(root, directory), names);
  const digest = createHash("sha256");
  for (const name of names.sort()) {
    digest.update(name + "\0");
    digest.update(readFileSync(join(root, name)));
    digest.update("\0");
  }
  return digest.digest("hex");
}

export function gitCommit(root) {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8", timeout: 2000 }).trim();
  } catch {
    return "unknown";
  }
}
