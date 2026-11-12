import { describe, expect, it } from "vitest";
import { hasRequiredPublicEnvironment, hasRequiredSelfHostedEnvironment, hasRequiredSupabaseEnvironment, isSupportedProductionDeploymentMode } from "@/lib/runtime/readiness";

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

  it("exige a chave de serviço no modo Supabase", () => {
    const complete = { NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon", SUPABASE_SERVICE_ROLE_KEY: "service-role" };
    expect(hasRequiredSupabaseEnvironment(complete)).toBe(true);
    expect(hasRequiredSupabaseEnvironment({ ...complete, SUPABASE_SERVICE_ROLE_KEY: undefined })).toBe(false);
  });

  it("não considera o modo legado seguro para o portal de produção", () => {
    expect(isSupportedProductionDeploymentMode("supabase")).toBe(true);
    expect(isSupportedProductionDeploymentMode("self_hosted")).toBe(true);
    expect(isSupportedProductionDeploymentMode(undefined)).toBe(false);
    expect(isSupportedProductionDeploymentMode("legacy")).toBe(false);
  });
});
