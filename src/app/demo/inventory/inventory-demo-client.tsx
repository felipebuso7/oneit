"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { DemoSidebar } from "@/components/demo-sidebar";
import { DemoModeBanner } from "@/components/demo-mode-banner";

type AssetStatus = "Ativo" | "Em manutenção" | "Desativado";
type Asset = { id: string; name: string; type: string; status: AssetStatus; company: string; department: string; assignee: string; serial: string; model: string; manufacturer: string; cost: string; notes?: string };

const initialAssets: Asset[] = [
  { id: "AST-000392", name: "NB-FIN-0392", type: "Notebook", status: "Ativo", company: "Servicia", department: "Financeiro", assignee: "Mariana Souza", serial: "PF0FML8Z", model: "ThinkPad E14", manufacturer: "Lenovo", cost: "R$ 4.890,00" },
  { id: "AST-000418", name: "MOB-0418", type: "Celular", status: "Ativo", company: "Servicia", department: "Operações", assignee: "Carlos Lima", serial: "351584940805078", model: "Moto G54", manufacturer: "Motorola", cost: "R$ 1.350,00" },
  { id: "AST-000156", name: "NB-COM-0156", type: "Notebook", status: "Ativo", company: "OneIT", department: "Comercial", assignee: "Jéssica Soares", serial: "BRM435F1QL", model: "ProBook 250", manufacturer: "HP", cost: "R$ 3.950,00" },
  { id: "AST-000216", name: "MON-0216", type: "Monitor", status: "Em manutenção", company: "Servicia", department: "Tecnologia", assignee: "Rafael Bento", serial: "10VP9XA002088", model: "24B3HM", manufacturer: "AOC", cost: "R$ 630,00" },
];

const statusTone = (status: AssetStatus) => status === "Ativo" ? "bg-emerald-50 text-emerald-700" : status === "Em manutenção" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600";
const emptyAsset = (): Asset => ({ id: "", name: "", type: "Notebook", status: "Ativo", company: "Servicia", department: "Tecnologia", assignee: "", serial: "", model: "", manufacturer: "", cost: "", notes: "" });

function Status({ value }: { value: AssetStatus }) {
  return <span className={"rounded-full px-2.5 py-1 text-xs font-semibold " + statusTone(value)}>{value}</span>;
}

function EditorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-xs font-semibold text-slate-600"><span className="mb-1.5 block">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-[#0c526c]" /></label>;
}

