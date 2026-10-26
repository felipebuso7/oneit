import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("deslocamento do técnico parceiro", () => {
  it("expõe a sequência aceite, deslocamento, chegada, execução e checkout", () => {
    const component = readFileSync("src/components/field-service/partner-execution-flow.tsx", "utf8");
    expect(component).toContain('"ACCEPT"');
    expect(component).toContain("Aceitar visita");
    expect(component).toContain('"TRAVEL_STARTED"');
    expect(component).toContain("Iniciar deslocamento");
    expect(component).toContain("Cheguei ao local · fazer check-in");
    expect(component).toContain("Fazer checkout e enviar OS");
    expect(component).toContain("Etapa 1 de 5 · aceitar visita");
    expect(component).toContain("pelo menos 10 caracteres");
    expect(component).toContain("if (event === \"SUBMIT\")");
    expect(component).toContain("payload?.context?.status === \"IN_SERVICE\"");
  });

  it("impõe a sequência no banco", () => {
    const migration = readFileSync("supabase/migrations/20261024133000_partner_submission_completion_guard.sql", "utf8");
    expect(migration).toContain("target_event = 'TRAVEL_STARTED'");
    expect(migration).toContain("order_record.status <> 'DISPATCHED'");
    expect(migration).toContain("order_record.status <> 'TRAVELING'");
    expect(migration).toContain("'TRAVELING'");
    expect(migration).toContain("target_event = 'SUBMIT'");
    expect(migration).toContain("PARTNER_SUBMISSION_REQUIRED");
    expect(migration).toContain("target_event not in ('TRAVEL_STARTED','CHECK_IN','CHECK_OUT','SUBMIT')");
    expect(migration).toContain("status = 'COMPLETED'");
  });
});
