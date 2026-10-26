import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("field service RTO file immutability", () => {
  it("rejects replacing a registered path or hash", () => {
    const source = readFileSync("supabase/migrations/20261025190000_field_service_rto_file_immutability.sql", "utf8");
    expect(source).toContain("report.storage_path is not null");
    expect(source).toContain("report.sha256 is distinct from target_sha256");
    expect(source).toContain("RTO_FILE_ALREADY_REGISTERED");
  });
});
