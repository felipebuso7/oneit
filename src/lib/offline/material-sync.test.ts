import { describe, expect, it, vi } from "vitest";
import { syncMaterials } from "./material-sync";
import type { QueuedMaterial } from "./material-queue";
const ownerId = "019cda50-f764-7a5e-9101-513020ce22e8"; const id = "019cda50-f764-7a5e-9101-513020ce22e9";
const payload = { id, ownerId, ticketId: "019cda50-f764-7a5e-9101-513020ce22ea", materialId: "019cda50-f764-7a5e-9101-513020ce22eb", version: 3, quantity: 2.125, capturedAt: "2026-10-05T12:00:00Z" };
function fixture(status: QueuedMaterial["status"] = "pending") { const item: QueuedMaterial = { id, ownerId, ticketId: payload.ticketId, materialId: payload.materialId, payload, status, attempts: 0, retryAt: 0 }; return { item, repository: { listMaterials: vi.fn().mockResolvedValue([item]), updateMaterial: vi.fn().mockResolvedValue(undefined), removeMaterial: vi.fn().mockResolvedValue(undefined) } }; }
describe("material queue synchronization", () => {
  it("removes only a matching receipt", async () => { const { repository } = fixture(); expect(await syncMaterials(ownerId, repository, async () => Response.json({ id, materialRecordId: crypto.randomUUID() }))).toBe(1); expect(repository.removeMaterial).toHaveBeenCalledWith(id); });
  it("preserves the same key after response loss", async () => { const { repository } = fixture(); await syncMaterials(ownerId, repository, async () => { throw new Error("network"); }, 1000); expect(repository.updateMaterial.mock.calls[0][0]).toMatchObject({ payload, retryAt: 6000 }); });
  it.each([[401, "auth"], [403, "conflict"], [409, "conflict"], [422, "invalid"]])("pauses HTTP %i as %s", async (status, expected) => { const { repository } = fixture(); await syncMaterials(ownerId, repository, async () => new Response(null, { status: Number(status) })); expect(repository.updateMaterial.mock.calls[0][0].status).toBe(expected); });
  it("does not resend a conflict", async () => { const { repository } = fixture("conflict"); const send = vi.fn(); await syncMaterials(ownerId, repository, send, 0, true); expect(send).not.toHaveBeenCalled(); });
});
