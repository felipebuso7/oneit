import { fieldEventReceiptSchema } from "../validation/offline-field-event";
import type { QueuedEvent } from "./queue";

export interface QueueRepository {
  listEvents(ownerId: string): Promise<QueuedEvent[]>;
  updateEvent(event: QueuedEvent): Promise<void>;
  removeEvent(id: string): Promise<void>;
}

export function retryDelay(attempts: number) { return Math.min(300_000, 5_000 * 2 ** Math.min(attempts, 6)); }

export async function syncEvents(ownerId: string, repository: QueueRepository, send: (payload: QueuedEvent["payload"]) => Promise<Response>, now = Date.now(), retryAuth = false) {
  let confirmed = 0;
  for (const event of await repository.listEvents(ownerId)) {
    if (event.ownerId !== ownerId || event.payload.ownerId !== ownerId) continue;
    if (!(event.status === "pending" || (retryAuth && event.status === "auth")) || event.retryAt > now) continue;
    const next: QueuedEvent = { ...event, status: "pending", attempts: event.attempts + 1 };
    try {
      const response = await send(event.payload);
      if (response.ok) {
        const receipt = fieldEventReceiptSchema.safeParse(await response.json());
        if (!receipt.success || receipt.data.id !== event.id) throw new Error("Confirmação inválida.");
        await repository.removeEvent(event.id);
        confirmed++;
        continue;
      }
      if (response.status === 401) { next.status = "auth"; next.message = "Entre novamente na mesma conta e tente sincronizar."; }
      else if ([403, 409].includes(response.status)) { next.status = "conflict"; next.message = "Permissão, atribuição ou estado alterado. Recarregue a OS e confira com a gestão; não será reenviado automaticamente."; }
      else if ([400, 413, 415, 422].includes(response.status)) { next.status = "invalid"; next.message = "Evento rejeitado. Confira horário do dispositivo e dados com a gestão."; }
      else { next.retryAt = now + retryDelay(next.attempts - 1); next.message = "Servidor indisponível. Nova tentativa com a mesma chave."; }
    } catch {
      next.retryAt = now + retryDelay(next.attempts - 1);
      next.message = "Sem confirmação do servidor. Evento preservado para reenvio com a mesma chave.";
    }
    await repository.updateEvent(next);
    if (next.status === "auth") break;
  }
  return confirmed;
}
