import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("src/app/(auth)/login/actions.ts", "utf8");

describe("origem da recuperação de senha", () => {
  it("usa a URL configurada ou o host efetivo, sem confiar no forwarded-host", () => {
    expect(source).toContain("process.env.ONEIT_APP_URL");
    expect(source).toContain('requestHeaders.get("host")');
    expect(source).not.toContain('requestHeaders.get("x-forwarded-host")');
  });
});
