"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as repository from "@/lib/offline/material-queue";
import { syncMaterials } from "@/lib/offline/material-sync";

export function OfflineMaterialQueue({ ownerId }: { ownerId: string }) {
  const router = useRouter(); const running = useRef(false); const [items, setItems] = useState<repository.QueuedMaterial[]>([]); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => setItems(await repository.listMaterials(ownerId)), [ownerId]);
  const synchronize = useCallback(async (retryAuth = false) => {
    if (running.current || !navigator.onLine) return; running.current = true; setBusy(true);
    try { const confirmed = await syncMaterials(ownerId, repository, (payload) => fetch("/api/materials", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(20_000) }), Date.now(), retryAuth); if (confirmed) { setMessage(`${confirmed} material(is) confirmado(s) pelo servidor.`); router.refresh(); } await refresh(); }
    catch { setMessage("Fila de materiais indisponível. Não há confirmação de salvamento; confira a OS."); }
    finally { running.current = false; setBusy(false); }
  }, [ownerId, refresh, router]);
  useEffect(() => { const run = () => void synchronize(); run(); window.addEventListener("online", run); window.addEventListener("servicia-material-queue-change", run); const timer = window.setInterval(run, 15_000); return () => { window.removeEventListener("online", run); window.removeEventListener("servicia-material-queue-change", run); window.clearInterval(timer); }; }, [synchronize]);
  async function discard(id: string) { if (!window.confirm("Remover este material da fila local? Ele pode já ter chegado ao servidor sem confirmação. Confira a OS antes de registrar novamente.")) return; try { await repository.removeMaterial(id); await refresh(); setMessage("Material removido somente desta fila local."); } catch { setMessage("Não foi possível remover o material local."); } }
  return <aside className="mt-5 rounded-xl border border-amber-200 bg-white p-4" aria-label="Fila de materiais"><h2 className="font-semibold">Fila de materiais deste dispositivo ({items.length})</h2><p className="mt-1 text-sm">Salvo localmente não significa consumo registrado. Fotos não entram nesta fila.</p>{message ? <p role="status" className="mt-2 text-sm">{message}</p> : null}<button type="button" disabled={busy} onClick={() => void synchronize(true)} className="mt-3 min-h-11 rounded border px-4 py-2 disabled:opacity-50">{busy ? "Conferindo fila…" : "Tentar sincronizar materiais"}</button><ul className="mt-3 space-y-3">{items.map((item) => <li key={item.id} className="rounded bg-slate-50 p-3 text-sm"><p>OS {item.ticketId.slice(0, 8)} · quantidade {item.payload.quantity} · {item.status}</p><p>{item.message ?? "Aguardando confirmação do servidor."}</p><button type="button" onClick={() => void discard(item.id)} className="mt-2 min-h-11 rounded border px-3 py-2">Remover da fila local</button></li>)}</ul><p className="mt-3 text-xs text-slate-600">A fila guarda identificador de OS, material e quantidade sem criptografia adicional. Use dispositivo protegido; limpar dados do navegador pode perder itens pendentes.</p></aside>;
}
