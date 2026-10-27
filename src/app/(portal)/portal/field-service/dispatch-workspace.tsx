"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Ticket = { id: string; organization_id: string; customer_id: string; location_id: string; ticket_number: string; title: string; priority: number; operational_status: string; opened_at: string };
type Order = { id: string; organization_id: string; ticket_id: string; order_number: string; status: string; technician_id: string | null; scheduled_at: string | null };
type Technician = { id: string; organization_id: string; full_name: string; status: string; base_city: string | null; active: boolean };
type Location = { id: string; organization_id: string; customer_id: string; name: string; street: string | null; street_number: string | null; city: string; state_code: string | null; active: boolean };
type Review = { id: string; organization_id: string; service_order_id: string; status: string };
type Props = { tickets: Ticket[]; orders: Order[]; technicians: Technician[]; locations: Location[]; pendingReviews: Review[]; unlinkedTechnicians: number };

const dispatchable = new Set(["NEW", "TRIAGE", "AWAITING_SCHEDULING", "SCHEDULED", "ASSIGNED"]);
const activeStatuses = new Set(["DISPATCHED", "TRAVELING", "CHECKED_IN", "IN_SERVICE"]);
const statusLabel: Record<string, string> = { DISPATCHED: "Agendada", TRAVELING: "Em deslocamento", CHECKED_IN: "No local", IN_SERVICE: "Em atendimento", COMPLETED: "Aguardando validação", VALIDATED: "Validada" };
const dispatchErrors: Record<string, string> = {
  SCHEDULE_CONFLICT: "O técnico já possui atendimento nesse horário. Escolha outra janela.",
  DISPATCH_STATE_CONFLICT: "O chamado mudou ou já possui OS. Atualize a fila.",
  DISPATCH_NOT_AUTHORIZED: "Seu perfil não pode despachar este chamado.",
  DISPATCH_REFERENCE_INVALID: "Confira técnico, polo e horários selecionados.",
};

