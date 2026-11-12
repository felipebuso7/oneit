import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/current-user", () => ({ requireUser: mocks.requireUser }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(url); } }));
import { updateTechnician } from "@/app/(portal)/portal/technicians/actions";

const technicianId = "11111111-1111-4111-8111-111111111111";
const organizationId = "22222222-2222-4222-8222-222222222222";

function form(optional: Record<string, string> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ technicianId, organizationId, fullName: "Técnico de teste", employmentType: "interno", email: "", phone: "", baseCity: "", primaryRegionId: "", ...optional })) data.set(key, value);
  return data;
}

function database(error: object | null = null) {
  const technician = { update: vi.fn(), eq: vi.fn(), select: vi.fn(), single: vi.fn() };
  technician.update.mockReturnValue(technician);
  technician.eq.mockReturnValue(technician);
  technician.select.mockReturnValue(technician);
  technician.single.mockResolvedValue({ error, data: error ? null : { id: technicianId, organization_id: organizationId, full_name: "Técnico de teste", employment_type: "interno", email: null, phone: null, active: true } });
  const field = { update: vi.fn(), eq: vi.fn(), select: vi.fn(), maybeSingle: vi.fn() };
  field.update.mockReturnValue(field);
  field.eq.mockReturnValue(field);
  field.select.mockReturnValue(field);
  field.maybeSingle.mockResolvedValue({ data: { id: "field-id" }, error: null });
  const from = vi.fn((table: string) => {
    if (table === "technicians") return technician;
    if (table === "field_service_technicians") return field;
    throw new Error(`Unexpected table: ${table}`);
  });
  mocks.requireUser.mockResolvedValue({ supabase: { from } });
  return { technician, field, from };
}

describe("edição do técnico — contrato de persistência", () => {
  beforeEach(() => vi.clearAllMocks());

  it("envia null para remover valores opcionais anteriores, preservando o escopo", async () => {
    const db = database();
    await expect(updateTechnician(form())).rejects.toThrow("Técnico+atualizado.");
    expect(db.technician.update).toHaveBeenCalledWith({ full_name: "Técnico de teste", employment_type: "interno", email: null, phone: null, base_city: null, primary_region_id: null });
    expect(db.technician.eq).toHaveBeenCalledWith("id", technicianId);
    expect(db.technician.eq).toHaveBeenCalledWith("organization_id", organizationId);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/portal/field-service");
  });

  it("preserva valores opcionais preenchidos", async () => {
    const db = database();
    await expect(updateTechnician(form({ email: "teste@example.com", phone: "11999999999", baseCity: "Atibaia", primaryRegionId: organizationId }))).rejects.toThrow("Técnico+atualizado.");
    expect(db.technician.update).toHaveBeenCalledWith(expect.objectContaining({ email: "teste@example.com", phone: "11999999999", base_city: "Atibaia", primary_region_id: organizationId }));
  });

  it("não comunica sucesso nem atualiza vínculo se o banco rejeitar a edição", async () => {
    const db = database({ code: "42501" });
    await expect(updateTechnician(form())).rejects.toThrow("Não foi possível atualizar o técnico.");
    expect(db.field.update).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("rejeita identificadores inválidos antes de acessar o banco", async () => {
    database();
    await expect(updateTechnician(form({ organizationId: "invalid" }))).rejects.toThrow("Dados do técnico inválidos.");
    expect(mocks.requireUser).not.toHaveBeenCalled();
  });
});
