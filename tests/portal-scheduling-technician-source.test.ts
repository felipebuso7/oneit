import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("agendamento usa o técnico operacional como fonte canônica", () => {
  it("não exige o vínculo administrativo legado para agendar ou atribuir", () => {
    const source = readFileSync("src/app/(portal)/portal/scheduling/actions.ts", "utf8");
    expect(source).toContain('from("technicians").select("id,active,status")');
    expect(source).toContain('eq("organization_id", ticket.organization_id)');
    expect(source).toContain('["OFFLINE", "UNAVAILABLE", "VACATION"]');
    expect(source).not.toContain('from("field_service_technicians").select("id")');
  });
});
