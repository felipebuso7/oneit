"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { catalogPriority, demoCatalogServices } from "@/lib/demo/service-catalog";
import { RequesterPortalSidebar } from "@/components/requester-portal-sidebar";

type Service = typeof demoCatalogServices[number];
type Ticket = { id: string; subject: string; requester: string; technician: string; priority: string; sla: string; status: "Aberto" | "Pendente" | "SLA vencido" | "Fechado"; department: string; company?: string; service: string; createdAt: number };
type Settings = { services?: Service[]; users?: Array<{ name: string; email?: string; departmentId: string; role?: string; active: boolean; notifyOnCreate?: boolean }>; departments?: Array<{ id: string; companyId?: string; name: string; active: boolean }>; companies?: Array<{ id: string; name: string; active: boolean }> };
type RequesterProfile = { name: string; location: string };
const settingsKey = "oneit.demo.settings.v1";
const ticketsKey = "oneit.demo.tickets.v1";

export default function RequesterPortalDemoPage() {
  const [services, setServices] = useState<Service[]>(demoCatalogServices);
  const [category, setCategory] = useState(demoCatalogServices[0].category);
  const [serviceId, setServiceId] = useState(demoCatalogServices[0].id);
  const [requesters, setRequesters] = useState<string[]>([]);
  const [requesterProfiles, setRequesterProfiles] = useState<RequesterProfile[]>([]);
  const [requester, setRequester] = useState("");
  const [department, setDepartment] = useState("");
  const [notice, setNotice] = useState("Selecione uma categoria e um serviço para registrar sua solicitação.");
  const categories = useMemo(() => Array.from(new Set(services.filter((item) => item.active).map((item) => item.category))), [services]);
  const selectedServices = useMemo(() => services.filter((item) => item.active && item.category === category), [category, services]);
  const selected = selectedServices.find((item) => item.id === serviceId) ?? selectedServices[0];

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(settingsKey) ?? "{}") as Settings;
      if (Array.isArray(stored.services) && stored.services.length) {
        const storedIds = new Set(stored.services.map((item) => item.id));
        setServices([...demoCatalogServices.filter((item) => !storedIds.has(item.id)), ...stored.services]);
      }
      const activeUsers = (stored.users ?? []).filter((item) => item.active && item.role === "Solicitante");
      const profiles = activeUsers.map((item) => {
        const userDepartment = (stored.departments ?? []).find((departmentItem) => departmentItem.id === item.departmentId);
        const company = (stored.companies ?? []).find((companyItem) => companyItem.id === userDepartment?.companyId);
        return { name: item.name, location: [company?.name, userDepartment?.name].filter(Boolean).join(" · ") || "Novo Registro" };
      });
      if (profiles.length) {
        setRequesterProfiles(profiles);
        setRequesters(profiles.map((item) => item.name));
        setRequester(profiles[0].name);
        setDepartment(profiles[0].location);
      } else {
        setNotice("Não há solicitantes ativos cadastrados. Cadastre o solicitante e seu vínculo organizacional antes de abrir a solicitação.");
      }
    } catch {
      setServices(demoCatalogServices);
    }
  }, []);

  const selectCategory = (next: string) => {
    setCategory(next);
    const first = services.find((item) => item.active && item.category === next);
    if (first) setServiceId(first.id);
  };
  const selectRequester = (next: string) => {
    setRequester(next);
    const profile = requesterProfiles.find((item) => item.name === next);
    if (profile) setDepartment(profile.location);
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const subject = String(data.get("subject") ?? "").trim();
    const description = String(data.get("description") ?? "").trim();
    if (!selected || !requester || !subject || !description) {
      setNotice("Selecione um solicitante ativo, um serviço e informe os dados obrigatórios.");
      return;
    }
    try {
      const stored = JSON.parse(window.localStorage.getItem(ticketsKey) ?? "{}") as { tickets?: Ticket[]; timeline?: Record<string, unknown[]>; firstResponseStarted?: Record<string, boolean> };
      const settings = JSON.parse(window.localStorage.getItem(settingsKey) ?? "{}") as Settings;
      const requesterProfile = settings.users?.find((item) => item.name === requester);
      const requesterDepartment = settings.departments?.find((item) => item.id === requesterProfile?.departmentId);
      const company = settings.companies?.find((item) => item.id === requesterDepartment?.companyId)?.name;
      const ticket: Ticket = { id: "REQ-" + String(Date.now()).slice(-6), subject, requester, technician: "Aguardando triagem", priority: catalogPriority(selected.resolution), sla: selected.resolution, status: "Aberto", department: requesterDepartment?.name ?? department, company, service: selected.category + " · " + selected.name, createdAt: Date.now() };
      const tickets = Array.isArray(stored.tickets) ? stored.tickets : [];
      const timeline = stored.timeline && typeof stored.timeline === "object" ? stored.timeline : {};
      window.localStorage.setItem(ticketsKey, JSON.stringify({ ...stored, tickets: [ticket, ...tickets], timeline: { ...timeline, [ticket.id]: [{ at: "Agora", text: "Chamado aberto pelo Portal do Solicitante.", kind: "cliente" }] } }));
      if (requesterProfile?.email && requesterProfile.notifyOnCreate) {
        const outbox = JSON.parse(window.localStorage.getItem("oneit.demo.outbox.v1") ?? "[]") as Array<unknown>;
        window.localStorage.setItem("oneit.demo.outbox.v1", JSON.stringify([{ id: "mail-" + Date.now().toString(36), ticketId: ticket.id, recipient: requesterProfile.email, event: "abertura", subject: ticket.id + " · " + ticket.subject, createdAt: new Date().toLocaleString("pt-BR"), status: "Pendente de conector" }, ...outbox]));
      }
      window.localStorage.setItem("oneit.demo.portal-requester", requester);
      event.currentTarget.reset();
      setNotice("Solicitação " + ticket.id + " enviada. Você receberá as atualizações do atendimento pelo canal cadastrado.");
    } catch {
      setNotice("Não foi possível registrar a solicitação local. Tente novamente.");
    }
  };

  return <main className="min-h-screen bg-slate-100 text-slate-900"><RequesterPortalSidebar active="new" /><div data-oneit-sidebar-offset className="ml-64 min-h-screen">
    <header className="flex items-center justify-between border-b bg-white px-8 py-4"><div><p className="text-xs font-semibold tracking-[.15em] text-orange-500">ONEIT · AUTOATENDIMENTO</p><h1 className="mt-1 text-xl font-semibold">Portal do solicitante</h1></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Área segura do solicitante</span></header>
    <section className="mx-auto max-w-5xl p-8">
      <div className="rounded-2xl bg-[#092f40] px-7 py-8 text-white"><p className="text-xs font-semibold tracking-[.15em] text-orange-300">ONEIT · CENTRAL DE SERVIÇOS</p><h1 className="mt-2 text-3xl font-semibold">Olá, como podemos ajudar?</h1><p className="mt-2 text-sm text-slate-300">Escolha o serviço que melhor descreve sua necessidade. Leva menos de um minuto.</p></div>
      <p role="status" className="mt-5 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">{notice}</p>
      <form onSubmit={submit} className="mt-5 rounded-2xl border bg-white p-6 shadow-sm">
        <div className="grid gap-5 md:grid-cols-2"><label className="text-sm font-semibold text-slate-800">Você está solicitando como<select value={requester} onChange={(event) => selectRequester(event.target.value)} disabled={!requesters.length} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal disabled:cursor-not-allowed disabled:bg-slate-50"><option value="">Selecione o solicitante</option>{requesters.map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-sm font-semibold text-slate-800">Empresa / departamento<input value={department} readOnly aria-label="Empresa e departamento vinculados ao solicitante" placeholder="Definido pelo cadastro do solicitante" className="mt-2 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 font-normal text-slate-600" /><span className="mt-1 block text-xs font-normal text-slate-500">Preenchido automaticamente pelo cadastro do solicitante.</span></label></div>
        <div className="mt-7 border-t pt-6"><p className="text-xs font-semibold tracking-[.14em] text-orange-500">1. SELECIONE O SERVIÇO</p><div className="mt-4 grid gap-4 md:grid-cols-[.8fr_1.2fr]"><label className="text-sm font-semibold text-slate-800">Categoria<select value={category} onChange={(event) => selectCategory(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal">{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-sm font-semibold text-slate-800">Serviço<select value={selected?.id ?? ""} onChange={(event) => setServiceId(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal">{selectedServices.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>{selected && <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm"><span><b>{selected.name}</b><span className="ml-2 text-slate-500">{selected.category}</span></span><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Prazo previsto: {selected.resolution}</span></div>}</div>
        <div className="mt-7 border-t pt-6"><p className="text-xs font-semibold tracking-[.14em] text-orange-500">2. CONTE O QUE VOCÊ PRECISA</p><div className="mt-4 grid gap-4"><label className="text-sm font-semibold text-slate-800">Título<input name="subject" required placeholder="Ex.: preciso de acesso ao sistema" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label><label className="text-sm font-semibold text-slate-800">Detalhes<textarea name="description" required placeholder="Explique o que aconteceu ou o que você precisa. Inclua informações que possam ajudar no atendimento." className="mt-2 min-h-36 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label></div></div>
        <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t pt-5"><p className="text-xs text-slate-500">Seu chamado será enviado para a equipe responsável.</p><button className="rounded-lg bg-orange-500 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-600">Enviar solicitação</button></div>
      </form>
      <p className="mt-6 text-center text-xs text-slate-500">Área de autoatendimento do OneIT. Para demonstração, a identidade do solicitante pode ser escolhida no formulário.</p>
    </section></div>
  </main>;
}
