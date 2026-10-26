"use client";

import { useRef, useState, type FormEvent } from "react";
import { enqueueEvent } from "@/lib/offline/queue";
import { offlineFieldEventSchema } from "@/lib/validation/offline-field-event";

export function CheckInForm({ ticketId, ownerId, version, eventType, label }: { ticketId: string; ownerId: string; version: number; eventType: string; label: string }) {
  const [position, setPosition] = useState<{ latitude: number; longitude: number; accuracy: number }>();
  const [message, setMessage] = useState("Colete a localização ou justifique sua indisponibilidade.");
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const form = new FormData(event.currentTarget);
      const parsed = offlineFieldEventSchema.safeParse({ id: crypto.randomUUID(), ownerId, ticketId, version, eventType,
        capturedAt: new Date().toISOString(), ...position, justification: form.get("justification") || undefined });
      if (!parsed.success) { setMessage("Confira o GPS ou uma justificativa de pelo menos 10 caracteres."); return; }
      await enqueueEvent(parsed.data);
      setMessage("Evento salvo na fila local. Aguarde a confirmação do servidor no painel; não registre novamente.");
    } catch {
      setMessage("Não foi possível adicionar à fila. Pode existir um evento desta OS aguardando envio, ou o armazenamento está indisponível. Confira o painel antes de tentar novamente.");
    } finally { savingRef.current = false; setSaving(false); }
  }

  function locate() {
    setPosition(undefined);
    if (!navigator.geolocation) {
      setMessage("Este navegador não oferece localização. Informe uma justificativa.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setPosition({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy });
      setMessage(`Localização coletada. Precisão estimada: ${Math.round(coords.accuracy)} m.`);
      setLocating(false);
    }, () => {
      setMessage("Não foi possível coletar GPS. Tente novamente ou informe uma justificativa.");
      setLocating(false);
    }, { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 });
  }

  return <form onSubmit={submit} data-offline-queue="true" className="mt-4 space-y-3">
    <input name="ticketId" type="hidden" value={ticketId} />
    <input name="eventType" type="hidden" value={eventType} />
    <input name="latitude" type="hidden" value={position?.latitude ?? ""} />
    <input name="longitude" type="hidden" value={position?.longitude ?? ""} />
    <input name="accuracy" type="hidden" value={position?.accuracy ?? ""} />
    <button type="button" disabled={locating} onClick={locate} className="rounded border px-4 py-2 text-sm font-medium disabled:opacity-50">{locating ? "Obtendo GPS…" : "Coletar localização"}</button>
    <p role="status" className="text-sm text-slate-600">{message}</p>
    {!position ? <label className="block text-sm">Justificativa para ausência de localização<textarea name="justification" required minLength={10} maxLength={1000} className="mt-1 block w-full rounded border p-2" /></label> : null}
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" required className="mt-1" />Autorizo salvar este check-in (OS, GPS e justificativa) neste dispositivo até a confirmação do servidor.</label>
    <button disabled={saving || locating} className="w-full rounded bg-cyan-700 px-4 py-3 font-semibold text-white disabled:opacity-50" type="submit">{saving ? "Salvando na fila…" : label}</button>
  </form>;
}
