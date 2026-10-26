import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";

describe("endpoint de liveness", () => {
  it("retorna somente o estado vivo da aplicação", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
