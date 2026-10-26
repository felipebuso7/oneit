"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as repository from "@/lib/offline/queue";
import { syncEvents } from "@/lib/offline/sync";
import { invalidateAgenda } from "@/lib/offline/agenda";

export function OfflineQueue({ ownerId }: { ownerId: string }) {
  const router = useRouter();
  const running = useRef(false);
  const [events, setEvents] = useState<repository.QueuedEvent[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => { setEvents(await repository.listEvents(ownerId)); }, [ownerId]);

  const synchronize = useCallback(async (retryAuth = false) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    try {
      if (navigator.onLine) {
        const confirmed = await syncEvents(ownerId, repository, (payload) => fetch("/api/field-events", {
          method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload), signal: AbortSignal.timeout(20_000),
        }), Date.now(), retryAuth);
        if (confirmed) {
          await invalidateAgenda(ownerId);
          setMessage(`${confirmed} evento(s) confirmado(s) pelo servidor. A cópia local desta conta foi invalidada; prepare uma nova agenda após a atualização.`);
          router.refresh();
        }
      }
      await refresh();
    } catch { setMessage("Fila local indisponível. Não há confirmação de salvamento; mantenha a tela aberta e confira a OS."); }
    finally { running.current = false; setBusy(false); }
  }, [ownerId, refresh, router]);

  useEffect(() => {
    const run = () => { void synchronize(); };
    run();
    window.addEventListener("online", run);
    window.addEventListener("servicia-queue-change", run);
    const timer = window.setInterval(run, 15_000);
    return () => {
      window.removeEventListener("online", run);
      window.removeEventListener("servicia-queue-change", run);
      window.clearInterval(timer);
    };
  }, [synchronize]);

  async function discard(id: string) {
    if (!window.confirm("Remover este evento da fila local? Ele pode já ter chegado ao servidor sem confirmação. Confira a OS antes de registrar novamente. Esta remoção não desfaz eventos no servidor.")) return;
    try { await repository.removeEvent(id); await refresh(); setMessage("Evento removido somente da fila deste dispositivo. O histórico do servidor não foi alterado."); }
    catch { setMessage("Não foi possível remover o evento local."); }
  }

  return <aside className="mt-5 rounded-xl border border-cyan-200 bg-white p-4" aria-label="Fila de check-ins">
    <h2 className="font-semibold">Fila de check-ins deste dispositivo ({events.length})</h2>
    <p className="mt-1 text-sm">Salvo localmente não significa registrado no servidor. Somente check-ins desta conta são enviados. Mantenha esta tela aberta e conectada para sincronizar.</p>
    {message ? <p role="status" className="mt-2 text-sm">{message}</p> : null}
    <button type="button" disabled={busy} onClick={() => void synchronize(true)} className="mt-3 min-h-11 rounded border px-4 py-2 disabled:opacity-50">{busy ? "Conferindo fila…" : "Tentar sincronizar"}</button>
    <ul className="mt-3 space-y-3">{events.map((event) => <li key={event.id} className="rounded bg-slate-50 p-3 text-sm">
      <p>{event.payload.eventType} · OS {event.ticketId.slice(0, 8)} · {event.status}</p>
      <p>{event.message ?? "Aguardando confirmação do servidor."}</p>
      <p className="mt-1 text-slate-600">Capturado: {event.payload.capturedAt}</p>
      <button type="button" disabled={busy} onClick={() => void discard(event.id)} className="mt-2 min-h-11 rounded border px-3 py-2 disabled:opacity-50">Remover da fila local</button>
    </li>)}</ul>
    <p className="mt-3 text-xs text-slate-600">A fila contém identificadores de OS, GPS e justificativas no armazenamento do navegador, sem criptografia adicional. Use dispositivo protegido. Limpar dados do navegador pode perder eventos ainda não confirmados.</p>
  </aside>;
}
