import { materialReceiptSchema } from "../validation/offline-material";
import type { QueuedMaterial } from "./material-queue";
import { retryDelay } from "./sync";
export type MaterialRepository = { listMaterials(ownerId: string): Promise<QueuedMaterial[]>; updateMaterial(value: QueuedMaterial): Promise<void>; removeMaterial(id: string): Promise<void> };
export async function syncMaterials(ownerId: string, repository: MaterialRepository, send: (payload: QueuedMaterial["payload"]) => Promise<Response>, now = Date.now(), retryAuth = false) {
  let confirmed = 0;
  for (const material of await repository.listMaterials(ownerId)) {
    if (material.ownerId !== ownerId || material.payload.ownerId !== ownerId || !(material.status === "pending" || (retryAuth && material.status === "auth")) || material.retryAt > now) continue;
    const next: QueuedMaterial = { ...material, status: "pending", attempts: material.attempts + 1 };
    try {
      const response = await send(material.payload);
      if (response.ok) { const receipt = materialReceiptSchema.safeParse(await response.json()); if (!receipt.success || receipt.data.id !== material.id) throw new Error("Recibo inválido."); await repository.removeMaterial(material.id); confirmed++; continue; }
      if (response.status === 401) { next.status = "auth"; next.message = "Entre novamente na mesma conta para sincronizar."; }
      else if ([403, 409].includes(response.status)) { next.status = "conflict"; next.message = "Atribuição, versão ou etapa mudou. Não será reenviado automaticamente."; }
      else if ([400, 413, 415, 422].includes(response.status)) { next.status = "invalid"; next.message = "Material rejeitado. Confira a OS e o catálogo."; }
      else { next.retryAt = now + retryDelay(next.attempts - 1); next.message = "Servidor indisponível. A mesma ação será tentada depois."; }
    } catch { next.retryAt = now + retryDelay(next.attempts - 1); next.message = "Sem confirmação. Material preservado com a mesma chave."; }
    await repository.updateMaterial(next); if (next.status === "auth") break;
  }
  return confirmed;
}
