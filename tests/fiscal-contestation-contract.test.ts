import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const source = readFileSync(path.resolve(process.cwd(), "src/app/api/field-service/fiscal/contestation/resolve/route.ts"), "utf8");

describe("contrato de resolução de contestação fiscal", () => {
  it("protege resolução concorrente e confirma a transição da competência", () => {
    expect(source).toContain("CONTESTATION_ALREADY_RESOLVED");
    expect(source).toContain("BILLING_PERIOD_UPDATE_UNAVAILABLE");
    expect(source).toContain("BILLING_PERIOD_TRANSITION_CONFLICT");
    expect(source).toContain('.select("id").maybeSingle()');
    expect(source).toContain('eq("status", "SENT_FOR_CONTESTATION")');
  });
});
