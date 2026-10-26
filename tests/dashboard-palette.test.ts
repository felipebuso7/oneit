import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const operations = readFileSync("src/app/demo/page.tsx", "utf8");
const sgsti = readFileSync("src/app/demo/sgsti/dashboard/page.tsx", "utf8");
const designSystem = readFileSync("src/app/globals.css", "utf8");

describe("paleta dos dashboards", () => {
  it("usa azul nos gráficos operacionais", () => {
    expect(operations).toContain('tone="bg-[#123f99]"');
    expect(operations).toContain("bg-[#146272]");
    expect(operations).not.toContain('tone="bg-orange-500"');
  });

  it("reserva cores quentes para estados sem pintar links de navegação", () => {
    expect(sgsti).toContain('text-[#146272]">Abrir →');
    expect(sgsti).toContain('text-[#146272]">Abrir área →');
  });

  it("usa azul-petróleo no cabeçalho compartilhado", () => {
    expect(designSystem).toContain(".oneit-page-header__eyebrow");
    expect(designSystem).toContain("color: var(--oneit-petrol-700)");
  });

  it("identifica a tela principal como Dashboard operacional", () => {
    expect(operations).toContain("Dashboard operacional");
    expect(operations).toContain("Resumo executivo da operação");
  });

  it("mantém semântica acessível nos indicadores", () => {
    expect(operations).toContain('role="progressbar"');
    expect(operations).toContain("aria-valuenow");
    expect(operations).toContain('role="img" aria-label={`');
  });
});
