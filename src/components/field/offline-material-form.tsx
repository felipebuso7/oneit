"use client";

import { useState, type FormEvent } from "react";
import { enqueueMaterial } from "@/lib/offline/material-queue";
import { offlineMaterialSchema } from "@/lib/validation/offline-material";

export function OfflineMaterialForm({ ownerId, ticketId, version, materials }: { ownerId: string; ticketId: string; version: number; materials: { id: string; name: string; unit: string }[] }) {
  const [message, setMessage] = useState(""); const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (saving) return; setSaving(true);
    const form = new FormData(event.currentTarget);
    const parsed = offlineMaterialSchema.safeParse({ id: crypto.randomUUID(), ownerId, ticketId, version, materialId: form.get("materialId"), quantity: form.get("quantity"), capturedAt: new Date().toISOString() });
    if (!parsed.success) { setMessage("Selecione o material e informe quantidade entre 0,001 e 100.000, com até três casas."); setSaving(false); return; }
    try { await enqueueMaterial(parsed.data); event.currentTarget.reset(); setMessage("Material salvo na fila local. Aguarde a confirmação no painel; não registre o mesmo material novamente enquanto estiver pendente."); }
    catch { setMessage("Não foi possível salvar. Este material pode já estar pendente nesta OS, ou o armazenamento está indisponível."); }
    finally { setSaving(false); }
  }
  return <form onSubmit={submit} data-offline-queue="true" className="mt-3 space-y-3 rounded border border-dashed p-3">
    <p className="text-sm font-medium">Registrar material na fila local</p>
    <label className="block text-sm">Material<select required name="materialId" defaultValue="" className="mt-1 block w-full rounded border p-2"><option disabled value="">Selecione</option>{materials.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}</select></label>
    <label className="block text-sm">Quantidade<input required name="quantity" type="number" min="0.001" max="100000" step="0.001" className="mt-1 block w-full rounded border p-2" /></label>
    <button type="submit" disabled={saving} className="rounded border px-4 py-2 text-sm font-semibold disabled:opacity-50">{saving ? "Salvando…" : "Salvar material na fila"}</button>
    {message ? <p role="status" className="text-sm">{message}</p> : null}
  </form>;
}
