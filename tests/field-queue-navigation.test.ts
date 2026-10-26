import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("field queue navigation", () => {
  it("points the primary menu entry to the simplified queue", () => {
    const source = readFileSync("src/components/demo-sidebar.tsx", "utf8");
    expect(source).toContain('id: "field-queue"');
    expect(source).toContain('href: "/demo/field-service/queue-v2"');
  });
});
