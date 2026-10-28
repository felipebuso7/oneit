import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("supabase/migrations/20261028180500_field_service_lpu_compositions.sql", "utf8");

describe("modelo persistente de composição LPU", () => {
  it("é aditivo, preserva snapshots de quantidade e preço e aplica RLS", () => {
    expect(source).toContain("create table if not exists public.field_service_lpu_compositions");
    expect(source).toContain("create table if not exists public.field_service_lpu_composition_lines");
    expect(source).toContain("lpu_item_id uuid not null references public.field_service_lpu_items(id) on delete restrict");
    expect(source).toContain("quantity numeric(12,3)");
    expect(source).toContain("unit_price numeric(12,2)");
    expect(source).toContain("alter table public.field_service_lpu_compositions enable row level security");
    expect(source).toContain("alter table public.field_service_lpu_composition_lines enable row level security");
  });
});
