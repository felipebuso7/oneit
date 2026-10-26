import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("evidências do técnico externo", () => {
  it("valida a imagem e armazena somente metadados no evento", () => {
    const upload = readFileSync("src/app/api/field-service/partner/upload/route.ts", "utf8");
    const event = readFileSync("src/app/api/field-service/partner/event/route.ts", "utf8");
    const migration = readFileSync("supabase/migrations/20261024132000_partner_evidence_storage_paths.sql", "utf8");
    expect(upload).toContain("validateEvidenceBytes");
    expect(upload).toContain("createStorageAdmin");
    expect(upload).toContain("partner/${order.service_order_id}");
    expect(event).toContain("storagePath");
    expect(event).toContain("256 * 1024");
    expect(migration).toContain("expected_prefix");
    expect(migration).toContain("PARTNER_EVIDENCE_INVALID");
  });
});
