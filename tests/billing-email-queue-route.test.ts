import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { POST } from "@/app/api/field-service/fiscal/queue-email/route";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const organizationId = "11111111-1111-4111-8111-111111111111";
const otherOrganizationId = "22222222-2222-4222-8222-222222222222";
const sheetId = "33333333-3333-4333-8333-333333333333";
const periodId = "44444444-4444-4444-8444-444444444444";
const versionId = "55555555-5555-4555-8555-555555555555";
const batchId = "66666666-6666-4666-8666-666666666666";

function request(body: Record<string, unknown>) {
  return new Request("http://localhost/api/field-service/fiscal/queue-email", {
    method: "POST",
    headers: { origin: "http://localhost", "content-type": "application/json" },
    body: JSON.stringify({ organizationId, recipients: ["financeiro@exemplo.com.br"], subject: "BM de outubro", ...body }),
  });
}

function query(result: { data: unknown; error: null }) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    limit: () => builder,
    in: async () => result,
    maybeSingle: async () => result,
  };
  return builder;
}

beforeEach(() => vi.clearAllMocks());

describe("fila de e-mail do BM", () => {
  it("recusa a tentativa do cliente de declarar envio pelo endpoint legado", async () => {
    const response = await POST(request({ emailType: "MEASUREMENT", measurementSheetId: sheetId, status: "SENT", provider: "manual" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ code: "INVALID_BILLING_EMAIL" });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("recusa BM vinculado a outra organização antes de consultar destinatários", async () => {
    const from = vi.fn((table: string) => {
      if (table === "measurement_sheets") return query({ data: { id: sheetId, organization_id: otherOrganizationId, billing_period_id: periodId }, error: null });
      throw new Error(`consulta inesperada: ${table}`);
    });
    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: "actor" } }, error: null }) }, from } as never);
    const response = await POST(request({ emailType: "MEASUREMENT", measurementSheetId: sheetId }));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ code: "MEASUREMENT_NOT_FOUND" });
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("recusa lote fiscal encerrado sem criar log de envio", async () => {
    const from = vi.fn((table: string) => {
      if (table === "fiscal_batches") return query({ data: { id: batchId, organization_id: organizationId, status: "CLOSED" }, error: null });
      throw new Error(`consulta inesperada: ${table}`);
    });
    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: "actor" } }, error: null }) }, from } as never);
    const response = await POST(request({ emailType: "FISCAL", fiscalBatchId: batchId }));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ code: "FISCAL_BATCH_NOT_READY_FOR_EMAIL" });
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("recusa lote fiscal sem BMs vinculados", async () => {
    const from = vi.fn((table: string) => {
      if (table === "fiscal_batches") return query({ data: { id: batchId, organization_id: organizationId, status: "READY", measurement_sheet_ids: [] }, error: null });
      throw new Error(`consulta inesperada: ${table}`);
    });
    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: "actor" } }, error: null }) }, from } as never);
    const response = await POST(request({ emailType: "FISCAL", fiscalBatchId: batchId }));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ code: "FISCAL_BATCH_SHEETS_INVALID" });
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("recusa lote fiscal com BM fora da organização", async () => {
    const from = vi.fn((table: string) => {
      if (table === "fiscal_batches") return query({ data: { id: batchId, organization_id: organizationId, status: "READY", measurement_sheet_ids: [sheetId] }, error: null });
      if (table === "measurement_sheets") return query({ data: [{ id: sheetId, organization_id: otherOrganizationId }], error: null });
      throw new Error(`consulta inesperada: ${table}`);
    });
    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: "actor" } }, error: null }) }, from } as never);
    const response = await POST(request({ emailType: "FISCAL", fiscalBatchId: batchId }));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ code: "FISCAL_BATCH_SHEETS_INVALID" });
    expect(from).toHaveBeenCalledTimes(2);
  });

  it("deriva a chave pela versão do BM e não aceita chave arbitrária do cliente", async () => {
    const from = vi.fn((table: string) => {
      if (table === "measurement_sheets") return query({ data: { id: sheetId, organization_id: organizationId, billing_period_id: periodId }, error: null });
      if (table === "billing_periods") return query({ data: { status: "READY_FOR_REVIEW" }, error: null });
      if (table === "measurement_sheet_versions") return query({ data: { id: versionId, version: 2, status: "DRAFT" }, error: null });
      throw new Error(`consulta inesperada: ${table}`);
    });
    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: "actor" } }, error: null }) }, from } as never);
    const response = await POST(request({ emailType: "MEASUREMENT", measurementSheetId: sheetId, idempotencyKey: "qualquer-chave" }));
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ code: "INVALID_IDEMPOTENCY_KEY" });
    expect(from).toHaveBeenCalledTimes(3);
  });

  it("registra o BM da versão atual como enfileirado, sem declarar envio", async () => {
    const inserted = vi.fn(() => ({
      select: () => ({ single: async () => ({ data: { id: "log-1", status: "QUEUED", provider: "PENDING" }, error: null }) }),
    }));
    const from = vi.fn((table: string) => {
      if (table === "measurement_sheets") return query({ data: { id: sheetId, organization_id: organizationId, billing_period_id: periodId }, error: null });
      if (table === "billing_periods") return query({ data: { status: "READY_FOR_REVIEW" }, error: null });
      if (table === "measurement_sheet_versions") return query({ data: { id: versionId, version: 2, status: "DRAFT" }, error: null });
      if (table === "billing_recipients") return query({ data: [{ email: "financeiro@exemplo.com.br" }], error: null });
      if (table === "billing_email_log") return { insert: inserted };
      throw new Error(`consulta inesperada: ${table}`);
    });
    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: "actor" } }, error: null }) }, from } as never);
    const response = await POST(request({ emailType: "MEASUREMENT", measurementSheetId: sheetId }));
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ queued: true, emailLog: { id: "log-1", status: "QUEUED", provider: "PENDING" } });
    expect(inserted).toHaveBeenCalledWith(expect.objectContaining({
      idempotency_key: `MEASUREMENT:sheet:${sheetId}:version:${versionId}`,
      context: expect.objectContaining({ measurementSheetVersionId: versionId }),
      status: "QUEUED",
      provider: "PENDING",
    }));
  });

  it("normaliza destinatários antes de validar e enfileirar", async () => {
    const inserted = vi.fn(() => ({
      select: () => ({ single: async () => ({ data: { id: "log-2", status: "QUEUED", provider: "PENDING" }, error: null }) }),
    }));
    const from = vi.fn((table: string) => {
      if (table === "measurement_sheets") return query({ data: { id: sheetId, organization_id: organizationId, billing_period_id: periodId }, error: null });
      if (table === "billing_periods") return query({ data: { status: "READY_FOR_REVIEW" }, error: null });
      if (table === "measurement_sheet_versions") return query({ data: { id: versionId, version: 2, status: "DRAFT" }, error: null });
      if (table === "billing_recipients") return query({ data: [{ email: "financeiro@exemplo.com.br" }], error: null });
      if (table === "billing_email_log") return { insert: inserted };
      throw new Error(`consulta inesperada: ${table}`);
    });
    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: "actor" } }, error: null }) }, from } as never);
    const response = await POST(new Request("http://localhost/api/field-service/fiscal/queue-email", {
      method: "POST",
      headers: { origin: "http://localhost", "content-type": "application/json" },
      body: JSON.stringify({ organizationId, recipients: ["Financeiro@Exemplo.com.br", "financeiro@exemplo.com.br"], subject: "BM de outubro", emailType: "MEASUREMENT", measurementSheetId: sheetId }),
    }));
    expect(response.status).toBe(202);
    expect(inserted).toHaveBeenCalledWith(expect.objectContaining({ recipients: ["financeiro@exemplo.com.br"] }));
  });
});
