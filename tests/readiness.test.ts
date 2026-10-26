import { describe, expect, it } from "vitest";
import { hasRequiredPublicEnvironment, hasRequiredSelfHostedEnvironment } from "@/lib/runtime/readiness";

describe("readiness do runtime", () => {
  it("exige as variáveis públicas do Supabase", () => {
    expect(hasRequiredPublicEnvironment({ NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon" })).toBe(true);
    expect(hasRequiredPublicEnvironment({ NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co" })).toBe(false);
    expect(hasRequiredPublicEnvironment({ NEXT_PUBLIC_SUPABASE_URL: "not-a-url", NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon" })).toBe(false);
  });

  it("exige o conjunto completo no modo self-hosted", () => {
    const complete = { ONEIT_DATABASE_URL: "postgres://db", ONEIT_AUTH_ISSUER: "https://auth", ONEIT_AUTH_CLIENT_ID: "client", ONEIT_S3_ENDPOINT: "https://s3", ONEIT_S3_BUCKET: "oneit" };
    expect(hasRequiredSelfHostedEnvironment(complete)).toBe(true);
    expect(hasRequiredSelfHostedEnvironment({ ...complete, ONEIT_S3_BUCKET: undefined })).toBe(false);
    expect(hasRequiredSelfHostedEnvironment({ ...complete, ONEIT_DATABASE_URL: "not-a-database-url" })).toBe(false);
  });
});
