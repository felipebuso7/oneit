export const fieldCommunicationsKey = "oneit.demo.field-communications.v1";
export type FieldCommunication = { id: string; ticket: string; channel: string; recipient: string; phone: string; status: string; createdAt: string; body: string };
export function recordFieldCommunication(input: Omit<FieldCommunication, "id" | "createdAt">) {
  if (typeof window === "undefined") return;
  try {
    const saved = JSON.parse(window.localStorage.getItem(fieldCommunicationsKey) ?? "[]") as unknown;
    const items = Array.isArray(saved) ? saved as FieldCommunication[] : [];
    const entry: FieldCommunication = { ...input, id: "field-communication-" + Date.now().toString(36), createdAt: new Date().toISOString() };
    window.localStorage.setItem(fieldCommunicationsKey, JSON.stringify([entry, ...items].slice(0, 200)));
  } catch { /* O envio não deve ser bloqueado por falha no cache local. */ }
}
