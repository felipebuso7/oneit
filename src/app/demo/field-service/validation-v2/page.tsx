"use client";
/* eslint-disable @next/next/no-img-element -- imagens demonstrativas assinadas e evidências em data URL local. */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DemoSidebar } from "@/components/demo-sidebar";
import { OneitStatusBadge } from "@/components/oneit-design-system";
import { appendFieldEvent } from "@/lib/demo/field-events";
import { pricePendingVisit } from "@/lib/demo/field-validation-pricing";

type Material = { id?: string; description?: string; quantity?: number; unit?: string };
type Visit = {
  id: string;
  ticket: string;
  title: string;
  company?: string;
  department?: string;
  address?: string;
  technician?: string;
  state?: string;
  technicalResolution?: string;
  evidenceNotes?: string;
  additionalNotes?: string;
  evidenceDataUrls?: string[];
  photoCount?: number;
  materials?: Material[];
  customerSignatureName?: string;
  signatureDataUrl?: string;
  technicianCompletedAt?: string;
  checkedOutAt?: string;
  lpuCode?: string;
  lpuDescription?: string;
  quotedAmount?: number;
};

type LpuItem = { id: string; code: string; description: string; unit: string; price: number; active: boolean };

const storageKey = "oneit.demo.field-visits.v1";
const lpuStorageKey = "oneit.demo.field-lpu.v1";
const reviewState = "Aguardando validação do gestor";
const defaultLpu: LpuItem[] = [
  { id: "lpu-1", code: "LPU-RED-001", description: "Visita técnica de rede", unit: "visita", price: 220, active: true },
  { id: "lpu-2", code: "LPU-HDW-010", description: "Substituição de periférico", unit: "unidade", price: 85, active: true },
];

function readVisits(): Visit[] {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? "[]") as unknown;
    return Array.isArray(value) ? value.filter((item): item is Visit => Boolean(item && typeof item === "object" && typeof item.id === "string" && typeof item.ticket === "string")) : [];
  } catch { return []; }
}

function reviewFlags(visit: Visit) {
  const flags: string[] = [];
  if (!visit.lpuCode?.trim()) flags.push("LPU a conferir");
  if (!visit.customerSignatureName?.trim() || !visit.signatureDataUrl?.startsWith("data:image/")) flags.push("Assinatura ausente");
  if (!visit.photoCount && !(visit.evidenceNotes || visit.additionalNotes)?.trim()) flags.push("Evidência ausente");
  return flags;
}

function completedLabel(value?: string) {
  if (!value) return "Data não registrada";
  const legacy = /^(\d{2})\/(\d{2})\/(\d{4}),?\s+(\d{2}):(\d{2})/.exec(value);
  const parsed = legacy ? new Date(Number(legacy[3]), Number(legacy[2]) - 1, Number(legacy[1]), Number(legacy[4]), Number(legacy[5])) : new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Data não registrada" : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(parsed);
}

