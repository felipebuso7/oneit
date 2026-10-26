import { describe, expect, it } from "vitest";

import { contractSchema, organizationSchema } from "./organization";

describe("organizationSchema", () => {
  it("requires legal and display names", () => {
    expect(organizationSchema.safeParse({ legalName: "S", displayName: "" }).success).toBe(false);
  });
});

describe("contractSchema", () => {
  it("rejects an end date before the start date", () => {
    const result = contractSchema.safeParse({
      organizationId: "019cda50-f764-7a5e-9101-513020ce22e8",
      customerId: "019cda50-f764-7a5e-9101-513020ce22e9",
      code: "SABESP-2026",
      name: "Cabling",
      startsAt: "2026-01-02",
      endsAt: "2026-01-01",
    });

    expect(result.success).toBe(false);
  });
});
