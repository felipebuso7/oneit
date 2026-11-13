import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/globals.css", "utf8");
const tickets = readFileSync("src/components/tickets/tickets-table.tsx", "utf8");

describe("contratos responsivos do portal operacional", () => {
  it("mantém a tabela de chamados navegável sem estourar o viewport", () => {
    expect(tickets).toContain('className="divide-y divide-slate-200 lg:hidden"');
    expect(tickets).toContain('className="hidden overflow-x-auto lg:block"');
    expect(tickets).toContain("min-w-[980px]");
    expect(css).toContain("[data-oneit-sidebar-offset] .overflow-x-auto");
    expect(css).toContain("overflow-x: auto");
  });

  it("empilha cabeçalhos e libera o conteúdo em viewport estreito", () => {
    expect(css).toContain("@media (max-width: 767px)");
    expect(css).toContain(".oneit-page-header { align-items: stretch; flex-direction: column;");
    expect(css).toContain(".oneit-page-heading-row { align-items: stretch; flex-direction: column; }");
    expect(css).toContain("[data-oneit-sidebar-offset] { margin-left: 0 !important;");
    expect(css).toContain(".oneit-portal-sidebar");
  });
});
