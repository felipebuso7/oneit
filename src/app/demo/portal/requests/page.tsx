"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RequesterPortalSidebar } from "@/components/requester-portal-sidebar";

type Status = "Aberto" | "Pendente" | "SLA vencido" | "Fechado";
type Ticket = { id: string; subject: string; requester: string; technician: string; priority: string; sla: string; status: Status; department: string; service: string; createdAt: number };
const ticketsKey = "oneit.demo.tickets.v1";
const statusTone = (status: Status) => status === "Aberto" ? "bg-emerald-50 text-emerald-700" : status === "Pendente" ? "bg-amber-50 text-amber-800" : status === "SLA vencido" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700";

export default function PortalRequestsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [requester, setRequester] = useState("Rafael Bonato");
  const [requesters, setRequesters] = useState<string[]>(["Rafael Bonato", "Mariana Lopes", "Lucas Mendes"]);

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(ticketsKey) ?? "{}") as { tickets?: Ticket[] };
      const savedTickets = Array.isArray(stored.tickets) ? stored.tickets : [];
      const identities = Array.from(new Set(["Rafael Bonato", "Mariana Lopes", "Lucas Mendes", ...savedTickets.map((item) => item.requester)]));
      const savedRequester = window.localStorage.getItem("oneit.demo.portal-requester");
      setTickets(savedTickets);
      setRequesters(identities);
      if (savedRequester && identities.includes(savedRequester)) setRequester(savedRequester);
    } catch {
      setTickets([]);
    }
  }, []);
  const visibleTickets = useMemo(() => tickets.filter((ticket) => ticket.requester === requester).sort((a, b) => b.createdAt - a.createdAt), [requester, tickets]);
  const changeRequester = (value: string) => { setRequester(value); window.localStorage.setItem("oneit.demo.portal-requester", value); };

  return <main className="min-h-screen bg-slate-100 text-slate-900"><RequesterPortalSidebar active="requests" /><div data-oneit-sidebar-offset className="ml-64 min-h-screen">
    <header className="flex items-center justify-between border-b bg-white px-8 py-4"><div><p className="text-xs font-semibold tracking-[.15em] text-orange-500">ONEIT · AUTOATENDIMENTO</p><h1 className="mt-1 text-xl font-semibold">Minhas solicitações</h1></div><Link href="/demo/portal" className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white">+ Nova solicitação</Link></header>
    <section className="mx-auto max-w-5xl p-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold tracking-[.14em] text-orange-500">ACOMPANHAMENTO</p><h2 className="mt-2 text-2xl font-semibold">Chamados abertos em seu nome</h2><p className="mt-2 text-sm text-slate-600">Consulte andamento, prazo e responsável pelo atendimento.</p></div><label className="text-sm font-semibold text-slate-700">Visualizar como<select value={requester} onChange={(event) => changeRequester(event.target.value)} className="mt-2 block rounded-lg border bg-white px-3 py-2.5 font-normal">{requesters.map((item) => <option key={item}>{item}</option>)}</select></label></div>
      <div className="mt-6 space-y-3">{visibleTickets.map((ticket) => <article key={ticket.id} className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-cyan-300 hover:shadow"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold text-[#0b4a64]">{ticket.id}</p><h2 className="mt-1 font-semibold text-slate-900"><Link href={"/demo/portal/requests/" + ticket.id} className="hover:text-[#0b4a64] hover:underline">{ticket.subject}</Link></h2><p className="mt-1 text-sm text-slate-500">{ticket.service} · {ticket.department}</p></div><span className={"rounded-full px-3 py-1 text-xs font-semibold " + statusTone(ticket.status)}>{ticket.status}</span></div><div className="mt-4 grid gap-3 border-t pt-4 text-sm sm:grid-cols-3"><p><span className="block text-xs text-slate-500">Prazo de atendimento</span><b>{ticket.sla}</b></p><p><span className="block text-xs text-slate-500">Responsável</span><b>{ticket.technician}</b></p><p><span className="block text-xs text-slate-500">Prioridade</span><b>{ticket.priority}</b></p></div><Link href={"/demo/portal/requests/" + ticket.id} className="mt-4 inline-block text-sm font-semibold text-[#0b4a64] hover:underline">Ver detalhes e comunicação →</Link></article>)}{!visibleTickets.length && <div className="rounded-xl border border-dashed bg-white p-10 text-center"><p className="font-semibold text-slate-800">Nenhuma solicitação encontrada</p><p className="mt-1 text-sm text-slate-500">Você ainda não possui chamados registrados neste ambiente.</p><Link href="/demo/portal" className="mt-4 inline-block rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white">Abrir uma solicitação</Link></div>}</div>
    </section></div>
  </main>;
}
