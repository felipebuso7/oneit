import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("collaborator CRUD contract", () => {
  it("uses an audited backend function for status and identity changes", () => {
    const migration = readFileSync("supabase/migrations/20261027230000_collaborator_crud.sql", "utf8");
    const actions = readFileSync("src/app/(portal)/portal/collaborators/actions.ts", "utf8");
    expect(migration).toContain("create or replace function public.update_collaborator");
    expect(migration).toContain("COLLABORATOR_UPDATED");
    expect(actions).toContain('supabase.rpc("update_collaborator"');
  });

  it("exposes the edit operation in the collaborators list", () => {
    const page = readFileSync("src/app/(portal)/portal/collaborators/page.tsx", "utf8");
    expect(page).toContain("action={updateCollaborator}");
    expect(page).toContain('value="INACTIVE"');
  });
});
