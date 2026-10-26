import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/20261024120500_report_evidence_paths.sql", "utf8");

describe("snapshot de evidências do RTO", () => {
  it("preserva o caminho privado sem expor o objeto", () => {
    expect(migration).toContain("'storagePath', storage_path");
    expect(migration).toContain("create or replace function public.prepare_ticket_report");
    expect(migration).toContain("grant execute on function public.prepare_ticket_report(uuid) to authenticated");
  });
});
