import { describe, expect, it } from "vitest";
import { nonconformitySchema } from "./nonconformity";

describe("nonconformity", () => {
  const valid = {
    organizationId: "019cda50-f764-7a5e-9101-513020ce22e8",
    recordType: "NONCONFORMITY",
    description: "A evidência de aprovação da mudança não foi registrada.",
  };

  it("accepts a complete valid record", () => {
    expect(nonconformitySchema.safeParse(valid).success).toBe(true);
  });

  it("rejects unknown types and insufficient descriptions", () => {
    expect(nonconformitySchema.safeParse({ ...valid, recordType: "INCIDENT" }).success).toBe(false);
    expect(nonconformitySchema.safeParse({ ...valid, description: "curta" }).success).toBe(false);
  });
});
