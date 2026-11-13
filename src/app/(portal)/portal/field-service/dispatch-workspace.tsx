"use client";

import Link from "next/link";
import { fieldStage, isInField } from "@/domain/dashboard/field-stage";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { isShareableAccessLink, whatsappRecipient } from "@/lib/field-service/dispatch-sharing";

type Ticket = { id: string; organization_id: string; customer_id: string; location_id: string; ticket_number: string; title: string; priority: number; operational_status: string; opened_at: string };
type Order = { id: string; organization_id: string; ticket_id: string; order_number: string; status: string; technician_id: string | null; scheduled_at: string | null };
type Technician = { id: string; organization_id: string; full_name: string; phone?: string | null; mobile?: string | null; status: string; base_city: string | null; active: boolean };
type Location = { id: string; organization_id: string; customer_id: string; name: string; street: string | null; street_number: string | null; city: string; state_code: string | null; active: boolean };
type LocationContact = { id: string; location_id: string; name: string; phone: string | null; mobile: string | null; active: boolean };
type Review = { id: string; organization_id: string; service_order_id: string; status: string };
type Props = { tickets: Ticket[]; orders: Order[]; technicians: Technician[]; locations: Location[]; locationContacts: LocationContact[]; pendingReviews: Review[]; unlinkedTechnicians: number; unavailableTechnicians: number; initialTicketId?: string };
type DispatchSummary = { ticket: Ticket; technician: Technician; location: Location | undefined; contact: LocationContact | undefined; date: string; shift: string; accessUrl: string | null; accessCode: string | null };

const dispatchable = new Set(["NEW", "TRIAGE", "AWAITING_SCHEDULING", "SCHEDULED", "ASSIGNED"]);
const activeStatuses = new Set(["DISPATCHED", "TRAVELING", "CHECKED_IN", "IN_SERVICE"]);
const statusLabel: Record<string, string> = { DISPATCHED: "Agendada", TRAVELING: "Em deslocamento", CHECKED_IN: "No local", IN_SERVICE: "Em atendimento", COMPLETED: "Aguardando validação", VALIDATED: "Validada" };
const ticketStatusLabel: Record<string, string> = { NEW: "Aberto", TRIAGE: "Em triagem", AWAITING_SCHEDULING: "Aguardando despacho", SCHEDULED: "Agendado", ASSIGNED: "Atribuído" };
const technicianStatusLabel: Record<string, string> = { AVAILABLE: "Disponível", UNAVAILABLE: "Indisponível", BUSY: "Em atendimento", ON_LEAVE: "Em afastamento" };
const pendingTicketStatuses = new Set(["NEW", "TRIAGE", "AWAITING_SCHEDULING"]);
const shiftWindows: Record<string, { label: string; start: number; end: number }> = { MORNING: { label: "Manhã · 08:00–12:00", start: 8, end: 12 }, AFTERNOON: { label: "Tarde · 13:00–18:00", start: 13, end: 18 }, NIGHT: { label: "Noite · 19:00–22:00", start: 19, end: 22 } };
const dispatchErrors: Record<string, string> = {
  SCHEDULE_CONFLICT: "O técnico já possui atendimento nesse horário. Escolha outra janela.",
  DISPATCH_STATE_CONFLICT: "O chamado mudou ou já possui OS. Atualize a fila.",
  DISPATCH_NOT_AUTHORIZED: "Seu perfil não pode despachar este chamado.",
  DISPATCH_REFERENCE_INVALID: "Confira técnico, polo e horários selecionados.",
};

