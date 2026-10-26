"use client";
/* eslint-disable react-hooks/set-state-in-effect -- hidrata cadastros locais do modo demonstrativo. */

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DemoSidebar } from "@/components/demo-sidebar";

type Ticket = { id: string; subject?: string; title?: string; requester?: string; company?: string; department?: string; priority?: string; sla?: string; address?: string; region?: string; distanceCapitalKm?: number; serviceOrderId?: string; locationId?: string };
type Technician = { id: string; name: string; kind?: string; phone?: string; operationalTechnicianId?: string };
type Polo = { id: string; companyId?: string; companyName?: string; name: string; address?: string; region?: string; distanceCapitalKm?: number; localContact?: string; localPhone?: string; active?: boolean; operationalLocationId?: string };
type ScheduledVisit = { technician?: string; plannedAt?: string; window?: string; state?: string; ticket?: string; region?: string };

const visitsKey = "oneit.demo.field-visits.v1";
const ticketsKey = "oneit.demo.tickets.v1";
const fallbackTechnicians: Technician[] = [
  { id: "tech-1", name: "Felipe Buso", kind: "Interno", phone: "(11) 99999-1001" },
  { id: "tech-2", name: "Ana Costa", kind: "Interno", phone: "(11) 99999-1002" },
  { id: "tech-3", name: "Carlos Ribeiro", kind: "Parceiro", phone: "(11) 98888-2001" },
];

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function scheduleWindow(date: string, value: string) {
  const times = value.match(/(\d{1,2}):(\d{2})\s*(?:—|-|a|até)\s*(\d{1,2}):(\d{2})/i);
  if (!times) return null;
  const normalize = (hour: string, minute: string) => `${hour.padStart(2, "0")}:${minute}`;
  const start = new Date(`${date}T${normalize(times[1], times[2])}:00-03:00`);
  const end = new Date(`${date}T${normalize(times[3], times[4])}:00-03:00`);
  return Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start ? null : { start: start.toISOString(), end: end.toISOString() };
}

