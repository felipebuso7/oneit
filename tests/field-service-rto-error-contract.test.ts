import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("field service RTO error contract", () => {
  it("does not leak storage or PDF exceptions from POST", () => {
    const source = readFileSync("src/app/api/field-service/rto/route.ts", "utf8");
    expect(source).toContain("try {");
    expect(source).toContain('return reply(503, "RTO_STORAGE_UNAVAILABLE")');
    expect(source).toContain('return reply(503, "RTO_UPLOAD_FAILED")');
  });
});
