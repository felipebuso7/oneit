import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20261023150000_field_service_master_data.sql", "utf8");

describe("persistência dos cadastros de Field Service", () => {
  it("segrega técnico interno e parceiro", () => {
    expect(migration).toContain("technician_type");
    expect(migration).toContain("'internal', 'partner'");
  });
  it("cria empresas, polos e LPU com isolamento organizacional", () => {
    expect(migration).toContain("create table if not exists public.field_service_companies");
    expect(migration).toContain("create table if not exists public.field_service_polos");
    expect(migration).toContain("create table if not exists public.field_service_lpu_items");
    expect(migration).toContain("organization_id uuid not null");
    expect(migration).toContain("enable row level security");
  });

  it("preserva regras de unidade, preço e vigência da LPU", () => {
    expect(migration).toContain("unit_price numeric(12,2) not null");
    expect(migration).toContain("valid_until date");
    expect(migration).toContain("unit in ('unidade', 'peça', 'metro', 'centímetro', 'hora', 'visita', 'quilômetro')");
    expect(migration).toContain("valid_until >= valid_from");
  });
});
