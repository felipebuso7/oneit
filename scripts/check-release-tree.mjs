import { execFileSync } from "node:child_process";
import { describeReleaseTree } from "./release-tree-state.mjs";

try {
  execFileSync("git", ["rev-parse", "--is-inside-work-tree"], { stdio: "pipe", timeout: 5000 });
  const status = execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], {
    encoding: "utf8", stdio: "pipe", timeout: 10000,
  });
  const commit = execFileSync("git", ["rev-parse", "--short=12", "HEAD"], { encoding: "utf8", timeout: 5000 }).trim();
  const result = describeReleaseTree(status, commit);
  if (result.ok) console.log(result.message);
  else { console.error(result.message); process.exitCode = 1; }
} catch (error) {
  console.error("Publicação bloqueada: não foi possível confirmar a árvore Git e o commit.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
