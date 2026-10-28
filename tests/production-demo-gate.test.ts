import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

afterEach(() => vi.unstubAllEnvs());

describe("isolamento da demonstração", () => {
  it("mantém a entrada de produção no portal persistente", () => {
    const source = readFileSync("src/app/page.tsx", "utf8");
    expect(source).toContain('redirect("/portal")');
    expect(source).toContain('process.env.NODE_ENV === "production"');
  });

  it.each(["/demo", "/demo/field-service/queue-v2", "/api/demo", "/api/demo/field-service/billing-pdf"])(
    "não publica %s no build de produção",
    async (path) => {
      vi.stubEnv("NODE_ENV", "production");
      const response = await proxy(new NextRequest(`https://oneit.example${path}`));
      expect(response.status).toBe(404);
    },
  );

  it("preserva a demonstração no desenvolvimento local", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const response = await proxy(new NextRequest("http://localhost:3000/demo"));
    expect(response.status).toBe(200);
  });

  it("libera a demonstração somente na prévia explicitamente configurada", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("ONEIT_PREVIEW_MODE", "demo");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const response = await proxy(new NextRequest("https://oneit-preview.example/demo/field-service/queue-v2"));
    expect(response.status).toBe(200);
  });

  it("não libera a demonstração no ambiente production da Vercel", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("ONEIT_PREVIEW_MODE", "demo");
    const response = await proxy(new NextRequest("https://oneit.example/demo"));
    expect(response.status).toBe(404);
  });

  it("propaga um request-id válido para a resposta", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const response = await proxy(new NextRequest("http://localhost:3000/portal", {
      headers: { "x-request-id": "homologacao-123" },
    }));
    expect(response.headers.get("x-request-id")).toBe("homologacao-123");
  });

  it("substitui request-id inválido por um identificador seguro", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const response = await proxy(new NextRequest("http://localhost:3000/portal", {
      headers: { "x-request-id": "id com espaços e tamanho inválido" },
    }));
    expect(response.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
  });
});
