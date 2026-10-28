import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("master data CRUD integration contract", () => {
  it("keeps customer edits available to dependent ticket and location screens", () => {
    const actions = readFileSync("src/app/(portal)/portal/customers/actions.ts", "utf8");
    const page = readFileSync("src/app/(portal)/portal/customers/page.tsx", "utf8");
    expect(actions).toContain("export async function updateCustomer");
    expect(actions).toContain('revalidatePath("/portal/tickets")');
    expect(page).toContain("action={updateCustomer}");
  });

  it("keeps locality edits tied to the selected customer and dispatch consumers", () => {
    const actions = readFileSync("src/app/(portal)/portal/locations/actions.ts", "utf8");
    const page = readFileSync("src/app/(portal)/portal/locations/page.tsx", "utf8");
    expect(actions).toContain("export async function updateLocation");
    expect(actions).toContain('revalidatePath("/portal/field-service")');
    expect(page).toContain("action={updateLocation}");
  });
});
