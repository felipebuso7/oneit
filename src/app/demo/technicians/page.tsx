"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { DemoSidebar } from "@/components/demo-sidebar";
import { isValidEmail, isValidPhone } from "@/lib/field-service/validation";

type ModuleKey = "OPERATION" | "SERVICE_MANAGEMENT" | "FIELD_SERVICE" | "FISCAL" | "SGSTI" | "ADMINISTRATION";
type Tab = "principal" | "privilegios" | "historico";
type Entry = { at: string; author: string; message: string };
type Technician = {
  id: string; name: string; email: string; role: "Técnico interno" | "Técnico parceiro" | "Analista" | "Gestor";
  active: boolean; phone: string; mobile: string; jobTitle: string; hourlyCost: string; externalReference: string; baseAddress?: string; availability?: string;
  scope: "Todos os locais" | "Somente atribuições" | "Mesmo nível" | "Locais selecionados";
  modules: ModuleKey[]; permissions: string[]; history: Entry[];
};

const storageKey = "oneit.demo.technicians.v1";
const modules: Array<{ key: ModuleKey; label: string; description: string }> = [
  { key: "OPERATION", label: "Operação", description: "Chamados, caixa de entrada e acompanhamento." },
  { key: "SERVICE_MANAGEMENT", label: "Gestão de serviços", description: "Problemas, mudanças, ativos e fornecedores." },
  { key: "FIELD_SERVICE", label: "Field Service", description: "Fila de campo, rotas e atendimento técnico." },
  { key: "FISCAL", label: "Faturamento", description: "Boletins de medição, lotes fiscais e histórico." },
  { key: "SGSTI", label: "SGSTI", description: "Agenda, documentos, evidências e auditorias." },
  { key: "ADMINISTRATION", label: "Administração", description: "Usuários, parâmetros e relatórios." },
];
const permissions = [
  { key: "OPERATION_TICKETS_VIEW", module: "OPERATION", label: "Visualizar chamados" },
  { key: "OPERATION_TICKETS_UPDATE", module: "OPERATION", label: "Atualizar chamados" },
  { key: "FIELD_SERVICE_VIEW", module: "FIELD_SERVICE", label: "Visualizar Field Service" },
  { key: "FIELD_SERVICE_EXECUTE", module: "FIELD_SERVICE", label: "Executar atendimento de campo" },
  { key: "FISCAL_VIEW", module: "FISCAL", label: "Consultar faturamento" },
  { key: "FISCAL_MANAGE", module: "FISCAL", label: "Gerenciar BM e lotes fiscais" },
  { key: "SERVICE_MANAGEMENT_VIEW", module: "SERVICE_MANAGEMENT", label: "Consultar gestão de serviços" },
  { key: "SERVICE_MANAGEMENT_MANAGE", module: "SERVICE_MANAGEMENT", label: "Gerenciar serviços" },
  { key: "SGSTI_VIEW", module: "SGSTI", label: "Consultar SGSTI" },
  { key: "SGSTI_EXECUTE", module: "SGSTI", label: "Executar ritos SGSTI" },
  { key: "SGSTI_AUDIT", module: "SGSTI", label: "Conduzir auditorias" },
  { key: "ADMINISTRATION_USERS", module: "ADMINISTRATION", label: "Gerenciar usuários e técnicos" },
  { key: "ADMINISTRATION_SETTINGS", module: "ADMINISTRATION", label: "Gerenciar configurações" },
  { key: "ADMINISTRATION_REPORTS", module: "ADMINISTRATION", label: "Consultar relatórios" },
] as const;

