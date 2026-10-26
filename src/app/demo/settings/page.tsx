"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { DemoSidebar } from "@/components/demo-sidebar";
import { catalogPriority, demoCatalogServices } from "@/lib/demo/service-catalog";
import { digitsOnly, isValidCnpj } from "@/lib/field-service/validation";

type Company = { id: string; name: string; cnpj?: string; active: boolean };
type Region = "Capital - São Paulo" | "Região Metropolitana" | "Interior" | "Litoral";
type Department = { id: string; companyId: string; name: string; address: string; region: Region; distanceCapitalKm: number; localContact: string; localPhone: string; active: boolean };
type Service = { id: string; category: string; subcategory: string; name: string; active: boolean };
type ServiceLevel = { id: string; serviceId: string; priority: string; response: string; resolution: string; ola: string; type: string; urgency: string; impact: string; level: string; criticality: string; active: boolean };
type User = { id: string; name: string; email: string; departmentId: string; role: string; active: boolean };
type AssetType = { id: string; name: string; active: boolean };
type EmailInbox = { id: string; name: string; address: string; provider: "Gmail" | "Outlook" | "IMAP"; interval: number; secretReference: string; active: boolean; lastCheck?: string };
type BlockedSender = { id: string; inboxId: string; email: string; reason: string; active: boolean };

const initialCompanies: Company[] = [{ id: "cmp-1", name: "Servicia", active: true }, { id: "cmp-2", name: "Zigurate", active: true }];
const initialDepartments: Department[] = [{ id: "dep-1", companyId: "cmp-1", name: "Tecnologia da Informação", address: "Rua da Tecnologia, 250, Centro, São Paulo - SP", region: "Capital - São Paulo", distanceCapitalKm: 4, localContact: "Central de TI", localPhone: "(11) 3333-2000", active: true }, { id: "dep-2", companyId: "cmp-1", name: "Operações", address: "Rod. Régis Bittencourt, km 275, Embu das Artes - SP", region: "Região Metropolitana", distanceCapitalKm: 28, localContact: "Operações locais", localPhone: "(11) 3333-3000", active: true }, { id: "dep-3", companyId: "cmp-2", name: "Comercial", address: "Av. Paulista, 1000, Bela Vista, São Paulo - SP", region: "Capital - São Paulo", distanceCapitalKm: 3, localContact: "Recepção Comercial", localPhone: "(11) 3333-1000", active: true }];
const initialServices: Service[] = demoCatalogServices;
const initialLevels: ServiceLevel[] = demoCatalogServices.map((service) => ({ id: "sla-" + service.id, serviceId: service.id, priority: catalogPriority(service.resolution), response: service.resolution, resolution: service.resolution, ola: service.resolution, type: "Solicitação", urgency: "Normal", impact: "Afeta o usuário", level: "Nível 1", criticality: catalogPriority(service.resolution) === "P1" ? "Crítica" : "Normal", active: true }));
const initialUsers: User[] = [{ id: "usr-1", name: "Felipe Buso", email: "felipe@oneit.local", departmentId: "dep-1", role: "Administrador", active: true }];
const initialAssetTypes: AssetType[] = [{ id: "ast-1", name: "Notebook", active: true }, { id: "ast-2", name: "Celular", active: true }, { id: "ast-3", name: "Monitor", active: true }];
const initialInboxes: EmailInbox[] = [];
const initialBlockedSenders: BlockedSender[] = [];
const storageKey = "oneit.demo.settings.v1";

