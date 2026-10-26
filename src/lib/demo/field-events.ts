export const fieldEventsKey = "oneit.demo.field-events.v1";

export type FieldEvent = {
  id: string;
  ticket: string;
  from: string;
  to: string;
  actor: string;
  at: string;
  details: string;
};

export function readFieldEvents(): FieldEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(fieldEventsKey) ?? "[]") as unknown;
    return Array.isArray(value) ? value as FieldEvent[] : [];
  } catch {
    return [];
  }
}

export function appendFieldEvent(event: Omit<FieldEvent, "id" | "at"> & Partial<Pick<FieldEvent, "id" | "at">>) {
  if (typeof window === "undefined") return;
  const next: FieldEvent = { ...event, id: event.id ?? "field-event-" + Date.now().toString(36), at: event.at ?? new Date().toISOString() };
  try {
    window.localStorage.setItem(fieldEventsKey, JSON.stringify([next, ...readFieldEvents()].slice(0, 500)));
  } catch {
    // O fluxo operacional não deve ser bloqueado por falha no cache local.
  }
}
