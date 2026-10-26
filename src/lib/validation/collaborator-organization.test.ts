import { describe, expect, it } from "vitest";

import { organizationUnitSchema, updateOrganizationUnitSchema } from "./collaborator-organization";

const organizationId = "019cda50-f764-7a5e-9101-513020ce22e8";
const unitId = "019cda50-f764-7a5e-9101-513020ce22e9";

describe("organization unit validation", () => {
  it("accepts the master-data unit types", () => {
    expect(organizationUnitSchema.safeParse({ organizationId, type: "DEPARTMENT", code: "TI", name: "Tecnologia" }).success).toBe(true);
  });

  it("requires explicit activation state on maintenance", () => {
    const base = { organizationUnitId: unitId, code: "TI", name: "Tecnologia", active: "true" };
    expect(updateOrganizationUnitSchema.safeParse(base).success).toBe(true);
    expect(updateOrganizationUnitSchema.safeParse({ ...base, active: "pending" }).success).toBe(false);
  });
});
