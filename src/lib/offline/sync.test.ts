import { describe, expect, it, vi } from "vitest";
import { retryDelay, syncEvents } from "./sync";
import type { QueuedEvent } from "./queue";

const ownerId = "019cda50-f764-7a5e-9101-513020ce22e8";
const id = "019cda50-f764-7a5e-9101-513020ce22e9";
const payload = { id, ownerId, ticketId: "019cda50-f764-7a5e-9101-513020ce22ea", version: 2, eventType: "ARRIVAL" as const, capturedAt: "2026-10-01T12:00:00Z", justification: "GPS indisponível no local" };
function fixture(status: QueuedEvent["status"] = "pending") {
  const event: QueuedEvent = { id, ownerId, ticketId: payload.ticketId, payload, status, attempts: 0, retryAt: 0 };
  const repository = { listEvents: vi.fn().mockResolvedValue([event]), updateEvent: vi.fn().mockResolvedValue(undefined), removeEvent: vi.fn().mockResolvedValue(undefined) };
  return { event, repository };
}

describe("foreground queue synchronization", () => {
  it("removes only a matching validated server receipt", async () => {
    const { repository } = fixture();
    const send = vi.fn().mockResolvedValue(Response.json({ id, eventId: crypto.randomUUID() }));
    expect(await syncEvents(ownerId, repository, send)).toBe(1);
    expect(send).toHaveBeenCalledWith(payload);
    expect(repository.removeEvent).toHaveBeenCalledWith(id);
  });
  it("preserves the same action key after response loss", async () => {
    const { repository } = fixture();
    await syncEvents(ownerId, repository, vi.fn().mockRejectedValue(new Error("network")), 1000);
    const updated = repository.updateEvent.mock.calls[0][0];
    expect(updated.payload).toEqual(payload);
    expect(updated.retryAt).toBe(6000);
    expect(repository.removeEvent).not.toHaveBeenCalled();
  });
  it("does not accept a successful response for another key", async () => {
    const { repository } = fixture();
    await syncEvents(ownerId, repository, async () => Response.json({ id: crypto.randomUUID(), eventId: crypto.randomUUID() }), 0);
    expect(repository.removeEvent).not.toHaveBeenCalled();
    expect(repository.updateEvent).toHaveBeenCalled();
  });
  it.each([[401, "auth"], [403, "conflict"], [409, "conflict"], [422, "invalid"]])("pauses status %i as %s", async (status, expected) => {
    const { repository } = fixture();
    await syncEvents(ownerId, repository, async () => new Response(null, { status: Number(status) }));
    expect(repository.updateEvent.mock.calls[0][0].status).toBe(expected);
    expect(repository.removeEvent).not.toHaveBeenCalled();
  });
  it("never resends conflicts automatically", async () => {
    const { repository } = fixture("conflict");
    const send = vi.fn();
    await syncEvents(ownerId, repository, send, 0, true);
    expect(send).not.toHaveBeenCalled();
  });
  it("respects backoff and excludes another owner's payload", async () => {
    const { repository, event } = fixture();
    repository.listEvents.mockResolvedValue([{ ...event, retryAt: 2000 }, { ...event, ownerId: crypto.randomUUID() }]);
    const send = vi.fn();
    await syncEvents(ownerId, repository, send, 1000);
    expect(send).not.toHaveBeenCalled();
  });
  it("caps exponential retry delay", () => {
    expect(retryDelay(0)).toBe(5000);
    expect(retryDelay(99)).toBe(300000);
  });
  it("requires manual retry after auth failure, then resumes transient backoff", async () => {
    const { repository } = fixture("auth");
    const send = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));
    await syncEvents(ownerId, repository, send, 1000);
    expect(send).not.toHaveBeenCalled();
    await syncEvents(ownerId, repository, send, 1000, true);
    expect(repository.updateEvent.mock.calls[0][0]).toMatchObject({ status: "pending", retryAt: 6000 });
  });
});