export function DispatchWorkspace({ tickets, orders, technicians, locations, pendingReviews, unlinkedTechnicians }: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const ordersByTicket = useMemo(() => new Map(orders.map((order) => [order.ticket_id, order])), [orders]);
  const locationsById = useMemo(() => new Map(locations.map((location) => [location.id, location])), [locations]);
  const techniciansById = useMemo(() => new Map(technicians.map((technician) => [technician.id, technician])), [technicians]);
  const waiting = tickets.filter((ticket) => dispatchable.has(ticket.operational_status) && !ordersByTicket.has(ticket.id));
  const active = orders.filter((order) => activeStatuses.has(order.status));
  const selected = waiting.find((ticket) => ticket.id === selectedId);
  const options = selected ? technicians.filter((technician) => technician.organization_id === selected.organization_id) : [];
  const locationOptions = selected ? locations.filter((location) => location.organization_id === selected.organization_id && location.customer_id === selected.customer_id) : [];
  const filtered = waiting.filter((ticket) => `${ticket.ticket_number} ${ticket.title} ${locationsById.get(ticket.location_id)?.city ?? ""}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));
  const selectedTechnician = techniciansById.get(technicianId);
  const nextOrders = orders.filter((order) => order.technician_id === technicianId && activeStatuses.has(order.status) && order.scheduled_at).sort((a, b) => Date.parse(a.scheduled_at!) - Date.parse(b.scheduled_at!));

  function choose(ticket: Ticket) {
    setSelectedId(ticket.id);
    setTechnicianId("");
    setLocationId(ticket.location_id);
    setStart("");
    setEnd("");
    setMessage("");
  }

  async function dispatch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !technicianId || !locationId || !start || !end) return;
    const plannedStartAt = new Date(start);
    const plannedEndAt = new Date(end);
    if (!Number.isFinite(plannedStartAt.getTime()) || !Number.isFinite(plannedEndAt.getTime()) || plannedEndAt <= plannedStartAt) {
      setMessage("Informe uma janela válida. O término deve ser posterior ao início.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/field-service/dispatch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: selected.id, technicianId, locationId, plannedStartAt: plannedStartAt.toISOString(), plannedEndAt: plannedEndAt.toISOString() }),
      });
      if (!response.ok) {
        const result = await response.json() as { code?: string };
        setMessage(dispatchErrors[result.code ?? ""] ?? "Despacho não concluído. Atualize a fila e tente novamente.");
        return;
      }
      setSelectedId(null);
      router.refresh();
    } catch {
      setMessage("Não foi possível conectar ao servidor. Confira a conexão e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return <div className="mt-6 space-y-5">
    {unlinkedTechnicians > 0 ? <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"><span><strong>{unlinkedTechnicians} técnico(s) aguardando vínculo operacional.</strong> Eles não podem receber OS até serem associados ao cadastro usado pelo despacho.</span><Link href="/portal/technicians" className="font-semibold underline">Ajustar cadastros</Link></div> : null}
    <div className="grid gap-3 sm:grid-cols-3" aria-label="Indicadores de Field Service">
      <Metric label="Aguardando despacho" count={waiting.length} />
      <Metric label="Em campo" count={active.length} />
      <Link href="/portal/review" className="rounded-xl border border-slate-200 bg-white p-4 hover:border-sky-300"><span className="block text-sm text-slate-600">Aguardando validação</span><strong className="mt-1 block text-2xl text-slate-900">{pendingReviews.length}</strong></Link>
    </div>
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section aria-label="Fila de despacho" className="min-w-0 rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div><h2 className="font-semibold text-slate-900">Chamados para despacho</h2><p className="text-sm text-slate-500">Selecione um chamado para definir técnico, polo e horário.</p></div>
          <Link href="/portal/tickets" className="text-sm font-semibold text-sky-900 hover:underline">Abrir chamados</Link>
        </div>
        <div className="p-4"><label className="sr-only" htmlFor="field-search">Buscar chamado</label><input id="field-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar número, serviço ou cidade" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-700" /></div>
        {filtered.length ? <ul className="max-h-[34rem] divide-y divide-slate-100 overflow-y-auto">{filtered.map((ticket) => { const location = locationsById.get(ticket.location_id); return <li key={ticket.id}><button type="button" onClick={() => choose(ticket)} aria-pressed={selectedId === ticket.id} className={`w-full px-4 py-3 text-left hover:bg-slate-50 ${selectedId === ticket.id ? "bg-sky-50" : ""}`}><span className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-sky-950">{ticket.ticket_number}</strong><span className="text-xs text-slate-500">P{ticket.priority} · {ticket.operational_status}</span></span><span className="mt-1 block text-sm text-slate-800">{ticket.title}</span><span className="mt-1 block text-xs text-slate-500">{location ? `${location.name} · ${location.city}` : "Polo indisponível"}</span></button></li>; })}</ul> : <p className="px-4 pb-6 text-sm text-slate-600">Nenhum chamado corresponde à busca ou aguarda despacho.</p>}
      </section>
      <aside aria-label="Planejar despacho" className="min-w-0 self-start rounded-xl border border-slate-200 bg-white p-5 xl:sticky xl:top-5">
        <h2 className="font-semibold text-slate-900">Planejar visita</h2>
        {!selected ? <p className="mt-3 text-sm text-slate-600">Selecione um chamado na fila para ver as opções de despacho.</p> : <form onSubmit={dispatch} className="mt-4 space-y-4">
          <div><p className="text-sm font-semibold">{selected.ticket_number} · {selected.title}</p><p className="mt-1 text-sm text-slate-600">{locationsById.get(selected.location_id)?.city ?? "Local não definido"}</p></div>
          <label className="block text-sm font-medium">Polo<select required value={locationId} onChange={(event) => setLocationId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2"><option value="">Selecione o polo</option>{locationOptions.map((location) => <option key={location.id} value={location.id}>{location.name} · {location.city}</option>)}</select></label>
          <label className="block text-sm font-medium">Técnico<select required value={technicianId} onChange={(event) => setTechnicianId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2"><option value="">Selecione o técnico</option>{options.map((technician) => <option key={technician.id} value={technician.id}>{technician.full_name} · {technician.base_city ?? "base não informada"} · {technician.status}</option>)}</select></label>
          {selectedTechnician ? <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600"><strong className="text-slate-800">Agenda conhecida de {selectedTechnician.full_name}</strong>{nextOrders.length ? <ul className="mt-2 space-y-1">{nextOrders.slice(0, 5).map((order) => <li key={order.id}>{new Date(order.scheduled_at!).toLocaleString("pt-BR")} · {order.order_number}</li>)}</ul> : <p className="mt-1">Nenhuma OS ativa agendada nesta lista.</p>}<p className="mt-2">A disponibilidade final e o conflito de horário são verificados no despacho.</p></div> : null}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1"><label className="block text-sm font-medium">Início<input required type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2" /></label><label className="block text-sm font-medium">Término previsto<input required type="datetime-local" value={end} onChange={(event) => setEnd(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2" /></label></div>
          <p className="text-xs text-slate-500">Horários interpretados no fuso deste dispositivo. A confirmação grava a OS, a agenda e o histórico juntos.</p>
          {message ? <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{message}</p> : null}
          <button disabled={submitting} className="w-full rounded-lg bg-sky-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{submitting ? "Confirmando…" : "Confirmar despacho"}</button>
        </form>}
      </aside>
    </div>
    <section className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Atendimentos em campo</h2><Link href="/portal/routes" className="text-sm font-semibold text-sky-900 hover:underline">Ver rotas</Link></div>{active.length ? <ul className="mt-3 divide-y divide-slate-100">{active.slice(0, 30).map((order) => { const ticket = tickets.find((item) => item.id === order.ticket_id); return <li key={order.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span><strong>{order.order_number}</strong> · {ticket?.title ?? "Chamado associado"}<span className="ml-2 text-slate-500">{techniciansById.get(order.technician_id ?? "")?.full_name ?? "Técnico não identificado"}</span></span><span className="text-slate-600">{statusLabel[order.status] ?? order.status}</span></li>; })}</ul> : <p className="mt-3 text-sm text-slate-600">Nenhuma OS em campo agora.</p>}</section>
  </div>;
}

function Metric({ label, count }: { label: string; count: number }) { return <div className="rounded-xl border border-slate-200 bg-white p-4"><span className="block text-sm text-slate-600">{label}</span><strong className="mt-1 block text-2xl text-slate-900">{count}</strong></div>; }
