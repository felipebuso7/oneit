import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), store: vi.fn(), auth: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(url); } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/current-user", () => ({ requireUser: mocks.auth }));
vi.mock("@/lib/reports/store-field-service-rto", () => ({ storeFieldServiceRtoPdf: mocks.store }));
import { addFieldServiceOrderLpuLine, addFieldServiceOrderLpuComposition, reviewFieldServiceOrder, generateFieldServiceRto, closeFieldServiceTicket } from "@/app/(portal)/portal/review/actions";

const id = "d567b2e9-dc46-406d-8236-cbb98e82540a";
const actions = [addFieldServiceOrderLpuLine, addFieldServiceOrderLpuComposition, reviewFieldServiceOrder, generateFieldServiceRto, closeFieldServiceTicket];
function form(context = id) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ returnOrderId: context, queueId: id, serviceOrderId: id, lpuItemId: id, compositionId: id, ticketId: id, reportId: id, quantity: "2", version: "1", decision: "APPROVE", reason: "Conferência realizada", exceptionReason: "Responsável identificado", exceptionAcknowledged: "on" })) data.set(key, value);
  return data;
}
async function destination(action: typeof actions[number], data: FormData) {
  try { await action(data); } catch (error) {
    if (error instanceof Error && error.message.startsWith("/portal/review?")) return new URL(error.message, "https://oneit.example");
    throw error;
  }
  throw new Error("Expected redirect");
}
describe("contexto das ações de revisão", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ supabase: { rpc: mocks.rpc } });
    mocks.rpc.mockResolvedValue({ data: id, error: null });
    mocks.store.mockResolvedValue(undefined);
  });
  it.each(actions)("preserva OS após sucesso em %s", async (action) => {
    const url = await destination(action, form());
    expect(url.searchParams.get("order")).toBe(id);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
  it.each(actions)("preserva OS após erro do backend em %s", async (action) => {
    mocks.rpc.mockResolvedValue({ error: { message: "NOT_AUTHORIZED" } });
    const url = await destination(action, form());
    expect(url.searchParams.get("order")).toBe(id);
    expect(url.searchParams.get("message")).toBeTruthy();
    expect(mocks.store).not.toHaveBeenCalled();
  });
  it("rejeita destino externo e não envia contexto à RPC", async () => {
    const url = await destination(reviewFieldServiceOrder, form("https://evil.example"));
    expect(url.pathname).toBe("/portal/review");
    expect(url.searchParams.has("order")).toBe(false);
    expect(mocks.rpc).toHaveBeenCalledWith("review_field_service_order", { target_queue_id: id, target_decision: "APPROVE", target_reason: "Conferência realizada" });
  });
  it("mantém contexto no erro de preenchimento sem chamar banco", async () => {
    const data = form(); data.set("quantity", "0");
    expect((await destination(addFieldServiceOrderLpuLine, data)).searchParams.get("order")).toBe(id);
    expect(mocks.auth).not.toHaveBeenCalled();
  });
});
