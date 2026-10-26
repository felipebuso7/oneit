import { beforeEach, describe, expect, it, vi } from "vitest";
import { syncSavedExecution } from "./execution-sync";
import { loadExecutionDraft, markDraftConfirmed } from "./execution-draft";

vi.mock("./execution-draft", () => ({ loadExecutionDraft: vi.fn(), markDraftConfirmed: vi.fn() }));
const ownerId = "019cda50-f764-7a5e-9101-513020ce22e8";
const ticketId = "019cda50-f764-7a5e-9101-513020ce22e9";
const revision = "019cda50-f764-7a5e-9101-513020ce22ea";
const recordId = "019cda50-f764-7a5e-9101-513020ce22eb";
const draft = { ownerId, ticketId, revision, version: 4, updatedAt: "2026-10-01T12:00:00Z", faultDomain: "CABLING" as const, diagnosis: "Diagnóstico completo da OS", solution: "Conector substituído e ponto testado", items: [{ item_code: "TEST", label: "Testar ponto", required: true }], answers: { TEST: true } };
beforeEach(() => { vi.resetAllMocks(); vi.mocked(loadExecutionDraft).mockResolvedValue(draft); vi.mocked(markDraftConfirmed).mockResolvedValue(true); });

describe("manual execution synchronization", () => {
  it("sends the saved revision and marks only a matching acknowledgement", async () => {
    const send = vi.fn().mockResolvedValue(Response.json({ actionId: revision, recordId }));
    expect(await syncSavedExecution(ownerId, ticketId, "senha de teste", send)).toEqual({ recordId, marked: true });
    expect(send.mock.calls[0][0]).toMatchObject({ actionId: revision, ownerId, ticketId, version: 4 });
    expect(send.mock.calls[0][0]).not.toHaveProperty("updatedAt");
    expect(markDraftConfirmed).toHaveBeenCalledWith(ownerId, ticketId, revision, recordId);
  });
  it("retries the same immutable saved key after a lost response", async () => {
    const send = vi.fn().mockRejectedValueOnce(new TypeError("lost response")).mockResolvedValueOnce(Response.json({ actionId: revision, recordId }));
    await expect(syncSavedExecution(ownerId, ticketId, "senha", send)).rejects.toThrow(/Sem confirmação/);
    expect(markDraftConfirmed).not.toHaveBeenCalled();
    await syncSavedExecution(ownerId, ticketId, "senha", send);
    expect(send.mock.calls[0][0]).toEqual(send.mock.calls[1][0]);
  });
  it.each([401, 403, 409, 422, 503])("preserves the draft on HTTP %i without marking success", async (status) => {
    const send = vi.fn().mockResolvedValue(new Response(null, { status }));
    await expect(syncSavedExecution(ownerId, ticketId, "senha", send)).rejects.toThrow(/preservado/);
    expect(send).toHaveBeenCalledOnce();
    expect(markDraftConfirmed).not.toHaveBeenCalled();
  });
  it("rejects a receipt for a different revision", async () => {
    await expect(syncSavedExecution(ownerId, ticketId, "senha", async () => Response.json({ actionId: crypto.randomUUID(), recordId }))).rejects.toThrow(/não corresponde/);
    expect(markDraftConfirmed).not.toHaveBeenCalled();
  });
  it("refuses partial drafts before network transmission", async () => {
    vi.mocked(loadExecutionDraft).mockResolvedValue({ ...draft, solution: "" });
    const send = vi.fn();
    await expect(syncSavedExecution(ownerId, ticketId, "senha", send)).rejects.toThrow(/incompleto/);
    expect(send).not.toHaveBeenCalled();
  });
  it("refuses absent drafts", async () => {
    vi.mocked(loadExecutionDraft).mockResolvedValue(undefined);
    const send = vi.fn();
    await expect(syncSavedExecution(ownerId, ticketId, "senha", send)).rejects.toThrow(/Nenhum/);
    expect(send).not.toHaveBeenCalled();
  });
  it("does not mask server confirmation if local marking fails", async () => {
    vi.mocked(markDraftConfirmed).mockRejectedValue(new Error("quota"));
    expect(await syncSavedExecution(ownerId, ticketId, "senha", async () => Response.json({ actionId: revision, recordId }))).toEqual({ recordId, marked: false });
  });
  it("allows receipt verification even when already marked locally", async () => {
    vi.mocked(loadExecutionDraft).mockResolvedValue({ ...draft, confirmedRecordId: recordId });
    const send = vi.fn().mockResolvedValue(Response.json({ actionId: revision, recordId }));
    await syncSavedExecution(ownerId, ticketId, "senha", send);
    expect(send).toHaveBeenCalledOnce();
  });
});
