"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { DemoSidebar } from "@/components/demo-sidebar";

type RegisteredUser = { id?: string; name: string; email: string; login?: string; departmentId: string; role?: string; active: boolean; provisional?: boolean };
type Department = { id: string; companyId?: string; name: string; active: boolean };
type Company = { id: string; name: string; active: boolean };
type BlockedSender = { email: string; reason: string; blockedAt: string; blockedBy: string };
type ImportRecord = { id: string; sender: string; subject: string; receivedAt: string; outcome: "importado" | "bloqueado"; ticketId?: string; reason?: string; messageKey?: string };
type Ticket = { id: string; subject: string; requester: string; technician: string; priority: string; sla: string; status: "Aberto" | "Pendente" | "SLA vencido" | "Fechado"; department: string; company?: string; service: string; createdAt: number; };

export default function InboxDemoPage() {
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sender, setSender] = useState("felipe@oneit.local");
  const [subject, setSubject] = useState("Solicitação de suporte");
  const [body, setBody] = useState("Preciso de apoio para realizar uma atividade no meu computador.");
  const [notice, setNotice] = useState("Simule um e-mail recebido pelo suporte para abrir o chamado automaticamente.");
  const [blockedSenders, setBlockedSenders] = useState<BlockedSender[]>([]);
  useEffect(() => {
    try {
      const settings = JSON.parse(window.localStorage.getItem("oneit.demo.settings.v1") ?? "{}") as { users?: RegisteredUser[]; departments?: Department[] };
      if (Array.isArray(settings.users)) setUsers(settings.users.filter((item) => item.active));
      if (Array.isArray(settings.departments)) setDepartments(settings.departments.filter((item) => item.active));
      const blocked = JSON.parse(window.localStorage.getItem("oneit.demo.mail-blocklist.v1") ?? "[]") as BlockedSender[];
      if (Array.isArray(blocked)) setBlockedSenders(blocked);
    } catch {
      // A importação continua disponível sem cadastros locais.
    }
  }, []);
  const importEmail = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sender.trim() || !subject.trim() || !body.trim()) return;
    const normalizedSender = sender.trim().toLocaleLowerCase();
    const blocked = blockedSenders.find((item) => item.email === normalizedSender);
    const messageKey = [normalizedSender, subject.trim(), body.trim()].join("|").toLocaleLowerCase();
    const previousImports = JSON.parse(window.localStorage.getItem("oneit.demo.email-imports.v1") ?? "[]") as ImportRecord[];
    if (previousImports.some((item) => item.messageKey === messageKey)) {
      setNotice("Esta mensagem já foi processada anteriormente. Nenhum chamado duplicado foi criado.");
      return;
    }
    const recordBase = { id: "mail-" + Date.now().toString(36), sender: normalizedSender, subject: subject.trim(), receivedAt: new Date().toLocaleString("pt-BR"), messageKey };
    if (blocked) {
      window.localStorage.setItem("oneit.demo.email-imports.v1", JSON.stringify([{ ...recordBase, outcome: "bloqueado", reason: blocked.reason }, ...previousImports]));
      setNotice("Mensagem registrada como bloqueada. Nenhum solicitante ou chamado foi criado para " + normalizedSender + ".");
      return;
    }
    let requester = users.find((user) => user.email.toLocaleLowerCase() === normalizedSender);
    let department = requester ? departments.find((item) => item.id === requester?.departmentId)?.name ?? "Novo Registro" : "Novo Registro";
    let company: string | undefined;
    try {
      const settings = JSON.parse(window.localStorage.getItem("oneit.demo.settings.v1") ?? "{}") as { users?: RegisteredUser[]; departments?: Department[]; companies?: Company[] };
      if (requester) {
        const requesterDepartment = (settings.departments ?? []).find((item) => item.id === requester?.departmentId);
        company = (settings.companies ?? []).find((item) => item.id === requesterDepartment?.companyId)?.name;
      }
      if (!requester) {
        const companies = settings.companies ?? [];
        const departments = settings.departments ?? [];
        const registrationCompany = companies.find((item) => item.name === "Novo Registro") ?? { id: "cmp-new-registration", name: "Novo Registro", active: true };
        const registrationDepartment = departments.find((item) => item.companyId === registrationCompany.id && item.name === "Novo Registro") ?? { id: "dep-new-registration", companyId: registrationCompany.id, name: "Novo Registro", active: true };
        requester = { id: "req-" + Date.now().toString(36), name: normalizedSender.split("@")[0], email: normalizedSender, login: normalizedSender, departmentId: registrationDepartment.id, role: "Solicitante", active: true, provisional: true };
        window.localStorage.setItem("oneit.demo.settings.v1", JSON.stringify({ ...settings, companies: companies.some((item) => item.id === registrationCompany.id) ? companies : [...companies, registrationCompany], departments: departments.some((item) => item.id === registrationDepartment.id) ? departments : [...departments, registrationDepartment], users: [...(settings.users ?? []), requester] }));
        setUsers((current) => [...current, requester!]);
        setDepartments((current) => [...current.filter((item) => item.id !== registrationDepartment.id), registrationDepartment]);
        department = registrationDepartment.name;
        company = registrationCompany.name;
      }
    } catch {
      // Em caso de falha na base local, o chamado permanece em Novo Registro para triagem.
    }
    const ticket: Ticket = { id: "INC-" + String(Date.now()).slice(-6), subject: subject.trim(), requester: requester?.name ?? normalizedSender, technician: "Aguardando triagem", priority: "P3", sla: "A definir", status: "Pendente", department, company: company ?? (requester ? undefined : "Novo Registro"), service: "Categorização", createdAt: Date.now() };
    try {
      const stored = JSON.parse(window.localStorage.getItem("oneit.demo.tickets.v1") ?? "{}") as { tickets?: Ticket[]; timeline?: Record<string, Array<{ at: string; text: string; kind: "cliente" | "interna" }>> };
      const tickets = Array.isArray(stored.tickets) ? stored.tickets : [];
      const timeline = stored.timeline ?? {};
      timeline[ticket.id] = [{ at: "Agora", text: "E-mail importado do remetente " + sender.trim() + ". Chamado criado em categorização.", kind: "interna" }];
      window.localStorage.setItem("oneit.demo.tickets.v1", JSON.stringify({ ...stored, tickets: [ticket, ...tickets], timeline }));
      window.localStorage.setItem("oneit.demo.email-imports.v1", JSON.stringify([{ ...recordBase, outcome: "importado", ticketId: ticket.id }, ...previousImports]));
      setNotice(requester?.provisional ? "Solicitante provisório criado em " + (company ?? "Novo Registro") + " · " + department + ". Chamado " + ticket.id + " entrou em Categorização." : "Chamado " + ticket.id + " aberto para " + requester?.name + " e vinculado ao departamento " + department + ".");
    } catch {
      setNotice("Não foi possível importar o e-mail localmente.");
    }
  };
  return <main className="min-h-screen bg-[#f5f6f8] text-slate-900"><DemoSidebar active="inbox" /><div data-oneit-sidebar-offset className="ml-64 min-h-screen"><header className="flex min-h-[62px] items-center justify-between border-b border-slate-300 bg-white px-5"><div><p className="text-[11px] font-semibold tracking-[.15em] text-orange-500">ONEIT · CENTRAL DE SERVIÇOS</p><h1 className="mt-0.5 text-lg font-semibold">Caixa de entrada do suporte</h1></div><Link href="/demo/tickets" className="oneit-grid-action border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">Ver chamados</Link></header><section className="p-3 sm:p-4"><div className="oneit-operational-band flex flex-wrap items-center justify-between gap-3 border border-[#103c98] bg-[#123f99] px-4 py-3 text-white"><div><p className="text-xs font-semibold">Importação operacional</p><p className="mt-0.5 text-xs text-blue-100">Solicitantes cadastrados são identificados pelo e-mail; remetentes novos seguem para Novo Registro.</p></div><span className="text-xs text-blue-100">E-mail recebido → chamado em categorização</span></div><p role="status" className="mt-3 border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-900">{notice}</p><form onSubmit={importEmail} className="mt-3 max-w-5xl border bg-white"><div className="border-b bg-[#f4f5f7] px-4 py-3"><h3 className="text-sm font-semibold">Simular mensagem recebida</h3><p className="mt-0.5 text-xs text-slate-500">Valide o encaminhamento antes de conectar uma caixa real.</p></div><div className="grid gap-3 p-4"><label className="text-sm font-medium">Remetente<input type="email" value={sender} onChange={(event) => setSender(event.target.value)} className="mt-1 w-full border border-slate-400 px-3 py-2" /></label><label className="text-sm font-medium">Assunto<input value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-1 w-full border border-slate-400 px-3 py-2" /></label><label className="text-sm font-medium">Mensagem<textarea value={body} onChange={(event) => setBody(event.target.value)} className="mt-1 min-h-40 w-full border border-slate-400 px-3 py-2" /></label></div><div className="flex flex-wrap items-center justify-between gap-4 border-t px-4 py-3"><p className="text-xs text-slate-500">Status inicial: Pendente · serviço: A classificar · técnico: Aguardando triagem.</p><button className="oneit-grid-action border border-orange-500 bg-orange-500 px-4 py-2 text-sm font-semibold text-white">Importar e abrir chamado</button></div></form></section></div></main>;
}
