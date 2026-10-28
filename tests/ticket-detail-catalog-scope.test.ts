import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("src/app/(portal)/portal/tickets/[id]/page.tsx", "utf8");

describe("ticket triage catalog scope", () => {
  it("loads offering ancestry and scopes options to the ticket organization", () => {
    expect(page).toContain('select("id,subcategory_id,code,name")');
    expect(page).toContain('from("service_categories").select("id").eq("organization_id", ticket.organization_id)');
    expect(page).toContain('from("service_subcategories").select("id").in("category_id", categoryIds)');
    expect(page).toContain("const organizationOfferings = (offerings ?? []).filter");
    expect(page).toContain("organizationOfferings.map((item)");
  });
});
