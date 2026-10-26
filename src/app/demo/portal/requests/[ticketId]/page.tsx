"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { RequesterPortalSidebar } from "@/components/requester-portal-sidebar";

type Status = "Aberto" | "Pendente" | "SLA vencido" | "Fechado";
type Ticket = { id: string; subject: string; requester: string; technician: string; priority: string; sla: string; status: Status; department: string; service: string; createdAt: number };
type TimelineEntry = { at: string; text: string; kind: "cliente" | "interna" };
type Satisfaction = { ticketId: string; rating: number; comment: string; submittedAt: string };
const ticketsKey = "oneit.demo.tickets.v1";
const satisfactionKey = "oneit.demo.satisfaction.v1";
const statusTone = (status: Status) => status === "Aberto" ? "bg-emerald-50 text-emerald-700" : status === "Pendente" ? "bg-amber-50 text-amber-800" : status === "SLA vencido" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700";

export default function PortalTicketDetailPage() {
  const params = useParams<{ ticketId: string }>();
  const ticketId = params.ticketId;
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [timeline, setTimeline] = useState<Record<string, TimelineEntry[]>>({});
  const [requester, setRequester] = useState("");
  const [notice, setNotice] = useState("");
  const [satisfaction, setSatisfaction] = useState<Satisfaction | null>(null);
  const ticket = useMemo(() => tickets.find((item) => item.id === ticketId), [ticketId, tickets]);
  const authorized = Boolean(ticket && (!requester || ticket.requester === requester));

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(ticketsKey) ?? "{}") as { tickets?: Ticket[]; timeline?: Record<string, TimelineEntry[]> };
      if (Array.isArray(stored.tickets)) setTickets(stored.tickets);
      if (stored.timeline && typeof stored.timeline === "object") setTimeline(stored.timeline);
      setRequester(window.localStorage.getItem("oneit.demo.portal-requester") ?? "");
      const savedSatisfaction = JSON.parse(window.localStorage.getItem(satisfactionKey) ?? "[]") as Satisfaction[];
      if (Array.isArray(savedSatisfaction)) setSatisfaction(savedSatisfaction.find((item) => item.ticketId === ticketId) ?? null);
    } catch {
      setNotice("Não foi possível carregar esta solicitação.");
    }
  }, []);
  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = String(new FormData(event.currentTarget).get("message") ?? "").trim();
    if (!message || !ticket) return;
    const entry: TimelineEntry = { at: "Agora", text: "Solicitante: " + message, kind: "cliente" };
    const nextTimeline = { ...timeline, [ticket.id]: [entry, ...(timeline[ticket.id] ?? [])] };
    setTimeline(nextTimeline);
    const stored = JSON.parse(window.localStorage.getItem(ticketsKey) ?? "{}") as object;
    window.localStorage.setItem(ticketsKey, JSON.stringify({ ...stored, tickets, timeline: nextTimeline }));
    event.currentTarget.reset();
    setNotice("Mensagem enviada ao atendimento e registrada no histórico.");
  };
  const submitSatisfaction = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ticket) return;
    const data = new FormData(event.currentTarget);
    const rating = Number(data.get("rating") ?? 0);
    const comment = String(data.get("comment") ?? "").trim();
    if (rating < 1 || rating > 5) return;
    const record: Satisfaction = { ticketId: ticket.id, rating, comment, submittedAt: "Agora" };
    const saved = JSON.parse(window.localStorage.getItem(satisfactionKey) ?? "[]") as Satisfaction[];
    const current = Array.isArray(saved) ? saved.filter((item) => item.ticketId !== ticket.id) : [];
    window.localStorage.setItem(satisfactionKey, JSON.stringify([...current, record]));
    setSatisfaction(record);
    setNotice("Obrigado. Sua avaliação foi registrada para melhoria contínua.");
  };

  return <main className="min-h-screen bg-slate-100 text-slate-900"><RequesterPortalSidebar active="requests" /><div data-oneit-sidebar-offset className="ml-64 min-h-screen">
    <header className="flex items-center justify-between border-b bg-white px-8 py-4"><div><p className="text-xs font-semibold tracking-[.15em] text-orange-500">ONEIT · AUTOATENDIMENTO</p><h1 className="mt-1 text-xl font-semibold">Detalhes da solicitação</h1></div><Link href="/demo/portal/requests" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">← Minhas solicitações</Link></header>
    <section className="mx-auto max-w-5xl p-8">{!ticket ? <div className="rounded-xl border bg-white p-8 text-center"><h2 className="font-semibold">Solicitação não encontrada</h2><p className="mt-2 text-sm text-slate-500">Ela pode não existir neste ambiente demonstrativo.</p></div> : !authorized ? <div className="rounded-xl border border-red-200 bg-red-50 p-8"><h2 className="font-semibold text-red-900">Acesso restrito</h2><p className="mt-2 text-sm text-red-700">O portal exibe somente solicitações abertas pelo solicitante atual.</p></div> : <div className="grid gap-5 lg:grid-cols-[1fr_320px]"><div className="space-y-5"><article className="rounded-xl border bg-white p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold text-[#0b4a64]">{ticket.id}</p><h2 className="mt-1 text-xl font-semibold">{ticket.subject}</h2><p className="mt-2 text-sm text-slate-500">{ticket.service} · {ticket.department}</p></div><span className={"rounded-full px-3 py-1 text-xs font-semibold " + statusTone(ticket.status)}>{ticket.status}</span></div><div className="mt-5 grid gap-4 border-t pt-4 text-sm sm:grid-cols-3"><p><span className="block text-xs text-slate-500">Prazo de atendimento</span><b>{ticket.sla}</b></p><p><span className="block text-xs text-slate-500">Responsável</span><b>{ticket.technician}</b></p><p><span className="block text-xs text-slate-500">Prioridade</span><b>{ticket.priority}</b></p></div></article><article className="rounded-xl border bg-white p-6"><h2 className="font-semibold">Histórico e comunicações</h2><div className="mt-4 space-y-4">{(timeline[ticket.id] ?? []).filter((entry) => entry.kind === "cliente").map((entry, index) => <div key={index} className="border-l-2 border-cyan-400 pl-3 text-sm"><p className="font-medium">{entry.at}</p><p className="mt-1 text-slate-600">{entry.text}</p></div>)}{!(timeline[ticket.id] ?? []).length && <p className="text-sm text-slate-500">Ainda não há comunicações registradas.</p>}</div></article></div><aside className="space-y-5">{ticket.status === "Fechado" ? <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5"><h2 className="font-semibold text-emerald-950">Avalie o atendimento</h2>{satisfaction ? <div className="mt-3 text-sm"><p className="font-semibold">Nota registrada: {satisfaction.rating}/5</p><p className="mt-1 text-emerald-900">{satisfaction.comment || "Sem comentário."}</p></div> : <form onSubmit={submitSatisfaction} className="mt-3"><label className="text-sm font-medium">Nota<select name="rating" defaultValue="5" className="mt-1 w-full rounded-lg border bg-white p-2"><option value="5">5 - Excelente</option><option value="4">4 - Bom</option><option value="3">3 - Regular</option><option value="2">2 - Ruim</option><option value="1">1 - Muito ruim</option></select></label><textarea name="comment" placeholder="Comentário opcional" className="mt-3 min-h-20 w-full rounded-lg border bg-white p-2 text-sm" /><button className="mt-3 w-full rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white">Enviar avaliação</button></form>}</section> : null}<section className="rounded-xl border bg-white p-5"><h2 className="font-semibold">Enviar mensagem</h2><p className="mt-1 text-sm text-slate-500">Use este canal para complementar informações ou responder ao analista.</p>{notice && <p role="status" className="mt-4 rounded-lg bg-cyan-50 p-3 text-sm text-cyan-900">{notice}</p>}<form onSubmit={sendMessage} className="mt-4"><textarea name="message" required placeholder="Digite sua mensagem" className="min-h-36 w-full rounded-lg border p-3 text-sm" /><button className="mt-3 w-full rounded-lg bg-[#092f40] px-4 py-2.5 text-sm font-semibold text-white">Enviar mensagem</button></form></section></aside></div>}</section>
  </div></main>;
}
