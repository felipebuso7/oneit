"use client";

import { FormEvent, useState } from "react";

type Organization = { id: string; display_name: string };
type Sheet = { id: string; organization_id: string; sheet_number: string; total_orders: number; total_amount: number; created_at: string; billing_period_id: string; competence: string; status: string };

const labels: Record<string, string> = {
  NO_CLOSED_FIELD_SERVICE_ORDERS: "Não há OS de Field Service elegíveis nessa competência.",
  NO_LPU_LINES: "As OS elegíveis ainda não possuem itens LPU aprovados.",
  MEASUREMENT_GENERATION_INVALID_STATE: "A competência já avançou no fluxo e não pode ser recalculada.",
  MEASUREMENT_GENERATION_FORBIDDEN: "Seu perfil não tem permissão para gerar o BM desta organização.",
};
const statusLabels: Record<string, string> = { DRAFT: "Rascunho", READY_FOR_REVIEW: "Em validação", SENT_FOR_CONTESTATION: "Enviado ao cliente", CONTESTED: "Contestado", APPROVED: "Aprovado", SENT_TO_TAX: "Aguardando fiscal", SENT_TO_BILLING: "Enviado para faturamento", CLOSED: "Fechado", RETURNED_FOR_CORRECTION: "Devolvido para correção" };
const statusTone: Record<string, string> = { DRAFT: "border-slate-200 bg-slate-100 text-slate-700", READY_FOR_REVIEW: "border-amber-200 bg-amber-50 text-amber-900", SENT_FOR_CONTESTATION: "border-sky-200 bg-sky-50 text-sky-900", CONTESTED: "border-rose-200 bg-rose-50 text-rose-900", APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-900", SENT_TO_TAX: "border-indigo-200 bg-indigo-50 text-indigo-900", SENT_TO_BILLING: "border-cyan-200 bg-cyan-50 text-cyan-900", CLOSED: "border-slate-300 bg-slate-200 text-slate-800", RETURNED_FOR_CORRECTION: "border-orange-200 bg-orange-50 text-orange-900" };

export function MeasurementPanel({ organizations, initialSheets, defaultCompetence }: { organizations: Organization[]; initialSheets: Sheet[]; defaultCompetence: string }) {
  const [organizationId, setOrganizationId] = useState(organizations[0]?.id ?? "");
  const [competence, setCompetence] = useState(defaultCompetence);
  const [sheets, setSheets] = useState(initialSheets);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId || !competence) return;
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/field-service/measurement/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, competence: `${competence}-01` }),
      });
      const body = await response.json().catch(() => ({})) as { code?: string; measurementSheet?: Sheet };
      if (!response.ok || !body.measurementSheet) {
        setNotice(labels[body.code ?? ""] ?? "Não foi possível iniciar o fechamento da competência.");
        return;
      }
      setSheets((current) => [body.measurementSheet!, ...current.filter((sheet) => sheet.id !== body.measurementSheet!.id)]);
      setNotice("Medição gerada a partir das OS fechadas. Confira os itens antes de enviar para validação.");
    } catch {
      setNotice("Não foi possível conectar ao serviço de medição. Verifique sua sessão e tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  async function transition(sheet: Sheet, targetStatus: string) {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/field-service/measurement/transition", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sheetId: sheet.id, targetStatus }) });
      const body = await response.json().catch(() => ({})) as { code?: string; measurementSheet?: Sheet };
      if (!response.ok || !body.measurementSheet) { setNotice(body.code === "INVALID_MEASUREMENT_STATE" ? "Esse BM não pode avançar a partir do status atual." : "Não foi possível atualizar o status do BM."); return; }
      const updated = body.measurementSheet;
      setSheets((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
      setNotice("BM enviado para validação.");
    } catch { setNotice("Não foi possível conectar ao serviço de workflow financeiro."); } finally { setBusy(false); }
  }

  const visibleSheets = sheets.filter((sheet) => sheet.organization_id === organizationId);
  return <div className="oneit-bm-panel mt-6 grid gap-6 lg:grid-cols-[22rem_1fr]">
    <form onSubmit={generate} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Iniciar fechamento</p>
      <h2 className="mt-2 text-lg font-semibold text-slate-950">Gerar medição da competência</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">O sistema consolida somente OS validadas, com RTO e itens LPU registrados. Nenhum chamado é alterado nesta etapa.</p>
      <label className="mt-5 grid gap-1 text-sm font-medium text-slate-700">Organização<select required value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className="rounded-lg border border-slate-300 bg-white p-2.5 font-normal"><option value="">Selecione</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.display_name}</option>)}</select></label>
      <label className="mt-4 grid gap-1 text-sm font-medium text-slate-700">Competência<input required type="month" value={competence} onChange={(event) => setCompetence(event.target.value)} className="rounded-lg border border-slate-300 p-2.5 font-normal" /></label>
      <button type="submit" disabled={busy || !organizationId} className="mt-5 w-full rounded-lg bg-[#062c59] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Calculando…" : "Iniciar fechamento"}</button>
      {notice ? <p role="status" className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">{notice}</p> : null}
    </form>
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-950">Boletins de medição</h2><p className="mt-1 text-sm text-slate-500">Histórico real por organização e competência.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{visibleSheets.length} registro(s)</span></div>
      <ol aria-label="Fluxo do boletim de medição" className="mt-5 grid gap-2 text-xs sm:grid-cols-4"><li className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><strong className="block text-slate-900">1. Fechar competência</strong><span className="text-slate-500">Calcular OS elegíveis</span></li><li className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"><strong className="block text-amber-950">2. Validar BM</strong><span className="text-amber-800">Conferir itens e valores</span></li><li className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2"><strong className="block text-sky-950">3. Enviar ao cliente</strong><span className="text-sky-800">Registrar comunicação</span></li><li className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2"><strong className="block text-indigo-950">4. Aguardar fiscal</strong><span className="text-indigo-800">Liberar faturamento</span></li></ol>
      {visibleSheets.length ? <div className="mt-4 overflow-x-auto"><table data-oneit-data-table className="min-w-[760px] w-full text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">BM</th><th className="px-3 py-3">Competência</th><th className="px-3 py-3">OS</th><th className="px-3 py-3">Valor</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Ação</th></tr></thead><tbody>{visibleSheets.map((sheet) => <tr key={sheet.id} className="border-b border-slate-100 last:border-0"><td className="px-3 py-3 font-semibold text-slate-900">{sheet.sheet_number}</td><td className="px-3 py-3 text-slate-600">{new Date(`${sheet.competence}T00:00:00`).toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" })}</td><td className="px-3 py-3 text-slate-600">{sheet.total_orders}</td><td className="px-3 py-3 font-medium text-slate-900">R$ {Number(sheet.total_amount).toFixed(2).replace(".", ",")}</td><td className="px-3 py-3"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone[sheet.status] ?? statusTone.DRAFT}`}>{statusLabels[sheet.status] ?? sheet.status}</span></td><td className="flex flex-wrap gap-2 px-3 py-3">{sheet.status === "DRAFT" ? <button type="button" disabled={busy} onClick={() => void transition(sheet, "READY_FOR_REVIEW")} className="rounded-lg border border-[#062c59] px-3 py-1.5 text-xs font-semibold text-[#062c59] disabled:opacity-50">Enviar para validação</button> : <span className="text-xs text-slate-400">Sem ação</span>}<a href={`/api/field-service/measurement/${sheet.id}/pdf`} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">Prévia PDF</a></td></tr>)}</tbody></table></div> : <p className="mt-8 rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Nenhum BM gerado para esta organização.</p>}
    </section>
  </div>;
}
