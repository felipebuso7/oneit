import { createHash } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ storage: vi.fn(), render: vi.fn() }));
vi.mock("@/domain/reports/pdf", () => ({ fieldServiceRtoSnapshotSchema: { safeParse: () => ({ success: true, data: { evidence: [] } }) }, renderFieldServiceRtoPdf: mocks.render }));
vi.mock("@/lib/reports/normalize-evidence-image", () => ({ normalizeEvidenceImage: vi.fn() }));
vi.mock("@/lib/supabase/storage-admin", () => ({ createStorageAdmin: mocks.storage }));
import { storeFieldServiceRtoPdf } from "@/lib/reports/store-field-service-rto";

const bytes = new Uint8Array([37, 80, 68, 70]);
const report: { id: string; organization_id: string; service_order_id: string; ticket_id: string; snapshot: object; report_version: number; generated_by: string; storage_path: string | null; sha256: string | null } = { id: "report", organization_id: "org", service_order_id: "os", ticket_id: "ticket", snapshot: {}, report_version: 1, generated_by: "reviewer", storage_path: null, sha256: null };
function database(record = report) {
  const query = { select: vi.fn(), eq: vi.fn(), single: vi.fn(), maybeSingle: vi.fn() };
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query);
  query.single.mockResolvedValue({ data: record, error: null });
  query.maybeSingle.mockResolvedValue({ data: { full_name: "Gestor" }, error: null });
  const rpc = vi.fn().mockResolvedValue({ error: null });
  return { from: vi.fn(() => query), rpc };
}
describe("persistência imutável do PDF RTO", () => {
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  beforeEach(() => {
    vi.clearAllMocks(); process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
    mocks.render.mockResolvedValue(bytes);
  });
  afterAll(() => { if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey; });
  it("reutiliza um PDF já registrado sem gerar ou sobrescrever", async () => {
    const upload = vi.fn();
    mocks.storage.mockReturnValue({ upload, createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://example.test/rto" } }) });
    const db = database({ ...report, storage_path: "org/field-service/os/rto-v1.pdf", sha256: "hash" });
    await expect(storeFieldServiceRtoPdf(db as never, "report")).resolves.toEqual({ reportId: "report", downloadUrl: "https://example.test/rto" });
    expect(upload).not.toHaveBeenCalled(); expect(mocks.render).not.toHaveBeenCalled(); expect(db.rpc).not.toHaveBeenCalled();
  });
  it("reaproveita upload anterior apenas se o hash for idêntico", async () => {
    const upload = vi.fn().mockResolvedValue({ error: { message: "exists" } });
    const download = vi.fn().mockResolvedValue({ data: new Blob([bytes]) });
    mocks.storage.mockReturnValue({ upload, download, createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://example.test/rto" } }) });
    const db = database();
    await storeFieldServiceRtoPdf(db as never, "report");
    expect(upload).toHaveBeenCalledWith("org/field-service/os/rto-v1.pdf", bytes, { contentType: "application/pdf", upsert: false });
    expect(db.rpc).toHaveBeenCalledWith("register_field_service_rto_file", expect.objectContaining({ target_sha256: createHash("sha256").update(bytes).digest("hex") }));
  });
  it("não registra arquivo anterior com conteúdo diferente", async () => {
    mocks.storage.mockReturnValue({ upload: vi.fn().mockResolvedValue({ error: { message: "exists" } }), download: vi.fn().mockResolvedValue({ data: new Blob(["different"]) }) });
    const db = database();
    await expect(storeFieldServiceRtoPdf(db as never, "report")).rejects.toThrow("RTO_UPLOAD_FAILED");
    expect(db.rpc).not.toHaveBeenCalled();
  });
});
