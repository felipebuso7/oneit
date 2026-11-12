import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc }) }));

import { POST } from "@/app/api/field-service/partner/materials/route";

const token = "t".repeat(48);
const code = "123456";
const lpuItemId = "af361293-4d33-4706-8f55-3bb15ec82e34";
const request = (body: unknown) => new Request("https://oneit.example/api/field-service/partner/materials", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});

describe("materiais utilizados pelo técnico", () => {
  beforeEach(() => rpc.mockReset());

  it("lê o catálogo e o consumo somente pelo acesso da OS", async () => {
    rpc.mockResolvedValue({ data: { catalog: [{ id: lpuItemId, code: "CAT6", name: "Cabo CAT6", unit: "metro" }], used: [] }, error: null });
    const response = await POST(request({ token, code, action: "LIST" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ catalog: [{ id: lpuItemId, unit: "metro" }], used: [] });
    expect(rpc).toHaveBeenCalledWith("get_partner_service_order_materials", { target_token: token, target_code: code });
  });

  it("salva quantidade válida e rejeita entrada inválida antes do banco", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    expect((await POST(request({ token, code, action: "SAVE", items: [{ lpuItemId, quantity: 2.5 }] }))).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("save_partner_service_order_materials", { target_token: token, target_code: code, target_items: [{ lpuItemId, quantity: 2.5 }] });
    rpc.mockClear();
    expect((await POST(request({ token, code, action: "SAVE", items: [{ lpuItemId, quantity: -1 }] }))).status).toBe(400);
    expect((await POST(request({ token, code, action: "SAVE", items: [{ lpuItemId, quantity: 1.0001 }] }))).status).toBe(400);
    expect((await POST(request({ token, code, action: "SAVE", items: [{ lpuItemId, quantity: 1 }, { lpuItemId, quantity: 2 }] }))).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("não mascara falha de permissão ou estado", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "PARTNER_ACCESS_INVALID" } });
    expect((await POST(request({ token, code, action: "LIST" }))).status).toBe(401);
    rpc.mockResolvedValueOnce({ data: null, error: { message: "PARTNER_MATERIAL_INVALID_STATE" } });
    expect((await POST(request({ token, code, action: "SAVE", items: [] }))).status).toBe(409);
  });
});
