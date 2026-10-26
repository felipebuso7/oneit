import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

afterEach(() => vi.unstubAllEnvs());

describe("isolamento da demonstração", () => {
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
});