const seed: Technician[] = [
  { id: "tec-joao", name: "João da Silva", email: "joao.silva@servicia.com.br", role: "Técnico interno", active: true, phone: "(11) 3333-1000", mobile: "(11) 98888-1000", jobTitle: "Técnico de campo", hourlyCost: "85,00", externalReference: "", scope: "Somente atribuições", modules: ["OPERATION", "FIELD_SERVICE"], permissions: ["OPERATION_TICKETS_VIEW", "OPERATION_TICKETS_UPDATE", "FIELD_SERVICE_VIEW", "FIELD_SERVICE_EXECUTE"], history: [{ at: "15/10/2026 10:20", author: "Administrador", message: "Perfil técnico criado com acesso a Operação e Field Service." }] },
  { id: "gov-ana", name: "Ana Martins", email: "ana.martins@servicia.com.br", role: "Analista", active: true, phone: "", mobile: "(11) 97777-2200", jobTitle: "Analista de governança", hourlyCost: "", externalReference: "", scope: "Todos os locais", modules: ["SGSTI"], permissions: ["SGSTI_VIEW", "SGSTI_EXECUTE", "SGSTI_AUDIT"], history: [{ at: "15/10/2026 09:10", author: "Administrador", message: "Acesso SGSTI atribuído." }] },
  { id: "gestor-felipe", name: "Felipe Buso", email: "felipe.buso@servicia.com.br", role: "Gestor", active: true, phone: "", mobile: "(11) 96666-3000", jobTitle: "Gestor de serviços", hourlyCost: "", externalReference: "", scope: "Todos os locais", modules: ["OPERATION", "SERVICE_MANAGEMENT", "FIELD_SERVICE", "FISCAL", "ADMINISTRATION"], permissions: ["OPERATION_TICKETS_VIEW", "OPERATION_TICKETS_UPDATE", "FIELD_SERVICE_VIEW", "SERVICE_MANAGEMENT_VIEW", "SERVICE_MANAGEMENT_MANAGE", "ADMINISTRATION_USERS", "ADMINISTRATION_SETTINGS", "ADMINISTRATION_REPORTS", "FISCAL_VIEW", "FISCAL_MANAGE"], history: [{ at: "14/10/2026 17:40", author: "Administrador", message: "Perfil gerencial cadastrado com acesso à operação e ao ciclo de faturamento." }] },
  { id: "parceiro-andre", name: "André Isola", email: "andre.isola@parceiro.com", role: "Técnico parceiro", active: true, phone: "", mobile: "(11) 95555-4411", jobTitle: "Técnico de redes", hourlyCost: "115,50", externalReference: "OS parceiro 12345", scope: "Somente atribuições", modules: ["FIELD_SERVICE"], permissions: ["FIELD_SERVICE_VIEW", "FIELD_SERVICE_EXECUTE"], history: [{ at: "13/10/2026 11:05", author: "Administrador", message: "Técnico parceiro vinculado para execução de campo." }] },
];

function now() { return new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }); }
function toggle(values: string[], value: string) { return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]; }

