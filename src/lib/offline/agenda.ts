import { z } from "zod";

export const AGENDA_TTL_MS = 8 * 60 * 60 * 1000;
export const checklistSchema = z.array(z.object({ item_code: z.string().min(1).max(80), label: z.string().max(500), required: z.boolean() })).max(100)
  .refine((items) => new Set(items.map((item) => item.item_code)).size === items.length, "Códigos de checklist duplicados.");
export const agendaSchema = z.object({
  ownerId: z.uuid(),
  fetchedAt: z.iso.datetime({ offset: true }),
  tickets: z.array(z.object({
    id: z.uuid(), ticket_number: z.string().max(100), title: z.string().max(500),
    operational_status: z.enum(["ASSIGNED", "TRAVEL_STARTED", "ON_SITE", "WORK_STARTED", "IN_PROGRESS"]),
    scheduled_at: z.iso.datetime({ offset: true }).nullable(), version: z.number().int().positive(),
    checklist: checklistSchema.default([]),
  })).max(50),
});
export type LocalAgenda = z.infer<typeof agendaSchema>;
export type EncryptedLocalValue = { format: 1; salt: number[]; iv: number[]; ciphertext: ArrayBuffer };
export type AgendaVault = EncryptedLocalValue & { id: "current"; ownerId: string };

async function keyFor(password: string, salt: Uint8Array<ArrayBuffer>) {
  if (password.length < 12 || password.length > 200) throw new Error("Use uma senha local de 12 a 200 caracteres.");
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 600_000, hash: "SHA-256" }, material,
    { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function sealLocalValue(value: unknown, password: string, context: string): Promise<EncryptedLocalValue> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  if (bytes.byteLength > 1_000_000) throw new Error("Cópia local excede o limite de tamanho.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFor(password, salt);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode(context) }, key, bytes);
  return { format: 1, salt: Array.from(salt), iv: Array.from(iv), ciphertext };
}
export async function unlockLocalValue(vault: EncryptedLocalValue, password: string, context: string): Promise<unknown> {
  if (vault.format !== 1 || vault.salt.length !== 16 || vault.iv.length !== 12 || vault.ciphertext.byteLength > 1_000_016) throw new Error("Cópia local inválida.");
  const key = await keyFor(password, new Uint8Array(vault.salt));
  const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(vault.iv), additionalData: new TextEncoder().encode(context) }, key, vault.ciphertext);
  return JSON.parse(new TextDecoder().decode(clear));
}
export async function sealAgenda(agenda: LocalAgenda, password: string): Promise<AgendaVault> {
  const validated = agendaSchema.parse(agenda);
  return { ...await sealLocalValue(validated, password, `servicia-agenda-v1:${validated.ownerId}`), id: "current", ownerId: validated.ownerId };
}
export async function unlockAgenda(vault: AgendaVault, password: string, now = Date.now()): Promise<LocalAgenda> {
  const agenda = agendaSchema.parse(await unlockLocalValue(vault, password, `servicia-agenda-v1:${vault.ownerId}`));
  if (agenda.ownerId !== vault.ownerId) throw new Error("Conta da agenda inválida.");
  const age = now - Date.parse(agenda.fetchedAt);
  if (age < -5 * 60_000 || age > AGENDA_TTL_MS) throw new Error("Agenda expirada ou relógio divergente. Atualize online na tela Campo.");
  return agenda;
}

async function vaultTransaction<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("servicia-agenda-v1", 1);
    request.onupgradeneeded = () => { request.result.createObjectStore("vault", { keyPath: "id" }); };
    request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Feche outras abas para atualizar a agenda local."));
  });
  return new Promise((resolve, reject) => {
    const tx = db.transaction("vault", mode);
    const request = operation(tx.objectStore("vault"));
    tx.oncomplete = () => { db.close(); resolve(request.result); };
    tx.onabort = () => { db.close(); reject(tx.error); };
  });
}

export async function saveAgenda(agenda: LocalAgenda, password: string) {
  const vault = await sealAgenda(agenda, password);
  await vaultTransaction("readwrite", (store) => store.put(vault));
}
export async function loadVault(): Promise<AgendaVault | undefined> {
  return vaultTransaction("readonly", (store) => store.get("current"));
}
export async function clearAgenda() {
  await vaultTransaction("readwrite", (store) => store.delete("current"));
}
export async function invalidateAgenda(ownerId: string) {
  await vaultTransaction("readwrite", (store) => {
    const request = store.get("current");
    request.onsuccess = () => {
      const current: AgendaVault | undefined = request.result;
      if (current?.ownerId === ownerId) store.delete("current");
    };
    return request;
  });
}
