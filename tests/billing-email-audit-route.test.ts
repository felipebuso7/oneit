import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("billing email audit route", () => {
  it("provides protected filtered history", () => {
    const route = readFileSync("src/app/api/field-service/fiscal/email-log/route.ts", "utf8");
    expect(route).toContain("export async function GET");
    expect(route).toContain("organizationId");
    expect(route).toContain("emailType");
    expect(route).toContain("emailLogs");
    expect(route).toContain("AUTH_REQUIRED");
  });
});
