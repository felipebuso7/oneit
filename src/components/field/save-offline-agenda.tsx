"use client";

import { useState, type FormEvent } from "react";
import { clearAgenda, saveAgenda, type LocalAgenda } from "@/lib/offline/agenda";

export function SaveOfflineAgenda({ agenda }: { agenda: LocalAgenda }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (data.get("password") !== data.get("confirmation")) { setMessage("As senhas locais não conferem."); return; }
    setBusy(true);
    try {
      await saveAgenda(agenda, String(data.get("password")));
      form.reset();
      setMessage("Cópia criptografada salva. Abra Agenda local e teste sua senha antes de ficar sem conexão. A senha não é recuperável.");
    } catch { setMessage("Não foi possível salvar a agenda. Verifique o armazenamento, a senha e se o endereço usa HTTPS ou localhost."); }
    finally { setBusy(false); }
  }
  async function clear() {
    if (!window.confirm("Remover a cópia local da agenda? Isso não remove check-ins pendentes nem altera o servidor.")) return;
    setBusy(true);
    try { await clearAgenda(); setMessage("Cópia local da agenda removida. Check-ins pendentes foram preservados."); }
    catch { setMessage("Não foi possível remover a agenda local."); }
    finally { setBusy(false); }
  }
  return <details className="mt-5 rounded-xl border bg-white p-4"><summary className="cursor-pointer py-2 font-semibold">Preparar agenda para uso offline</summary>
    <p className="mt-2 text-sm">Guarda até 50 OS atribuídas, com número, título, horário, etapa, versão e checklist. Sem contatos, diagnóstico confirmado ou fotos. A cópia vale por 8 horas desde a consulta online ({agenda.fetchedAt}). Rascunhos têm armazenamento separado e não são apagados ao substituir a agenda.</p>
    <form onSubmit={save} className="mt-3 space-y-3">
      <label className="block text-sm">Senha local diferente do login<input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={200} className="mt-1 block w-full rounded border p-2" /></label>
      <label className="block text-sm">Confirmar senha local<input name="confirmation" type="password" autoComplete="new-password" required minLength={12} maxLength={200} className="mt-1 block w-full rounded border p-2" /></label>
      <label className="flex items-start gap-2 text-sm"><input name="consent" type="checkbox" required className="mt-1" />Autorizo guardar esta agenda no dispositivo e substituir qualquer cópia anterior, inclusive de outra conta. Os check-ins pendentes não serão removidos.</label>
      <button disabled={busy} className="min-h-11 rounded bg-cyan-700 px-4 py-2 text-white disabled:opacity-50" type="submit">{busy ? "Processando…" : "Salvar cópia da agenda"}</button>
    </form>
    {message ? <p role="status" className="mt-3 text-sm">{message}</p> : null}
    <a href="/offline.html" className="mt-3 inline-block min-h-11 rounded border px-4 py-2">Abrir agenda local</a>
    <button type="button" disabled={busy} onClick={() => void clear()} className="ml-2 mt-3 min-h-11 rounded border px-4 py-2">Remover cópia local</button>
    <p className="mt-2 text-xs">Uma cópia por dispositivo. A senha local não autentica no servidor. Use senha forte e bloqueio do dispositivo; criptografia não protege uma tela desbloqueada ou scripts maliciosos na mesma origem.</p>
  </details>;
}
