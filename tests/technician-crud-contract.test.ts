import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("technician CRUD integration contract", () => {
  const source = readFileSync("src/app/(portal)/portal/technicians/actions.ts", "utf8");
  const page = readFileSync("src/app/(portal)/portal/technicians/page.tsx", "utf8");

  it("does not duplicate the automatic Field Service master on create", () => {
    expect(source).toContain("eq(\"operational_technician_id\", technician.id).maybeSingle()");
    expect(source).toContain("fieldInsertError.code !== \"23505\"");
  });

  it("provides a persisted edit path and refreshes dependent dispatch screens", () => {
    expect(source).toContain("export async function updateTechnician");
    expect(source).toContain('revalidatePath("/portal/field-service")');
    expect(page).toContain("action={updateTechnician}");
  });
});
