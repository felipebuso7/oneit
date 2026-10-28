import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("src/app/(portal)/portal/field/page.tsx", "utf8");

describe("jornada do técnico", () => {
  it("mantém evidências e materiais bloqueados até o início do atendimento", () => {
    expect(page).toContain('["WORK_STARTED", "IN_PROGRESS"].includes(ticket.operational_status)');
    expect(page).not.toContain('["ON_SITE", "WORK_STARTED", "IN_PROGRESS"].includes(ticket.operational_status)');
  });
});
