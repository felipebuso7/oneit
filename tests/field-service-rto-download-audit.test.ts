import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("field service RTO download audit", () => {
  it("records the authenticated viewer before returning the signed URL", () => {
    const source = readFileSync("src/app/api/field-service/rto/route.ts", "utf8");
    expect(source).toContain('action: "FIELD_SERVICE_RTO_VIEWED"');
    expect(source).toContain("actor_id: auth.user.id");
    expect(source).toContain("entity_type: \"field_service_rto_report\"");
  });
});
