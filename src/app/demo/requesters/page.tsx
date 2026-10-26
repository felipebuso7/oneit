"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DemoSidebar } from "@/components/demo-sidebar";

type Company = { id: string; name: string; active: boolean };
type Department = { id: string; companyId: string; name: string; active: boolean };
type License = { name: string; value: string };
type Requester = {
  id: string; name: string; email: string; login: string; departmentId: string; role: string; active: boolean;
  document?: string; phone?: string; mobile?: string; position?: string; licenses?: License[];
  notifyOnCreate?: boolean; notifyOnMessage?: boolean; notifyOnClose?: boolean;
};
type Settings = { companies?: Company[]; departments?: Department[]; users?: Requester[] };

const storageKey = "oneit.demo.settings.v1";
const onboardingCompany: Company = { id: "cmp-novo-registro", name: "Novo Registro", active: true };
const onboardingDepartment: Department = { id: "dep-novo-registro", companyId: onboardingCompany.id, name: "Novo Registro", active: true };

export default function RequestersDemoPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [requesters, setRequesters] = useState<Requester[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [editing, setEditing] = useState<Requester | null>(null);
  const [notice, setNotice] = useState("Cadastre solicitantes para que empresa e departamento sejam preenchidos automaticamente nos chamados.");
  const companyById = useMemo(() => new Map(companies.map((company) => [company.id, company.name])), [companies]);
  const selectedDepartment = departments.find((department) => department.id === departmentId);
  const availableDepartments = departments.filter((department) => department.companyId === companyId);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "{}") as Settings;
      const savedCompanies = (saved.companies ?? []).filter((company) => company.active);
      const savedDepartments = (saved.departments ?? []).filter((department) => department.active);
      const baseCompanies = savedCompanies.length ? savedCompanies : [onboardingCompany];
      const baseDepartments = savedDepartments.length ? savedDepartments : [onboardingDepartment];
      if (!savedCompanies.length || !savedDepartments.length) {
        window.localStorage.setItem(storageKey, JSON.stringify({ ...saved, companies: saved.companies?.length ? saved.companies : [onboardingCompany], departments: saved.departments?.length ? saved.departments : [onboardingDepartment] }));
        setNotice("Base inicial criada: Novo Registro / Novo Registro. Cadastre empresas e departamentos definitivos em Configurações quando necessário.");
      }
      setCompanies(baseCompanies);
      setDepartments(baseDepartments);
      setCompanyId(baseCompanies[0].id);
      setDepartmentId(baseDepartments.find((department) => department.companyId === baseCompanies[0].id)?.id ?? "");
      setRequesters((saved.users ?? []).filter((user) => user.role === "Solicitante"));
    } catch {
      setNotice("Não foi possível ler a base local de configurações.");
    }
  }, []);

  const saveRequester = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const login = String(form.get("login") ?? "").trim();
    if (!name || !email || !login || !departmentId) {
      setNotice("Preencha nome, e-mail, login e departamento.");
      return;
    }
    const licenses = [1, 2, 3].map((index) => ({ name: String(form.get("licenseName" + index) ?? "").trim(), value: String(form.get("licenseValue" + index) ?? "").trim() })).filter((license) => license.name || license.value);
    const requester: Requester = {
      id: editing?.id ?? "req-" + Date.now().toString(36), name, email, login, departmentId, role: "Solicitante", active: editing?.active ?? true,
      document: String(form.get("document") ?? "").trim(), phone: String(form.get("phone") ?? "").trim(),
      mobile: String(form.get("mobile") ?? "").trim(), position: String(form.get("position") ?? "").trim(), licenses,
      notifyOnCreate: form.get("notifyOnCreate") === "on", notifyOnMessage: form.get("notifyOnMessage") === "on", notifyOnClose: form.get("notifyOnClose") === "on",
    };
    try {
      const current = JSON.parse(window.localStorage.getItem(storageKey) ?? "{}") as Settings;
      const users = [...(current.users ?? []).filter((user) => user.id !== requester.id && user.email !== requester.email), requester];
      window.localStorage.setItem(storageKey, JSON.stringify({ ...current, users }));
      setRequesters((items) => [...items.filter((item) => item.email !== requester.email), requester]);
      setNotice("Solicitante cadastrado. Novos chamados desse usuário usarão " + (companyById.get(selectedDepartment?.companyId ?? "") ?? "a empresa") + " · " + (selectedDepartment?.name ?? "o departamento") + ".");
      event.currentTarget.reset();
      setCompanyId("");
      setDepartmentId("");
      setEditing(null);
    } catch {
      setNotice("Não foi possível salvar o solicitante localmente.");
    }
  };

  const editRequester = (requester: Requester) => {
    const department = departments.find((item) => item.id === requester.departmentId);
    setEditing(requester);
    setCompanyId(department?.companyId ?? "");
    setDepartmentId(requester.departmentId);
    setNotice("Editando " + requester.name + ". Altere os dados necessários e salve.");
  };

  const toggleRequester = (requester: Requester) => {
    const updated = requesters.map((item) => item.id === requester.id ? { ...item, active: !item.active } : item);
    try {
      const current = JSON.parse(window.localStorage.getItem(storageKey) ?? "{}") as Settings;
      const requesterIds = new Set(updated.map((item) => item.id));
      window.localStorage.setItem(storageKey, JSON.stringify({ ...current, users: [...(current.users ?? []).filter((user) => !requesterIds.has(user.id)), ...updated] }));
      setRequesters(updated);
      setNotice(requester.name + (requester.active ? " foi desativado." : " foi ativado."));
    } catch {
      setNotice("Não foi possível atualizar o status do solicitante.");
    }
  };

  return <main className="min-h-screen bg-[#f5f6f8] text-slate-900"><DemoSidebar active="requesters" /><div data-oneit-sidebar-offset className="ml-64 min-h-screen">
    <header className="flex min-h-[62px] items-center justify-between border-b border-slate-300 bg-white px-5"><div><p className="text-[11px] font-semibold tracking-[.15em] text-orange-500">ONEIT · CONFIGURAÇÕES</p><h1 className="mt-0.5 text-lg font-semibold">Solicitantes</h1></div><Link href="/demo/settings" className="oneit-grid-action border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">Voltar às configurações</Link></header>
    <section className="p-3 sm:p-4"><div className="oneit-operational-band border border-[#103c98] bg-[#123f99] px-4 py-3 text-white"><p className="text-xs font-semibold">Base organizacional</p><p className="mt-0.5 text-xs text-blue-100">Vínculo, preferências e licenças ficam disponíveis para chamados, APIs e indicadores.</p></div><p role="status" className="mt-3 border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-900">{notice}</p>
      <form key={editing?.id ?? "new"} onSubmit={saveRequester} className="mt-3 border bg-white p-4"><div className="border-b pb-3"><p className="text-xs font-semibold tracking-[.14em] text-orange-500">DADOS PRINCIPAIS</p><h2 className="mt-1 font-semibold">{editing ? "Editar solicitante" : "Informações do solicitante"}</h2></div><div className="mt-4 grid gap-3 md:grid-cols-2"><label className="md:col-span-2 text-sm font-medium">Nome<input name="name" defaultValue={editing?.name} required className="mt-1 w-full border border-slate-400 px-3 py-2 font-normal" /></label><label className="text-sm font-medium">E-mail<input name="email" defaultValue={editing?.email} type="email" required className="mt-1 w-full border border-slate-400 px-3 py-2 font-normal" /></label><label className="text-sm font-medium">Login<input name="login" defaultValue={editing?.login} required className="mt-1 w-full border border-slate-400 px-3 py-2 font-normal" /></label><label className="text-sm font-medium">Empresa<select value={companyId} onChange={(event) => { setCompanyId(event.target.value); setDepartmentId(""); }} required className="mt-1 w-full border border-slate-400 px-3 py-2 font-normal"><option value="">Selecione</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label><label className="text-sm font-medium">Departamento<select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} required disabled={!companyId} className="mt-1 w-full border border-slate-400 px-3 py-2 font-normal disabled:bg-slate-50"><option value="">Selecione</option>{availableDepartments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label><label className="text-sm font-medium">CPF / CNPJ<input name="document" defaultValue={editing?.document} className="mt-1 w-full border border-slate-400 px-3 py-2 font-normal" /></label><label className="text-sm font-medium">Cargo<input name="position" defaultValue={editing?.position} className="mt-1 w-full border border-slate-400 px-3 py-2 font-normal" /></label><label className="text-sm font-medium">Telefone<input name="phone" defaultValue={editing?.phone} className="mt-1 w-full border border-slate-400 px-3 py-2 font-normal" /></label><label className="text-sm font-medium">Celular<input name="mobile" defaultValue={editing?.mobile} className="mt-1 w-full border border-slate-400 px-3 py-2 font-normal" /></label></div>
        <div className="mt-7 border-t pt-5"><p className="text-xs font-semibold tracking-[.14em] text-orange-500">LICENCIAMENTO</p><p className="mt-1 text-sm text-slate-500">Até três licenças por solicitante; nome e valor ficam estruturados para consumo futuro por API e dashboards.</p><div className="mt-4 grid gap-3">{[1, 2, 3].map((index) => <div key={index} className="grid gap-3 md:grid-cols-[1fr_220px]"><input name={"licenseName" + index} defaultValue={editing?.licenses?.[index - 1]?.name} placeholder={"Licença " + index + ", ex.: Microsoft 365 E3"} className="rounded-lg border px-3 py-2.5 text-sm" /><input name={"licenseValue" + index} defaultValue={editing?.licenses?.[index - 1]?.value} inputMode="decimal" placeholder="Valor da licença" className="rounded-lg border px-3 py-2.5 text-sm" /></div>)}</div></div>
        <div className="mt-7 border-t pt-5"><p className="text-xs font-semibold tracking-[.14em] text-orange-500">NOTIFICAÇÕES</p><div className="mt-3 space-y-2 text-sm"><label className="flex items-center gap-2"><input name="notifyOnCreate" type="checkbox" defaultChecked={editing ? editing.notifyOnCreate : true} /> Notificar ao criar solicitação</label><label className="flex items-center gap-2"><input name="notifyOnMessage" type="checkbox" defaultChecked={editing ? editing.notifyOnMessage : true} /> Notificar ao comunicar solicitação</label><label className="flex items-center gap-2"><input name="notifyOnClose" type="checkbox" defaultChecked={editing ? editing.notifyOnClose : true} /> Notificar ao fechar solicitação</label></div></div><div className="mt-7 flex justify-end"><button className="rounded-lg bg-[#092f40] px-5 py-2.5 text-sm font-semibold text-white">{editing ? "Salvar alterações" : "Salvar solicitante"}</button></div></form>
      <section className="mt-6 overflow-hidden rounded-xl border bg-white"><div className="border-b p-5"><h2 className="font-semibold">Solicitantes cadastrados</h2><p className="mt-1 text-sm text-slate-500">A organização exibida aqui será reutilizada no chamado.</p></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Solicitante</th><th className="p-4">Empresa / departamento</th><th className="p-4">Licenças</th><th className="p-4">Notificações</th><th className="p-4">Ações</th></tr></thead><tbody>{requesters.map((requester) => { const department = departments.find((item) => item.id === requester.departmentId); return <tr key={requester.id} className={"border-t " + (requester.active ? "" : "bg-slate-50 text-slate-500")}><td className="p-4 font-medium">{requester.name}<small className="block font-normal text-slate-500">{requester.email}</small></td><td className="p-4">{companyById.get(department?.companyId ?? "") ?? "—"} · {department?.name ?? "—"}</td><td className="p-4">{requester.licenses?.length ? requester.licenses.map((license) => license.name + (license.value ? " · " + license.value : "")).join(" | ") : "Sem licenças"}</td><td className="p-4 text-slate-600">{[requester.notifyOnCreate && "Criação", requester.notifyOnMessage && "Comunicação", requester.notifyOnClose && "Fechamento"].filter(Boolean).join(", ") || "Nenhuma"}</td><td className="p-4"><div className="flex gap-2"><button type="button" onClick={() => editRequester(requester)} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700">Editar</button><button type="button" onClick={() => toggleRequester(requester)} className={"rounded border px-2 py-1 text-xs font-semibold " + (requester.active ? "border-red-200 text-red-700" : "border-emerald-200 text-emerald-700")}>{requester.active ? "Desativar" : "Ativar"}</button></div></td></tr>; })}</tbody></table></div></section>
    </section></div></main>;
}
