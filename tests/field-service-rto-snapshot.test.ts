import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("snapshot RTO do Field Service", () => {
  const source = readFileSync("supabase/migrations/20261025120000_field_service_rto_snapshot.sql", "utf8");
  it("só gera depois da aprovação e congela dados operacionais", () => {
    expect(source).toContain("RTO_REVIEW_REQUIRED");
    expect(source).toContain("field_service_rto_reports");
    expect(source).toContain("customer_signature_data_url");
    expect(source).toContain("lpu_lines");
    expect(source).toContain("evidence");
  });
  it("registra versão e auditoria", () => {
    expect(source).toContain("report_version");
    expect(source).toContain("FIELD_SERVICE_RTO_GENERATED");
    expect(source).toContain("generated_by");
    expect(source).toContain("register_field_service_rto_file");
    expect(source).toContain("RTO_HASH_INVALID");
  });
});
