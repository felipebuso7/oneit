import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = readFileSync("src/app/(portal)/portal/reports/[id]/route.ts", "utf8");

describe("RTO download contract", () => {
  it("requires an authenticated user and returns a short-lived private redirect", () => {
    expect(route).toContain("requireUser");
    expect(route).toContain("createSignedUrl(data.storage_path, 60)");
    expect(route).toContain('Cache-Control", "private, no-store');
    expect(route).toContain('Referrer-Policy", "no-referrer');
  });
});
