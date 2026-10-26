import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { POST as legacyPost } from "@/app/api/field-service/fiscal/email-log/route";
import { POST as queuePost } from "@/app/api/field-service/fiscal/queue-email/route";

describe("log de e-mail financeiro", () => {
  it("usa a mesma validação da fila sem criar um segundo caminho de gravação", () => {
    const source = readFileSync("src/app/api/field-service/fiscal/email-log/route.ts", "utf8");
    expect(legacyPost).toBe(queuePost);
    expect(source).not.toContain(".insert(");
    const worker = readFileSync("src/app/api/internal/billing-email/result/route.ts", "utf8");
    expect(worker).toContain('z.enum(["SENT", "FAILED"])');
    expect(worker).toContain("complete_billing_email");
  });
});
