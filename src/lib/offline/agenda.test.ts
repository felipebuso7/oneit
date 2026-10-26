import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AGENDA_TTL_MS, agendaSchema, clearAgenda, invalidateAgenda, loadVault, saveAgenda, sealAgenda, unlockAgenda, type LocalAgenda } from "./agenda";
import { enqueueEvent, listEvents } from "./queue";

const password = "senha local longa de teste";
const now = Date.parse("2026-10-01T12:00:00Z");
const ownerId = "019cda50-f764-7a5e-9101-513020ce22e8";
const otherOwner = "019cda50-f764-7a5e-9101-513020ce22e9";
const ticketId = "019cda50-f764-7a5e-9101-513020ce22ea";
const agenda: LocalAgenda = { ownerId, fetchedAt: new Date(now).toISOString(), tickets: [{ id: ticketId, ticket_number: "OS-001", title: "Unidade restrita de teste", operational_status: "ASSIGNED", scheduled_at: null, version: 4, checklist: [] }] };

beforeEach(() => { vi.stubGlobal("indexedDB", new IDBFactory()); vi.stubGlobal("window", { dispatchEvent: vi.fn() }); });
afterEach(() => vi.unstubAllGlobals());

describe("encrypted local agenda", () => {
  it("round trips only after decrypting with the local password", async () => {
    const vault = await sealAgenda(agenda, password);
    expect(new TextDecoder().decode(vault.ciphertext)).not.toContain(agenda.tickets[0].title);
    expect(await unlockAgenda(vault, password, now)).toEqual(agenda);
  });
  it("rejects a wrong password without revealing the agenda", async () => {
    const vault = await sealAgenda(agenda, password);
    await expect(unlockAgenda(vault, "outra senha local forte", now)).rejects.toBeTruthy();
  });
  it("rejects ciphertext tampering", async () => {
    const vault = await sealAgenda(agenda, password);
    new Uint8Array(vault.ciphertext)[0] ^= 1;
    await expect(unlockAgenda(vault, password, now)).rejects.toBeTruthy();
  });
  it("authenticates the account metadata with the ciphertext", async () => {
    const vault = await sealAgenda(agenda, password);
    await expect(unlockAgenda({ ...vault, ownerId: otherOwner }, password, now)).rejects.toBeTruthy();
  });
  it("uses independent random salt and IV for each save", async () => {
    const first = await sealAgenda(agenda, password);
    const second = await sealAgenda(agenda, password);
    expect(first.salt).not.toEqual(second.salt);
    expect(first.iv).not.toEqual(second.iv);
  });
  it("refuses expired snapshots and timestamps too far in the future", async () => {
    const vault = await sealAgenda(agenda, password);
    await expect(unlockAgenda(vault, password, now + AGENDA_TTL_MS + 1)).rejects.toThrow(/expirada/);
    await expect(unlockAgenda(vault, password, now - 5 * 60_000 - 1)).rejects.toThrow(/relógio/);
  });
  it("rejects short passwords before saving", async () => {
    await expect(saveAgenda(agenda, "1234")).rejects.toThrow(/12/);
    expect(await loadVault()).toBeUndefined();
  });
  it("stores one encrypted copy and replaces the previous account snapshot", async () => {
    await saveAgenda(agenda, password);
    await saveAgenda({ ...agenda, ownerId: otherOwner }, "nova senha local longa");
    const vault = (await loadVault())!;
    expect(vault.ownerId).toBe(otherOwner);
    await expect(unlockAgenda(vault, password, now)).rejects.toBeTruthy();
    expect((await unlockAgenda(vault, "nova senha local longa", now)).ownerId).toBe(otherOwner);
  });
  it("invalidates only the matching account copy", async () => {
    await saveAgenda(agenda, password);
    await invalidateAgenda(otherOwner);
    expect(await loadVault()).toBeDefined();
    await invalidateAgenda(ownerId);
    expect(await loadVault()).toBeUndefined();
  });
  it("clears the agenda without deleting pending check-ins", async () => {
    await saveAgenda(agenda, password);
    await enqueueEvent({ id: crypto.randomUUID(), ownerId, ticketId, version: 4, eventType: "TRAVEL_STARTED", capturedAt: new Date(now).toISOString(), justification: "GPS indisponível no teste" });
    await clearAgenda();
    expect(await loadVault()).toBeUndefined();
    expect(await listEvents(ownerId)).toHaveLength(1);
  });
  it("limits snapshot fields and rejects invalid versions or excessive rows", () => {
    expect(agendaSchema.safeParse({ ...agenda, tickets: Array(51).fill(agenda.tickets[0]) }).success).toBe(false);
    expect(agendaSchema.safeParse({ ...agenda, tickets: [{ ...agenda.tickets[0], version: 0 }] }).success).toBe(false);
    expect(agendaSchema.parse({ ...agenda, token: "secret" })).not.toHaveProperty("token");
  });
});
