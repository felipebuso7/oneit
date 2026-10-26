import { z } from "zod";
import { checklistSchema, sealLocalValue, unlockLocalValue, type EncryptedLocalValue } from "./agenda";
import { faultDomains } from "../validation/execution";

export const executionDraftSchema = z.object({
  ownerId: z.uuid(), ticketId: z.uuid(), version: z.number().int().positive(),
  updatedAt: z.iso.datetime({ offset: true }), faultDomain: z.enum(faultDomains),
  ticketNumber: z.string().max(100).optional(), title: z.string().max(500).optional(),
  diagnosis: z.string().max(10000), solution: z.string().max(10000),
  items: checklistSchema, answers: z.record(z.string().min(1).max(80), z.boolean()),
}).refine((value) => {
  const keys = Object.keys(value.answers);
  return keys.length === value.items.length && value.items.every((item) => keys.includes(item.item_code));
}, "Respostas devem corresponder exatamente ao checklist do rascunho.");
export type ExecutionDraft = z.infer<typeof executionDraftSchema>;
type DraftVault = EncryptedLocalValue & { ownerId: string; ticketId: string; revision: string; confirmedRecordId?: string };

function context(ownerId: string, ticketId: string, revision: string) { return `servicia-execution-draft-v1:${ownerId}:${ticketId}:${revision}`; }
async function transaction<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("servicia-execution-drafts-v1", 2);
    request.onupgradeneeded = () => {
      const store = request.result.objectStoreNames.contains("drafts") ? request.transaction!.objectStore("drafts") : request.result.createObjectStore("drafts", { keyPath: ["ownerId", "ticketId"] });
      if (!store.indexNames.contains("owner")) store.createIndex("owner", "ownerId");
    };
    request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Feche outras abas para atualizar os rascunhos."));
  });
  return new Promise((resolve, reject) => {
    const tx = db.transaction("drafts", mode);
    const request = operation(tx.objectStore("drafts"));
    tx.oncomplete = () => { db.close(); resolve(request.result); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error("Rascunho alterado em outra aba ou removido. Reabra antes de salvar.")); };
  });
}
export async function saveExecutionDraft(draft: ExecutionDraft, password: string, expectedRevision?: string) {
  const parsed = executionDraftSchema.parse(draft);
  const revision = crypto.randomUUID();
  const vault: DraftVault = { ...await sealLocalValue(parsed, password, context(parsed.ownerId, parsed.ticketId, revision)), ownerId: parsed.ownerId, ticketId: parsed.ticketId, revision };
  // Default add refuses to overwrite an existing draft, even across tabs.
  if (!expectedRevision) await transaction("readwrite", (store) => store.add(vault));
  else await transaction("readwrite", (store) => {
    const request = store.get([parsed.ownerId, parsed.ticketId]);
    request.onsuccess = () => {
      const current: DraftVault | undefined = request.result;
      if (current?.revision !== expectedRevision) store.transaction.abort();
      else store.put(vault);
    };
    return request;
  });
  return revision;
}
export async function loadExecutionDraft(ownerId: string, ticketId: string, password: string): Promise<(ExecutionDraft & { revision: string; confirmedRecordId?: string }) | undefined> {
  const vault: DraftVault | undefined = await transaction("readonly", (store) => store.get([ownerId, ticketId]));
  if (!vault) return undefined;
  const draft = executionDraftSchema.parse(await unlockLocalValue(vault, password, context(ownerId, ticketId, vault.revision)));
  if (draft.ownerId !== ownerId || draft.ticketId !== ticketId) throw new Error("Rascunho não corresponde à conta/OS.");
  return { ...draft, revision: vault.revision, ...(vault.confirmedRecordId ? { confirmedRecordId: vault.confirmedRecordId } : {}) };
}
export async function listExecutionDrafts(ownerId: string, password: string) {
  const vaults: DraftVault[] = await transaction("readonly", (store) => store.index("owner").getAll(ownerId));
  const recovered: (ExecutionDraft & { revision: string; confirmedRecordId?: string })[] = [];
  let unreadable = 0;
  // Bound local decryption work; no record is modified or discarded when this limit is reached.
  for (const vault of vaults.slice(0, 100)) {
    try {
      const draft = executionDraftSchema.parse(await unlockLocalValue(vault, password, context(ownerId, vault.ticketId, vault.revision)));
      if (draft.ownerId !== ownerId || draft.ticketId !== vault.ticketId) throw new Error("Conta/OS divergente.");
      recovered.push({ ...draft, revision: vault.revision, ...(vault.confirmedRecordId ? { confirmedRecordId: vault.confirmedRecordId } : {}) });
    } catch { unreadable++; }
  }
  return { drafts: recovered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), unreadable, skipped: Math.max(0, vaults.length - 100) };
}
export async function markDraftConfirmed(ownerId: string, ticketId: string, revision: string, recordId: string) {
  z.uuid().parse(recordId);
  let marked = false;
  await transaction("readwrite", (store) => {
    const request = store.get([ownerId, ticketId]);
    request.onsuccess = () => {
      const current: DraftVault | undefined = request.result;
      if (current?.revision === revision) { store.put({ ...current, confirmedRecordId: recordId }); marked = true; }
    };
    return request;
  });
  return marked;
}
export async function removeExecutionDraft(ownerId: string, ticketId: string) {
  await transaction("readwrite", (store) => store.delete([ownerId, ticketId]));
}
export function draftMatches(draft: ExecutionDraft, ownerId: string, ticketId: string, version: number, items: ExecutionDraft["items"]) {
  const canonical = (value: ExecutionDraft["items"]) => JSON.stringify(value.map(({ item_code, label, required }) => ({ item_code, label, required })).sort((a, b) => a.item_code < b.item_code ? -1 : a.item_code > b.item_code ? 1 : 0));
  return draft.ownerId === ownerId && draft.ticketId === ticketId && draft.version === version && canonical(draft.items) === canonical(items);
}
