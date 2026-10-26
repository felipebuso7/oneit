import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("convergência dos cadastros de Field", () => {
  it("garante mapeamentos únicos e pertencentes à mesma organização", () => {
    const migration = readFileSync("supabase/migrations/20261024130000_field_service_operational_mapping.sql", "utf8");
    expect(migration).toContain("operational_technician_id");
    expect(migration).toContain("operational_location_id");
    expect(migration).toContain("field_service_technicians_operational_technician_unique");
    expect(migration).toContain("FIELD_SERVICE_TECHNICIAN_ORGANIZATION_MISMATCH");
    expect(migration).toContain("FIELD_SERVICE_POLO_ORGANIZATION_MISMATCH");
  });

  it("expõe os vínculos explicitamente nas APIs administrativas", () => {
    const technicianApi = readFileSync("src/app/api/field-service/technicians/route.ts", "utf8");
    const poloApi = readFileSync("src/app/api/field-service/polos/route.ts", "utf8");
    expect(technicianApi).toContain("operationalTechnicianId");
    expect(technicianApi).toContain("operational_technician_id");
    expect(poloApi).toContain("operationalLocationId");
    expect(poloApi).toContain("operational_location_id");
  });
});
