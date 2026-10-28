import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/app/(portal)/portal/review/page.tsx", "utf8");

describe("fila de validação", () => {
  it("mantém atualização explícita e resumo operacional", () => {
    expect(source).toContain("Atualizar validação");
    expect(source).toContain("Resumo da validação");
    expect(source).toContain("Aguardando validação");
    expect(source).toContain("Devolvidas");
  });

  it("prioriza a fila oficial de Field Service e evita duplicidade com o legado", () => {
    expect(source).toContain("const fieldQueueTicketIds = new Set(fieldItems.map((item) => item.ticket_id));");
    expect(source).toContain("const legacyTickets = (tickets ?? []).filter((ticket) => !fieldQueueTicketIds.has(ticket.id));");
    expect(source).toContain("fieldItems.length + legacyTickets.length");
    expect(source).toContain("Chamados legados aguardando revisão");
  });
});
