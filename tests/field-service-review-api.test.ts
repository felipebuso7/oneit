import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("API de revisão da OS de Field Service", () => {
  const source = readFileSync("src/app/api/field-service/review/route.ts", "utf8");

  it("exige mesma origem, autenticação e decisão limitada", () => {
    expect(source).toContain("hasSameOrigin");
    expect(source).toContain("getUser");
    expect(source).toContain('z.enum(["APPROVE", "RETURN"])');
    expect(source).toContain("review_field_service_order");
  });
});
