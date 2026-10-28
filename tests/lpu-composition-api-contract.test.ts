import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = readFileSync("src/app/api/field-service/lpu/compositions/route.ts", "utf8");

describe("API de composição LPU", () => {
  it("usa função transacional, valida linhas e não aceita payload sem organização", () => {
    expect(route).toContain("create_field_service_lpu_composition");
    expect(route).toContain("lines: z.array(lineSchema).min(1)");
    expect(route).toContain("ORGANIZATION_REQUIRED");
    expect(route).toContain("hasSameOrigin");
  });
});
