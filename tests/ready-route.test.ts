import { afterEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/ready/route";

const original = { ...process.env };

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in original)) delete process.env[key];
  }
  for (const [key, value] of Object.entries(original)) process.env[key] = value;
});

describe("endpoint de prontidão", () => {
  it("retorna 503 sem as credenciais públicas mínimas", async () => {
    delete process.env.ONEIT_DEPLOYMENT_MODE;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const response = await GET();
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toMatchObject({ status: "not_ready", deploymentMode: "legacy" });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(JSON.stringify(body)).not.toContain("SUPABASE");
    expect(JSON.stringify(body)).not.toContain("ANON_KEY");
  });

  it("retorna 200 quando o ambiente legado está completo", async () => {
    delete process.env.ONEIT_DEPLOYMENT_MODE;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";

    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ready", deploymentMode: "legacy" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("exige o conjunto self-hosted quando o modo VPS está ativo", async () => {
    process.env.ONEIT_DEPLOYMENT_MODE = "self_hosted";
    process.env.ONEIT_DATABASE_URL = "postgres://db";
    process.env.ONEIT_AUTH_ISSUER = "https://auth";
    process.env.ONEIT_AUTH_CLIENT_ID = "client";
    process.env.ONEIT_S3_ENDPOINT = "https://s3";
    delete process.env.ONEIT_S3_BUCKET;

    const response = await GET();
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toMatchObject({ status: "not_ready", deploymentMode: "self_hosted" });
    expect(JSON.stringify(body)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(body)).not.toContain("S3_BUCKET");
  });
});
