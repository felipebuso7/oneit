import { describe, expect, it } from "vitest";
import { describeReleaseTree } from "../scripts/release-tree-state.mjs";

describe("release tree gate", () => {
  it("accepts a clean commit and blocks modified or untracked source", () => {
    const clean = describeReleaseTree("", "abc123");
    expect(clean.ok).toBe(true);
    expect(clean.message).toContain("abc123");

    const dirty = describeReleaseTree(" M src/app/page.tsx\n?? src/app/demo/page.tsx\n", "abc123");
    expect(dirty.ok).toBe(false);
    expect(dirty.message).toContain("2 arquivo(s)");
    expect(dirty.message).toContain("src/app/demo/page.tsx");
  });
});
