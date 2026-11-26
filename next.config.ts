import type { NextConfig } from "next";
import { readFileSync } from "node:fs";

function buildDeploymentId() {
  if (process.env.NODE_ENV !== "production") return undefined;
  try {
    const info = JSON.parse(readFileSync("public/build-info.json", "utf8")) as { deploymentId?: string };
    return process.env.ONEIT_DEPLOYMENT_ID || info.deploymentId;
  } catch {
    return process.env.ONEIT_DEPLOYMENT_ID;
  }
}

const nextConfig: NextConfig = {
  output: "standalone",
  deploymentId: buildDeploymentId(),
  async redirects() {
    return [
      { source: "/demo/field-service", destination: "/demo/field-service/overview", permanent: false, missing: [{ type: "query", key: "ticket" }] },
      { source: "/demo/field-service/queue", destination: "/demo/field-service/queue-v2", permanent: false },
      { source: "/demo/field-service/validation", destination: "/demo/field-service/validation-v2", permanent: false },
    ];
  },
  // Permite validar builds isolados sem reutilizar uma saída bloqueada por outro processo local.
  distDir: process.env.ONEIT_NEXT_DIST_DIR || ".next",
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
      { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=()" },
    ] }, { source: "/sw.js", headers: [
      { key: "Content-Type", value: "application/javascript; charset=utf-8" },
      { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
    ] }];
  },
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
    // Em alguns ambientes Windows o worker paralelo do webpack disputa a criação
    // da árvore de saída e encerra o build com EPERM. Compilar no processo
    // principal preserva o mesmo resultado e torna o pipeline determinístico.
    webpackBuildWorker: false,
    cpus: 1,
    parallelServerCompiles: false,
    parallelServerBuildTraces: false,
  },
  // This repository is nested in a broader workspace; keep Turbopack scoped here.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
