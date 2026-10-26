"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveExecution } from "@/app/(portal)/portal/field/execution-actions";
import { faultDomains } from "@/lib/validation/execution";
import { draftMatches, loadExecutionDraft, removeExecutionDraft, type ExecutionDraft } from "@/lib/offline/execution-draft";
import { syncSavedExecution } from "@/lib/offline/execution-sync";
import { invalidateAgenda } from "@/lib/offline/agenda";

const labels: Record<(typeof faultDomains)[number], string> = {
  CABLING: "Cabeamento", ACTIVE_NETWORK_EQUIPMENT: "Equipamento ativo de rede", ENDPOINT: "Estação de trabalho",
  POWER: "Energia", CLIENT_SYSTEM: "Sistema do cliente", UNKNOWN: "Não identificado", OTHER: "Outro",
};

export function ExecutionForm({ ownerId, ticketId, version, items, previous }: {
  ownerId: string; ticketId: string; version: number;
  items: { item_code: string; label: string; required: boolean }[];
  previous?: { fault_domain: string; diagnosis: string; solution: string; checklist_answers: Record<string, boolean> };
}) {
  const router = useRouter();
  const [faultDomain, setFaultDomain] = useState(previous?.fault_domain ?? "CABLING");
  const [diagnosis, setDiagnosis] = useState(previous?.diagnosis ?? "");
  const [solution, setSolution] = useState(previous?.solution ?? "");
  const [answers, setAnswers] = useState(previous?.checklist_answers ?? {});
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<ExecutionDraft>();
  const [busy, setBusy] = useState(false);

  async function synchronize() {
    if (!window.confirm("Enviar somente o rascunho SALVO ao servidor? Alterações não salvas deste formulário não serão enviadas. Uma execução fora de cabeamento muda a OS para fora do escopo. Após confirmação, a agenda será atualizada.")) return;
    setBusy(true); const secret = password; setPassword("");
    try {
      const receipt = await syncSavedExecution(ownerId, ticketId, secret, (payload) => fetch("/api/executions", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(20_000),
      }));
      let invalidated = true;
      try { await invalidateAgenda(ownerId); } catch { invalidated = false; }
      const notice = `Execução confirmada: ${receipt.recordId}. Rascunho preservado.${!receipt.marked ? " A confirmação não foi marcada na cópia local (ela pode ter sido alterada); confira antes de editar." : ""}${!invalidated ? " Não foi possível invalidar a agenda local; atualize-a antes de usar offline." : ""}`;
      router.replace(`/portal/field?message=${encodeURIComponent(notice)}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Sem confirmação. Rascunho preservado."); }
    finally { setBusy(false); }
  }

  async function restore() {
    setBusy(true);
    const secret = password; setPassword(""); setPreview(undefined);
    try {
      const draft = await loadExecutionDraft(ownerId, ticketId, secret);
      if (!draft) { setMessage("Nenhum rascunho local para esta conta e OS."); return; }
      if (draft.confirmedRecordId) { setPreview(draft); setMessage(`Esta cópia já tem confirmação local: ${draft.confirmedRecordId}. Não foi aplicada novamente. Para verificar o recibo no servidor, use Sincronizar rascunho salvo.`); return; }
      if (!draftMatches(draft, ownerId, ticketId, version, items)) {
        setPreview(draft); setMessage("Versão ou checklist alterado. Importação bloqueada; cópia antiga disponível abaixo somente para consulta. Não foi enviada nem sobrescrita."); return;
      }
      if (!window.confirm("Aplicar este rascunho aos campos do formulário? Os valores preenchidos na tela serão substituídos, sem envio ao servidor.")) return;
      setFaultDomain(draft.faultDomain); setDiagnosis(draft.diagnosis); setSolution(draft.solution); setAnswers(draft.answers);
      setMessage("Rascunho aplicado ao formulário. Revise e use Salvar execução para enviar; nada foi registrado no servidor ainda.");
    } catch { setMessage("Não foi possível ler o rascunho. Use a senha local original; se ela mudou ao preparar nova agenda, a anterior continua necessária para este rascunho."); }
    finally { setBusy(false); }
  }
  async function discard() {
    if (!window.confirm("Excluir permanentemente o rascunho local desta OS e conta? Confira antes se a execução foi confirmada no servidor. Não há recuperação deste rascunho.")) return;
    setBusy(true);
    try { await removeExecutionDraft(ownerId, ticketId); setPreview(undefined); setMessage("Rascunho local excluído. Nenhum registro do servidor foi alterado."); }
    catch { setMessage("Não foi possível excluir o rascunho."); }
    finally { setBusy(false); }
  }

  return <div><details className="mt-5 rounded border p-3"><summary className="cursor-pointer font-medium">Restaurar rascunho offline</summary>
    <label className="mt-3 block text-sm">Senha local usada no rascunho<input type="password" minLength={12} maxLength={200} autoComplete="off" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 block w-full rounded border p-2" /></label>
    <button type="button" disabled={busy || password.length < 12} onClick={() => void restore()} className="mt-3 min-h-11 rounded border px-4 py-2 disabled:opacity-50">Restaurar no formulário</button>
    <button type="button" disabled={busy || password.length < 12} onClick={() => void synchronize()} className="mt-3 min-h-11 rounded border px-4 py-2 disabled:opacity-50">Sincronizar rascunho salvo</button>
    <button type="button" disabled={busy} onClick={() => void discard()} className="mt-3 min-h-11 rounded border px-4 py-2">Excluir rascunho local</button>
    {message ? <p role="status" className="mt-2 text-sm">{message}</p> : null}
    {preview ? <section className="mt-3 rounded bg-amber-50 p-3 text-sm"><p>Cópia antiga — versão {preview.version}, salva {preview.updatedAt}. Origem: {preview.faultDomain}.</p><label className="mt-2 block">Diagnóstico antigo<textarea readOnly value={preview.diagnosis} className="mt-1 block w-full rounded border p-2" /></label><label className="mt-2 block">Solução antiga<textarea readOnly value={preview.solution} className="mt-1 block w-full rounded border p-2" /></label><ul>{preview.items.map((item) => <li key={item.item_code}>{item.label}: {preview.answers[item.item_code] ? "Marcado" : "Não marcado"}</li>)}</ul></section> : null}
  </details><form action={saveExecution} className="mt-5 space-y-4"><fieldset disabled={busy} className="space-y-4">
    <input type="hidden" name="ticketId" value={ticketId} /><input type="hidden" name="version" value={version} />
    <label className="block text-sm font-medium">Origem da falha<select name="faultDomain" value={faultDomain} onChange={(event) => setFaultDomain(event.target.value)} className="mt-1 block w-full rounded border p-2">{faultDomains.map((domain) => <option key={domain} value={domain}>{labels[domain]}</option>)}</select></label>
    <p className="text-sm text-slate-600">Falhas fora de cabeamento serão encaminhadas como fora do escopo. Descreva os testes e o encaminhamento.</p>
    <label className="block text-sm font-medium">Diagnóstico<textarea name="diagnosis" value={diagnosis} onChange={(event) => setDiagnosis(event.target.value)} required minLength={10} maxLength={10000} className="mt-1 block min-h-24 w-full rounded border p-2" /></label>
    <label className="block text-sm font-medium">Serviço realizado ou encaminhamento<textarea name="solution" value={solution} onChange={(event) => setSolution(event.target.value)} required minLength={10} maxLength={10000} className="mt-1 block min-h-24 w-full rounded border p-2" /></label>
    <fieldset className="space-y-3"><legend className="mb-2 font-medium">Checklist</legend>{items.map((item) => <label key={item.item_code} className="flex items-start gap-3 text-sm"><input type="hidden" name="itemCode" value={item.item_code} /><input type="checkbox" name={`answer:${item.item_code}`} checked={answers[item.item_code] ?? false} onChange={(event) => setAnswers((current) => ({ ...current, [item.item_code]: event.target.checked }))} className="mt-1 size-5" /><span>{item.label}{item.required ? " (obrigatório para conclusão)" : ""}</span></label>)}</fieldset>
    <button type="submit" className="w-full rounded bg-cyan-700 px-4 py-3 font-semibold text-white">Salvar execução</button>
  </fieldset></form></div>;
}
