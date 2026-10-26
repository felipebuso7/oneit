import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const currentUser = readFileSync("src/lib/auth/self-hosted-current-user.ts", "utf8");

describe("self-hosted current user", () => {
  it("uses only the signed OneIT session and validates an active local profile", () => {
    expect(currentUser).toContain('get("oneit_session")');
    expect(currentUser).toContain("readSelfHostedSession");
    expect(currentUser).toContain("profiles.active as profile_active");
    expect(currentUser).toContain("users.active = true");
  });
});
