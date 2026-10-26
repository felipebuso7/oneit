import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { draftMatches, executionDraftSchema, listExecutionDrafts, loadExecutionDraft, markDraftConfirmed, removeExecutionDraft, saveExecutionDraft, type ExecutionDraft } from "./execution-draft";
import { clearAgenda, saveAgenda } from "./agenda";

const ownerId = "019cda50-f764-7a5e-9101-513020ce22e8";
const ticketId = "019cda50-f764-7a5e-9101-513020ce22e9";
const password = "senha local longa de teste";
const draft: ExecutionDraft = { ownerId, ticketId, version: 4, updatedAt: "2026-10-01T12:00:00Z", faultDomain: "CABLING", diagnosis: "Diagnóstico parcial", solution: "", items: [{ item_code: "TEST", label: "Teste de conexão", required: true }], answers: { TEST: false } };
beforeEach(() => vi.stubGlobal("indexedDB", new IDBFactory()));
afterEach(() => vi.unstubAllGlobals());

describe("encrypted execution drafts", () => {
  it("allows incomplete work but requires exact valid checklist answers", () => {
    expect(executionDraftSchema.safeParse(draft).success).toBe(true);
    expect(executionDraftSchema.safeParse({ ...draft, answers: {} }).success).toBe(false);
    expect(executionDraftSchema.safeParse({ ...draft, answers: { TEST: false, EXTRA: true } }).success).toBe(false);
    expect(executionDraftSchema.safeParse({ ...draft, items: [draft.items[0], draft.items[0]] }).success).toBe(false);
    expect(executionDraftSchema.safeParse({ ...draft, diagnosis: "x".repeat(10001) }).success).toBe(false);
  });
  it("persists and decrypts the partial draft with a revision token", async () => {
    const revision = await saveExecutionDraft(draft, password);
    expect(await loadExecutionDraft(ownerId, ticketId, password)).toEqual({ ...draft, revision });
  });
  it("refuses wrong passwords and excludes other account/ticket keys", async () => {
    await saveExecutionDraft(draft, password);
    await expect(loadExecutionDraft(ownerId, ticketId, "outra senha longa válida")).rejects.toBeTruthy();
    expect(await loadExecutionDraft(crypto.randomUUID(), ticketId, password)).toBeUndefined();
    expect(await loadExecutionDraft(ownerId, crypto.randomUUID(), password)).toBeUndefined();
  });
  it("never silently overwrites an existing draft", async () => {
    await saveExecutionDraft(draft, password);
    await expect(saveExecutionDraft({ ...draft, diagnosis: "Outra tentativa" }, password)).rejects.toBeTruthy();
    expect((await loadExecutionDraft(ownerId, ticketId, password))?.diagnosis).toBe(draft.diagnosis);
  });
  it("rejects a stale revision from a second tab", async () => {
    const original = await saveExecutionDraft(draft, password);
    const revised = await saveExecutionDraft({ ...draft, diagnosis: "Atualizado na primeira aba" }, password, original);
    expect(revised).not.toBe(original);
    await expect(saveExecutionDraft({ ...draft, diagnosis: "Aba atrasada" }, password, original)).rejects.toThrow(/outra aba/);
    expect((await loadExecutionDraft(ownerId, ticketId, password))?.diagnosis).toBe("Atualizado na primeira aba");
  });
  it("does not resurrect a removed draft through stale overwrite", async () => {
    const original = await saveExecutionDraft(draft, password);
    await removeExecutionDraft(ownerId, ticketId);
    await expect(saveExecutionDraft(draft, password, original)).rejects.toThrow();
    expect(await loadExecutionDraft(ownerId, ticketId, password)).toBeUndefined();
  });
  it("preserves drafts when the agenda is replaced or removed", async () => {
    await saveExecutionDraft(draft, password);
    await saveAgenda({ ownerId, fetchedAt: draft.updatedAt, tickets: [] }, "nova senha local longa");
    await clearAgenda();
    expect((await loadExecutionDraft(ownerId, ticketId, password))?.diagnosis).toBe(draft.diagnosis);
    await expect(loadExecutionDraft(ownerId, ticketId, "nova senha local longa")).rejects.toBeTruthy();
  });
  it("blocks restoring stale version, account or changed checklist semantics", () => {
    expect(draftMatches(draft, ownerId, ticketId, 4, draft.items)).toBe(true);
    expect(draftMatches(draft, ownerId, ticketId, 5, draft.items)).toBe(false);
    expect(draftMatches(draft, crypto.randomUUID(), ticketId, 4, draft.items)).toBe(false);
    expect(draftMatches(draft, ownerId, ticketId, 4, [{ ...draft.items[0], required: false }])).toBe(false);
    expect(draftMatches(draft, ownerId, ticketId, 4, [{ ...draft.items[0], label: "Novo procedimento" }])).toBe(false);
  });
  it("marks acknowledgement while preserving the encrypted draft", async () => {
    const revision = await saveExecutionDraft(draft, password);
    const recordId = crypto.randomUUID();
    expect(await markDraftConfirmed(ownerId, ticketId, revision, recordId)).toBe(true);
    expect(await loadExecutionDraft(ownerId, ticketId, password)).toMatchObject({ ...draft, revision, confirmedRecordId: recordId });
  });
  it("never marks a newly edited revision as confirmed by an older send", async () => {
    const revision = await saveExecutionDraft(draft, password);
    await saveExecutionDraft({ ...draft, diagnosis: "Revisão posterior" }, password, revision);
    expect(await markDraftConfirmed(ownerId, ticketId, revision, crypto.randomUUID())).toBe(false);
    expect(await loadExecutionDraft(ownerId, ticketId, password)).not.toHaveProperty("confirmedRecordId");
  });
  it("does not resurrect a removed draft when acknowledgement arrives", async () => {
    const revision = await saveExecutionDraft(draft, password);
    await removeExecutionDraft(ownerId, ticketId);
    expect(await markDraftConfirmed(ownerId, ticketId, revision, crypto.randomUUID())).toBe(false);
    expect(await loadExecutionDraft(ownerId, ticketId, password)).toBeUndefined();
  });
  it("recovers all drafts only for the account and preserves unreadable copies", async () => {
    await saveExecutionDraft({ ...draft, ticketNumber: "OS-42", title: "Ponto remoto" }, password);
    const otherTicket = crypto.randomUUID();
    await saveExecutionDraft({ ...draft, ticketId: otherTicket, updatedAt: "2026-10-02T12:00:00Z" }, password);
    await saveExecutionDraft({ ...draft, ownerId: crypto.randomUUID(), ticketId: crypto.randomUUID() }, password);
    const listed = await listExecutionDrafts(ownerId, password);
    expect(listed).toMatchObject({ unreadable: 0, skipped: 0 });
    expect(listed.drafts.map((item) => item.ticketId)).toEqual([otherTicket, ticketId]);
    expect(listed.drafts[1]).toMatchObject({ ticketNumber: "OS-42", title: "Ponto remoto" });
    expect((await listExecutionDrafts(ownerId, "senha local diferente")).unreadable).toBe(2);
  });
});
