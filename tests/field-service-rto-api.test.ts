import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("API de RTO do Field Service", () => {
  const source = readFileSync("src/app/api/field-service/rto/route.ts", "utf8");
  it("exige origem, sessão e chama o gerador aprovado", () => {
    expect(source).toContain("hasSameOrigin");
    expect(source).toContain("getUser");
    expect(source).toContain("generate_field_service_rto");
    expect(source).toContain("RTO_REVIEW_REQUIRED");
    expect(source).toContain("renderFieldServiceRtoPdf");
    expect(source).toContain("sha256");
    expect(source).toContain("createSignedUrl");
    expect(source).toContain("export async function GET");
    expect(source).toContain("RTO_NOT_FOUND");
  });
});
