"use client";

import { FormEvent, useMemo, useState } from "react";
import { LPU_UNITS } from "@/lib/field-service/lpu-units";
import { formatLpuLabel } from "@/lib/field-service/lpu-label";
import { OneitButton, OneitEmptyState, OneitStatusBadge } from "@/components/oneit";

type Organization = { id: string; display_name: string };
type Item = { id: string; organization_id: string; code: string; description: string; unit: string; unit_price: number; valid_from: string; valid_until: string | null; kind: "material" | "mao_de_obra" | "deslocamento"; active: boolean };

export function LpuSettingsClient({ organizations, initialItems }: { organizations: Organization[]; initialItems: Item[] }) {
  const [items, setItems] = useState(initialItems);
  const [organizationId, setOrganizationId] = useState(organizations[0]?.id ?? "");
  const [kindFilter, setKindFilter] = useState<"all" | Item["kind"]>("all");
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const visibleItems = useMemo(() => items.filter((item) => item.organization_id === organizationId), [items, organizationId]);
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return visibleItems.filter((item) => {
      const matchesKind = kindFilter === "all" || item.kind === kindFilter;
      const matchesQuery = !normalizedQuery || `${item.code} ${item.description}`.toLocaleLowerCase().includes(normalizedQuery);
      return matchesKind && matchesQuery;
    });
  }, [kindFilter, query, visibleItems]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = { organizationId, code: String(form.get("code") ?? "").trim().toUpperCase(), description: String(form.get("description") ?? "").trim(), kind: String(form.get("kind") ?? "material"), unit: String(form.get("unit") ?? "unidade"), unitPrice: Number(form.get("unitPrice") ?? 0), validFrom: String(form.get("validFrom") ?? "") || undefined, validUntil: String(form.get("validUntil") ?? "") || null };
    if (!organizationId || !payload.code || !payload.description || !Number.isFinite(payload.unitPrice) || payload.unitPrice < 0) { setNotice("Selecione a organização e informe código, descrição e valor válido."); return; }
    const response = await fetch(editingId ? `/api/field-service/lpu/${editingId}` : "/api/field-service/lpu", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json().catch(() => ({})) as { item?: Item; code?: string };
    if (!response.ok || !body.item) { setNotice(body.code === "LPU_ITEM_ALREADY_EXISTS" ? "Este código já existe nesta organização." : "Não foi possível salvar o item LPU."); return; }
    setItems((current) => editingId ? current.map((item) => item.id === editingId ? body.item! : item) : [...current, body.item!]);
    setEditingId(null); event.currentTarget.reset(); setNotice(editingId ? "Item atualizado." : "Item cadastrado.");
  }

  function edit(item: Item) {
    setEditingId(item.id); setOrganizationId(item.organization_id);
    const form = document.querySelector<HTMLFormElement>("form[data-lpu-settings-form]");
    if (!form) return;
    for (const [name, value] of Object.entries({ code: item.code, description: item.description, kind: item.kind, unit: item.unit, unitPrice: String(item.unit_price), validFrom: item.valid_from, validUntil: item.valid_until ?? "" })) { const field = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null; if (field) field.value = value; }
  }

  function cancelEdit() {
    setEditingId(null);
    setNotice(null);
    const form = document.querySelector<HTMLFormElement>("form[data-lpu-settings-form]");
    form?.reset();
    setOrganizationId(organizations[0]?.id ?? "");
  }

  async function deactivate(item: Item) {
    const response = item.active
      ? await fetch(`/api/field-service/lpu/${item.id}?organizationId=${encodeURIComponent(item.organization_id)}`, { method: "DELETE" })
      : await fetch(`/api/field-service/lpu/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organizationId: item.organization_id, active: true }) });
    if (!response.ok) { setNotice(item.active ? "Não foi possível desativar o item." : "Não foi possível reativar o item."); return; }
    setItems((current) => current.map((value) => value.id === item.id ? { ...value, active: !item.active } : value)); setNotice(item.active ? "Item desativado." : "Item reativado.");
  }

  return <>
    {notice ? <p role="status" className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">{notice}</p> : null}
    <div className="mt-6 grid gap-5 lg:grid-cols-[22rem_1fr]">
      <form data-lpu-settings-form aria-label={editingId ? "Editar item da LPU" : "Cadastrar item da LPU"} onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-950">{editingId ? "Editar item" : "Novo item"}</h2><p className="mt-1 text-sm text-slate-500">Defina unidade e preço unitário para a composição da OS.</p>
        <div className="mt-4 grid gap-3">
          <label className="grid gap-1 text-sm font-medium">Organização<select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} required className="rounded-lg border border-slate-300 p-2.5 font-normal"><option value="">Selecione</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.display_name}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-medium">Código<input name="code" required className="rounded-lg border border-slate-300 p-2.5 font-normal" placeholder="Ex.: CAB-RJ45" /></label>
          <label className="grid gap-1 text-sm font-medium">Descrição<input name="description" required className="rounded-lg border border-slate-300 p-2.5 font-normal" placeholder="Serviço ou material" /></label>
          <label className="grid gap-1 text-sm font-medium">Tipo<select name="kind" defaultValue="material" className="rounded-lg border border-slate-300 p-2.5 font-normal"><option value="material">Material</option><option value="mao_de_obra">Mão de obra</option><option value="deslocamento">Deslocamento</option></select></label>
          <label className="grid gap-1 text-sm font-medium">Unidade<select name="unit" defaultValue="unidade" className="rounded-lg border border-slate-300 p-2.5 font-normal">{LPU_UNITS.map((unit) => <option key={unit}>{unit}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-medium">Valor unitário<input name="unitPrice" required type="number" min="0" step="0.01" className="rounded-lg border border-slate-300 p-2.5 font-normal" /></label>
           <label className="grid gap-1 text-sm font-medium">Válido a partir de<input name="validFrom" type="date" className="rounded-lg border border-slate-300 p-2.5 font-normal" /></label>
           <label className="grid gap-1 text-sm font-medium">Válido até (opcional)<input name="validUntil" type="date" className="rounded-lg border border-slate-300 p-2.5 font-normal" /></label>
        </div>
        <div className="mt-4 flex gap-2"><OneitButton type="submit">{editingId ? "Atualizar item" : "Salvar item"}</OneitButton>{editingId ? <button type="button" onClick={cancelEdit} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Cancelar edição</button> : null}</div>
      </form>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Itens da organização</h2><p className="mt-1 text-sm text-slate-500">Somente itens ativos podem ser usados em novas validações.</p></div><div className="flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">Todos: {visibleItems.length}</span><span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-800">Ativos: {visibleItems.filter((item) => item.active).length}</span></div></div><div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><label className="sr-only" htmlFor="lpu-search">Pesquisar item LPU</label><input id="lpu-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar por código ou descrição" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /><div className="flex flex-wrap gap-2" aria-label="Filtrar itens LPU"><button type="button" onClick={() => setKindFilter("all")} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${kindFilter === "all" ? "border-sky-800 bg-sky-50 text-sky-950" : "border-slate-300 text-slate-600"}`}>Todos</button><button type="button" onClick={() => setKindFilter("material")} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${kindFilter === "material" ? "border-sky-800 bg-sky-50 text-sky-950" : "border-slate-300 text-slate-600"}`}>Materiais</button><button type="button" onClick={() => setKindFilter("mao_de_obra")} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${kindFilter === "mao_de_obra" ? "border-sky-800 bg-sky-50 text-sky-950" : "border-slate-300 text-slate-600"}`}>Mão de obra</button><button type="button" onClick={() => setKindFilter("deslocamento")} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${kindFilter === "deslocamento" ? "border-sky-800 bg-sky-50 text-sky-950" : "border-slate-300 text-slate-600"}`}>Deslocamento</button></div></div>
        {filteredItems.length ? <ul className="mt-4 divide-y divide-slate-100">{filteredItems.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-4 py-3"><div><strong>{formatLpuLabel({ code: item.code, description: item.description, unit: item.unit, price: item.unit_price })}</strong><p className="mt-1 text-sm text-slate-500">{item.kind === "mao_de_obra" ? "Mão de obra" : item.kind === "deslocamento" ? "Deslocamento" : "Material"} · R$ {Number(item.unit_price).toFixed(2).replace(".", ",")}</p><p className="mt-1 text-xs text-slate-400">Vigência: {item.valid_from ? new Date(`${item.valid_from}T00:00:00`).toLocaleDateString("pt-BR") : "imediata"}{item.valid_until ? ` até ${new Date(`${item.valid_until}T00:00:00`).toLocaleDateString("pt-BR")}` : " em aberto"}</p></div><div className="flex items-center gap-2"><OneitStatusBadge tone={item.active ? "success" : "neutral"}>{item.active ? "Ativo" : "Inativo"}</OneitStatusBadge><button type="button" onClick={() => edit(item)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold">Editar</button><button type="button" onClick={() => void deactivate(item)} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${item.active ? "border-red-200 text-red-700" : "border-sky-200 text-sky-700"}`}>{item.active ? "Desativar" : "Reativar"}</button></div></li>)}</ul> : <div className="mt-5"><OneitEmptyState title="Nenhum item encontrado" description={kindFilter === "all" ? "Cadastre o primeiro material, serviço ou item de mão de obra da LPU." : "Não há itens desse tipo para esta organização."} /></div>}
      </section>
    </div>
  </>;
}
