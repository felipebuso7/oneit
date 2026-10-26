import { describe, expect, it } from "vitest";
import { digitsOnly, isValidCnpj, isValidEmail, isValidPhone } from "@/lib/field-service/validation";
import { formatLpuLabel } from "@/lib/field-service/lpu-label";

describe("cadastros operacionais", () => {
  it("normaliza documentos e valida contatos", () => {
    expect(digitsOnly("11.222.333/0001-44")).toBe("11222333000144");
    expect(isValidCnpj("11.222.333/0001-44")).toBe(true);
    expect(isValidCnpj("123")).toBe(false);
    expect(isValidEmail("marcelo@oneit.com.br")).toBe(true);
    expect(isValidEmail("marcelo@oneit")).toBe(false);
    expect(isValidPhone("(11) 99999-0000")).toBe(true);
    expect(isValidPhone("9999")).toBe(false);
  });

  it("mantém unidade e preço na identificação da LPU", () => {
    expect(formatLpuLabel({ code: "LPU-CABO-001", description: "Cabo de rede", unit: "metro", price: 10 })).toBe("LPU-CABO-001 · Cabo de rede · metro · R$ 10.00");
    expect(formatLpuLabel({ code: "LPU-RJ45-001", description: "RJ45", price: 5 })).toContain("unidade");
  });
});
