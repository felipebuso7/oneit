import { markPending } from "@/app/(portal)/portal/pending/actions";
import { pendingLabels, pendingOptions } from "@/domain/tickets/pending";

export function PendingForm({ ticketId, version, status }: { ticketId: string; version: number; status: string }) {
  const options = pendingOptions(status);
  if (!options.length) return null;
  return <details className="mt-5 rounded border p-3"><summary className="cursor-pointer font-medium">Registrar pendência</summary><form action={markPending} className="mt-3 space-y-3">
    <input type="hidden" name="ticketId" value={ticketId} /><input type="hidden" name="version" value={version} />
    <label className="block text-sm">Motivo<select name="status" className="mt-1 block w-full rounded border p-2">{options.map((item) => <option key={item} value={item}>{pendingLabels[item]}</option>)}</select></label>
    <label className="block text-sm">Justificativa<textarea required minLength={10} maxLength={2000} name="reason" className="mt-1 block w-full rounded border p-2" /></label>
    <button type="submit" className="rounded bg-amber-800 px-4 py-2 font-semibold text-white">Registrar pendência</button>
  </form></details>;
}