export function DispatchWorkspace({ tickets, orders, technicians, locations, locationContacts, pendingReviews, unlinkedTechnicians, unavailableTechnicians, initialTicketId }: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(initialTicketId ?? null);
  const [search, setSearch] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [shift, setShift] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [lastDispatch, setLastDispatch] = useState<DispatchSummary | null>(null);
  const ordersByTicket = useMemo(() => new Map(orders.map((order) => [order.ticket_id, order])), [orders]);
  const locationsById = useMemo(() => new Map(locations.map((location) => [location.id, location])), [locations]);
  const contactsByLocationId = useMemo(() => new Map(locationContacts.map((contact) => [contact.location_id, contact])), [locationContacts]);
  const techniciansById = useMemo(() => new Map(technicians.map((technician) => [technician.id, technician])), [technicians]);
  const waiting = tickets.filter((ticket) => dispatchable.has(ticket.operational_status) && !ordersByTicket.has(ticket.id));
  const active = orders.filter((order) => activeStatuses.has(order.status));
  const selected = waiting.find((ticket) => ticket.id === selectedId);
  const options = selected ? technicians.filter((technician) => technician.organization_id === selected.organization_id) : [];
  const allSelectedOrganizationTechnicians = selected ? technicians.filter((technician) => technician.organization_id === selected.organization_id) : [];
  const filtered = waiting.filter((ticket) => `${ticket.ticket_number} ${ticket.title} ${locationsById.get(ticket.location_id)?.city ?? ""}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));
  const selectedTechnician = techniciansById.get(technicianId);
  const nextOrders = orders.filter((order) => order.technician_id === technicianId && activeStatuses.has(order.status) && order.scheduled_at).sort((a, b) => Date.parse(a.scheduled_at!) - Date.parse(b.scheduled_at!));

  function choose(ticket: Ticket) {
    setSelectedId(ticket.id);
    setTechnicianId("");
    setLocationId(ticket.location_id);
    setScheduledDate("");
    setShift("");
    setMessage("");
    setWhatsappPhone("");
  }

  async function dispatch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !technicianId || !selectedTechnician || !locationId || !scheduledDate || !shift) return;
    const shiftWindow = shiftWindows[shift];
    const plannedStartAt = new Date(`${scheduledDate}T${String(shiftWindow.start).padStart(2, "0")}:00`);
    const plannedEndAt = new Date(`${scheduledDate}T${String(shiftWindow.end).padStart(2, "0")}:00`);
    if (!Number.isFinite(plannedStartAt.getTime()) || !Number.isFinite(plannedEndAt.getTime()) || plannedEndAt <= plannedStartAt) {
      setMessage("Informe uma janela válida. O término deve ser posterior ao início.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/field-service/dispatch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: selected.id,
          technicianId,
          locationId,
          plannedStartAt: plannedStartAt.toISOString(),
          plannedEndAt: plannedEndAt.toISOString(),
          localContactName: contactsByLocationId.get(locationId)?.name,
          localContactPhone: contactsByLocationId.get(locationId)?.mobile || contactsByLocationId.get(locationId)?.phone,
        }),
      });
      if (!response.ok) {
        const result = await response.json() as { code?: string };
        setMessage(dispatchErrors[result.code ?? ""] ?? "Despacho não concluído. Atualize a fila e tente novamente.");
        return;
      }
      const result = await response.json() as { dispatch?: { service_order_id?: string } };
      const dispatchedTicket = selected;
      const dispatchedTechnician = selectedTechnician;
      const dispatchedLocation = locationsById.get(locationId);
      const dispatchedContact = contactsByLocationId.get(locationId);
      let accessUrl: string | null = null;
      let accessCode: string | null = null;
      if (result.dispatch?.service_order_id) {
        try {
          const accessResponse = await fetch("/api/field-service/partner/access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ serviceOrderId: result.dispatch.service_order_id, validForMinutes: 480 }) });
          const accessPayload = await accessResponse.json().catch(() => ({})) as { access?: { token?: string; code?: string } };
          if (accessResponse.ok && accessPayload.access?.token && accessPayload.access.code) {
            accessUrl = `${window.location.origin}/field-service/partner/access#token=${encodeURIComponent(accessPayload.access.token)}`;
            accessCode = accessPayload.access.code;
          }
        } catch { /* O despacho já foi persistido; a geração do acesso pode ser refeita pelo gestor. */ }
      }
      if (!accessUrl || !isShareableAccessLink(accessUrl)) {
        setMessage("A visita foi registrada, mas o link público seguro não foi gerado. Não foi aberto um link autenticado por engano; gere um novo acesso antes de comunicar o técnico.");
        router.refresh();
        return;
      }
      let phoneForWhatsApp = whatsappPhone || dispatchedTechnician.mobile || dispatchedTechnician.phone || "";
      if (!phoneForWhatsApp) phoneForWhatsApp = globalThis.window.prompt("Informe o WhatsApp do técnico externo com DDD:", "") ?? "";
      const recipient = whatsappRecipient(phoneForWhatsApp);
      if (recipient) {
        const address = dispatchedLocation ? `${dispatchedLocation.name} · ${dispatchedLocation.street ?? ""} ${dispatchedLocation.street_number ?? ""} · ${dispatchedLocation.city}`.replace(/\s+/g, " ").trim() : "Localidade não informada";
        const contact = dispatchedContact;
        const waze = dispatchedLocation ? `https://waze.com/ul?q=${encodeURIComponent(`${dispatchedLocation.street ?? ""} ${dispatchedLocation.street_number ?? ""}, ${dispatchedLocation.city}, ${dispatchedLocation.state_code ?? "SP"}`)}` : "";
        const body = [`ONEIT · OS ${dispatchedTicket.ticket_number}`, `Serviço: ${dispatchedTicket.title}`, `Local: ${address}`, `Quem procurar: ${contact?.name ?? "Contato da localidade"}${contact?.mobile || contact?.phone ? ` · ${contact.mobile || contact.phone}` : ""}`, `Agendamento: ${new Date(`${scheduledDate}T12:00:00`).toLocaleDateString("pt-BR")} · ${shiftWindow.label}`, ...(waze ? [`Abrir rota no Waze: ${waze}`] : []), `Acesso público seguro: ${accessUrl}`, ...(accessCode ? [`Código temporário: ${accessCode}`] : []), "Mensagem preparada pelo OneIT. Confirme o envio no WhatsApp."].join("\n");
        const whatsappWindow = globalThis.window.open(`https://wa.me/${recipient}?text=${encodeURIComponent(body)}`, "_blank", "noopener,noreferrer");
        if (!whatsappWindow) void navigator.clipboard?.writeText(body);
      }
      setLastDispatch({ ticket: dispatchedTicket, technician: dispatchedTechnician, location: dispatchedLocation, contact: dispatchedContact, date: scheduledDate, shift, accessUrl, accessCode });
      setMessage(`Visita agendada para ${dispatchedTechnician.full_name}. WhatsApp preparado com o link público seguro da OS.`);
      setSelectedId(null);
      router.refresh();
    } catch {
      setMessage("Não foi possível conectar ao servidor. Confira a conexão e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return <div className="mt-6 space-y-5">
    {unlinkedTechnicians > 0 ? <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"><span><strong>{unlinkedTechnicians} vínculo(s) legado(s) precisam ser regularizados.</strong> O despacho pode usar o técnico operacional ativo, mas revise o cadastro para completar a fonte administrativa.</span><Link href="/portal/technicians" className="font-semibold underline">Revisar cadastros</Link></div> : null}
    {waiting.length > 0 && !technicians.length && unavailableTechnicians > 0 ? <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950"><span><strong>Nenhum técnico está disponível para despacho.</strong> Existem {unavailableTechnicians} técnico(s) vinculado(s), mas com status indisponível. Habilite o despacho no cadastro antes de agendar.</span><Link href="/portal/technicians" className="font-semibold underline">Abrir técnicos</Link></div> : null}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores de Field Service">
      <Metric label="Aguardando despacho" count={waiting.length} />
      <Metric label="Agendadas" count={active.filter((order) => fieldStage(order.status, "order") === "scheduled").length} />
      <Metric label="Em campo" count={active.filter((order) => isInField(order.status, "order")).length} />
      <Link href="/portal/review" className="rounded-xl border border-slate-200 bg-white p-4 hover:border-sky-300"><span className="block text-sm text-slate-600">Aguardando validação</span><strong className="mt-1 block text-2xl text-slate-900">{pendingReviews.length}</strong></Link>
    </div>
    {message ? <p role="status" aria-live="polite" className="rounded-lg bg-sky-50 p-3 text-sm text-sky-950">{message}</p> : null}
    {lastDispatch ? <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4" aria-label="Despacho confirmado"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Visita agendada e comunicação preparada</p><h2 className="mt-1 font-semibold text-emerald-950">{lastDispatch.ticket.ticket_number} · {lastDispatch.technician.full_name}</h2><p className="mt-1 text-sm text-emerald-900">{lastDispatch.location?.city ?? "Local não informado"} · {new Date(`${lastDispatch.date}T12:00:00`).toLocaleDateString("pt-BR")} · {shiftWindows[lastDispatch.shift]?.label ?? lastDispatch.shift}</p><p className="mt-2 text-xs text-emerald-800">O técnico deve abrir o link público recebido no WhatsApp. O OneIT não considera a mensagem enviada até a confirmação no WhatsApp.</p></section> : null}
    <div className="flex justify-end"><button type="button" onClick={() => router.refresh()} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-sky-400 hover:text-sky-900">Atualizar fila</button></div>
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section aria-label="Fila de despacho" className="min-w-0 rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div><h2 className="font-semibold text-slate-900">Chamados para despacho</h2><p className="text-sm text-slate-500">Selecione um chamado para definir técnico, polo e horário.</p></div>
          <Link href="/portal/tickets" className="text-sm font-semibold text-sky-900 hover:underline">Abrir chamados</Link>
        </div>
        <div className="p-4"><label className="sr-only" htmlFor="field-search">Buscar chamado</label><input id="field-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar número, serviço ou cidade" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-700" /></div>
        {filtered.length ? <ul className="max-h-[34rem] divide-y divide-slate-100 overflow-y-auto" aria-label="Chamados aguardando despacho">{filtered.map((ticket) => { const location = locationsById.get(ticket.location_id); const isPending = pendingTicketStatuses.has(ticket.operational_status); const isSelected = selectedId === ticket.id; return <li key={ticket.id}><button type="button" onClick={() => choose(ticket)} aria-pressed={isSelected} aria-current={isSelected ? "true" : undefined} className={`w-full border-l-4 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${isSelected ? "border-l-sky-700 bg-sky-50" : "border-l-transparent"}`}><span className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-sky-950">{ticket.ticket_number}</strong><span className="flex items-center gap-2 text-xs text-slate-500">P{ticket.priority} · <span className={isPending ? "rounded-full border border-orange-400 bg-orange-50 px-2 py-0.5 font-semibold text-orange-800" : ""}>{ticketStatusLabel[ticket.operational_status] ?? ticket.operational_status}</span></span></span><span className="mt-1 block text-sm text-slate-800">{ticket.title}</span><span className="mt-1 block text-xs text-slate-500">{location ? `${location.name} · ${location.city}` : "Polo indisponível"}</span></button></li>; })}</ul> : <p className="px-4 pb-6 text-sm text-slate-600">Nenhum chamado corresponde à busca ou aguarda despacho.</p>}
      </section>
      <aside aria-label="Planejar despacho" className="min-w-0 self-start rounded-xl border border-slate-200 bg-white p-5 xl:sticky xl:top-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-900">Planejar visita</h2><p className="mt-1 text-xs text-slate-500">Selecione, agende e comunique em uma única etapa.</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">3 passos</span></div>
        <ol className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] font-medium text-slate-500" aria-label="Etapas do despacho"><li className={`rounded-md border px-2 py-2 ${selected ? "border-sky-200 bg-sky-50 text-sky-900" : "border-slate-200"}`}><span className="block text-xs font-bold">1</span>Selecionar</li><li className={`rounded-md border px-2 py-2 ${technicianId && scheduledDate && shift ? "border-sky-200 bg-sky-50 text-sky-900" : "border-slate-200"}`}><span className="block text-xs font-bold">2</span>Agendar</li><li className="rounded-md border border-slate-200 px-2 py-2"><span className="block text-xs font-bold">3</span>Comunicar</li></ol>
        {!selected ? <p className="mt-3 text-sm text-slate-600">Selecione um chamado na fila para ver as opções de despacho.</p> : <form onSubmit={dispatch} className="mt-4 space-y-4">
          <div><p className="text-sm font-semibold">{selected.ticket_number} · {selected.title}</p><p className="mt-1 text-sm text-slate-600">{locationsById.get(selected.location_id)?.city ?? "Local não definido"}</p></div>
          <div className="block text-sm font-medium"><span>Polo / localidade do chamado</span><div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800" aria-label="Polo ou localidade do chamado">{locationsById.get(locationId)?.name ?? "Polo não informado"}{locationsById.get(locationId)?.city ? ` · ${locationsById.get(locationId)?.city}` : ""}</div><span className="mt-1 block text-xs font-normal text-slate-500">Puxado automaticamente do chamado. Para alterar, corrija a localidade no chamado antes do despacho.</span></div>
          <label className="block text-sm font-medium">Técnico<select required value={technicianId} onChange={(event) => setTechnicianId(event.target.value)} aria-describedby="dispatch-technician-help" className="mt-1 w-full rounded-lg border border-slate-300 p-2"><option value="">Selecione o técnico</option>{options.map((technician) => <option key={technician.id} value={technician.id}>{technician.full_name} · {technician.base_city ?? "base não informada"} · {technicianStatusLabel[technician.status] ?? technician.status}</option>)}</select><span id="dispatch-technician-help" className="mt-1 block text-xs font-normal text-slate-500">Somente técnicos ativos da organização deste chamado aparecem aqui.</span></label>
          {selected && !options.length ? <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">Nenhum técnico elegível para esta organização. {allSelectedOrganizationTechnicians.length ? "Os técnicos cadastrados estão indisponíveis; habilite o cadastro ou ajuste o status operacional." : "Cadastre um técnico nesta organização antes de agendar a visita."} <Link href="/portal/technicians" className="font-semibold underline">Abrir técnicos</Link></p> : null}
          {selectedTechnician ? <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600"><strong className="text-slate-800">Agenda conhecida de {selectedTechnician.full_name}</strong>{nextOrders.length ? <ul className="mt-2 space-y-1">{nextOrders.slice(0, 5).map((order) => <li key={order.id}>{new Date(order.scheduled_at!).toLocaleString("pt-BR")} · {order.order_number}</li>)}</ul> : <p className="mt-1">Nenhuma OS ativa agendada nesta lista.</p>}<p className="mt-2">A disponibilidade final e o conflito de horário são verificados no despacho.</p><label className="mt-3 block font-medium text-slate-700">Celular para WhatsApp{selectedTechnician.mobile || selectedTechnician.phone ? <span className="ml-1 font-normal text-slate-500">(cadastro: {selectedTechnician.mobile || selectedTechnician.phone})</span> : null}<input value={whatsappPhone} onChange={(event) => setWhatsappPhone(event.target.value)} placeholder="(11) 99999-9999" className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm" /></label></div> : null}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1"><label className="block text-sm font-medium">Data agendada<input required type="date" value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2" /></label><label className="block text-sm font-medium">Horário<select required value={shift} onChange={(event) => setShift(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2"><option value="">Selecione o período</option>{Object.entries(shiftWindows).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label></div>
          <p className="text-xs text-slate-500">A agenda registra a janela do período escolhido e valida conflitos automaticamente.</p>
          <button disabled={submitting || !selectedTechnician || !scheduledDate || !shift} className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600 hover:shadow-md disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none">{submitting ? "Agendando…" : "Agendar visita e encaminhar por WhatsApp"}</button>
        </form>}
      </aside>
    </div>
    <section className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Visitas agendadas e em campo</h2><Link href="/portal/routes" className="text-sm font-semibold text-sky-900 hover:underline">Ver rotas</Link></div>{active.length ? <ul className="mt-3 divide-y divide-slate-100">{active.slice(0, 30).map((order) => { const ticket = tickets.find((item) => item.id === order.ticket_id); return <li key={order.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span><strong>{order.order_number}</strong> · {ticket?.title ?? "Chamado associado"}<span className="ml-2 text-slate-500">{techniciansById.get(order.technician_id ?? "")?.full_name ?? "Técnico não identificado"}</span></span><span className="text-slate-600">{statusLabel[order.status] ?? order.status}</span></li>; })}</ul> : <p className="mt-3 text-sm text-slate-600">Nenhuma visita agendada ou em campo agora.</p>}</section>
  </div>;
}

function Metric({ label, count }: { label: string; count: number }) { return <div className="rounded-xl border border-slate-200 bg-white p-4"><span className="block text-sm text-slate-600">{label}</span><strong className="mt-1 block text-2xl text-slate-900">{count}</strong></div>; }
