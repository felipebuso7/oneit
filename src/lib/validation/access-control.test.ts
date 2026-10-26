import { describe, expect, it } from "vitest";
import { copyUserAccessProfileSchema, technicianProfileSchema, userModuleAccessSchema } from "./access-control";

const organizationId = "550e8400-e29b-41d4-a716-446655440000";
const userId = "550e8400-e29b-41d4-a716-446655440001";

describe("access control validation", () => {
  it("limits module access to the OneIT module catalog", () => {
    expect(userModuleAccessSchema.safeParse({ organizationId, userId, moduleKey: "FIELD_SERVICE", enabled: true, visibilityScope: "OWN_ASSIGNMENTS" }).success).toBe(true);
    expect(userModuleAccessSchema.safeParse({ organizationId, userId, moduleKey: "ROOT", enabled: true, visibilityScope: "OWN_ASSIGNMENTS" }).success).toBe(false);
  });

  it("does not allow copying a profile onto itself", () => {
    expect(copyUserAccessProfileSchema.safeParse({ organizationId, sourceUserId: userId, targetUserId: userId }).success).toBe(false);
  });

  it("captures the partner technician reference and controlled cost", () => {
    expect(technicianProfileSchema.safeParse({
      organizationId, fullName: "André Isola", employmentType: "PARTNER", active: true,
      visibilityScope: "OWN_ASSIGNMENTS", externalPartnerReference: "OS parceiro 12345", hourlyCost: 115.5,
    }).success).toBe(true);
    expect(technicianProfileSchema.safeParse({ organizationId, fullName: "A", employmentType: "PARTNER", active: true, visibilityScope: "OWN_ASSIGNMENTS", hourlyCost: -1 }).success).toBe(false);
  });
});
