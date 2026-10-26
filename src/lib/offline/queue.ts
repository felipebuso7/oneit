import { offlineFieldEventSchema, type OfflineFieldEvent } from "../validation/offline-field-event";

export type QueuedEvent = {
  id: string; ownerId: string; ticketId: string; payload: OfflineFieldEvent;
  status: "pending" | "conflict" | "auth" | "invalid";
  attempts: number; retryAt: number; message?: string;
};
const DB_NAME = "servicia-field-events-v1";
const STORE = "events";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in globalThis)) { reject(new Error("Armazenamento local indisponível.")); return; }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: "id" });
      store.createIndex("owner", "ownerId");
      store.createIndex("ownerTicket", ["ownerId", "ticketId"], { unique: true });
    };
    request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Feche outras abas para atualizar o armazenamento local."));
  });
}

async function transact<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = operation(tx.objectStore(STORE));
    tx.oncomplete = () => { db.close(); resolve(request.result); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error("Não foi possível salvar a fila local.")); };
    tx.onerror = () => { /* abort handler owns rejection */ };
  });
}

export async function enqueueEvent(payload: OfflineFieldEvent) {
  const validated = offlineFieldEventSchema.parse(payload);
  const event: QueuedEvent = { id: validated.id, ownerId: validated.ownerId, ticketId: validated.ticketId, payload: validated, status: "pending", attempts: 0, retryAt: 0 };
  await transact("readwrite", (store) => store.add(event));
  window.dispatchEvent(new Event("servicia-queue-change"));
}
export async function listEvents(ownerId: string): Promise<QueuedEvent[]> {
  return transact("readonly", (store) => store.index("owner").getAll(ownerId));
}
export async function updateEvent(event: QueuedEvent) {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const request = store.get(event.id);
    request.onsuccess = () => {
      const current: QueuedEvent | undefined = request.result;
      // A stale tab must not resurrect an acknowledged/discarded item.
      if (current && current.ownerId === event.ownerId && current.attempts <= event.attempts) store.put(event);
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onabort = () => { db.close(); reject(tx.error); };
  });
}
export async function removeEvent(id: string) {
  await transact("readwrite", (store) => store.delete(id));
}
