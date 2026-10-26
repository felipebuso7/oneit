import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enqueueMaterial, listMaterials, removeMaterial, updateMaterial } from "./material-queue";
import { offlineMaterialSchema } from "../validation/offline-material";
const ownerId = "019cda50-f764-7a5e-9101-513020ce22e8";
const payload = { id: "019cda50-f764-7a5e-9101-513020ce22e9", ownerId, ticketId: "019cda50-f764-7a5e-9101-513020ce22ea", materialId: "019cda50-f764-7a5e-9101-513020ce22eb", version: 3, quantity: 2.125, capturedAt: "2026-10-05T12:00:00Z" };
beforeEach(() => { vi.stubGlobal("indexedDB", new IDBFactory()); vi.stubGlobal("window", { dispatchEvent: vi.fn() }); }); afterEach(() => vi.unstubAllGlobals());
describe("local material queue", () => {
  it("validates immutable action envelopes", () => { expect(offlineMaterialSchema.safeParse({ ...payload, quantity: "2.125" }).success).toBe(true); expect(offlineMaterialSchema.safeParse({ ...payload, quantity: "0.0001" }).success).toBe(false); });
  it("keeps an item until removal and isolates account queues", async () => { await enqueueMaterial(payload); await enqueueMaterial({ ...payload, id: crypto.randomUUID(), ownerId: crypto.randomUUID(), materialId: crypto.randomUUID() }); expect((await listMaterials(ownerId))[0].payload).toMatchObject({ quantity: 2.125, materialId: payload.materialId }); await removeMaterial(payload.id); expect(await listMaterials(ownerId)).toEqual([]); });
  it("prevents duplicate pending consumption for the same material and OS", async () => { await enqueueMaterial(payload); await expect(enqueueMaterial({ ...payload, id: crypto.randomUUID() })).rejects.toBeTruthy(); });
  it("does not resurrect a discarded item or overwrite a newer retry", async () => { await enqueueMaterial(payload); const [item] = await listMaterials(ownerId); await removeMaterial(item.id); await updateMaterial({ ...item, attempts: 1 }); expect(await listMaterials(ownerId)).toEqual([]); await enqueueMaterial(payload); const [next] = await listMaterials(ownerId); await updateMaterial({ ...next, attempts: 2, status: "conflict" }); await updateMaterial({ ...next, attempts: 1 }); expect((await listMaterials(ownerId))[0].status).toBe("conflict"); });
});
