import { beforeEach, describe, expect, it, vi } from "vitest";

const createClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/lib/http/same-origin", () => ({ hasSameOrigin: () => true }));

import { GET, POST } from "@/app/api/field-service/lpu/route";
import { DELETE, PATCH } from "@/app/api/field-service/lpu/[id]/route";

const organizationId = "11111111-1111-4111-8111-111111111111";
const itemId = "22222222-2222-4222-8222-222222222222";

function request(url: string, init: RequestInit = {}) {
  return new Request(`http://localhost${url}`, { headers: { origin: "http://localhost", "content-type": "application/json" }, ...init });
}

function clientFor(result: { data: unknown; error: null | { code?: string } }) {
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.eq = () => builder;
  builder.order = () => builder;
  builder.in = () => builder;
  builder.insert = () => builder;
  builder.update = () => builder;
  builder.single = async () => result;
  builder.maybeSingle = async () => result;
  builder.then = (resolve: (value: { data: unknown; error: null | { code?: string } }) => unknown) => Promise.resolve(result).then(resolve);
  return {
    auth: { getUser: async () => ({ data: { user: { id: "actor" } }, error: null }) },
    from: () => builder,
  };
}

beforeEach(() => vi.clearAllMocks());

describe("handlers HTTP da LPU", () => {
  it("rejeita unidade inválida antes de acessar o banco", async () => {
    const response = await POST(request("/api/field-service/lpu", { method: "POST", body: JSON.stringify({ organizationId, code: "CAB-1", description: "Cabo", unit: "litro", unitPrice: 10 }) }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ code: "INVALID_LPU_ITEM" });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("retorna os itens ativos da organização", async () => {
    createClient.mockResolvedValue(clientFor({ data: [{ id: itemId, organization_id: organizationId, code: "CAB-1", active: true }], error: null }));
    const response = await GET(request(`/api/field-service/lpu?organizationId=${organizationId}`));
    expect(response.status).toBe(200);
    expect((await response.json()).items).toHaveLength(1);
  });

  it("cria um item com unidade metro e preço unitário", async () => {
    createClient.mockResolvedValue(clientFor({ data: { id: itemId, organization_id: organizationId, code: "CAB-1", unit: "metro", unit_price: 10, active: true }, error: null }));
    const response = await POST(request("/api/field-service/lpu", { method: "POST", body: JSON.stringify({ organizationId, code: "cab-1", description: "Cabo de rede", kind: "material", unit: "metro", unitPrice: 10 }) }));
    expect(response.status).toBe(201);
    expect((await response.json()).item).toMatchObject({ code: "CAB-1", unit: "metro", unit_price: 10 });
  });

  it("edita o preço e reativa um item", async () => {
    createClient.mockResolvedValue(clientFor({ data: { id: itemId, organization_id: organizationId, code: "CAB-1", unit_price: 12, active: true }, error: null }));
    const response = await PATCH(request(`/api/field-service/lpu/${itemId}`, { method: "PATCH", body: JSON.stringify({ organizationId, unitPrice: 12, active: true }) }), { params: Promise.resolve({ id: itemId }) });
    expect(response.status).toBe(200);
    expect((await response.json()).item).toMatchObject({ unit_price: 12, active: true });
  });

  it("desativa sem excluir o registro", async () => {
    createClient.mockResolvedValue(clientFor({ data: { id: itemId }, error: null }));
    const response = await DELETE(request(`/api/field-service/lpu/${itemId}?organizationId=${organizationId}`, { method: "DELETE" }), { params: Promise.resolve({ id: itemId }) });
    expect(response.status).toBe(204);
  });
});
