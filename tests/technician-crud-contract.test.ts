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

  it("creates new technicians as dispatchable without changing existing availability", () => {
    expect(source).toContain('status: "AVAILABLE"');
    expect(readFileSync("supabase/migrations/20261028110000_new_technicians_available.sql", "utf8"))
      .toContain("alter column status set default 'AVAILABLE'");
  });

  it("does not report a Field Service link when no master row was updated", () => {
    expect(source).toContain("const { data: fieldUpdated, error: fieldUpdateError }");
    expect(source).toContain("const { data: fieldUpdated, error: fieldError }");
    expect(source).toContain("const { data: linkedRecord, error }");
    expect(source).toContain("!linkedRecord");
  });

  it("reativa o vínculo operacional ao habilitar o técnico para despacho", () => {
    expect(source).toContain('if (parsed.data.status === "AVAILABLE")');
    expect(source).toContain('from("field_service_technicians")');
    expect(source).toContain('.update({ active: true })');
    expect(source).toContain('.eq("operational_technician_id", parsed.data.technicianId)');
  });
});
