import { spawn } from "node:child_process";

const nextBin = process.platform === "win32" ? "next.cmd" : "next";
const args = ["dev", ...process.argv.slice(2)];
const env = {
  ...process.env,
  ONEIT_NEXT_DIST_DIR: process.env.ONEIT_NEXT_DIST_DIR || ".next-dev-isolated",
};

const child = spawn(nextBin, args, {
  env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(`Não foi possível iniciar o Next.js: ${error.message}`);
  process.exit(1);
});
