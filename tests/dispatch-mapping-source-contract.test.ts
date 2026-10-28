import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const central = readFileSync("src/app/(portal)/portal/field-service/page.tsx", "utf8");
const scheduling = readFileSync("src/app/(portal)/portal/scheduling/page.tsx", "utf8");

describe("dispatch mapping source contract", () => {
  it("does not hide inactive mappings before eligibility resolution", () => {
    expect(central).toContain('.from("field_service_technicians").select("organization_id,operational_technician_id,phone,mobile,active")');
    expect(central).not.toContain('.in("organization_id", organizationIds).eq("active", true).limit(300)');
    expect(scheduling).toContain("withMissingOperationalMappings");
    expect(scheduling).toContain('.in("organization_id", organizationIds) : Promise.resolve({ data: [] })');
  });
});