export default function InventoryDemoClient() {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [selected, setSelected] = useState<Asset | null>(null);
  const [draft, setDraft] = useState<Asset | null>(null);
  const [tab, setTab] = useState("Principal");
  const [assetTypes, setAssetTypes] = useState(["Notebook", "Celular", "Monitor"]);
  const [companies, setCompanies] = useState(["Servicia", "OneIT"]);
  const [departments, setDepartments] = useState(["Financeiro", "Operações", "Comercial", "Tecnologia", "Patrimônio"]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Todos" | AssetStatus>("Todos");
  const [newAssetOpen, setNewAssetOpen] = useState(false);
  const [newAsset, setNewAsset] = useState<Asset>(emptyAsset);
  const [hydrated, setHydrated] = useState(false);
  const [notice, setNotice] = useState("Selecione um ativo para consultar ou alterar seus dados.");

  /* eslint-disable react-hooks/set-state-in-effect -- hidrata o estado demonstrativo persistido no navegador. */
  useEffect(() => {
    try {
      const savedAssets = JSON.parse(window.localStorage.getItem("oneit.demo.assets.v1") ?? "null") as Asset[] | null;
      const settings = JSON.parse(window.localStorage.getItem("oneit.demo.settings.v1") ?? "{}") as { companies?: Array<{ name: string; active: boolean }>; departments?: Array<{ name: string; active: boolean }>; assetTypes?: Array<{ name: string; active: boolean }> };
      if (Array.isArray(savedAssets) && savedAssets.length > 0) setAssets(savedAssets);
      const configuredCompanies = (settings.companies ?? []).filter((item) => item.active).map((item) => item.name);
      const configuredDepartments = (settings.departments ?? []).filter((item) => item.active).map((item) => item.name);
      const configuredTypes = (settings.assetTypes ?? []).filter((item) => item.active).map((item) => item.name);
      if (configuredCompanies.length) setCompanies(configuredCompanies);
      if (configuredDepartments.length) setDepartments(configuredDepartments);
      if (configuredTypes.length) setAssetTypes(configuredTypes);
    } catch {
      window.localStorage.removeItem("oneit.demo.assets.v1");
    } finally {
      setHydrated(true);
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (hydrated) window.localStorage.setItem("oneit.demo.assets.v1", JSON.stringify(assets));
  }, [assets, hydrated]);

  const filteredAssets = useMemo(() => assets.filter((asset) => {
    const matchesText = [asset.name, asset.serial, asset.id, asset.assignee].join(" ").toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
    return matchesText && (statusFilter === "Todos" || asset.status === statusFilter);
  }), [assets, query, statusFilter]);

  const openAsset = (asset: Asset) => { setSelected(asset); setDraft({ ...asset }); setTab("Principal"); };
  const updateDraft = (field: keyof Asset, value: string) => setDraft((current) => current ? { ...current, [field]: value } : current);
  const saveAsset = () => {
    if (!draft || !draft.name.trim() || !draft.serial.trim()) { setNotice("Nome e serial são obrigatórios para salvar o ativo."); return; }
    const saved = { ...draft, name: draft.name.trim(), serial: draft.serial.trim() };
    setAssets((current) => current.map((item) => item.id === saved.id ? saved : item));
    setSelected(saved);
    setDraft(saved);
    setNotice("Ativo " + saved.id + " atualizado e mantido no inventário demonstrativo.");
  };
  const createAsset = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newAsset.name.trim() || !newAsset.serial.trim()) return;
    const created = { ...newAsset, id: "AST-" + String(Date.now()).slice(-6), name: newAsset.name.trim(), serial: newAsset.serial.trim(), assignee: newAsset.assignee.trim() || "Sem responsável", model: newAsset.model.trim() || "Não informado", manufacturer: newAsset.manufacturer.trim() || "Não informado", cost: newAsset.cost.trim() || "Não informado" };
    setAssets((current) => [created, ...current]);
    setNewAssetOpen(false);
    openAsset(created);
    setNotice("Ativo cadastrado e pronto para detalhamento.");
  };

  return <main className="min-h-screen bg-[#f5f6f8] text-slate-900"><DemoModeBanner />
    <DemoSidebar active="inventory" />
    <section data-oneit-sidebar-offset className="ml-64 min-h-screen">
      <header className="flex min-h-[62px] flex-wrap items-center justify-between gap-2 border-b border-slate-300 bg-white px-5 py-2"><div><p className="text-[11px] font-bold uppercase tracking-[.15em] text-orange-500">Inventário operacional</p><h1 className="mt-0.5 text-lg font-bold">Ativos</h1></div><div className="flex items-center gap-1"><button type="button" onClick={() => setNotice("Exportação será conectada ao relatório na etapa de banco de dados.")} className="oneit-grid-action border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold">Exportar</button><button type="button" onClick={() => { setNewAsset({ ...emptyAsset(), type: assetTypes[0] ?? "Notebook", company: companies[0] ?? "Servicia", department: departments[0] ?? "Tecnologia" }); setNewAssetOpen(true); }} className="oneit-grid-action border border-orange-500 bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white">+ Novo ativo</button></div></header>
      <div className="p-3 sm:p-4"><div className="oneit-operational-band flex items-center justify-between gap-3 border border-[#103c98] bg-[#123f99] px-4 py-3 text-white"><div><p className="text-xs font-semibold">Base de ativos</p><p className="mt-0.5 text-xs text-blue-100">Ativos vinculados a empresas, departamentos e responsáveis.</p></div><span className="text-xs text-blue-100">{filteredAssets.length} de {assets.length} registros</span></div><div className="mt-3 flex flex-wrap gap-2 border border-slate-300 bg-white p-2"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, serial, patrimônio ou responsável" className="min-w-64 flex-1 border border-slate-400 px-3 py-2 text-sm outline-none focus:border-[#123f99]" /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "Todos" | AssetStatus)} className="border border-slate-400 px-3 text-sm"><option value="Todos">Todos os status</option><option>Ativo</option><option>Em manutenção</option><option>Desativado</option></select></div><p aria-live="polite" className="my-2 text-xs text-slate-500">{notice}</p><div className="overflow-x-auto border border-slate-300 bg-white"><table className="oneit-operational-grid w-full min-w-[950px] text-left text-sm"><thead className="bg-[#f4f5f7] text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Status</th><th className="px-3 py-3">Ativo</th><th className="px-3 py-3">Tipo</th><th className="px-3 py-3">Responsável</th><th className="px-3 py-3">Empresa / Departamento</th><th className="px-3 py-3">Serial</th></tr></thead><tbody>{filteredAssets.map((asset) => <tr key={asset.id} onClick={() => openAsset(asset)} className="cursor-pointer border-t border-slate-200 transition hover:bg-[#eef4ff]"><td className="px-3 py-2"><Status value={asset.status} /></td><td className="px-3 py-2"><p className="font-semibold text-[#123f99]">{asset.name}</p><p className="text-xs text-slate-400">{asset.id}</p></td><td className="px-3 py-2">{asset.type}</td><td className="px-3 py-2">{asset.assignee}</td><td className="px-3 py-2"><p>{asset.company}</p><p className="text-xs text-slate-400">{asset.department}</p></td><td className="px-3 py-2 font-mono text-xs">{asset.serial}</td></tr>)}</tbody></table></div></div>
    </section>

    {newAssetOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-5"><form onSubmit={createAsset} className="w-full max-w-2xl rounded-xl bg-white p-7 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-500">INVENTÁRIO OPERACIONAL</p><h2 className="mt-1 text-xl font-bold">Cadastrar ativo</h2><p className="mt-1 text-sm text-slate-500">Use a base de empresas, departamentos e tipos parametrizada.</p></div><button type="button" onClick={() => setNewAssetOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">✕</button></div><AssetForm asset={newAsset} setField={(field, value) => setNewAsset((current) => ({ ...current, [field]: value }))} assetTypes={assetTypes} companies={companies} departments={departments} /><div className="mt-7 flex justify-end gap-3"><button type="button" onClick={() => setNewAssetOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancelar</button><button type="submit" className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white">Cadastrar ativo</button></div></form></div>}

    {selected && draft && <><button aria-label="Fechar detalhes" onClick={() => setSelected(null)} className="fixed inset-0 z-30 bg-slate-950/35" /><aside className="fixed inset-y-0 right-0 z-40 w-full max-w-2xl overflow-y-auto bg-white shadow-2xl"><div className="sticky top-0 flex items-start justify-between border-b border-slate-200 bg-white px-7 pt-6"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-500">ATIVO {selected.id}</p><h2 className="mt-1 text-xl font-bold">{selected.name}</h2></div><button onClick={() => setSelected(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">✕</button></div><div className="flex gap-5 border-b border-slate-200 px-7">{["Principal", "Campos extras", "Histórico"].map((item) => <button key={item} onClick={() => setTab(item)} className={tab === item ? "border-b-2 border-orange-500 py-4 text-sm font-semibold text-[#092f40]" : "border-b-2 border-transparent py-4 text-sm font-semibold text-slate-500"}>{item}</button>)}</div><div className="space-y-5 p-7">{tab === "Principal" && <><AssetForm asset={draft} setField={updateDraft} assetTypes={assetTypes} companies={companies} departments={departments} /><label className="block text-xs font-semibold text-slate-600"><span className="mb-1.5 block">Comentários e observações</span><textarea value={draft.notes ?? ""} onChange={(event) => updateDraft("notes", event.target.value)} rows={7} className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800" placeholder="Histórico operacional, termo de responsabilidade, garantia ou observações..." /></label></>}{tab === "Campos extras" && <div className="grid grid-cols-2 gap-4"><EditorField label="Data da última manutenção" value="Não registrada" onChange={() => undefined} /><EditorField label="Garantia" value="Até 12/2027" onChange={() => undefined} /><EditorField label="Sistema operacional" value="Windows 11 Pro" onChange={() => undefined} /><EditorField label="Centro de custo" value={draft.department} onChange={() => undefined} /></div>}{tab === "Histórico" && <ol className="space-y-4 border-l-2 border-slate-200 pl-5 text-sm"><li><p className="font-semibold">Cadastro ou última alteração</p><p className="text-slate-500">Registro associado a {selected.company} / {selected.department}.</p></li><li><p className="font-semibold">Vínculo de responsável</p><p className="text-slate-500">Responsável atual: {selected.assignee}.</p></li></ol>}<div className="flex justify-end gap-3 border-t border-slate-200 pt-5"><button onClick={() => { setDraft({ ...selected }); setNotice("Alterações descartadas."); }} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold">Descartar</button><button onClick={saveAsset} className="rounded-lg bg-[#0c526c] px-4 py-2 text-sm font-semibold text-white">Salvar alterações</button></div></div></aside></>}
  </main>;
}

function AssetForm({ asset, setField, assetTypes, companies, departments }: { asset: Asset; setField: (field: keyof Asset, value: string) => void; assetTypes: string[]; companies: string[]; departments: string[] }) {
  return <div className="mt-6 grid grid-cols-2 gap-4"><EditorField label="Nome" value={asset.name} onChange={(value) => setField("name", value)} /><label className="block text-xs font-semibold text-slate-600"><span className="mb-1.5 block">Tipo de ativo</span><select value={asset.type} onChange={(event) => setField("type", event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm">{assetTypes.map((item) => <option key={item}>{item}</option>)}</select></label><label className="block text-xs font-semibold text-slate-600"><span className="mb-1.5 block">Status</span><select value={asset.status} onChange={(event) => setField("status", event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"><option>Ativo</option><option>Em manutenção</option><option>Desativado</option></select></label><EditorField label="Patrimônio" value={asset.id || "Gerado ao salvar"} onChange={() => undefined} /><EditorField label="Serial" value={asset.serial} onChange={(value) => setField("serial", value)} /><EditorField label="Responsável" value={asset.assignee} onChange={(value) => setField("assignee", value)} /><label className="block text-xs font-semibold text-slate-600"><span className="mb-1.5 block">Empresa</span><select value={asset.company} onChange={(event) => setField("company", event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm">{companies.map((item) => <option key={item}>{item}</option>)}</select></label><label className="block text-xs font-semibold text-slate-600"><span className="mb-1.5 block">Departamento</span><select value={asset.department} onChange={(event) => setField("department", event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm">{departments.map((item) => <option key={item}>{item}</option>)}</select></label><EditorField label="Fabricante" value={asset.manufacturer} onChange={(value) => setField("manufacturer", value)} /><EditorField label="Modelo" value={asset.model} onChange={(value) => setField("model", value)} /><EditorField label="Custo" value={asset.cost} onChange={(value) => setField("cost", value)} /></div>;
}