export default function FieldValidationV2Page() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [lpuItems, setLpuItems] = useState<LpuItem[]>(defaultLpu);
  const [lpuChoice, setLpuChoice] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(lpuStorageKey) ?? "null") as unknown;
        if (Array.isArray(saved)) setLpuItems(saved.filter((item): item is LpuItem => Boolean(item && typeof item === "object" && typeof item.code === "string" && Number.isFinite(item.price))));
        const organizationId = localStorage.getItem("oneit.demo.organization-id.v1");
        if (organizationId) fetch(`/api/field-service/lpu?organizationId=${encodeURIComponent(organizationId)}`)
          .then(async (response) => response.ok ? response.json() : null)
          .then((payload: { items?: Array<{ id: string; code: string; description: string; unit: string; unit_price: number; active: boolean }> } | null) => {
            if (payload?.items?.length) setLpuItems(payload.items.map((item) => ({ id: item.id, code: item.code, description: item.description, unit: item.unit, price: item.unit_price, active: item.active })));
          }).catch(() => undefined);
      } catch { /* Mantém os itens de demonstração quando o cache local não estiver disponível. */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const requestedTicket = new URLSearchParams(window.location.search).get("ticket");
    const read = () => {
      const rows = readVisits();
      setVisits(rows);
      setSelectedId((current) => {
        if (current && rows.some((item) => item.id === current && item.state === reviewState)) return current;
        return rows.find((item) => item.ticket === requestedTicket && item.state === reviewState)?.id ?? rows.find((item) => item.state === reviewState)?.id ?? "";
      });
    };
    read();
    window.addEventListener("focus", read);
    window.addEventListener("storage", read);
    window.addEventListener("oneit-demo-field-visits-updated", read);
    return () => {
      window.removeEventListener("focus", read);
      window.removeEventListener("storage", read);
      window.removeEventListener("oneit-demo-field-visits-updated", read);
    };
  }, []);

  const pending = useMemo(() => visits.filter((visit) => visit.state === reviewState && [visit.ticket, visit.title, visit.technician, visit.department, visit.company].join(" ").toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR"))).sort((a, b) => (a.technicianCompletedAt ?? a.checkedOutAt ?? "").localeCompare(b.technicianCompletedAt ?? b.checkedOutAt ?? "")), [visits, query]);
  const hasReviewItems = visits.some((visit) => visit.state === reviewState);
  const selected = pending.find((visit) => visit.id === selectedId) ?? pending[0];
  const flags = selected ? reviewFlags(selected) : [];
  const photos = selected?.evidenceDataUrls?.filter((value) => typeof value === "string" && value.startsWith("data:image/")).slice(0, 8) ?? [];
  const activeLpu = lpuItems.filter((item) => item.active);

  function applyLpu() {
    if (!selected || selected.state !== reviewState) return;
    const code = lpuChoice[selected.id] ?? selected.lpuCode ?? "";
    const item = activeLpu.find((value) => value.code === code);
    if (!item) { setNotice("Selecione um item ativo da LPU antes de aplicar a cobrança."); return; }
    try {
      const latest = readVisits();
      const current = latest.find((visit) => visit.id === selected.id);
      if (!current || current.state !== reviewState) { setNotice("A OS mudou de situação. Atualize a fila antes de precificar."); setVisits(latest); return; }
      const updated = pricePendingVisit(latest, selected.id, item);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      appendFieldEvent({ ticket: selected.ticket, from: reviewState, to: reviewState, actor: "Gestor de Field Service", details: `LPU ${current.lpuCode || "não aplicada"} → ${item.code}. Precificação: R$ ${item.price.toFixed(2)} por ${item.unit}.` });
      setVisits(updated);
      window.dispatchEvent(new Event("oneit-demo-field-visits-updated"));
      setNotice(`${item.code} aplicada à OS ${selected.ticket}: R$ ${item.price.toFixed(2)} por ${item.unit}.`);
    } catch { setNotice("Não foi possível salvar a LPU no navegador. Tente novamente."); }
  }

  return <main className="min-h-screen bg-[#f5f7fa] text-slate-900">
    <DemoSidebar active="field-validation" />
    <div data-oneit-sidebar-offset className="min-h-screen min-w-0">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-5 lg:px-8">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#0b4b78]">Operação / Field Service</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#062c59]">Validação de OS</h1>
          <p className="mt-1 text-sm text-slate-600">Confira a entrega do técnico antes do encerramento gerencial.</p>
        </div>
        <Link href="/demo/field-service/queue-v2" className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-[#062c59] hover:bg-slate-50">Voltar à fila Field</Link>
      </header>

      <div className="mx-auto max-w-[1500px] space-y-4 p-4 lg:p-7">
        {notice && <p role="status" className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-[#062c59]">{notice}</p>}
        {hasReviewItems && <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600"><strong className="text-[#062c59]">{pending.length}</strong> OS aguardando conferência</p>
          <label className="w-full sm:w-80"><span className="sr-only">Buscar OS em validação</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar OS, serviço, polo ou técnico" className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" /></label>
        </div>}

        {!pending.length ? <section className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center"><h2 className="font-semibold text-[#062c59]">{hasReviewItems ? "Nenhuma OS corresponde à busca" : "Nenhuma OS aguardando validação"}</h2><p className="mt-2 text-sm text-slate-600">{hasReviewItems ? "Altere a busca para encontrar a OS." : "As OS finalizadas pelo técnico aparecerão aqui para conferência do gestor."}</p></section> :
        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(380px,0.9fr)_minmax(480px,1.1fr)]">
          <section aria-label="Ordens de serviço pendentes" className="min-w-0 self-start overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3"><h2 className="text-sm font-semibold text-[#062c59]">Aguardando decisão</h2></div>
            <div className="divide-y divide-slate-100">{pending.map((visit) => {
              const active = selected?.id === visit.id;
              const issues = reviewFlags(visit);
              return <button key={visit.id} type="button" onClick={() => setSelectedId(visit.id)} aria-pressed={active} className={"block w-full px-4 py-4 text-left transition hover:bg-slate-50 " + (active ? "bg-[#edf4fb]" : "")}>
                <span className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-[#062c59]">{visit.ticket}</strong><OneitStatusBadge tone={issues.length ? "warning" : "success"}>{issues.length ? issues.length + " ponto(s) a conferir" : "Dados completos"}</OneitStatusBadge></span>
                <span className="mt-1 block text-sm font-medium">{visit.title}</span>
                <span className="mt-1 block text-xs text-slate-600">{visit.department || visit.company || "Polo não informado"} · {visit.technician || "Técnico não informado"}</span>
                <span className="mt-1 block text-xs text-slate-500">Encerramento técnico: {completedLabel(visit.technicianCompletedAt ?? visit.checkedOutAt)}</span>
              </button>;
            })}</div>
          </section>

          {selected && <section id="oneit-validation-review" aria-label={"Conferência da OS " + selected.ticket} className="min-w-0 self-start overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Conferência da execução</p>
              <h2 className="mt-1 text-lg font-semibold text-[#062c59]">{selected.ticket} · {selected.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{[selected.company, selected.department, selected.address].filter(Boolean).join(" · ") || "Local não informado"}</p>
            </div>
            <div className="space-y-5 p-5">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div><p className="text-xs text-slate-500">Técnico</p><strong>{selected.technician || "Não informado"}</strong></div>
                <div><p className="text-xs text-slate-500">Encerramento técnico</p><strong>{completedLabel(selected.technicianCompletedAt ?? selected.checkedOutAt)}</strong></div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h3 className="text-sm font-semibold text-[#062c59]">Serviço executado</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{selected.technicalResolution?.trim() || "O técnico não registrou uma descrição da execução."}</p>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h3 className="text-sm font-semibold text-[#062c59]">Evidências</h3>
                <p className="mt-1 text-xs text-slate-600">{selected.photoCount ?? photos.length} foto(s) informada(s){selected.evidenceNotes || selected.additionalNotes ? " · Observação: " + (selected.evidenceNotes || selected.additionalNotes) : ""}</p>
                {photos.length ? <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{photos.map((source, index) => <img key={source + index} src={source} alt={"Evidência " + (index + 1) + " da OS " + selected.ticket} className="aspect-square w-full rounded-lg border border-slate-200 object-cover" />)}</div> : <p className="mt-2 text-xs text-slate-500">Não há imagem disponível para prévia nesta tela.</p>}
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h3 className="text-sm font-semibold text-[#062c59]">Materiais registrados pelo técnico</h3>
                {selected.materials?.length ? <ul className="mt-2 space-y-1 text-sm text-slate-700">{selected.materials.map((material, index) => <li key={material.id ?? index}>{material.description || "Material"} · {material.quantity ?? 0} {material.unit || "unidade(s)"}</li>)}</ul> : <p className="mt-2 text-sm text-slate-600">Nenhum material registrado. Serviços somente de mão de obra são válidos.</p>}
                <p className="mt-2 text-xs text-slate-500">Composição e cobrança são definidas pela LPU do gestor, não pelo consumo isolado de materiais.</p>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h3 className="text-sm font-semibold text-[#062c59]">Precificação da OS</h3>
                <p className="mt-1 text-xs text-slate-600">Selecione o serviço executado na LPU. O material registrado acima serve como evidência da execução; só é cobrado separadamente quando fizer parte da composição aprovada.</p>
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <label className="min-w-[220px] flex-1 text-xs font-semibold text-slate-700">Item LPU
                    <select value={lpuChoice[selected.id] ?? selected.lpuCode ?? ""} onChange={(event) => setLpuChoice((current) => ({ ...current, [selected.id]: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal">
                      <option value="">Selecione um item</option>
                      {activeLpu.map((item) => <option key={item.id} value={item.code}>{item.code} · {item.description} · R$ {item.price.toFixed(2)}/{item.unit}</option>)}
                    </select>
                  </label>
                  <button type="button" onClick={applyLpu} disabled={!activeLpu.length} className="min-h-10 rounded-lg bg-[#062c59] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Aplicar LPU</button>
                </div>
                <p className="mt-2 text-sm text-slate-600">Aplicada: <strong className="text-[#062c59]">{selected.lpuCode || "nenhuma"}</strong> · valor base <strong className="text-[#062c59]">R$ {(selected.quotedAmount ?? 0).toFixed(2)}</strong></p>
                {!activeLpu.length && <Link href="/demo/field-service/settings" className="mt-2 inline-flex text-sm font-semibold text-[#0b4b78]">Cadastrar item LPU →</Link>}
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h3 className="text-sm font-semibold text-[#062c59]">Aceite do responsável</h3>
                <p className="mt-1 text-sm">{selected.customerSignatureName || "Nome não informado"}</p>
                {selected.signatureDataUrl?.startsWith("data:image/") && <img src={selected.signatureDataUrl} alt={"Assinatura de " + selected.customerSignatureName} className="mt-2 h-28 max-w-full rounded-lg border border-slate-200 bg-white object-contain p-2" />}
              </div>

              {flags.length > 0 && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><strong>Antes de concluir:</strong> {flags.join(" · ")}.</div>}
              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <Link href={"/demo/tickets?ticket=" + encodeURIComponent(selected.ticket) + "&tab=Resolução"} className="inline-flex min-h-10 items-center rounded-lg bg-[#062c59] px-4 text-sm font-semibold text-white hover:bg-[#0b4b78]">Abrir decisão no chamado</Link>
              </div>
            </div>
          </section>}
        </div>}
      </div>
    </div>
  </main>;
}
