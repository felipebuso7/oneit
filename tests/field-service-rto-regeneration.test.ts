import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("regeração de arquivo RTO", () => {
  it("diferencia arquivo já registrado de indisponibilidade de storage", () => {
    const route = readFileSync("src/app/api/field-service/rto/route.ts", "utf8");
    const storage = readFileSync("src/lib/reports/store-field-service-rto.ts", "utf8");

    expect(storage).toContain('registrationError.message?.includes("RTO_FILE_ALREADY_REGISTERED")');
    expect(route).toContain('cause.message === "RTO_FILE_ALREADY_REGISTERED"');
    expect(route).toContain('reply(409, "RTO_FILE_ALREADY_REGISTERED")');
    expect(readFileSync("src/app/(portal)/portal/review/actions.ts", "utf8")).toContain("Este RTO já possui um PDF registrado");
  });
});
