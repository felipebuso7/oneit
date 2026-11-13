import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20261113090000_harden_ticket_child_rls.sql", "utf8");

describe("isolamento RLS dos dados filhos de chamados", () => {
  it("substitui políticas baseadas apenas na existência do chamado", () => {
    expect(migration).toContain("public.has_ticket_management_role(t.organization_id)");
    expect(migration).toContain("public.is_ticket_assigned_to_current_user(t.assigned_technician_id)");
    expect(migration).not.toContain("using (exists (select 1 from public.tickets t where t.id = ticket_id))");
  });

  it("protege também os objetos privados de evidências e relatórios", () => {
    expect(migration).toContain("bucket_id = 'ticket-evidences'");
    expect(migration).toContain("bucket_id = 'ticket-reports'");
    expect(migration).toContain("join public.tickets t on t.id = e.ticket_id");
    expect(migration).toContain("join public.tickets t on t.id = r.ticket_id");
  });
});
