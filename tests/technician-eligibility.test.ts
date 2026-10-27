import { describe, expect, it } from "vitest";
import { countUnlinkedActiveTechnicians, resolveDispatchTechnicians } from "@/lib/field-service/technician-eligibility";

describe("dispatch technician source of truth", () => {
  it("offers only active operational technicians explicitly linked to an active Field Service record", () => {
    const result = resolveDispatchTechnicians(
      [
        { organization_id: "org-1", operational_technician_id: "tech-1", active: true },
        { organization_id: "org-1", operational_technician_id: "tech-2", active: false },
        { organization_id: "org-2", operational_technician_id: "tech-3", active: true },
        { organization_id: "org-1", operational_technician_id: null, active: true },
      ],
      [
        { id: "tech-1", organization_id: "org-1", full_name: "Ana", status: "AVAILABLE", base_city: "São Paulo", active: true },
        { id: "tech-2", organization_id: "org-1", full_name: "Bruno", status: "AVAILABLE", base_city: null, active: true },
        { id: "tech-3", organization_id: "org-2", full_name: "Carla", status: "AVAILABLE", base_city: null, active: true },
        { id: "tech-4", organization_id: "org-1", full_name: "Diego", status: "OFFLINE", base_city: null, active: true },
      ],
    );

    expect(result.map((technician) => technician.id)).toEqual(["tech-1"]);
  });

  it("counts active master records that still need operational mapping", () => {
    expect(countUnlinkedActiveTechnicians([
      { organization_id: "org-1", operational_technician_id: null, active: true },
      { organization_id: "org-1", operational_technician_id: "tech-1", active: true },
      { organization_id: "org-1", operational_technician_id: null, active: false },
    ])).toBe(1);
  });
});
