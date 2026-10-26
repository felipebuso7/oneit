import { IDBFactory } from "fake-indexeddb";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { enqueueEvent, listEvents, removeEvent, updateEvent } from "./queue";
import { offlineFieldEventSchema } from "../validation/offline-field-event";

const ownerId = "019cda50-f764-7a5e-9101-513020ce22e8";
const otherOwner = "019cda50-f764-7a5e-9101-513020ce22e9";
const payload = { id: "019cda50-f764-7a5e-9101-513020ce22ea", ownerId, ticketId: "019cda50-f764-7a5e-9101-513020ce22eb", version: 4, eventType: "ARRIVAL" as const, capturedAt: "2026-10-01T12:00:00Z", justification: "GPS indisponível no local" };

beforeEach(() => { vi.stubGlobal("indexedDB", new IDBFactory()); vi.stubGlobal("window", { dispatchEvent: vi.fn() }); });
afterEach(() => vi.unstubAllGlobals());

describe("local check-in queue", () => {
  it("retains field validation when adding envelope fields", () => {
    expect(offlineFieldEventSchema.safeParse({ ...payload, justification: undefined }).success).toBe(false);
    expect(offlineFieldEventSchema.safeParse({ ...payload, version: 0 }).success).toBe(false);
    expect(offlineFieldEventSchema.safeParse(payload).success).toBe(true);
  });
  it("persists the complete immutable envelope until acknowledgement", async () => {
    await enqueueEvent(payload);
    expect((await listEvents(ownerId))[0].payload).toEqual(payload);
    expect(window.dispatchEvent).toHaveBeenCalledOnce();
    await removeEvent(payload.id);
    expect(await listEvents(ownerId)).toEqual([]);
  });
  it("prevents two unconfirmed actions for the same owner and ticket", async () => {
    await enqueueEvent(payload);
    await expect(enqueueEvent({ ...payload, id: crypto.randomUUID() })).rejects.toBeTruthy();
    expect(await listEvents(ownerId)).toHaveLength(1);
  });
  it("lists only the selected account's records", async () => {
    await enqueueEvent(payload);
    await enqueueEvent({ ...payload, ownerId: otherOwner, id: crypto.randomUUID() });
    expect((await listEvents(ownerId)).map((value) => value.ownerId)).toEqual([ownerId]);
    expect((await listEvents(otherOwner)).map((value) => value.ownerId)).toEqual([otherOwner]);
  });
  it("does not resurrect an item removed by another tab", async () => {
    await enqueueEvent(payload);
    const [event] = await listEvents(ownerId);
    await removeEvent(event.id);
    await updateEvent({ ...event, attempts: 1 });
    expect(await listEvents(ownerId)).toEqual([]);
  });
  it("does not overwrite a newer retry count with a stale response", async () => {
    await enqueueEvent(payload);
    const [event] = await listEvents(ownerId);
    await updateEvent({ ...event, attempts: 2, status: "conflict" });
    await updateEvent({ ...event, attempts: 1 });
    expect((await listEvents(ownerId))[0].status).toBe("conflict");
  });
});