function newId(prefix: string) {
  return prefix + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function Toggle({ active, onClick }: { active: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={active ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700" : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"}>{active ? "Ativo" : "Inativo"}</button>;
}

export default function DemoSettingsPage() {
  const [tab, setTab] = useState<"structure" | "catalog" | "levels" | "access" | "email">("structure");
  const [companies, setCompanies] = useState(initialCompanies);
  const [departments, setDepartments] = useState(initialDepartments);
  const [services, setServices] = useState(initialServices);
  const [levels, setLevels] = useState(initialLevels);
  const [users, setUsers] = useState(initialUsers);
  const [assetTypes, setAssetTypes] = useState(initialAssetTypes);
  const [inboxes, setInboxes] = useState(initialInboxes);
  const [blockedSenders, setBlockedSenders] = useState(initialBlockedSenders);
  const [notice, setNotice] = useState("Cadastros demonstrativos prontos para parametrização.");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "{}") as Partial<{
        companies: Company[]; departments: Department[]; services: Service[];
        levels: ServiceLevel[]; users: User[]; assetTypes: AssetType[]; inboxes: EmailInbox[]; blockedSenders: BlockedSender[];
      }>;
      if (Array.isArray(saved.companies)) setCompanies(saved.companies);
    if (Array.isArray(saved.departments)) setDepartments(saved.departments.map((department) => ({ ...department, address: department.address ?? "", region: department.region ?? "Capital - São Paulo", distanceCapitalKm: Number(department.distanceCapitalKm ?? 0), localContact: department.localContact ?? "", localPhone: department.localPhone ?? "" })));
      if (Array.isArray(saved.services)) {
        const savedIds = new Set(saved.services.map((item) => item.id));
        setServices([...initialServices.filter((item) => !savedIds.has(item.id)), ...saved.services]);
      }
      if (Array.isArray(saved.levels)) {
        const savedIds = new Set(saved.levels.map((item) => item.serviceId));
        setLevels([...initialLevels.filter((item) => !savedIds.has(item.serviceId)), ...saved.levels]);
      }
      if (Array.isArray(saved.users)) setUsers(saved.users);
      if (Array.isArray(saved.assetTypes)) setAssetTypes(saved.assetTypes);
      if (Array.isArray(saved.inboxes)) setInboxes(saved.inboxes);
      if (Array.isArray(saved.blockedSenders)) setBlockedSenders(saved.blockedSenders);
    } catch {
      window.localStorage.removeItem(storageKey);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKey, JSON.stringify({ companies, departments, services, levels, users, assetTypes, inboxes, blockedSenders }));
  }, [assetTypes, blockedSenders, companies, departments, hydrated, inboxes, levels, services, users]);

  const companyName = useMemo(() => new Map(companies.map((item) => [item.id, item.name])), [companies]);
  const departmentName = useMemo(() => new Map(departments.map((item) => [item.id, item.name])), [departments]);
  const serviceName = useMemo(() => new Map(services.map((item) => [item.id, item.name])), [services]);

  function addCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const cnpj = digitsOnly(String(data.get("cnpj") ?? ""));
    if (!name) { setNotice("Informe o nome da empresa."); return; }
    if (cnpj && !isValidCnpj(cnpj)) { setNotice("O CNPJ deve conter 14 dígitos."); return; }
    if (companies.some((company) => company.name.toLocaleLowerCase() === name.toLocaleLowerCase())) { setNotice("Esta empresa já está cadastrada."); return; }
    if (cnpj && companies.some((company) => (company.cnpj ?? "") === cnpj)) { setNotice("Este CNPJ já está cadastrado."); return; }
    setCompanies((current) => [...current, { id: newId("cmp"), name, cnpj, active: true }]);
    event.currentTarget.reset();
    setNotice("Empresa adicionada. Ela já pode receber departamentos, usuários e ativos.");
  }

  function addDepartment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const companyId = String(data.get("companyId") ?? "");
    const name = String(data.get("name") ?? "").trim();
    const address = String(data.get("address") ?? "").trim();
    const region = String(data.get("region") ?? "Capital - São Paulo") as Region;
    const distanceCapitalKm = Number(data.get("distanceCapitalKm") ?? 0);
    const localContact = String(data.get("localContact") ?? "").trim();
    const localPhone = String(data.get("localPhone") ?? "").trim();
    if (!companyId || !name || !address || !Number.isFinite(distanceCapitalKm) || distanceCapitalKm < 0) { setNotice("Informe empresa, departamento, endereço e distância de referência para permitir o despacho de campo."); return; }
    if (departments.some((department) => department.companyId === companyId && department.name.toLocaleLowerCase() === name.toLocaleLowerCase())) { setNotice("Este polo já está cadastrado para a empresa selecionada."); return; }
    setDepartments((current) => [...current, { id: newId("dep"), companyId, name, address, region, distanceCapitalKm, localContact, localPhone, active: true }]);
    event.currentTarget.reset();
    setNotice("Departamento e endereço do polo adicionados. Eles serão usados no despacho de campo.");
  }

  function addAssetType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    if (!name) return;
    setAssetTypes((current) => [...current, { id: newId("asset"), name, active: true }]);
    event.currentTarget.reset();
    setNotice("Tipo de ativo adicionado ao inventário.");
  }

  function addService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const category = String(data.get("category") ?? "").trim();
    const subcategory = String(data.get("subcategory") ?? "").trim();
    const name = String(data.get("name") ?? "").trim();
    if (!category || !subcategory || !name) return;
    setServices((current) => [...current, { id: newId("svc"), category, subcategory, name, active: true }]);
    event.currentTarget.reset();
    setNotice("Serviço adicionado. Ele poderá ser aplicado na classificação do chamado.");
  }

  function addLevel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const serviceId = String(data.get("serviceId") ?? "");
    const priority = String(data.get("priority") ?? "");
    const response = String(data.get("response") ?? "").trim();
    const resolution = String(data.get("resolution") ?? "").trim();
    const ola = String(data.get("ola") ?? "").trim();
    const type = String(data.get("type") ?? "Solicitação");
    const urgency = String(data.get("urgency") ?? "Normal");
    const impact = String(data.get("impact") ?? "Afeta o usuário");
    const level = String(data.get("level") ?? "Nível 1");
    const criticality = String(data.get("criticality") ?? "Normal");
    if (!serviceId || !priority || !response || !resolution || !ola) return;
    setLevels((current) => [...current, { id: newId("sla"), serviceId, priority, response, resolution, ola, type, urgency, impact, level, criticality, active: true }]);
    event.currentTarget.reset();
    setNotice("Política de SLA e OLA vinculada ao serviço.");
  }

  function addUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const departmentId = String(data.get("departmentId") ?? "");
    const role = String(data.get("role") ?? "");
    if (!name || !email || !departmentId || !role) return;
    setUsers((current) => [...current, { id: newId("usr"), name, email, departmentId, role, active: true }]);
    event.currentTarget.reset();
    setNotice("Usuário criado com vínculo organizacional e perfil de acesso.");
  }

  function addInbox(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const address = String(data.get("address") ?? "").trim().toLocaleLowerCase();
    const secretReference = String(data.get("secretReference") ?? "").trim();
    const interval = Number(data.get("interval") ?? 2);
    if (!name || !address || !secretReference || !/^\S+@\S+\.\S+$/.test(address) || !Number.isInteger(interval) || interval < 1 || interval > 60) { setNotice("Preencha uma caixa válida, a referência de segredo e um intervalo de 1 a 60 minutos."); return; }
    setInboxes((current) => [...current, { id: newId("mailbox"), name, address, provider: String(data.get("provider") ?? "Gmail") as EmailInbox["provider"], interval, secretReference, active: true }]);
    event.currentTarget.reset();
    setNotice("Caixa configurada. Na VPS, o worker consultará a conta usando a referência de segredo, nunca uma senha salva no sistema.");
  }

  function blockSender(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const inboxId = String(data.get("inboxId") ?? "");
    const email = String(data.get("email") ?? "").trim().toLocaleLowerCase();
    const reason = String(data.get("reason") ?? "").trim();
    if (!inboxId || !/^\S+@\S+\.\S+$/.test(email) || reason.length < 5) { setNotice("Informe a caixa, o e-mail do remetente e a justificativa do bloqueio."); return; }
    setBlockedSenders((current) => [...current, { id: newId("blocked"), inboxId, email, reason, active: true }]);
    event.currentTarget.reset();
    setNotice("Remetente bloqueado. Novos e-mails dele serão registrados como ignorados e não abrirão chamado.");
  }

  return <main className="min-h-screen bg-[#f5f6f8] text-slate-900">
    <DemoSidebar active="settings" />
    <div data-oneit-sidebar-offset className="ml-64 min-h-screen">
      <header className="flex min-h-[62px] items-center justify-between border-b border-slate-300 bg-white px-5">
        <div><p className="text-[11px] font-semibold tracking-[.15em] text-orange-500">ONEIT · ADMINISTRAÇÃO</p><h1 className="mt-0.5 text-lg font-semibold">Configurações e parametrização</h1></div>
        <span className="border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Ambiente demonstrativo</span>
      </header>
      <section className="p-3 sm:p-4">
        <div className="oneit-operational-band border border-[#103c98] bg-[#123f99] px-4 py-3 text-white"><p className="text-xs font-semibold">Base conectada</p><p className="mt-0.5 text-xs text-blue-100">Empresas e departamentos alimentam usuários e ativos. Catálogo e SLA alimentam a classificação dos chamados.</p></div>
        <p role="status" className="mt-3 border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-900">{notice}</p>
        <nav className="mt-3 flex flex-wrap gap-1 border border-slate-300 bg-white p-2">{[
          ["structure", "Estrutura e ativos"],
          ["catalog", "Catálogo de serviços"],
          ["levels", "SLA e OLA"],
          ["access", "Usuários e permissões"],
          ["email", "Integração de e-mail"],
        ].map(([id, label]) => <button key={id} onClick={() => setTab(id as typeof tab)} className={tab === id ? "oneit-grid-action border border-[#123f99] bg-[#123f99] px-3 py-1.5 text-xs font-semibold text-white" : "oneit-grid-action border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"}>{label}</button>)}</nav>

        {tab === "structure" && <div className="mt-5 grid gap-5 xl:grid-cols-3">
          <form onSubmit={addCompany} className="rounded-xl border bg-white p-5"><h3 className="font-semibold">Empresas</h3><p className="mt-1 text-sm text-slate-500">Base para departamentos, ativos e colaboradores.</p><input name="name" required placeholder="Nome da empresa" className="mt-4 w-full rounded-lg border p-2.5"/><button className="mt-3 rounded-lg bg-[#092f40] px-4 py-2 text-sm font-semibold text-white">Adicionar empresa</button><ul className="mt-5 space-y-2">{companies.map((item) => <li key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm"><span>{item.name}</span><Toggle active={item.active} onClick={() => setCompanies((current) => current.map((value) => value.id === item.id ? { ...value, active: !value.active } : value))}/></li>)}</ul></form>
          <form onSubmit={addDepartment} className="rounded-xl border bg-white p-5"><h3 className="font-semibold">Departamentos e polos</h3><p className="mt-1 text-sm text-slate-500">O endereço, região e distância de referência são usados na rota e nos indicadores de campo.</p><select name="companyId" required className="mt-4 w-full rounded-lg border p-2.5"><option value="">Empresa</option>{companies.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input name="name" required placeholder="Nome do departamento / polo" className="mt-3 w-full rounded-lg border p-2.5"/><input name="address" required placeholder="Endereço completo do polo" className="mt-3 w-full rounded-lg border p-2.5"/><div className="mt-3 grid grid-cols-2 gap-2"><select name="region" className="w-full rounded-lg border p-2.5"><option>Capital - São Paulo</option><option>Região Metropolitana</option><option>Interior</option><option>Litoral</option></select><input name="distanceCapitalKm" type="number" min="0" step="0.1" required placeholder="Km do marco zero" className="w-full rounded-lg border p-2.5"/></div><div className="mt-3 grid grid-cols-2 gap-2"><input name="localContact" placeholder="Contato local" className="w-full rounded-lg border p-2.5"/><input name="localPhone" placeholder="Telefone local" className="w-full rounded-lg border p-2.5"/></div><button className="mt-3 rounded-lg bg-[#092f40] px-4 py-2 text-sm font-semibold text-white">Adicionar departamento</button><ul className="mt-5 space-y-2">{departments.map((item) => <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-3 text-sm"><span><strong>{item.name}</strong><small className="ml-2 text-slate-500">{companyName.get(item.companyId)}</small><small className="mt-1 block text-slate-500">{item.address || "Endereço pendente"}</small><small className="block text-slate-500">{item.region} · {item.distanceCapitalKm} km do marco zero</small></span><Toggle active={item.active} onClick={() => setDepartments((current) => current.map((value) => value.id === item.id ? { ...value, active: !value.active } : value))}/></li>)}</ul></form>
          <form onSubmit={addAssetType} className="rounded-xl border bg-white p-5"><h3 className="font-semibold">Tipos de ativo</h3><p className="mt-1 text-sm text-slate-500">Disponíveis ao cadastrar ou importar ativos.</p><input name="name" required placeholder="Ex.: Impressora térmica" className="mt-4 w-full rounded-lg border p-2.5"/><button className="mt-3 rounded-lg bg-[#092f40] px-4 py-2 text-sm font-semibold text-white">Adicionar tipo</button><ul className="mt-5 space-y-2">{assetTypes.map((item) => <li key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm"><span>{item.name}</span><Toggle active={item.active} onClick={() => setAssetTypes((current) => current.map((value) => value.id === item.id ? { ...value, active: !value.active } : value))}/></li>)}</ul></form>
        </div>}

        {tab === "catalog" && <div className="mt-5 grid gap-5 lg:grid-cols-[380px_1fr]">
          <form onSubmit={addService} className="rounded-xl border bg-white p-5"><h3 className="font-semibold">Novo item do catálogo</h3><p className="mt-1 text-sm text-slate-500">Categoria → subcategoria → serviço aplicável aos chamados.</p><input name="category" required placeholder="Categoria, ex.: Hardware" className="mt-4 w-full rounded-lg border p-2.5"/><input name="subcategory" required placeholder="Subcategoria, ex.: Equipamentos" className="mt-3 w-full rounded-lg border p-2.5"/><input name="name" required placeholder="Serviço, ex.: Solicitação de notebook" className="mt-3 w-full rounded-lg border p-2.5"/><button className="mt-3 rounded-lg bg-[#092f40] px-4 py-2 text-sm font-semibold text-white">Adicionar serviço</button></form>
          <section className="overflow-hidden rounded-xl border bg-white"><div className="border-b p-5"><h3 className="font-semibold">Catálogo ativo</h3><p className="mt-1 text-sm text-slate-500">{services.length} itens disponíveis para classificação. Estes itens aparecem no botão Aplicar serviço do chamado.</p></div><div className="max-h-[620px] overflow-auto"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Categoria</th><th className="p-4">Subcategoria</th><th className="p-4">Serviço</th><th className="p-4">Status</th></tr></thead><tbody>{services.map((item) => <tr key={item.id} className="border-t"><td className="p-4">{item.category}</td><td className="p-4">{item.subcategory}</td><td className="p-4 font-medium">{item.name}</td><td className="p-4"><Toggle active={item.active} onClick={() => setServices((current) => current.map((value) => value.id === item.id ? { ...value, active: !value.active } : value))}/></td></tr>)}</tbody></table></div></section>
        </div>}

        {tab === "levels" && <div className="mt-5 grid gap-5 lg:grid-cols-[380px_1fr]">
          <form onSubmit={addLevel} className="rounded-xl border bg-white p-5"><h3 className="font-semibold">Política de classificação, SLA / OLA</h3><p className="mt-1 text-sm text-slate-500">Defina atributos e prazos aplicados automaticamente ao serviço.</p><select name="serviceId" required className="mt-4 w-full rounded-lg border p-2.5"><option value="">Serviço</option>{services.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><div className="mt-3 grid grid-cols-2 gap-2"><select name="type" className="rounded-lg border p-2.5"><option>Solicitação</option><option>Incidente</option><option>Melhoria</option><option>Mudança</option></select><select name="level" className="rounded-lg border p-2.5"><option>Nível 1</option><option>Nível 2</option><option>Nível 3</option></select><select name="urgency" className="rounded-lg border p-2.5"><option>Baixa</option><option>Normal</option><option>Média</option><option>Crítica</option></select><select name="impact" className="rounded-lg border p-2.5"><option>Afeta o usuário</option><option>Afeta o grupo</option><option>Afeta o departamento</option><option>Afeta o negócio</option></select><select name="priority" required className="rounded-lg border p-2.5"><option value="P1">P1 - Crítico</option><option value="P2">P2 - Alto</option><option value="P3">P3 - Normal</option><option value="P4">P4 - Baixo</option></select><select name="criticality" className="rounded-lg border p-2.5"><option>Normal</option><option>Alta</option><option>Crítica</option></select></div><div className="mt-3 grid grid-cols-3 gap-2"><input name="response" required placeholder="Resposta" className="w-full rounded-lg border p-2.5"/><input name="resolution" required placeholder="Resolução" className="w-full rounded-lg border p-2.5"/><input name="ola" required placeholder="OLA" className="w-full rounded-lg border p-2.5"/></div><button className="mt-3 rounded-lg bg-[#092f40] px-4 py-2 text-sm font-semibold text-white">Vincular política</button></form>
          <section className="overflow-hidden rounded-xl border bg-white"><div className="border-b p-5"><h3 className="font-semibold">Níveis configurados</h3><p className="mt-1 text-sm text-slate-500">Usados no cálculo do vencimento e nas escaladas da operação.</p></div><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Serviço</th><th className="p-4">Prioridade</th><th className="p-4">Resposta</th><th className="p-4">Resolução</th><th className="p-4">OLA</th><th className="p-4">Status</th></tr></thead><tbody>{levels.map((item) => <tr key={item.id} className="border-t"><td className="p-4 font-medium">{serviceName.get(item.serviceId)}</td><td className="p-4">{item.priority}</td><td className="p-4">{item.response}</td><td className="p-4">{item.resolution}</td><td className="p-4">{item.ola}</td><td className="p-4"><Toggle active={item.active} onClick={() => setLevels((current) => current.map((value) => value.id === item.id ? { ...value, active: !value.active } : value))}/></td></tr>)}</tbody></table></section>
        </div>}

        {tab === "access" && <div className="mt-5 grid gap-5 lg:grid-cols-[380px_1fr]">
          <form onSubmit={addUser} className="rounded-xl border bg-white p-5"><h3 className="font-semibold">Usuário e permissão</h3><p className="mt-1 text-sm text-slate-500">O perfil limita o que cada pessoa pode configurar e operar.</p><input name="name" required placeholder="Nome completo" className="mt-4 w-full rounded-lg border p-2.5"/><input name="email" required type="email" placeholder="E-mail corporativo" className="mt-3 w-full rounded-lg border p-2.5"/><select name="departmentId" required className="mt-3 w-full rounded-lg border p-2.5"><option value="">Departamento</option>{departments.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{companyName.get(item.companyId)} · {item.name}</option>)}</select><select name="role" required className="mt-3 w-full rounded-lg border p-2.5"><option>Solicitante</option><option>Analista</option><option>Dispatcher</option><option>Gestor</option><option>Administrador</option><option>Auditor</option></select><button className="mt-3 rounded-lg bg-[#092f40] px-4 py-2 text-sm font-semibold text-white">Criar usuário</button></form>
          <section className="overflow-hidden rounded-xl border bg-white"><div className="border-b p-5"><h3 className="font-semibold">Acessos cadastrados</h3><p className="mt-1 text-sm text-slate-500">Todo usuário pertence a uma estrutura organizacional e recebe um perfil.</p></div><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Usuário</th><th className="p-4">Departamento</th><th className="p-4">Perfil</th><th className="p-4">Status</th></tr></thead><tbody>{users.map((item) => <tr key={item.id} className="border-t"><td className="p-4"><strong>{item.name}</strong><small className="block text-slate-500">{item.email}</small></td><td className="p-4">{departmentName.get(item.departmentId)}</td><td className="p-4">{item.role}</td><td className="p-4"><Toggle active={item.active} onClick={() => setUsers((current) => current.map((value) => value.id === item.id ? { ...value, active: !value.active } : value))}/></td></tr>)}</tbody></table></section>
        </div>}
      </section>
    </div>
    {tab === "email" && <section className="absolute left-64 right-0 top-[229px] p-8"><div className="grid gap-5 xl:grid-cols-2"><form onSubmit={addInbox} className="rounded-xl border bg-white p-5"><h3 className="font-semibold">Caixa monitorada</h3><p className="mt-1 text-sm text-slate-500">A conexão será executada pelo worker da VPS. Use uma senha de aplicativo apenas no cofre de segredos.</p><div className="mt-4 grid gap-3"><input name="name" required placeholder="Nome, ex.: Suporte" className="rounded-lg border p-2.5" /><input name="address" required type="email" placeholder="suporte@empresa.com.br" className="rounded-lg border p-2.5" /><select name="provider" className="rounded-lg border p-2.5"><option>Gmail</option><option>Outlook</option><option>IMAP</option></select><input name="interval" required type="number" min="1" max="60" defaultValue="2" className="rounded-lg border p-2.5" /><input name="secretReference" required placeholder="Referência do segredo, ex.: vault://oneit/suporte" className="rounded-lg border p-2.5" /></div><button className="mt-4 rounded-lg bg-[#092f40] px-4 py-2 text-sm font-semibold text-white">Salvar caixa</button></form><form onSubmit={blockSender} className="rounded-xl border bg-white p-5"><h3 className="font-semibold">Bloquear remetente</h3><p className="mt-1 text-sm text-slate-500">Evita que spam, fornecedores ou mensagens indevidas abram chamados futuros.</p><div className="mt-4 grid gap-3"><select name="inboxId" required className="rounded-lg border p-2.5"><option value="">Caixa monitorada</option>{inboxes.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name} + " · " + item.address</option>)}</select><input name="email" required type="email" placeholder="remetente@exemplo.com" className="rounded-lg border p-2.5" /><textarea name="reason" required placeholder="Justificativa do bloqueio" className="min-h-24 rounded-lg border p-2.5" /></div><button className="mt-4 rounded-lg border border-[#092f40] px-4 py-2 text-sm font-semibold text-[#092f40]">Bloquear remetente</button></form></div><section className="mt-5 overflow-hidden rounded-xl border bg-white"><div className="border-b p-5"><h3 className="font-semibold">Monitoramento e bloqueios</h3><p className="mt-1 text-sm text-slate-500">A configuração aparece aqui; a conexão efetiva será ativada na VPS após cadastrar a referência de segredo.</p></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Caixa</th><th className="p-4">Consulta</th><th className="p-4">Segredo</th><th className="p-4">Remetentes bloqueados</th><th className="p-4">Status</th></tr></thead><tbody>{inboxes.map((inbox) => <tr key={inbox.id} className="border-t"><td className="p-4"><strong>{inbox.name}</strong><small className="block text-slate-500">{inbox.address} · {inbox.provider}</small></td><td className="p-4">A cada {inbox.interval} min</td><td className="p-4 text-slate-600">{inbox.secretReference}</td><td className="p-4">{blockedSenders.filter((item) => item.inboxId === inbox.id && item.active).length}</td><td className="p-4"><Toggle active={inbox.active} onClick={() => setInboxes((current) => current.map((value) => value.id === inbox.id ? { ...value, active: !value.active } : value))}/></td></tr>)}{!inboxes.length && <tr><td colSpan={5} className="p-6 text-center text-slate-500">Nenhuma caixa configurada.</td></tr>}</tbody></table></div></section></section>}
  </main>;
}
