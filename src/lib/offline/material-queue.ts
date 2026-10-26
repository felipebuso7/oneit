import { offlineMaterialSchema, type OfflineMaterial } from "../validation/offline-material";

export type QueuedMaterial = { id: string; ownerId: string; ticketId: string; materialId: string; payload: OfflineMaterial; status: "pending" | "conflict" | "auth" | "invalid"; attempts: number; retryAt: number; message?: string };
const DB = "servicia-materials-v1"; const STORE = "materials";
function open() { return new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(DB, 1);
  request.onupgradeneeded = () => { const store = request.result.createObjectStore(STORE, { keyPath: "id" }); store.createIndex("owner", "ownerId"); store.createIndex("ownerTicketMaterial", ["ownerId", "ticketId", "materialId"], { unique: true }); };
  request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
  request.onerror = () => reject(request.error); request.onblocked = () => reject(new Error("Feche outras abas para atualizar a fila de materiais."));
}); }
async function transaction<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>) { const db = await open(); return new Promise<T>((resolve, reject) => { const tx = db.transaction(STORE, mode); const request = operation(tx.objectStore(STORE)); tx.oncomplete = () => { db.close(); resolve(request.result); }; tx.onabort = () => { db.close(); reject(tx.error ?? new Error("Fila de materiais indisponível.")); }; }); }
export async function enqueueMaterial(payload: OfflineMaterial) { const value = offlineMaterialSchema.parse(payload); await transaction("readwrite", (store) => store.add({ id: value.id, ownerId: value.ownerId, ticketId: value.ticketId, materialId: value.materialId, payload: value, status: "pending", attempts: 0, retryAt: 0 } satisfies QueuedMaterial)); window.dispatchEvent(new Event("servicia-material-queue-change")); }
export function listMaterials(ownerId: string) { return transaction<QueuedMaterial[]>("readonly", (store) => store.index("owner").getAll(ownerId)); }
export function removeMaterial(id: string) { return transaction("readwrite", (store) => store.delete(id)); }
export async function updateMaterial(value: QueuedMaterial) { const db = await open(); await new Promise<void>((resolve, reject) => { const tx = db.transaction(STORE, "readwrite"); const store = tx.objectStore(STORE); const request = store.get(value.id); request.onsuccess = () => { const current: QueuedMaterial | undefined = request.result; if (current && current.ownerId === value.ownerId && current.attempts <= value.attempts) store.put(value); }; tx.oncomplete = () => { db.close(); resolve(); }; tx.onabort = () => { db.close(); reject(tx.error); }; }); }
