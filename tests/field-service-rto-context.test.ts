import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("contexto congelado no RTO de Field Service", () => {
  it("inclui cliente, local, técnico e contato no snapshot", () => {
    const migration = readFileSync("supabase/migrations/20261028162000_field_service_rto_context_snapshot.sql", "utf8");
    for (const field of ["ticket_number", "customer_name", "location_name", "location_address", "technician_name", "local_contact_name", "local_contact_phone"]) expect(migration).toContain(`'${field}'`);
  });

  it("permite ler os campos adicionais sem invalidar RTOs antigos", () => {
    const source = readFileSync("src/domain/reports/pdf.ts", "utf8");
    expect(source).toContain("customer_name: z.string().optional()");
    expect(source).toContain("snapshot.customer_name ??");
  });
});