export default function DispatchPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [storedTechnicians, setStoredTechnicians] = useState<Technician[]>(fallbackTechnicians);
  const [polos, setPolos] = useState<Polo[]>([]);
  const [scheduledVisits, setScheduledVisits] = useState<ScheduledVisit[]>([]);
  const [ticketId, setTicketId] = useState("");
  const [poloId, setPoloId] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [date, setDate] = useState("");
  const [window, setWindow] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [notice, setNotice] = useState("Selecione uma OS pendente e avance pelos três passos.");

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(ticketsKey) ?? "[]") as unknown;
      const rows = Array.isArray(raw) ? raw : raw && typeof raw === "object" && Array.isArray((raw as { tickets?: unknown[] }).tickets) ? (raw as { tickets: unknown[] }).tickets : [];
      setTickets(rows.map((row) => { const value = row as Ticket; return { ...value, id: String(value.id), subject: value.subject ?? value.title ?? "Chamado sem assunto" }; }));
      const saved = JSON.parse(localStorage.getItem("oneit.demo.field-technicians.v1") ?? "null") as unknown;
      if (Array.isArray(saved) && saved.length) setStoredTechnicians(saved.filter((item) => (item as { active?: boolean }).active !== false).map((item) => {
        const technician = item as Technician & { technician_type?: string; mobile?: string; operational_technician_id?: string };
        return { ...technician, kind: technician.kind ?? technician.technician_type, phone: technician.phone ?? technician.mobile, operationalTechnicianId: technician.operationalTechnicianId ?? technician.operational_technician_id };
      }));
      const settings = JSON.parse(localStorage.getItem("oneit.demo.settings.v1") ?? "{}") as { departments?: unknown[]; companies?: Array<{ id: string; name: string }> };
      if (Array.isArray(settings.departments)) setPolos(settings.departments.map((item) => {
        const polo = item as Polo & { operational_location_id?: string };
        return { ...polo, companyName: settings.companies?.find((company) => company.id === polo.companyId)?.name, operationalLocationId: polo.operationalLocationId ?? polo.operational_location_id };
      }).filter((item) => item.active !== false));
      const organizationId = localStorage.getItem("oneit.demo.organization-id.v1");
      if (organizationId) fetch(`/api/field-service/polos?organizationId=${encodeURIComponent(organizationId)}`)
        .then(async (response) => response.ok ? response.json() : null)
        .then((payload: { polos?: Array<{ id: string; company_id: string; name: string; address: string; city: string; state: string; region: string; distance_capital_km: number; active: boolean }> } | null) => {
          if (payload?.polos?.length) setPolos(payload.polos.filter((item) => item.active).map((item) => ({ id: item.id, companyId: item.company_id, name: item.name, address: `${item.address} · ${item.city}/${item.state}`, region: item.region, distanceCapitalKm: item.distance_capital_km, active: item.active, operationalLocationId: item.id })));
        }).catch(() => undefined);
      const planned = JSON.parse(localStorage.getItem(visitsKey) ?? "[]") as unknown;
      if (Array.isArray(planned)) setScheduledVisits(planned as ScheduledVisit[]);
      const requested = new URLSearchParams(location.search).get("ticket");
      if (requested) setTicketId(requested);
    } catch { setNotice("Não foi possível carregar os cadastros locais."); }
  }, []);

  const selectedTicket = tickets.find((ticket) => ticket.id === ticketId);
  const selectedPolo = polos.find((polo) => polo.id === poloId) ?? polos.find((polo) => (Boolean(selectedTicket?.locationId) && polo.operationalLocationId === selectedTicket?.locationId) || (Boolean(selectedTicket?.department) && polo.name === selectedTicket?.department));
  const address = (poloId ? selectedPolo?.address : selectedTicket?.address || selectedPolo?.address) || "";
  const region = (poloId ? selectedPolo?.region : selectedTicket?.region || selectedPolo?.region) || "Não classificada";
  const distanceCapitalKm = Number((poloId ? selectedPolo?.distanceCapitalKm : selectedTicket?.distanceCapitalKm ?? selectedPolo?.distanceCapitalKm) ?? 0);
  const technicians = useMemo(() => [...storedTechnicians].sort((left, right) => {
    const score = (technician: Technician) => {
      const planned = scheduledVisits.filter((visit) => visit.technician === technician.name && visit.plannedAt === date && visit.state !== "Concluído");
      const hasConflict = Boolean(window && planned.some((visit) => visit.window === window && visit.ticket !== ticketId));
      const sameRegion = Boolean(region && region !== "Não classificada" && planned.some((visit) => visit.region === region));
      return [hasConflict ? 1 : 0, planned.length, sameRegion ? 0 : 1] as const;
    };
    const leftScore = score(left);
    const rightScore = score(right);
    for (let index = 0; index < leftScore.length; index += 1) if (leftScore[index] !== rightScore[index]) return leftScore[index] - rightScore[index];
    return left.name.localeCompare(right.name, "pt-BR");
  }), [date, region, scheduledVisits, storedTechnicians, ticketId, window]);
  const selectedTechnician = technicians.find((technician) => technician.id === technicianId);
  const technicianCapacity = useMemo(() => technicians.map((technician) => {
    const planned = scheduledVisits.filter((visit) => visit.technician === technician.name && visit.plannedAt === date && visit.state !== "Concluído");
    const conflict = Boolean(window && planned.some((visit) => visit.window === window && visit.ticket !== ticketId));
    const sameRegion = Boolean(region && region !== "Não classificada" && planned.some((visit) => visit.region === region));
    return { technician, planned: planned.length, conflict, sameRegion };
  }), [date, region, scheduledVisits, technicians, ticketId, window]);
  const selectedCapacity = technicianCapacity.find((item) => item.technician.id === technicianId);
  useEffect(() => {
    if (!technicianId || !date || !selectedCapacity) return;
    if (selectedCapacity.conflict) {
      setNotice(`Conflito de agenda: ${selectedCapacity.technician.name} já possui uma OS na janela ${window || "selecionada"}. Escolha outro técnico ou horário.`);
      return;
    }
    setNotice(`${selectedCapacity.technician.name}: ${selectedCapacity.planned} visita(s) planejada(s) nesta data${selectedCapacity.sameRegion ? "; existe atendimento na mesma região." : "."}`);
  }, [date, selectedCapacity, technicianId, window]);
  const scheduledConflict = (() => {
    if (!technicianId || !date || !window) return undefined;
    try {
      const raw = JSON.parse(localStorage.getItem(visitsKey) ?? "[]") as unknown;
      return (Array.isArray(raw) ? raw : []).find((item) => {
        const visit = item as { technician?: string; plannedAt?: string; window?: string; state?: string; ticket?: string };
        return visit.technician === selectedTechnician?.name && visit.plannedAt === date && visit.window === window && visit.state !== "Concluído" && visit.ticket !== ticketId;
      }) as { ticket?: string } | undefined;
    } catch { return undefined; }
  })();

  function chooseTicket(value: string) {
    setTicketId(value);
    setPoloId("");
    const ticket = tickets.find((item) => item.id === value);
    setContact(ticket?.requester ?? "");
  }

  function choosePolo(value: string) {
    setPoloId(value);
    const polo = polos.find((item) => item.id === value);
    if (polo?.localContact) setContact(polo.localContact);
    if (polo?.localPhone) setPhone(polo.localPhone);
  }

  function syncTicketToField(visit: { id: string; ticket: string; technician: string; plannedAt: string; window: string; company: string; department: string; region: string }) {
    try {
      const raw = JSON.parse(localStorage.getItem(ticketsKey) ?? "[]") as unknown;
      const patch = (item: Record<string, unknown>) => String(item.id) === visit.ticket ? {
        ...item,
        status: "Pendente",
        technician: visit.technician,
        company: visit.company,
        department: visit.department,
        fieldVisitId: visit.id,
        fieldStatus: "Despachado",
        fieldScheduledAt: visit.plannedAt,
        fieldWindow: visit.window,
        fieldRegion: visit.region,
        pendingReason: "Visita atribuída e aguardando execução técnica.",
      } : item;
      if (Array.isArray(raw)) localStorage.setItem(ticketsKey, JSON.stringify(raw.map((item) => patch(item as Record<string, unknown>))));
      else if (raw && typeof raw === "object" && Array.isArray((raw as { tickets?: unknown[] }).tickets)) {
        const payload = raw as { tickets: Record<string, unknown>[] };
        localStorage.setItem(ticketsKey, JSON.stringify({ ...payload, tickets: payload.tickets.map(patch) }));
      }
    } catch { setNotice("Visita criada, mas a sincronização do chamado precisará ser refeita antes do envio ao técnico."); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTicket || !selectedTechnician || !date || !window || !contact.trim() || !phone.trim() || !address.trim()) {
      setNotice("Complete chamado, polo/endereço, técnico, data, janela e contato do local antes de confirmar.");
      return;
    }
    if (scheduledConflict) {
      setNotice(`Conflito de agenda: ${selectedTechnician.name} já possui ${scheduledConflict.ticket ?? "outra OS"} nesta data e janela.`);
      return;
    }
    const isPersistentTicket = uuidPattern.test(selectedTicket.id);
    const operationalTechnicianId = selectedTechnician.operationalTechnicianId;
    const operationalLocationId = selectedPolo?.operationalLocationId || selectedTicket.locationId;
    const schedule = scheduleWindow(date, window);
    let serviceOrderId = selectedTicket.serviceOrderId ?? "";
    if (isPersistentTicket) {
      if (!operationalTechnicianId || !operationalLocationId) {
        setNotice("Este chamado é persistido. Vincule o técnico e o polo às referências operacionais antes de confirmar o despacho.");
        return;
      }
      if (!schedule) {
        setNotice("Informe uma janela no formato 09:00 — 11:00 para gravar o despacho no servidor.");
        return;
      }
      try {
        const response = await fetch("/api/field-service/dispatch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticketId: selectedTicket.id, technicianId: operationalTechnicianId, locationId: operationalLocationId, plannedStartAt: schedule.start, plannedEndAt: schedule.end, localContactName: contact, localContactPhone: phone }) });
        const payload = await response.json().catch(() => ({})) as { dispatch?: { service_order_id?: string }; code?: string };
        if (!response.ok || !payload.dispatch?.service_order_id) {
          setNotice(payload.code === "SCHEDULE_CONFLICT" ? "Conflito de agenda no servidor. Escolha outra janela ou técnico." : `Não foi possível gravar o despacho: ${payload.code ?? "erro de comunicação"}.`);
          return;
        }
        serviceOrderId = payload.dispatch.service_order_id;
      } catch {
        setNotice("Não foi possível conectar ao servidor para gravar o despacho.");
        return;
      }
    }
    const now = new Date().toISOString();
    const visit = {
      id: `field-${Date.now()}`, ticket: selectedTicket.id, title: selectedTicket.subject, requester: selectedTicket.requester ?? "Solicitante não informado",
      company: selectedPolo?.companyName || selectedTicket.company || "Empresa a confirmar", department: selectedPolo?.name || selectedTicket.department || "Novo Registro", address, region, distanceCapitalKm, serviceOrderId,
      technician: selectedTechnician.name, team: selectedTechnician.kind ?? "Equipe", technicianPhone: selectedTechnician.phone ?? "", partner: selectedTechnician.kind === "Parceiro", plannedAt: date, window, sla: selectedTicket.sla ?? "SLA a definir", priority: selectedTicket.priority ?? "P3", state: "Despachado", localContact: contact, localPhone: phone, notes: "", technicalResolution: "", evidenceNotes: "", photoCount: 0, managerNotes: "", customerAttachmentReference: "", externalOs: "", lpuCode: "", quotedAmount: 0, materials: [], createdAt: now,
    };
    const existing = JSON.parse(localStorage.getItem(visitsKey) ?? "[]") as unknown;
    const visits = Array.isArray(existing) ? existing.filter((item) => (item as { ticket?: string }).ticket !== selectedTicket.id) : [];
    localStorage.setItem(visitsKey, JSON.stringify([visit, ...visits]));
    syncTicketToField(visit);
    localStorage.setItem("oneit.demo.field-active-ticket", selectedTicket.id);
    localStorage.setItem("oneit.demo.field-last-dispatch.v1", JSON.stringify({
      ticket: selectedTicket.id,
      serviceOrderId,
      subject: selectedTicket.subject ?? "Chamado sem assunto",
      technician: selectedTechnician.name,
      technicianPhone: selectedTechnician.phone ?? "",
      technicianKind: selectedTechnician.kind ?? "Equipe",
      company: visit.company,
      department: visit.department,
      address,
      plannedAt: date,
      window,
      localContact: contact,
      localPhone: phone,
    }));
    router.push("/demo/field-service/dispatch/confirmed");
  }

  const poloSelector = <div className="mt-4">
    <label className="block text-sm font-semibold">Polo da visita
      <select value={poloId || selectedPolo?.id || ""} onChange={(event) => choosePolo(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 font-normal">
        <option value="">{address ? "Usar endereço do chamado" : "Selecione o polo cadastrado"}</option>
        {polos.filter((polo) => polo.address?.trim()).map((polo) => <option key={polo.id} value={polo.id}>{polo.companyName ? `${polo.companyName} · ` : ""}{polo.name} · {polo.region || "Região a definir"}</option>)}
      </select>
    </label>
    {address ? <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"><strong>Endereço da OS:</strong> {address}</p> : <p className="mt-2 text-sm text-amber-800">Escolha um polo com endereço antes de confirmar o despacho.</p>}
    {!polos.length && <Link href="/demo/settings" className="mt-2 inline-flex text-sm font-semibold text-[#0b4b78]">Cadastrar empresa e polo →</Link>}
  </div>;

  return <main className="min-h-screen bg-slate-100 text-slate-900"><DemoSidebar active="field-service" /><div data-oneit-sidebar-offset className="ml-64 min-h-screen"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 bg-white px-6 py-4"><div><p className="text-xs font-semibold tracking-[.15em] text-orange-500">ONEIT · FIELD SERVICE</p><h1 className="mt-1 text-xl font-semibold">Atribuir visita</h1><p className="mt-1 text-sm text-slate-500">Despacho guiado para transformar uma OS em atendimento de campo.</p></div><Link href="/demo/field-service/queue-v2" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Voltar à fila</Link></header><section className="mx-auto max-w-5xl p-5 sm:p-8"><p role="status" className="rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-950">{notice}</p><form onSubmit={submit} className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><section className="rounded-xl border bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[.14em] text-[#0a5261]">1 · Chamado e local</p><label className="mt-4 block text-sm font-semibold">OS de origem<select value={ticketId} onChange={(event) => chooseTicket(event.target.value)} required className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 font-normal"><option value="">Selecione o chamado</option>{tickets.map((ticket) => <option key={ticket.id} value={ticket.id}>{ticket.id} · {ticket.subject}</option>)}</select></label>{selectedTicket ? <div className="mt-4 rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-sm"><p className="font-semibold">Contexto do chamado</p><p className="mt-2">{selectedTicket.company ?? "Empresa a confirmar"} · {selectedTicket.department ?? "Local a classificar"}</p><p className="mt-1">Prioridade {selectedTicket.priority ?? "P3"} · {selectedTicket.sla ?? "SLA a definir"}</p></div> : null}{poloSelector}<div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Data<input type="date" required value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 w-full rounded-lg border p-2.5 font-normal" /></label><label className="text-sm font-semibold">Janela<input required value={window} onChange={(event) => setWindow(event.target.value)} placeholder="09:00 — 11:00" className="mt-1 w-full rounded-lg border p-2.5 font-normal" /></label></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Contato no local<input required value={contact} onChange={(event) => setContact(event.target.value)} className="mt-1 w-full rounded-lg border p-2.5 font-normal" /></label><label className="text-sm font-semibold">Telefone<input required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(11) 00000-0000" className="mt-1 w-full rounded-lg border p-2.5 font-normal" /></label></div></section><aside className="rounded-xl border bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[.14em] text-[#0a5261]">2 · Técnico e disponibilidade</p><p className="mt-1 text-sm text-slate-500">A agenda definitiva deve ser confrontada no módulo de rotas antes da confirmação.</p><label className="mt-4 block text-sm font-semibold">Técnico<select value={technicianId} onChange={(event) => setTechnicianId(event.target.value)} required className="mt-1 w-full rounded-lg border p-2.5 font-normal"><option value="">Selecione o técnico</option>{technicians.map((technician) => <option key={technician.id} value={technician.id}>{technician.name} · {technician.kind ?? "Equipe"}</option>)}</select></label>{selectedTechnician ? <div className="mt-4 rounded-lg border bg-slate-50 p-4 text-sm"><p className="font-semibold">{selectedTechnician.name}</p><p className="mt-1 text-slate-600">{selectedTechnician.kind ?? "Equipe"} · {selectedTechnician.phone || "Telefone não informado"}</p><p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">Confirme conflitos de agenda e distância na tela de rotas antes de enviar.</p></div> : null}<div className="mt-6 border-t pt-4"><p className="text-xs font-semibold uppercase tracking-[.14em] text-[#0a5261]">3 · Confirmar</p><button className="mt-3 w-full rounded-lg bg-orange-500 px-4 py-3 text-sm font-semibold text-white">Confirmar visita e despachar</button><Link href="/demo/field-service/routes" className="mt-3 block text-center text-sm font-semibold text-[#123f99]">Ver agenda e conflitos →</Link></div></aside></form></section></div></main>;
}
