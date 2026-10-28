import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const createAction = readFileSync("src/app/(portal)/portal/technicians/actions.ts", "utf8");
const fieldServicePage = readFileSync("src/app/(portal)/portal/field-service/page.tsx", "utf8");
const autoMappingMigration = readFileSync("supabase/migrations/20261027210000_auto_field_service_technician_mapping.sql", "utf8");
const collisionMigration = readFileSync("supabase/migrations/20261027213000_field_service_technician_email_collision.sql", "utf8");

describe("fonte canônica do técnico para Field Service", () => {
  it("cria o técnico operacional como disponível e revalida o cadastro Field Service", () => {
    expect(createAction).toContain('status: "AVAILABLE"');
    expect(createAction).toContain('from("field_service_technicians")');
    expect(createAction).toContain('revalidatePath("/portal/field-service")');
  });

  it("carrega os dois registros apenas para resolver o vínculo, sem usar dados locais", () => {
    expect(fieldServicePage).toContain('from("technicians")');
    expect(fieldServicePage).toContain('from("field_service_technicians")');
    expect(fieldServicePage).toContain("resolveDispatchTechnicians");
    expect(fieldServicePage).not.toContain("localStorage");
  });

  it("mantém sincronização automática e não quebra por e-mail duplicado", () => {
    expect(autoMappingMigration).toContain("create trigger technicians_field_service_master_sync");
    expect(autoMappingMigration).toContain("insert into public.field_service_technicians");
    expect(collisionMigration).toContain("target_email := 'tecnico-'");
    expect(collisionMigration).toContain("operational_technician_id is distinct from new.id");
  });
});
