import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const script = "scripts/check-production-env.mjs";

describe("production environment preflight", () => {
  it("rejects an incomplete environment", () => {
    expect(() => execFileSync(process.execPath, [script], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
        ONEIT_APP_URL: undefined,
        ONEIT_DEPLOYMENT_MODE: undefined,
      },
      stdio: "pipe",
    })).toThrow();
  });

  it("accepts the minimum valid configuration", () => {
    const output = execFileSync(process.execPath, [script], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: "https://ci.invalid.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "ci-placeholder",
        ONEIT_APP_URL: "https://oneit.example.com",
        ONEIT_DEPLOYMENT_MODE: "supabase",
        SUPABASE_SERVICE_ROLE_KEY: "ci-placeholder-service-role",
      },
      encoding: "utf8",
    });

    expect(output).toContain("Configuração mínima de produção validada.");
  });

  it("rejects Supabase mode without the server-only service role key", () => {
    expect(() => execFileSync(process.execPath, [script], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: "https://ci.invalid.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "ci-placeholder",
        ONEIT_APP_URL: "https://oneit.example.com",
        ONEIT_DEPLOYMENT_MODE: "supabase",
        SUPABASE_SERVICE_ROLE_KEY: undefined,
      },
      stdio: "pipe",
    })).toThrow();
  });
});
