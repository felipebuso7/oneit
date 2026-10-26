import { describe, expect, it } from "vitest";

import { assetSchema, assetUpdateSchema } from "./asset";

const id = "550e8400-e29b-41d4-a716-446655440000";

describe("asset validation", () => {
  it("accepts an asset linked to an organization, type and optional department", () => {
    expect(assetSchema.safeParse({ organizationId: id, assetTypeId: id, departmentUnitId: id, assetCode: "NB-0001", manufacturer: "Lenovo" }).success).toBe(true);
  });

  it("allows only controlled lifecycle statuses on updates", () => {
    expect(assetUpdateSchema.safeParse({ assetId: id, assetTypeId: id, assetCode: "NB-0001", status: "MAINTENANCE" }).success).toBe(true);
    expect(assetUpdateSchema.safeParse({ assetId: id, assetTypeId: id, assetCode: "NB-0001", status: "ARBITRARY" }).success).toBe(false);
  });
});
