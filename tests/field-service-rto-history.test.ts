import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("histórico de RTO Field Service", () => {
  it("oferece download por URL assinada e mostra integridade", () => {
    const page = readFileSync("src/app/(portal)/portal/field-service-reports/page.tsx", "utf8");
    const api = readFileSync("src/app/api/field-service/rto/route.ts", "utf8");
    expect(page).toContain("Baixar PDF");
    expect(page).toContain("sha256");
    expect(api).toContain('searchParams.get("redirect")');
    expect(readFileSync("src/app/(portal)/layout.tsx", "utf8")).toContain("/portal/field-service-reports");
  });
});
