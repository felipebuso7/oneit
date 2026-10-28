import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("tickets queue UI contract", () => {
  const source = readFileSync("src/components/tickets/tickets-table.tsx", "utf8");

  it("provides a consistent queue toolbar with search, status filter and sorting", () => {
    expect(source).toContain("ticket-search");
    expect(source).toContain("ticket-status");
    expect(source).toContain("Todas as situações");
    expect(source).toContain("min-w-[1080px]");
  });

  it("keeps the operational actions visible without breaking row layout", () => {
    expect(source).toContain("Atribuir visita →");
    expect(source).toContain("Validar OS →");
    expect(source).toContain("Nenhum chamado corresponde aos filtros atuais.");
  });
});
