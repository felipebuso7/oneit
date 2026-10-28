"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { OneitEmptyState, OneitStatusBadge } from "@/components/oneit";

type Organization = { id: string; display_name: string };
type LpuItem = { id: string; organization_id: string; code: string; description: string; unit: string; unit_price: number; active: boolean };
type DraftLine = { lpuItemId: string; quantity: number };
type Composition = { id: string; organization_id: string; code: string; description: string; active: boolean; valid_from: string; valid_until: string | null; field_service_lpu_composition_lines?: Array<{ id: string; lpu_item_id: string; quantity: number; unit_price: number }> };

export function LpuCompositionsClient({ organizations, items }: { organizations: Organization[]; items: LpuItem[] }) {
  const [organizationId, setOrganizationId] = useState(organizations[0]?.id ?? "");
  const [compositions, setCompositions] = useState<Composition[]>([]);
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedQuantity, setSelectedQuantity] = useState("1");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const organizationItems = useMemo(() => items.filter((item) => item.organization_id === organizationId && item.active), [items, organizationId]);
  const draftTotal = useMemo(() => lines.reduce((sum, line) => { const item = organizationItems.find((value) => value.id === line.lpuItemId); return sum + (item ? Number(item.unit_price) * line.quantity : 0); }, 0), [lines, organizationItems]);

  async function loadCompositions(targetOrganizationId: string) {
    if (!targetOrganizationId) return;
    const response = await fetch(`/api/field-service/lpu/compositions?organizationId=${encodeURIComponent(targetOrganizationId)}`, { cache: "no-store" });
    const body = await response.json().catch(() => ({})) as { compositions?: Composition[]; code?: string };
    if (!response.ok) { setNotice(body.code === "LPU_COMPOSITIONS_UNAVAILABLE" ? "O cadastro de composições ainda não está disponível neste ambiente. A migration precisa ser aplicada no Supabase." : "Não foi possível carregar as composições."); return; }
    setCompositions(body.compositions ?? []);
  }

  // The effect synchronizes the selected organization with the server-backed list.
  // The async callback updates state only after the request resolves.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadCompositions(organizationId); }, [organizationId]);

  function addLine() {
    const quantity = Number(selectedQuantity);
    if (!selectedItemId || !Number.isFinite(quantity) || quantity <= 0) { setNotice("Selecione um item LPU e informe uma quantidade válida."); return; }
    setLines((current) => { const existing = current.find((line) => line.lpuItemId === selectedItemId); return existing ? current.map((line) => line.lpuItemId === selectedItemId ? { ...line, quantity: line.quantity + quantity } : line) : [...current, { lpuItemId: selectedItemId, quantity }]; });
    setSelectedItemId(""); setSelectedQuantity("1"); setNotice(null);
  }

  async function saveComposition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId || !code.trim() || !description.trim() || !lines.length) { setNotice("Informe organização, código, descrição e pelo menos um item LPU."); return; }
    setLoading(true); setNotice(null);
    const response = await fetch("/api/field-service/lpu/compositions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organizationId, code: code.trim().toUpperCase(), description: description.trim(), validFrom: validFrom || undefined, validUntil: validUntil || null, lines }) });
    const body = await response.json().catch(() => ({})) as { code?: string };
    setLoading(false);
    if (!response.ok) { setNotice(body.code === "LPU_COMPOSITION_ALREADY_EXISTS" ? "Este código de composição já existe nesta organização." : body.code === "LPU_COMPOSITION_NOT_AUTHORIZED" ? "Seu perfil não pode administrar composições desta organização." : body.code === "LPU_COMPOSITION_ITEM_NOT_FOUND" ? "Um dos itens não está mais vigente. Atualize a lista e tente novamente." : "Não foi possível salvar a composição."); return; }
    setCode(""); setDescription(""); setValidFrom(""); setValidUntil(""); setLines([]); setNotice("Composição salva com sucesso."); await loadCompositions(organizationId);
  }

  return <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-950">Composições de LPU</h2><p className="mt-1 max-w-2xl text-sm text-slate-500">Agrupe mão de obra, materiais e deslocamento em um serviço precificável. Os preços são congelados no momento do salvamento.</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{compositions.length} cadastrada(s)</span></div>{notice ? <p role="status" className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">{notice}</p> : null}<form onSubmit={saveComposition} className="mt-5 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 lg:grid-cols-4"><label className="grid gap-1 text-sm font-medium lg:col-span-2">Organização<select value={organizationId} onChange={(event) => { setOrganizationId(event.target.value); setLines([]); }} required className="rounded-lg border border-slate-300 bg-white p-2.5 font-normal"><option value="">Selecione</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.display_name}</option>)}</select></label><label className="grid gap-1 text-sm font-medium">Código<input value={code} onChange={(event) => setCode(event.target.value)} required placeholder="Ex.: CAB-01" className="rounded-lg border border-slate-300 bg-white p-2.5 font-normal" /></label><label className="grid gap-1 text-sm font-medium">Descrição<input value={description} onChange={(event) => setDescription(event.target.value)} required placeholder="Visita com cabeamento" className="rounded-lg border border-slate-300 bg-white p-2.5 font-normal" /></label><label className="grid gap-1 text-sm font-medium">Válida a partir de<input value={validFrom} onChange={(event) => setValidFrom(event.target.value)} type="date" className="rounded-lg border border-slate-300 bg-white p-2.5 font-normal" /></label><label className="grid gap-1 text-sm font-medium">Válida até<input value={validUntil} onChange={(event) => setValidUntil(event.target.value)} type="date" className="rounded-lg border border-slate-300 bg-white p-2.5 font-normal" /></label><div className="grid gap-1 text-sm font-medium lg:col-span-2"><span>Adicionar item vigente</span><div className="flex gap-2"><select value={selectedItemId} onChange={(event) => setSelectedItemId(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white p-2.5 font-normal"><option value="">Selecione material ou mão de obra</option>{organizationItems.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.description} · R$ {Number(item.unit_price).toFixed(2)} / {item.unit}</option>)}</select><input value={selectedQuantity} onChange={(event) => setSelectedQuantity(event.target.value)} type="number" min="0.001" step="0.001" aria-label="Quantidade do item" className="w-24 rounded-lg border border-slate-300 bg-white p-2.5 font-normal" /><button type="button" onClick={addLine} className="rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm font-semibold">Adicionar</button></div></div><div className="lg:col-span-4">{lines.length ? <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">{lines.map((line) => { const item = organizationItems.find((value) => value.id === line.lpuItemId); return <li key={line.lpuItemId} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm"><span>{item?.description ?? "Item não encontrado"} · {line.quantity} {item?.unit ?? ""}</span><span className="font-semibold">R$ {((item ? Number(item.unit_price) : 0) * line.quantity).toFixed(2).replace(".", ",")} <button type="button" onClick={() => setLines((current) => current.filter((value) => value.lpuItemId !== line.lpuItemId))} className="ml-2 text-xs font-semibold text-red-700">Remover</button></span></li>; })}<li className="flex justify-between bg-slate-50 p-3 text-sm font-semibold"><span>Total previsto</span><span>R$ {draftTotal.toFixed(2).replace(".", ",")}</span></li></ul> : <p className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500">Adicione os itens que compõem este serviço.</p>}</div><div className="lg:col-span-4"><button type="submit" disabled={loading || !lines.length} className="rounded-lg bg-[#092f40] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">{loading ? "Salvando…" : "Salvar composição"}</button></div></form>{compositions.length ? <div className="mt-5 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="p-3">Código</th><th className="p-3">Descrição</th><th className="p-3">Itens</th><th className="p-3">Vigência</th><th className="p-3">Status</th></tr></thead><tbody>{compositions.map((composition) => <tr key={composition.id} className="border-t"><td className="p-3 font-semibold">{composition.code}</td><td className="p-3">{composition.description}</td><td className="p-3">{composition.field_service_lpu_composition_lines?.length ?? 0}</td><td className="p-3">{composition.valid_from}{composition.valid_until ? ` até ${composition.valid_until}` : " em aberto"}</td><td className="p-3"><OneitStatusBadge tone={composition.active ? "success" : "neutral"}>{composition.active ? "Ativa" : "Inativa"}</OneitStatusBadge></td></tr>)}</tbody></table></div> : <div className="mt-5"><OneitEmptyState title="Nenhuma composição cadastrada" description="As composições salvas aparecerão aqui para consulta." /></div>}</section>;
}
