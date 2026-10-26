import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gitCommit, sourceFingerprint } from "../../../../scripts/source-version.mjs";

export const dynamic = "force-dynamic";

const startedAt = new Date().toISOString();

export async function GET() {
  const root = process.cwd();
  try {
    const info = process.env.NODE_ENV === "production"
      ? JSON.parse(readFileSync(join(root, "public", "build-info.json"), "utf8"))
      : {
          version: JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version,
          commit: gitCommit(root),
          builtAt: startedAt,
          environment: "development",
          deploymentId: "dev-live",
          sourceFingerprint: sourceFingerprint(root),
        };
    return Response.json(info, { headers: { "Cache-Control": "no-store, max-age=0", "X-OneIT-Deployment": info.deploymentId } });
  } catch {
    return Response.json({ error: "version_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