export default function TechniciansPage() {
  const [people, setPeople] = useState<Technician[]>(() => {
    if (typeof window === "undefined") return seed;
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "") as Technician[];
      return Array.isArray(saved) && saved.length ? saved : seed;
    } catch { return seed; }
  });
  const [selectedId, setSelectedId] = useState(() => {
    if (typeof window === "undefined") return seed[0].id;
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "") as Technician[];
      return Array.isArray(saved) && saved.length ? saved[0].id : seed[0].id;
    } catch { return seed[0].id; }
  });
  const [tab, setTab] = useState<Tab>("principal");
  const [filter, setFilter] = useState("");
  const [notice, setNotice] = useState("Selecione uma pessoa para revisar cadastro e acesso.");
  const organizationIdKey = "oneit.demo.organization-id.v1";

  useEffect(() => { window.localStorage.setItem(storageKey, JSON.stringify(people)); }, [people]);
  useEffect(() => {
    const organizationId = window.localStorage.getItem(organizationIdKey);
    if (!organizationId) return;
    fetch(`/api/field-service/technicians?organizationId=${encodeURIComponent(organizationId)}`).then(async (response) => response.ok ? response.json() : null).then((payload: { technicians?: Array<{ id: string; name: string; email: string; phone: string | null; mobile: string | null; job_title: string | null; hourly_cost: number | null; base_address: string | null; active: boolean }> } | null) => {
      if (!payload?.technicians?.length) return;
      const mapped: Technician[] = payload.technicians.map((item) => ({ id: item.id, name: item.name, email: item.email, role: "Técnico interno", active: item.active, phone: item.phone ?? "", mobile: item.mobile ?? "", jobTitle: item.job_title ?? "", hourlyCost: item.hourly_cost == null ? "" : String(item.hourly_cost), externalReference: "", baseAddress: item.base_address ?? "", availability: "", scope: "Somente atribuições", modules: ["OPERATION", "FIELD_SERVICE"], permissions: ["OPERATION_TICKETS_VIEW", "FIELD_SERVICE_VIEW", "FIELD_SERVICE_EXECUTE"], history: [{ at: now(), author: "Cadastro", message: "Perfil carregado do cadastro persistente." }] }));
      setPeople(mapped); setSelectedId(mapped[0].id); setNotice("Técnicos carregados do cadastro persistente.");
    }).catch(() => undefined);
  }, []);

  const selected = people.find((person) => person.id === selectedId) ?? people[0];
  const visiblePeople = useMemo(() => people.filter((person) => (person.name + person.email + person.role).toLocaleLowerCase().includes(filter.toLocaleLowerCase())), [people, filter]);
  const updateSelected = (patch: Partial<Technician>, eventMessage?: string) => {
    setPeople((current) => current.map((person) => person.id === selected.id ? { ...person, ...patch, history: eventMessage ? [{ at: now(), author: "Administrador", message: eventMessage }, ...person.history] : person.history } : person));
  };
  const savePrincipal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const mobile = String(form.get("mobile") ?? "").trim();
    if (!isValidEmail(email)) { setNotice("Informe um e-mail válido para o técnico."); return; }
    if (mobile && !isValidPhone(mobile)) { setNotice("Informe um celular com DDD válido."); return; }
    if (people.some((person) => person.id !== selected.id && person.email.toLowerCase() === email)) { setNotice("Este e-mail já está vinculado a outro usuário/técnico."); return; }
    const organizationId = localStorage.getItem(organizationIdKey);
    if (organizationId) {
      const isRemote = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(selected.id);
      const payload = { organizationId, name: String(form.get("name") ?? "").trim(), email, technicianType: String(form.get("technicianType") ?? "internal"), phone: String(form.get("phone") ?? "").trim() || undefined, mobile, jobTitle: String(form.get("jobTitle") ?? "").trim() || undefined, hourlyCost: String(form.get("hourlyCost") ?? "").trim() ? Number(String(form.get("hourlyCost")).replace(",", ".")) : null, baseAddress: String(form.get("baseAddress") ?? "").trim() || undefined };
      const response = await fetch(isRemote ? `/api/field-service/technicians/${selected.id}` : "/api/field-service/technicians", { method: isRemote ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (response.ok) {
        const result = await response.json() as { technician?: { id: string; name: string; email: string; phone: string | null; mobile: string | null; job_title: string | null; hourly_cost: number | null; base_address: string | null; active: boolean } };
        if (result.technician) updateSelected({ id: result.technician.id, name: result.technician.name, email: result.technician.email, phone: result.technician.phone ?? "", mobile: result.technician.mobile ?? "", jobTitle: result.technician.job_title ?? "", hourlyCost: result.technician.hourly_cost == null ? "" : String(result.technician.hourly_cost), baseAddress: result.technician.base_address ?? "", active: result.technician.active }, "Cadastro técnico persistido.");
        setNotice("Cadastro técnico salvo no cadastro persistente."); return;
      }
    }
    updateSelected({ name: String(form.get("name") ?? "").trim(), email, phone: String(form.get("phone") ?? "").trim(), mobile, jobTitle: String(form.get("jobTitle") ?? "").trim(), hourlyCost: String(form.get("hourlyCost") ?? "").trim(), externalReference: String(form.get("externalReference") ?? "").trim(), baseAddress: String(form.get("baseAddress") ?? "").trim(), availability: String(form.get("availability") ?? "").trim(), scope: String(form.get("scope")) as Technician["scope"] }, "Cadastro técnico atualizado.");
    setNotice("Cadastro salvo e registrado no histórico.");
  };
  const simulateAccess = () => {
    window.localStorage.setItem("oneit.demo.current-access.v1", JSON.stringify(selected.modules));
    window.dispatchEvent(new Event("oneit-demo-access-updated"));
    setNotice("Prévia de menu aplicada para " + selected.name + ". Esta simulação não altera a conta autenticada.");
  };
  const copyProfile = (sourceId: string) => {
    const source = people.find((person) => person.id === sourceId); if (!source || source.id === selected.id) return;
    updateSelected({ modules: source.modules, permissions: source.permissions, scope: source.scope }, "Privilégios copiados de " + source.name + ".");
    setNotice("Privilégios copiados. Revise antes de salvar em produção.");
  };
  const createTechnician = () => {
    const id = "tec-" + Date.now().toString(36);
    const person: Technician = { id, name: "Novo técnico", email: "", role: "Técnico interno", active: true, phone: "", mobile: "", jobTitle: "", hourlyCost: "", externalReference: "", scope: "Somente atribuições", modules: ["OPERATION", "FIELD_SERVICE"], permissions: ["OPERATION_TICKETS_VIEW", "FIELD_SERVICE_VIEW", "FIELD_SERVICE_EXECUTE"], history: [{ at: now(), author: "Administrador", message: "Cadastro técnico iniciado." }] };
    setPeople((current) => [person, ...current]); setSelectedId(id); setTab("principal"); setNotice("Novo técnico criado. Complete o cadastro e revise os privilégios.");
  };

  return <main className="min-h-screen bg-[#f5f6f8] text-slate-900"><DemoSidebar active="technicians" /><div data-oneit-sidebar-offset className="ml-64 min-h-screen"><header className="flex min-h-[62px] flex-wrap items-center justify-between gap-3 border-b border-slate-300 bg-white px-5 py-2"><div><p className="text-[11px] font-bold uppercase tracking-[.15em] text-orange-600">Administração · pessoas e acesso</p><h1 className="mt-0.5 text-lg font-semibold">Usuários e técnicos</h1></div><button type="button" onClick={createTechnician} className="oneit-grid-action border border-[#123f99] bg-[#123f99] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#0f347f]">+ Adicionar técnico</button></header>
    <div className="p-3 sm:p-4"><p role="status" className="border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950">{notice}</p>
      <div className="mt-3 grid gap-3 xl:grid-cols-[300px_minmax(0,1fr)]"><aside className="overflow-hidden border border-slate-300 bg-white"><div className="border-b border-slate-200 p-3"><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">Pessoas cadastradas</p><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Pesquisar pessoa" className="mt-3 w-full rounded border border-slate-300 px-3 py-2 text-sm" /></div><div className="max-h-[calc(100vh-220px)] overflow-y-auto">{visiblePeople.map((person) => <button type="button" key={person.id} onClick={() => { setSelectedId(person.id); setTab("principal"); }} className={"w-full border-b border-slate-100 px-3 py-2.5 text-left transition hover:bg-slate-50 " + (person.id === selected.id ? "border-l-4 border-l-[#123f99] bg-[#edf5ff]" : "border-l-4 border-l-transparent")}><span className="flex items-center justify-between gap-2"><strong className="text-sm">{person.name}</strong><span className={"h-2.5 w-2.5 rounded-full " + (person.active ? "bg-lime-500" : "bg-slate-300")} /></span><span className="mt-1 block text-xs text-slate-500">{person.role} · {person.modules.length} módulo(s)</span></button>)}{!visiblePeople.length && <p className="p-4 text-sm text-slate-500">Nenhuma pessoa encontrada.</p>}</div></aside>
        <section className="overflow-hidden rounded-md border border-slate-300 bg-white"><div className="border-b border-slate-200 px-5 pt-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">Editar técnico / usuário</p><h2 className="mt-1 text-lg font-semibold">{selected.name}</h2></div><span className={"rounded-full px-3 py-1 text-xs font-semibold " + (selected.active ? "bg-lime-100 text-lime-800" : "bg-slate-100 text-slate-600")}>{selected.active ? "Habilitado" : "Desabilitado"}</span></div><nav aria-label="Abas do cadastro" className="mt-5 flex gap-5"><button type="button" onClick={() => setTab("principal")} className={"border-b-2 pb-3 text-sm " + (tab === "principal" ? "border-blue-700 font-semibold text-slate-950" : "border-transparent text-slate-500")}>Principal</button><button type="button" onClick={() => setTab("privilegios")} className={"border-b-2 pb-3 text-sm " + (tab === "privilegios" ? "border-blue-700 font-semibold text-slate-950" : "border-transparent text-slate-500")}>Privilégios</button><button type="button" onClick={() => setTab("historico")} className={"border-b-2 pb-3 text-sm " + (tab === "historico" ? "border-blue-700 font-semibold text-slate-950" : "border-transparent text-slate-500")}>Histórico</button></nav></div>
          {tab === "principal" && <form onSubmit={savePrincipal} className="p-5"><div className="grid gap-x-5 gap-y-4 md:grid-cols-2"><label className="text-sm font-medium">Nome<input name="name" defaultValue={selected.name} required className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-normal" /></label><label className="text-sm font-medium">E-mail / login<input name="email" type="email" defaultValue={selected.email} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-normal" /></label><label className="text-sm font-medium">Cargo<input name="jobTitle" defaultValue={selected.jobTitle} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-normal" /></label><label className="text-sm font-medium">Tipo de vínculo<input value={selected.role} readOnly className="mt-1 w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 font-normal text-slate-600" /></label><label className="text-sm font-medium">Telefone<input name="phone" defaultValue={selected.phone} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-normal" /></label><label className="text-sm font-medium">Celular<input name="mobile" defaultValue={selected.mobile} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-normal" /></label><label className="text-sm font-medium">Custo por hora (R$)<input name="hourlyCost" defaultValue={selected.hourlyCost} inputMode="decimal" className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-normal" /></label><label className="text-sm font-medium">Chamado / OS do parceiro<input name="externalReference" defaultValue={selected.externalReference} placeholder="Opcional para técnico parceiro" className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-normal" /></label></div><fieldset className="mt-5 rounded border border-slate-200 bg-slate-50 p-4"><legend className="px-1 text-sm font-semibold">Escopo de visualização</legend><select name="scope" defaultValue={selected.scope} className="mt-2 w-full max-w-xl rounded border border-slate-300 bg-white px-3 py-2 text-sm"><option>Todos os locais</option><option>Somente atribuições</option><option>Mesmo nível</option><option>Locais selecionados</option></select><p className="mt-2 text-xs text-slate-500">Para técnicos de campo, use “Somente atribuições” como padrão.</p></fieldset><div className="mt-5 flex flex-wrap justify-between gap-3"><button type="button" onClick={() => { updateSelected({ active: !selected.active }, selected.active ? "Usuário desativado." : "Usuário reativado."); setNotice(selected.active ? "Acesso desativado." : "Acesso reativado."); }} className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">{selected.active ? "Desativar" : "Ativar"}</button><button className="rounded bg-blue-800 px-5 py-2 text-sm font-semibold text-white">Salvar cadastro</button></div></form>}
          {tab === "privilegios" && <div className="p-5"><div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4"><label className="text-sm font-medium">Copiar privilégios de<select defaultValue="" onChange={(event) => copyProfile(event.target.value)} className="mt-1 block min-w-72 rounded border border-slate-300 px-3 py-2 font-normal"><option value="">Selecione um perfil</option>{people.filter((person) => person.id !== selected.id).map((person) => <option key={person.id} value={person.id}>{person.name} · {person.role}</option>)}</select></label><button type="button" onClick={simulateAccess} className="rounded border border-blue-700 px-4 py-2 text-sm font-semibold text-blue-800">Visualizar menu deste perfil</button></div><div className="mt-5 grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]"><div className="rounded border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">Módulos</p><div className="mt-3 space-y-2">{modules.map((module) => <label key={module.key} className="flex cursor-pointer items-start gap-3 rounded bg-white p-3 hover:border-blue-200"><input type="checkbox" checked={selected.modules.includes(module.key)} onChange={() => { const next = toggle(selected.modules, module.key) as ModuleKey[]; const allowedPermissions: string[] = permissions.filter((permission) => next.includes(permission.module as ModuleKey)).map((permission) => permission.key); updateSelected({ modules: next, permissions: selected.permissions.filter((permission) => allowedPermissions.includes(permission)) }, "Módulos de acesso atualizados."); }} className="mt-0.5 h-4 w-4 accent-blue-700" /><span><strong className="block text-sm">{module.label}</strong><small className="mt-1 block text-xs text-slate-500">{module.description}</small></span></label>)}</div></div><div><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">Privilégios do perfil</p><div className="mt-3 overflow-hidden rounded border border-slate-200">{modules.filter((module) => selected.modules.includes(module.key)).map((module) => <section key={module.key} className="border-b border-slate-200 last:border-b-0"><div className="flex items-center justify-between bg-slate-50 px-4 py-2"><strong className="text-sm">{module.label}</strong><button type="button" onClick={() => { const related: string[] = permissions.filter((permission) => permission.module === module.key).map((permission) => permission.key); const allSelected = related.every((permission) => selected.permissions.includes(permission)); updateSelected({ permissions: allSelected ? selected.permissions.filter((permission) => !related.includes(permission)) : [...new Set([...selected.permissions, ...related])] }, "Privilégios do módulo atualizados."); }} className="text-xs font-semibold text-blue-800">Marcar / desmarcar todos</button></div>{permissions.filter((permission) => permission.module === module.key).map((permission) => <label key={permission.key} className="flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm hover:bg-slate-50"><span>{permission.label}</span><input type="checkbox" checked={selected.permissions.includes(permission.key)} onChange={() => updateSelected({ permissions: toggle(selected.permissions, permission.key) }, "Privilégio atualizado: " + permission.label + ".")} className="h-4 w-4 accent-blue-700" /></label>)}</section>)}</div></div></div><div className="mt-5 flex justify-end"><button type="button" onClick={() => setNotice("Privilégios salvos na demonstração e registrados no histórico.")} className="rounded bg-blue-800 px-5 py-2 text-sm font-semibold text-white">Salvar privilégios</button></div></div>}
          {tab === "historico" && <div className="p-5"><p className="text-sm text-slate-600">Registro das alterações realizadas neste cadastro e nos privilégios de acesso.</p><ol className="mt-5 divide-y divide-slate-200 rounded border border-slate-200">{selected.history.map((entry, index) => <li key={index} className="flex gap-4 p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-50 text-sm font-bold text-blue-800">{entry.author.slice(0, 1)}</span><div><p className="text-sm font-semibold">{entry.author}</p><p className="mt-1 text-sm text-slate-700">{entry.message}</p><time className="mt-1 block text-xs text-slate-500">{entry.at}</time></div></li>)}</ol></div>}
        </section></div></div>
  </div></main>;
}
