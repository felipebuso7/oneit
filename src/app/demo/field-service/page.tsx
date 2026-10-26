"use client";
/* eslint-disable react-hooks/set-state-in-effect -- sincroniza dados locais e eventos de foco/storage do modo demonstrativo. */
/* eslint-disable @next/next/no-img-element -- assinatura é uma data URL capturada no dispositivo. */

import { FormEvent, MouseEvent, useEffect, useMemo, useState } from "react";
import { DemoSidebar } from "@/components/demo-sidebar";
import { openGeneratedPdf } from "@/lib/demo/report-pdf";
import { appendFieldEvent } from "@/lib/demo/field-events";
import { recordFieldCommunication } from "@/lib/demo/field-communications";

type FieldState = "Fila de despacho" | "Despachado" | "Em deslocamento" | "Check-in" | "Em atendimento" | "Check-out" | "Aguardando validação do gestor" | "Concluído";
type Ticket = { id: string; subject: string; requester?: string; company?: string; department?: string; priority?: string; sla?: string; status?: string };
type Lpu = { id: string; code: string; description: string; unit?: string; price: number; active: boolean };
type Technician = { id: string; name: string; team: string; kind: "Interno" | "Parceiro"; phone: string; coverage?: string; partnerTicket?: string };
type MaterialItem = { id: string; description: string; quantity: number; unit: string; unitPrice: number };
type Visit = { id: string; ticket: string; title: string; requester: string; company: string; department: string; address: string; region: string; distanceCapitalKm: number; technician: string; team: string; technicianPhone: string; partner: boolean; plannedAt: string; completedAt?: string; technicianCompletedAt?: string; managerValidatedAt?: string; managerValidatedBy?: string; reportGeneratedAt?: string; window: string; sla: string; priority: string; state: FieldState; localContact: string; localPhone: string; notes: string; technicalResolution: string; evidenceNotes: string; photoCount: number; managerNotes: string; customerAttachmentReference: string; externalOs: string; lpuCode: string; quotedAmount: number; materials: MaterialItem[]; customerSignatureName?: string; signatureDataUrl?: string; signedAt?: string };
type DepartmentRecord = { id: string; companyId: string; name: string; address?: string; region?: string; distanceCapitalKm?: number; localContact?: string; localPhone?: string; active: boolean };

const visitKey = "oneit.demo.field-visits.v1";
const lpuKey = "oneit.demo.field-lpu.v1";
const ticketKey = "oneit.demo.tickets.v1";
const seedTechnicians: Technician[] = [
  { id: "tech-1", name: "Felipe Buso", team: "Equipe interna SP", kind: "Interno", phone: "(11) 99999-1001" },
  { id: "tech-2", name: "Ana Costa", team: "Equipe interna Sul", kind: "Interno", phone: "(11) 99999-1002" },
  { id: "tech-3", name: "Carlos Ribeiro", team: "Parceiro Norte", kind: "Parceiro", phone: "(11) 98888-2001", partnerTicket: "OS-PARCEIRO-001" },
  { id: "tech-4", name: "Mariana Lima", team: "Parceiro Litoral", kind: "Parceiro", phone: "(13) 98888-2002", partnerTicket: "OS-PARCEIRO-002" },
];
const addresses: Record<string, { address: string; contact: string; phone: string; region: string; distanceCapitalKm: number }> = {
  "Comercial": { address: "Av. Paulista, 1000, Bela Vista, São Paulo - SP", contact: "Recepção Comercial", phone: "(11) 3333-1000", region: "Capital - São Paulo", distanceCapitalKm: 3 },
  "TI": { address: "Rua da Tecnologia, 250, Centro, São Paulo - SP", contact: "Central de TI", phone: "(11) 3333-2000", region: "Capital - São Paulo", distanceCapitalKm: 4 },
  "Operações": { address: "Rod. Régis Bittencourt, km 275, Embu das Artes - SP", contact: "Operações locais", phone: "(11) 3333-3000", region: "Região Metropolitana", distanceCapitalKm: 28 },
  "Novo Registro": { address: "Endereço pendente no cadastro do departamento", contact: "", phone: "", region: "Não classificada", distanceCapitalKm: 0 },
};
const states: FieldState[] = ["Fila de despacho", "Despachado", "Em deslocamento", "Check-in", "Em atendimento", "Check-out", "Aguardando validação do gestor", "Concluído"];
const seedLpu: Lpu[] = [
  { id: "lpu-1", code: "LPU-RED-001", description: "Visita técnica de rede", unit: "visita", price: 220, active: true },
  { id: "lpu-2", code: "LPU-HDW-010", description: "Substituição de periférico", unit: "unidade", price: 85, active: true },
  { id: "lpu-3", code: "LPU-MAT-RJ45-001", description: "RJ45", unit: "unidade", price: 5, active: true },
  { id: "lpu-4", code: "LPU-MAT-CABO-001", description: "Cabo de rede", unit: "metro", price: 10, active: true },
];

function normalizeVisit(value: Partial<Visit> & Record<string, unknown>): Visit & Record<string, unknown> {
  return {
    id: String(value.id ?? "visit-" + Date.now()), ticket: String(value.ticket ?? "REQ-SEM-NÚMERO"), title: String(value.title ?? "Chamado de campo"),
    requester: String(value.requester ?? "Solicitante não informado"), company: String(value.company ?? "Empresa a confirmar"),
    department: String(value.department ?? value.customer ?? "Novo Registro"), address: String(value.address ?? "Endereço a confirmar"), region: String(value.region ?? "Não classificada"), distanceCapitalKm: Number(value.distanceCapitalKm ?? 0),
    technician: String(value.technician ?? "Não atribuído"), team: String(value.team ?? "Sem equipe"), technicianPhone: String(value.technicianPhone ?? ""), partner: Boolean(value.partner),
    plannedAt: String(value.plannedAt ?? ""), completedAt: value.completedAt ? String(value.completedAt) : undefined, technicianCompletedAt: value.technicianCompletedAt ? String(value.technicianCompletedAt) : undefined, managerValidatedAt: value.managerValidatedAt ? String(value.managerValidatedAt) : undefined, managerValidatedBy: value.managerValidatedBy ? String(value.managerValidatedBy) : undefined, reportGeneratedAt: value.reportGeneratedAt ? String(value.reportGeneratedAt) : undefined, window: String(value.window ?? ""), sla: String(value.sla ?? "SLA a definir"),
    priority: String(value.priority ?? "P3"), state: (states.includes(value.state as FieldState) ? value.state : "Fila de despacho") as FieldState,
    localContact: String(value.localContact ?? ""), localPhone: String(value.localPhone ?? ""), notes: String(value.notes ?? ""), technicalResolution: String(value.technicalResolution ?? ""), evidenceNotes: String(value.evidenceNotes ?? ""), photoCount: Number(value.photoCount ?? 0), managerNotes: String(value.managerNotes ?? ""), customerAttachmentReference: String(value.customerAttachmentReference ?? ""),
    externalOs: String(value.externalOs ?? ""), lpuCode: String(value.lpuCode ?? ""), quotedAmount: Number(value.quotedAmount ?? 0), materials: Array.isArray(value.materials) ? value.materials.map((item, index) => ({ id: String(item?.id ?? "material-" + index), description: String(item?.description ?? "Item sem descrição"), quantity: Number(item?.quantity ?? 0), unit: String(item?.unit ?? "unidade"), unitPrice: Number(item?.unitPrice ?? 0) })).filter((item) => item.quantity > 0 && item.unitPrice >= 0) : [], customerSignatureName: value.customerSignatureName ? String(value.customerSignatureName) : undefined, signatureDataUrl: value.signatureDataUrl ? String(value.signatureDataUrl) : undefined, signedAt: value.signedAt ? String(value.signedAt) : undefined, evidenceDataUrls: Array.isArray(value.evidenceDataUrls) ? value.evidenceDataUrls.filter((item): item is string => typeof item === "string").slice(0, 8) : [],
  };
}

function visitRisk(visit: Visit) {
  if (visit.state === "Concluído") return null;
  if (visit.state === "Aguardando validação do gestor") return { label: "Validar encerramento", tone: "bg-violet-50 text-violet-700", detail: "Gestor deve validar fotos, resolução, medição e fechamento no OneIT." };
  if (!visit.plannedAt) return { label: "Sem agendamento", tone: "bg-slate-100 text-slate-700", detail: "Defina data e janela para evitar chamado parado." };
  const planned = new Date(visit.plannedAt + "T00:00:00");
  if (Number.isNaN(planned.getTime())) return { label: "Data inválida", tone: "bg-red-50 text-red-700", detail: "Revise o agendamento da OS." };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const difference = Math.round((planned.getTime() - today.getTime()) / 86400000);
  if (difference < 0) return { label: "Atendimento vencido", tone: "bg-red-50 text-red-700", detail: "A data prevista passou; replaneje ou registre a execução." };
  if (difference === 0) return { label: "Atendimento hoje", tone: "bg-amber-50 text-amber-700", detail: "Confirme deslocamento, check-in e capacidade do técnico." };
  if (difference === 1) return { label: "Atendimento amanhã", tone: "bg-amber-50 text-amber-700", detail: "Confirme rota, contato e materiais antes da visita." };
  return null;
}

function measurementValue(visit: Visit) {
  return visit.quotedAmount + visit.materials.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

export default function FieldServicePage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>(seedTechnicians);
  const [lpuItems, setLpuItems] = useState<Lpu[]>(seedLpu);
  const [visitsHydrated, setVisitsHydrated] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [showDispatch, setShowDispatch] = useState(false);
  const [dispatchVisitId, setDispatchVisitId] = useState("");
  const [notice, setNotice] = useState("Selecione um despacho ou crie uma nova ordem de serviço de campo.");
  const [whatsAppPhone, setWhatsAppPhone] = useState("");
  const [showWhatsAppPhone, setShowWhatsAppPhone] = useState(false);
  const [ticketId, setTicketId] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [plannedAt, setPlannedAt] = useState("");
  const [window, setWindow] = useState("");
  const [localContact, setLocalContact] = useState("");
  const [localPhone, setLocalPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [externalOs, setExternalOs] = useState("");
  const [lpuCode, setLpuCode] = useState("");
  const [quotedAmount, setQuotedAmount] = useState("");

  useEffect(() => {
    try {
      const savedVisits = JSON.parse(localStorage.getItem(visitKey) ?? "[]");
      if (Array.isArray(savedVisits)) setVisits(savedVisits.map(normalizeVisit));
      const savedTickets = JSON.parse(localStorage.getItem(ticketKey) ?? "[]") as unknown;
      const ticketRows = Array.isArray(savedTickets) ? savedTickets : (savedTickets && typeof savedTickets === "object" && Array.isArray((savedTickets as { tickets?: unknown[] }).tickets) ? (savedTickets as { tickets: unknown[] }).tickets : []);
      if (ticketRows.length) setTickets(ticketRows.map((value) => ({ id: String((value as Ticket).id), subject: String((value as Ticket).subject ?? (value as { title?: unknown }).title ?? "Novo chamado"), requester: String((value as Ticket).requester ?? (value as { solicitante?: unknown }).solicitante ?? ""), company: String((value as Ticket).company ?? (value as { local?: unknown }).local ?? ""), department: String((value as Ticket).department ?? "Novo Registro"), priority: String((value as Ticket).priority ?? "P3"), sla: String((value as Ticket).sla ?? "SLA a definir"), status: String((value as Ticket).status ?? "") })));
      const savedLpu = JSON.parse(localStorage.getItem(lpuKey) ?? "null");
      if (Array.isArray(savedLpu)) setLpuItems([...seedLpu.filter((seed) => !savedLpu.some((item: Lpu) => item.code === seed.code)), ...savedLpu]);
      const lpuOrganizationId = localStorage.getItem("oneit.demo.organization-id.v1");
      if (lpuOrganizationId) fetch(`/api/field-service/lpu?organizationId=${encodeURIComponent(lpuOrganizationId)}`).then(async (response) => response.ok ? response.json() : null).then((payload: { items?: Array<{ id: string; code: string; description: string; unit: string; unit_price: number; active: boolean }> } | null) => { if (payload?.items?.length) setLpuItems(payload.items.map((item) => ({ id: item.id, code: item.code, description: item.description, unit: item.unit, price: item.unit_price, active: item.active }))); }).catch(() => undefined);
      const settings = JSON.parse(localStorage.getItem("oneit.demo.settings.v1") ?? "{}");
      if (Array.isArray(settings.departments)) setDepartments(settings.departments);
      const poloOrganizationId = localStorage.getItem("oneit.demo.organization-id.v1");
      if (poloOrganizationId) fetch(`/api/field-service/polos?organizationId=${encodeURIComponent(poloOrganizationId)}`).then(async (response) => response.ok ? response.json() : null).then((payload: { polos?: Array<{ id: string; company_id: string; name: string; address: string; city: string; state: string; region: string; distance_capital_km: number; active: boolean }> } | null) => { if (payload?.polos?.length) setDepartments(payload.polos.map((polo) => ({ id: polo.id, companyId: polo.company_id, name: polo.name, address: `${polo.address} · ${polo.city}/${polo.state}`, region: polo.region, distanceCapitalKm: polo.distance_capital_km, active: polo.active }))); }).catch(() => undefined);
      const savedTechnicians = JSON.parse(localStorage.getItem("oneit.demo.field-technicians.v1") ?? "null");
      if (Array.isArray(savedTechnicians)) setTechnicians(savedTechnicians.filter((technician) => technician.active));
      const organizationId = localStorage.getItem("oneit.demo.organization-id.v1");
      if (organizationId) fetch(`/api/field-service/technicians?organizationId=${encodeURIComponent(organizationId)}`).then(async (response) => response.ok ? response.json() : null).then((payload: { technicians?: Array<{ id: string; name: string; mobile: string | null; technician_type?: "internal" | "partner"; active: boolean }> } | null) => { if (payload?.technicians?.length) setTechnicians(payload.technicians.filter((item) => item.active).map((item) => ({ id: item.id, name: item.name, team: item.technician_type === "partner" ? "Parceiro" : "Cadastro persistente", kind: item.technician_type === "partner" ? "Parceiro" as const : "Interno" as const, phone: item.mobile ?? "", coverage: "A definir", active: item.active }))); }).catch(() => undefined);
    } catch { setNotice("Não foi possível recuperar todos os dados locais. Cadastre o despacho novamente."); }
    finally { setVisitsHydrated(true); }
  }, []);
  useEffect(() => { if (visitsHydrated) { localStorage.setItem(visitKey, JSON.stringify(visits)); globalThis.window.dispatchEvent(new Event("oneit-demo-field-visits-updated")); } }, [visits, visitsHydrated]);
  useEffect(() => { const refresh = () => { try { const saved = localStorage.getItem(visitKey); const parsed = JSON.parse(saved ?? "[]") as unknown; if (Array.isArray(parsed)) setVisits(parsed.map(normalizeVisit)); } catch { /* Mantém a visão atual se a leitura local falhar. */ } }; const onStorage = (event: StorageEvent) => { if (event.key === visitKey) refresh(); }; globalThis.window.addEventListener("storage", onStorage); globalThis.window.addEventListener("focus", refresh); return () => { globalThis.window.removeEventListener("storage", onStorage); globalThis.window.removeEventListener("focus", refresh); }; }, []);
  // A função abre o painel de despacho; a dependência estável é a lista de visitas.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { const params = new URLSearchParams(globalThis.location.search); const ticket = params.get("ticket"); const dispatchTicket = params.get("dispatch"); const found = visits.find((visit) => visit.ticket === (ticket || dispatchTicket)); if (found) { setSelectedId(found.id); if (dispatchTicket && found.state === "Fila de despacho") openDispatch(found); } else if (dispatchTicket) { setTicketId(dispatchTicket); setShowDispatch(true); } }, [visits]);

  const selected = visits.find((visit) => visit.id === selectedId) ?? visits[0];
  const pendingTickets = useMemo(() => tickets.filter((ticket) => !visits.some((visit) => visit.ticket === ticket.id && visit.state !== "Fila de despacho")), [tickets, visits]);
  const chosenTicket = tickets.find((ticket) => ticket.id === ticketId) ?? pendingTickets[0];
  const chosenTech = technicians.find((technician) => technician.id === technicianId);
  const configuredDepartment = departments.find((department) => department.name === chosenTicket?.department && department.active);
  const fallbackDepartment = addresses[chosenTicket?.department ?? ""];
  const departmentContext = configuredDepartment ? { address: configuredDepartment.address || "Endereço pendente no cadastro do departamento", contact: configuredDepartment.localContact || "", phone: configuredDepartment.localPhone || "", region: configuredDepartment.region || "Não classificada", distanceCapitalKm: Number(configuredDepartment.distanceCapitalKm ?? 0) } : (fallbackDepartment ?? { address: "Endereço pendente no cadastro do departamento", contact: "", phone: "", region: "Não classificada", distanceCapitalKm: 0 });

  function openDispatch(source?: Visit | MouseEvent<HTMLButtonElement>) {
    const queuedVisit = source && "ticket" in source ? source : undefined;
    const first = queuedVisit ? tickets.find((ticket) => ticket.id === queuedVisit.ticket) : pendingTickets[0];
    setDispatchVisitId(queuedVisit?.id ?? "");
    setTicketId(first?.id ?? queuedVisit?.ticket ?? "");
    setTechnicianId("");
    setPlannedAt(queuedVisit?.plannedAt ?? "");
    setWindow(queuedVisit?.window ?? "");
    setLocalContact(queuedVisit?.localContact ?? first?.requester ?? "");
    setLocalPhone(queuedVisit?.localPhone ?? "");
    setNotes(queuedVisit?.notes ?? "");
    setExternalOs(queuedVisit?.externalOs ?? "");
    setLpuCode(queuedVisit?.lpuCode ?? "");
    setQuotedAmount(queuedVisit?.quotedAmount ? String(queuedVisit.quotedAmount) : "");
    setShowDispatch(true);
  }
  function chooseLpu(code: string) {
    setLpuCode(code);
    const item = lpuItems.find((value) => value.code === code);
    setQuotedAmount(item ? String(item.price) : "");
    if (item) setNotice(`LPU aplicada: ${item.description} · unidade ${item.unit ?? "não informada"} · R$ ${item.price.toFixed(2)}.`);
  }
  function dispatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chosenTicket || !chosenTech || !plannedAt || !window) { setNotice("Informe chamado, técnico, agendamento e janela de atendimento."); return; }
    if (departmentContext.address.startsWith("Endereço pendente")) { setNotice("Cadastre o endereço do departamento antes de liberar a rota física."); return; }
    if (!localContact.trim() || !localPhone.trim()) { setNotice("Informe quem procurar no local e o telefone de contato antes de liberar a rota."); return; }
    const queuedVisit = visits.find((visit) => visit.id === dispatchVisitId);
    const created: Visit = {
      id: queuedVisit?.id ?? "field-" + Date.now(), ticket: chosenTicket.id, title: chosenTicket.subject, requester: chosenTicket.requester || queuedVisit?.requester || "Solicitante não informado",
      company: chosenTicket.company || "Empresa a confirmar", department: chosenTicket.department || "Novo Registro", address: departmentContext.address, region: departmentContext.region, distanceCapitalKm: departmentContext.distanceCapitalKm,
      technician: chosenTech.name, team: chosenTech.team, technicianPhone: chosenTech.phone, partner: chosenTech.kind === "Parceiro", plannedAt, window, sla: chosenTicket.sla || "SLA a definir",
      priority: chosenTicket.priority || "P3", state: "Despachado", localContact, localPhone, notes, technicalResolution: "", evidenceNotes: "", photoCount: 0, managerNotes: "", customerAttachmentReference: "", externalOs: externalOs || chosenTech.partnerTicket || "",
      lpuCode, quotedAmount: Number(quotedAmount || 0), materials: queuedVisit?.materials ?? [],
    };
    setVisits((all) => queuedVisit ? all.map((visit) => visit.id === queuedVisit.id ? created : visit) : [created, ...all]);
    setSelectedId(created.id);
    setShowDispatch(false);
    setNotice("Visita atribuída. Confirme a rota e use Compartilhar WhatsApp no detalhe para enviar o resumo e o link ao técnico.");
  }
  function changeState(state: FieldState) {
    if (!selected) return;
    if (state === "Concluído") { sendToManagerValidation(); return; }
    setVisits((all) => all.map((visit) => visit.id === selected.id ? { ...visit, state } : visit));
    setNotice("Status operacional atualizado para " + state + ".");
  }
  function updateSelected(patch: Partial<Visit>) {
    if (!selected) return;
    const nextState = patch.state ?? selected.state;
    if (nextState !== selected.state) {
      const allowed: Record<FieldState, FieldState[]> = { "Fila de despacho": ["Despachado"], "Despachado": ["Em deslocamento"], "Em deslocamento": ["Check-in"], "Check-in": ["Em atendimento"], "Em atendimento": ["Check-out", "Aguardando validação do gestor"], "Check-out": ["Aguardando validação do gestor"], "Aguardando validação do gestor": ["Concluído", "Em atendimento"], "Concluído": [] };
      if (!allowed[selected.state]?.includes(nextState)) { setNotice("Transição não permitida: " + selected.state + " → " + nextState + "."); return; }
      try {
        appendFieldEvent({ ticket: selected.ticket, from: selected.state, to: nextState, actor: "Gestor de Field Service", details: String(patch.managerNotes ?? "Atualização operacional pelo gestor") });
        const ticketPayload = JSON.parse(localStorage.getItem(ticketKey) ?? "{}") as { timeline?: Record<string, Array<{ at: string; text: string; kind: "cliente" | "interna" }>> };
        const timeline = ticketPayload.timeline ?? {};
        timeline[selected.ticket] = [{ at: new Date().toLocaleString("pt-BR"), text: "Field Service: " + selected.state + " → " + nextState + ".", kind: "interna" }, ...(timeline[selected.ticket] ?? [])];
        localStorage.setItem(ticketKey, JSON.stringify({ ...ticketPayload, timeline }));
      } catch { /* A atualização da OS continua mesmo se o cache local de auditoria falhar. */ }
    }
    setVisits((all) => all.map((visit) => visit.id === selected.id ? { ...visit, ...patch } : visit));
  }
  function sendToManagerValidation() {
    if (!selected) return;
    if (!selected.technicalResolution.trim()) { setNotice("Registre a resolução técnica antes de enviar a OS para validação do gestor."); return; }
    updateSelected({ state: "Aguardando validação do gestor", technicianCompletedAt: selected.technicianCompletedAt ?? new Date().toISOString() });
    try {
      const raw = JSON.parse(localStorage.getItem(ticketKey) ?? "[]") as unknown;
      if (Array.isArray(raw)) localStorage.setItem(ticketKey, JSON.stringify(raw.map((ticket) => typeof ticket === "object" && ticket && String((ticket as Ticket).id) === selected.ticket ? { ...ticket, status: "Pendente validação", fieldStatus: "Aguardando validação do gestor" } : ticket)));
      else if (raw && typeof raw === "object" && Array.isArray((raw as { tickets?: unknown[] }).tickets)) { const payload = raw as { tickets: Record<string, unknown>[] }; localStorage.setItem(ticketKey, JSON.stringify({ ...payload, tickets: payload.tickets.map((ticket) => String(ticket.id) === selected.ticket ? { ...ticket, status: "Pendente validação", fieldStatus: "Aguardando validação do gestor" } : ticket) })); }
    } catch { /* A OS continua na fila do Field mesmo se o cache de chamados estiver indisponível. */ }
    setNotice("Execução técnica encerrada. A OS retornou à fila do gestor para validar fotos, resolução e medição.");
  }
  function closeTicketInOneIT(visit: Visit) {
    try {
      const fieldReport = { status: "gerado", fileName: "RTO-" + visit.ticket + ".pdf", generatedAt: new Date().toISOString(), summary: visit.technicalResolution, signatureCaptured: Boolean(visit.signatureDataUrl), signatureName: visit.customerSignatureName };
      const raw = JSON.parse(localStorage.getItem(ticketKey) ?? "[]") as unknown;
      if (Array.isArray(raw)) {
        localStorage.setItem(ticketKey, JSON.stringify(raw.map((ticket) => typeof ticket === "object" && ticket && String((ticket as Ticket).id) === visit.ticket ? { ...ticket, status: "Fechado", resolution: visit.technicalResolution, fieldVisitId: visit.id, fieldStatus: "Concluído", fieldReport } : ticket)));
      } else if (raw && typeof raw === "object" && Array.isArray((raw as { tickets?: unknown[] }).tickets)) {
        const payload = raw as { tickets: Record<string, unknown>[] };
        localStorage.setItem(ticketKey, JSON.stringify({ ...payload, tickets: payload.tickets.map((ticket) => String(ticket.id) === visit.ticket ? { ...ticket, status: "Fechado", resolution: visit.technicalResolution, fieldVisitId: visit.id, fieldStatus: "Concluído", fieldReport } : ticket) }));
      }
    } catch { /* O encerramento de campo continua registrado, mesmo se o cache de chamados estiver indisponível. */ }
  }
  async function validateAndClose() {
    if (!selected) return;
    if (selected.state !== "Aguardando validação do gestor") { setNotice("A OS precisa estar na fila de validação do gestor antes do fechamento administrativo."); return; }
    if (!selected.technicalResolution.trim()) { setNotice("A resolução técnica é obrigatória para fechar a OS."); return; }
    if (!selected.customerSignatureName?.trim() || !selected.signatureDataUrl) { setNotice("A assinatura e o nome do responsável pelo aceite são obrigatórios para validar a OS."); return; }
    if (selected.photoCount <= 0 && !selected.evidenceNotes.trim()) { setNotice("Registre ao menos a quantidade de fotos ou uma evidência da resolução antes de fechar."); return; }
    const now = new Date().toISOString();
    const finalized = { ...selected, state: "Concluído" as FieldState, completedAt: now, managerValidatedAt: now, managerValidatedBy: "Gestor de Field Service" };
    if (!await reviewInBackend("APPROVE", "Fotos, resolução técnica, materiais e RTO conferidos pelo gestor.")) return;
    updateSelected({ ...finalized });
    closeTicketInOneIT(finalized);
    await generateTechnicalReport();
    setNotice("OS validada, RTO gerado e chamado de origem encerrado no OneIT.");
  }
  async function returnForCorrection() {
    if (!selected) return;
    if (selected.state !== "Aguardando validação do gestor") { setNotice("A OS só pode ser devolvida durante a validação do gestor."); return; }
    const reason = selected.managerNotes.trim();
    if (!reason) { setNotice("Registre o motivo da devolução no parecer do gestor antes de devolver a OS."); return; }
    if (!await reviewInBackend("RETURN", reason)) return;
    updateSelected({ state: "Em atendimento", managerNotes: "DEVOLVIDA PARA CORREÇÃO: " + reason });
    setNotice("OS devolvida para correção. O histórico do atendimento original foi preservado.");
  }
  async function reviewInBackend(decision: "APPROVE" | "RETURN", reason: string) {
    if (!selected || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(selected.ticket)) return true;
    try {
      const response = await fetch("/api/tickets/review", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticketId: selected.ticket, expectedVersion: 1, decision, reason }) });
      if (response.ok) return true;
      const payload = await response.json().catch(() => ({})) as { code?: string };
      setNotice("A API recusou a validação: " + (payload.code ?? "erro desconhecido") + ".");
    } catch { setNotice("Não foi possível validar a OS no servidor."); }
    return false;
  }
  async function generateTechnicalReport() {
    if (!selected) return;
    try { const timing = selected as Visit & { openedAt?: string; checkedInAt?: string; checkedOutAt?: string; travelStartedAt?: string }; const parseDate = (value?: string) => { if (!value) return 0; const iso = Date.parse(value); if (!Number.isNaN(iso)) return iso; const match = value.match(/(\d{2})\/(\d{2})\/(\d{4})[ ,]+(\d{2}):(\d{2})/); return match ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), Number(match[4]), Number(match[5])).getTime() : 0; }; const opened = parseDate(timing.openedAt) || parseDate(selected.plannedAt); const checkedIn = parseDate(timing.checkedInAt); const checkedOut = parseDate(timing.checkedOutAt); const elapsed = opened && checkedOut ? Math.max(0, checkedOut - opened) : 0; const serviceTime = checkedIn && checkedOut ? Math.max(0, checkedOut - checkedIn) : 0; const formatDuration = (value: number) => value ? Math.floor(value / 3600000) + "h " + Math.floor((value % 3600000) / 60000) + "min" : "Não registrado"; await openGeneratedPdf({ fileName: "RTO-" + selected.ticket + ".pdf", title: "RELATÓRIO TÉCNICO OPERACIONAL", subtitle: selected.ticket + " · " + selected.title, oneitLogoUrl: "/oneit-logo.png", serviciaLogoUrl: "/servicia-logo-cropped.png", sections: [
      { heading: "Identificação", lines: ["Solicitante: " + selected.requester, "Empresa / departamento: " + selected.company + " · " + selected.department, "Endereço: " + selected.address, "Técnico / equipe: " + selected.technician + " · " + selected.team, "Agendamento: " + (selected.plannedAt || "A definir") + " · " + (selected.window || "Sem janela"), "Tempo total do chamado: " + formatDuration(elapsed), "Tempo em atendimento: " + formatDuration(serviceTime), "Status / SLA / prioridade: " + selected.state + " · " + selected.sla + " · " + selected.priority] },
      { heading: "Execução e evidências", lines: ["Resolução técnica: " + (selected.technicalResolution || "Não registrada"), "Evidências: " + (selected.photoCount ? selected.photoCount + " foto(s)" : "Sem contagem de fotos") + (selected.evidenceNotes ? " · " + selected.evidenceNotes : ""), "Observações: " + (selected.notes || "Não registradas")], imageDataUrls: (selected as Visit & { evidenceDataUrls?: string[] }).evidenceDataUrls },
      { heading: "Medição e fechamento", lines: ["OS externa: " + (selected.externalOs || "Não informada"), "LPU / valor previsto: " + (selected.lpuCode || "Não aplicada") + " · R$ " + selected.quotedAmount.toFixed(2), "Materiais: " + (selected.materials.length ? selected.materials.map((item) => item.description + " (" + item.quantity + " × R$ " + item.unitPrice.toFixed(2) + ")").join("; ") : "Sem itens registrados"), "Valor total de medição: R$ " + measurementValue(selected).toFixed(2), "Aceite do cliente: " + (selected.customerSignatureName || "Não registrado") + (selected.signedAt ? " · " + new Date(selected.signedAt).toLocaleString("pt-BR") : ""), "Validação do gestor: " + (selected.managerValidatedAt ? (selected.managerValidatedBy || "Gestor") + " · " + new Date(selected.managerValidatedAt).toLocaleString("pt-BR") : "Pendente"), "Referência no sistema do cliente: " + (selected.customerAttachmentReference || "Não registrada")], signatureDataUrl: selected.signatureDataUrl },
    ] });
      updateSelected({ reportGeneratedAt: new Date().toISOString() });
      setNotice("PDF técnico gerado e aberto para leitura, impressão ou download.");
    } catch { setNotice("Não foi possível gerar o PDF técnico neste navegador. Tente novamente ou verifique permissões de pop-up/download."); }
  }
  function generatePartnerAccess() {
    if (!selected) return;
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const record = { ticket: selected.ticket, code, expiresAt, technician: selected.technician, createdAt: new Date().toISOString(), used: false };
    try {
      const existing = JSON.parse(localStorage.getItem("oneit.demo.field-partner-access.v1") ?? "[]");
      localStorage.setItem("oneit.demo.field-partner-access.v1", JSON.stringify([record, ...(Array.isArray(existing) ? existing.filter((item) => item.ticket !== selected.ticket) : [])]));
      setNotice("Acesso temporário gerado para " + selected.ticket + ". Código: " + code + ". Válido por 24 horas; envie somente ao parceiro responsável.");
    } catch { setNotice("Não foi possível gerar o acesso temporário no navegador."); }
  }
  function addMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const data = new FormData(event.currentTarget);
    const description = String(data.get("description") ?? "").trim();
    const quantity = Number(data.get("quantity") ?? 0);
    const unit = String(data.get("unit") ?? "unidade").trim() || "unidade";
    const unitPrice = Number(data.get("unitPrice") ?? 0);
    if (!description || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) { setNotice("Informe descrição, quantidade e valor unitário válidos para compor a OS."); return; }
    setVisits((all) => all.map((visit) => visit.id === selected.id ? { ...visit, materials: [...visit.materials, { id: "material-" + Date.now(), description, quantity, unit, unitPrice }] } : visit));
    event.currentTarget.reset();
    setNotice("Item utilizado adicionado à composição da OS. O valor de medição foi atualizado.");
  }
  function shareTicketWhatsApp(phoneOverride?: string | MouseEvent<HTMLButtonElement>) {
    if (!selected) return;
    if (selected.partner && typeof phoneOverride !== "string") { setWhatsAppPhone(selected.technicianPhone || ""); setShowWhatsAppPhone(true); return; }
    const phone = typeof phoneOverride === "string" ? phoneOverride : undefined;
    if (selected.partner && phone) updateSelected({ technicianPhone: phone });
    localStorage.setItem("oneit.demo.field-active-ticket", selected.ticket);
    let tokenLine = "Acesse com seu login técnico.";
    let portalPath = "/demo/field-service/technician";
    if (selected.partner) {
      portalPath = "/demo/field-service/partner";
      const existing = (() => { try { const stored = JSON.parse(localStorage.getItem("oneit.demo.field-partner-access.v1") ?? "[]"); return Array.isArray(stored) ? stored.find((item) => item.ticket === selected.ticket && new Date(item.expiresAt).getTime() > Date.now() && !item.used) : null; } catch { return null; } })();
      const code = existing?.code ?? String(Math.floor(100000 + Math.random() * 900000));
      if (!existing) { const record = { ticket: selected.ticket, code, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), technician: selected.technician, createdAt: new Date().toISOString(), used: false }; try { const stored = JSON.parse(localStorage.getItem("oneit.demo.field-partner-access.v1") ?? "[]"); localStorage.setItem("oneit.demo.field-partner-access.v1", JSON.stringify([record, ...(Array.isArray(stored) ? stored : [])])); } catch { /* A mensagem continua sem token se o navegador bloquear o armazenamento. */ } }
      tokenLine = "Código temporário: " + code + " (válido por 24 horas).";
    }
    const message = ["ONEIT · Ordem de campo", "Chamado: " + selected.ticket, "Serviço: " + selected.title, "Data/janela: " + (selected.plannedAt || "A definir") + " · " + (selected.window || "A definir"), "Local: " + selected.address, "Contato: " + (selected.localContact || selected.requester) + " · " + (selected.localPhone || "não informado"), "Instruções: " + (selected.notes || "Verificar orientações na OS."), tokenLine, "Portal: " + globalThis.location.origin + portalPath].join("\n");
    const number = (phone || selected.technicianPhone).replace(/\D/g, "");
    if (number.length !== 10 && number.length !== 11) { setNotice("Informe um telefone brasileiro com DDD válido para abrir o WhatsApp."); return; }
    const destination = number.length >= 10 ? "https://wa.me/55" + number.slice(-11) + "?text=" : "https://wa.me/?text=";
    recordFieldCommunication({ ticket: selected.ticket, channel: "WhatsApp", recipient: selected.technician, phone: phone || selected.technicianPhone, status: "Mensagem preparada", body: message });
    const opened = globalThis.window.open(destination + encodeURIComponent(message), "_blank", "noopener,noreferrer");
    if (!opened) {
      void navigator.clipboard?.writeText(message).then(() => setNotice("O navegador bloqueou a nova aba. A mensagem foi copiada para a área de transferência."), () => setNotice("O navegador bloqueou a nova aba do WhatsApp. Copie os dados da OS e envie manualmente."));
      return;
    }
    setShowWhatsAppPhone(false);
    setNotice("Mensagem preparada no WhatsApp com dados da OS" + (selected.partner ? " e token temporário" : "") + ". Revise o destinatário antes de enviar.");
  }
  const counters = (["Fila de despacho", "Em atendimento", "Aguardando validação do gestor", "Concluído"] as FieldState[]).map((state) => ({ state, count: visits.filter((visit) => visit.state === state).length }));
  const operationalAlerts = useMemo(() => visits.map((visit) => ({ visit, risk: visitRisk(visit) })).filter((item): item is { visit: Visit; risk: NonNullable<ReturnType<typeof visitRisk>> } => item.risk !== null), [visits]);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const kpis = [
    { label: "Total de OS", value: visits.length, detail: "Todas as ordens de campo" },
    { label: "Atendimentos do dia", value: visits.filter((visit) => visit.plannedAt === new Date().toISOString().slice(0, 10) && visit.state !== "Concluído").length, detail: "Planejados para hoje" },
    { label: "Aguardando rota", value: visits.filter((visit) => visit.state === "Fila de despacho" || !visit.plannedAt).length, detail: "Sem liberação completa" },
    { label: "Em atraso", value: operationalAlerts.filter((item) => item.risk.label === "Atendimento vencido").length, detail: "Exige replanejamento" },
    { label: "Medição do mês", value: "R$ " + visits.filter((visit) => visit.state === "Concluído" && visit.completedAt?.startsWith(currentMonth)).reduce((sum, visit) => sum + measurementValue(visit), 0).toFixed(2), detail: "OS concluídas com competência do mês" },
  ];

  return <main className="min-h-screen bg-slate-100 text-slate-900"><DemoSidebar active="field-service" /><div data-oneit-sidebar-offset className="ml-64 min-h-screen">
    <header className="flex min-h-[62px] flex-wrap items-center justify-between gap-2 border-b border-slate-300 bg-white px-5 py-2"><div><p className="text-[11px] font-semibold tracking-[.15em] text-orange-500">ONEIT · OPERAÇÃO EM CAMPO</p><h1 className="mt-0.5 text-lg font-semibold">Acompanhamento detalhado</h1></div><div className="flex flex-wrap gap-1"><a href="/demo/field-service/queue-v2" className="oneit-grid-action border border-[#123f99] bg-[#123f99] px-3 py-1.5 text-xs font-semibold text-white">Abrir fila Field Service</a><a href="/demo/field-service/measurement" className="oneit-grid-action border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium">Medição</a><a href="/demo/field-service/routes" className="oneit-grid-action border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium">Agenda e rotas</a><a href="/demo/field-service/teams" className="oneit-grid-action border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium">Equipes e técnicos</a><a href="/demo/field-service/settings" className="oneit-grid-action border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium">LPU e tabelas</a><button onClick={openDispatch} className="oneit-grid-action border border-orange-500 bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white">+ Criar despacho</button></div></header>
    <section className="p-3 sm:p-4"><div className="oneit-operational-band flex flex-wrap items-center justify-between gap-3 border border-[#103c98] bg-[#123f99] px-4 py-3 text-white"><div><p className="text-xs font-semibold">Gestão de rotas e execução</p><p className="mt-0.5 text-xs text-blue-100">Confirme técnico, polo, horário, SLA, OS externa e LPU antes de liberar a visita.</p></div><button onClick={openDispatch} className="border border-white/40 bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20">Criar despacho</button></div>
      <p role="status" className="mt-5 rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm">{notice}</p>
      <div className="mt-3 grid gap-px border border-slate-300 bg-slate-300 md:grid-cols-3 xl:grid-cols-5">{kpis.map((item) => <div key={item.label} className="bg-white px-3 py-2.5"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</p><strong className="mt-1 block text-xl">{item.value}</strong><p className="mt-0.5 text-xs text-slate-500">{item.detail}</p></div>)}</div>
      <div className="mt-3 grid gap-px border border-slate-300 bg-slate-300 md:grid-cols-4 xl:grid-cols-7">{counters.map((item) => <button key={item.state} onClick={() => setNotice(item.count + " ordem(ns) em " + item.state + ".")} className="bg-white px-3 py-2 text-left transition hover:bg-[#eef4ff]"><p className="text-xs text-slate-500">{item.state}</p><strong className="mt-0.5 block text-lg">{item.count}</strong></button>)}</div>
      <section className="mt-5 overflow-hidden rounded-xl border bg-white"><div className="flex items-center justify-between border-b p-5"><div><p className="text-xs font-semibold tracking-[.12em] text-orange-500">CONTROLE DO GESTOR</p><h2 className="mt-1 font-semibold">Alertas de execução e risco de SLA</h2><p className="mt-1 text-sm text-slate-500">Monitore ordens sem agenda ou próximas da data planejada antes que a operação fique parada.</p></div><span className={operationalAlerts.length ? "rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-700" : "rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700"}>{operationalAlerts.length ? operationalAlerts.length + " alerta(s)" : "Sem alertas"}</span></div>{operationalAlerts.length ? <div className="divide-y">{operationalAlerts.map(({ visit, risk }) => <button key={visit.id} onClick={() => { setSelectedId(visit.id); setNotice("OS " + visit.ticket + " selecionada para tratamento do alerta."); }} className="flex w-full items-center justify-between gap-4 p-4 text-left transition hover:bg-slate-50"><div><p className="text-sm font-semibold">{visit.ticket} · {visit.title}</p><p className="mt-1 text-xs text-slate-500">{visit.technician} · {visit.plannedAt || "Sem data"} · {visit.window || "Sem janela"} · {visit.sla}</p><p className="mt-1 text-xs text-slate-600">{risk.detail}</p></div><span className={"shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold " + risk.tone}>{risk.label}</span></button>)}</div> : <p className="p-5 text-sm text-slate-500">As ordens abertas têm data planejada e não há atendimento vencido na visualização atual.</p>}</section>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]"><section className="overflow-hidden rounded-xl border bg-white"><div className="flex items-center justify-between border-b p-5"><div><h2 className="font-semibold">Fila e rota física</h2><p className="mt-1 text-sm text-slate-500">Priorize chamados próximos ao SLA e confirme a execução em cada etapa.</p></div><button onClick={openDispatch} className="text-sm font-semibold text-orange-600">Criar despacho</button></div><div className="divide-y">{visits.length === 0 ? <div className="p-6 text-sm text-slate-500">Não há despachos. Use “Criar despacho” para transformar um chamado em ordem de campo.</div> : visits.map((visit) => <button key={visit.id} onClick={() => setSelectedId(visit.id)} className={"w-full p-4 text-left transition hover:bg-slate-50 " + (selected?.id === visit.id ? "bg-orange-50 ring-1 ring-inset ring-orange-300" : "")}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{visit.ticket} · {visit.title}</p><p className="mt-1 text-xs text-slate-500">{visit.company} · {visit.department} · {visit.technician}</p><p className="mt-1 text-xs text-slate-500">{visit.plannedAt || "A agendar"} · {visit.window || "Janela não definida"} · {visit.sla}</p></div><span className={"rounded-full px-2 py-1 text-xs font-semibold " + (visit.state === "Check-in" || visit.state === "Em atendimento" ? "bg-blue-50 text-blue-700" : visit.state === "Concluído" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>{visit.state}</span></div></button>)}</div></section>
      <aside className="rounded-xl border bg-white p-5">{selected ? <><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold tracking-[.12em] text-orange-500">ORDEM DE SERVIÇO</p><h2 className="mt-1 font-semibold">{selected.ticket}</h2></div><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{selected.priority}</span></div><h3 className="mt-4 text-lg font-semibold">{selected.title}</h3><dl className="mt-4 grid gap-3 text-sm"><div><dt className="text-slate-500">Local da rota</dt><dd className="font-medium">{selected.address}<small className="block text-slate-500">{selected.region} · {selected.distanceCapitalKm} km do marco zero</small></dd></div><div className="grid grid-cols-2 gap-3"><div><dt className="text-slate-500">Técnico / equipe</dt><dd className="font-medium">{selected.technician}<small className="block text-slate-500">{selected.team}{selected.partner ? " · Parceiro" : " · Servicia"}</small></dd></div><div><dt className="text-slate-500">Agendamento</dt><dd className="font-medium">{selected.plannedAt || "A definir"}<small className="block text-slate-500">{selected.window}</small></dd></div></div><div><dt className="text-slate-500">Contato no local</dt><dd className="font-medium">{selected.localContact || selected.requester}<small className="block text-slate-500">{selected.localPhone || "Telefone não informado"}</small></dd></div><div><dt className="text-slate-500">Financeiro</dt><dd className="font-medium">{selected.lpuCode || "LPU não aplicada"} · R$ {selected.quotedAmount.toFixed(2)}<small className="block text-slate-500">{selected.externalOs ? "OS externa: " + selected.externalOs : "OS externa não informada"}</small></dd></div></dl><section className="mt-4 rounded-lg border bg-slate-50 p-3"><div className="flex items-center justify-between"><p className="text-sm font-semibold">Composição de materiais</p><strong className="text-sm">R$ {measurementValue(selected).toFixed(2)}</strong></div>{selected.materials.length ? <ul className="mt-2 space-y-1 text-xs text-slate-600">{selected.materials.map((item) => <li key={item.id}>{item.description} · {item.quantity} × R$ {item.unitPrice.toFixed(2)}</li>)}</ul> : <p className="mt-2 text-xs text-slate-500">Nenhum material ou item adicional registrado.</p>}<form onSubmit={addMaterial} className="mt-3 grid grid-cols-[1fr_64px_82px] gap-2"><input name="description" required placeholder="Material ou item" className="min-w-0 rounded-md border bg-white px-2 py-1.5 text-xs"/><input name="quantity" type="number" min="0.01" step="0.01" required placeholder="Qtd." className="rounded-md border bg-white px-2 py-1.5 text-xs"/><input name="unitPrice" type="number" min="0" step="0.01" required placeholder="R$" className="rounded-md border bg-white px-2 py-1.5 text-xs"/><button className="col-span-3 rounded-md border bg-white px-2 py-1.5 text-xs font-semibold">Adicionar item à OS</button></form></section><label className="mt-5 block text-sm font-semibold">Atualizar etapa de campo<select value={selected.state} onChange={(event) => changeState(event.target.value as FieldState)} className="mt-1 w-full rounded-lg border p-2.5 font-normal">{states.map((state) => <option key={state}>{state}</option>)}</select></label><div className="mt-4 flex flex-wrap gap-2"><a href={"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(selected.address)} target="_blank" rel="noreferrer" className="rounded-lg border px-3 py-2 text-sm font-semibold">Abrir rota no mapa</a><button onClick={shareTicketWhatsApp} className="rounded-lg border border-emerald-300 px-3 py-2 text-sm font-semibold text-emerald-700">Compartilhar WhatsApp</button><button onClick={generateTechnicalReport} className="rounded-lg border px-3 py-2 text-sm font-semibold">Gerar relatório técnico</button>{selected.partner && <button onClick={generatePartnerAccess} className="rounded-lg border border-orange-300 px-3 py-2 text-sm font-semibold text-orange-700">Gerar acesso parceiro</button>}</div></> : <div className="text-sm text-slate-500">Selecione uma ordem para visualizar os detalhes.</div>}</aside></div>
    </section></div>
    {selected?.state === "Fila de despacho" && <button onClick={() => openDispatch(selected)} className="fixed bottom-5 right-5 z-30 rounded-lg bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-lg">Planejar rota e atribuir técnico</button>}
    {showDispatch && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"><form onSubmit={dispatch} role="dialog" aria-modal="true" aria-label="Criar despacho de campo" className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl"><header className="flex items-start justify-between border-b p-6"><div><p className="text-xs font-semibold tracking-[.14em] text-orange-500">NOVO DESPACHO · FIELD SERVICE</p><h2 className="mt-1 text-xl font-semibold">Criar ordem de serviço a partir de um chamado</h2><p className="mt-1 text-sm text-slate-500">Os dados do solicitante e do departamento são exibidos antes de liberar a rota.</p></div><button type="button" onClick={() => setShowDispatch(false)} className="rounded-lg px-3 py-2 text-lg text-slate-500">×</button></header><div className="grid gap-5 p-6 lg:grid-cols-[1.15fr_.85fr]"><div className="grid gap-4"><div className="border-b border-slate-200 pb-2"><p className="text-xs font-semibold uppercase tracking-[.14em] text-[#0a5261]">1 · Local e SLA</p><p className="mt-1 text-xs text-slate-500">Confirme o chamado, o polo e a janela antes de seguir.</p></div><label className="text-sm font-semibold">Chamado de origem<select value={ticketId} onChange={(event) => { setTicketId(event.target.value); const found = tickets.find((item) => item.id === event.target.value); setLocalContact(found?.requester ?? ""); }} required className="mt-1 w-full rounded-lg border p-2.5 font-normal"><option value="">Selecione o chamado</option>{pendingTickets.map((ticket) => <option key={ticket.id} value={ticket.id}>{ticket.id} · {ticket.subject}</option>)}</select></label><div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm"><p className="font-semibold">Contexto herdado do chamado</p><div className="mt-2 grid gap-2 sm:grid-cols-2"><span><b>Solicitante:</b> {chosenTicket?.requester || "Não informado"}</span><span><b>Empresa:</b> {chosenTicket?.company || "A confirmar"}</span><span><b>Departamento:</b> {chosenTicket?.department || "Novo Registro"}</span><span><b>Prioridade / SLA:</b> {chosenTicket?.priority || "P3"} · {chosenTicket?.sla || "A definir"}</span></div><p className="mt-2"><b>Endereço do polo:</b> {departmentContext.address}</p></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Agendamento previsto<input type="date" value={plannedAt} onChange={(event) => setPlannedAt(event.target.value)} required className="mt-1 w-full rounded-lg border p-2.5 font-normal" /></label><label className="text-sm font-semibold">Janela de atendimento<input value={window} onChange={(event) => setWindow(event.target.value)} required placeholder="Ex.: 09:00 — 11:00" className="mt-1 w-full rounded-lg border p-2.5 font-normal" /></label></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Quem procurar no local<input value={localContact} onChange={(event) => setLocalContact(event.target.value)} placeholder="Nome do contato" className="mt-1 w-full rounded-lg border p-2.5 font-normal" /></label><label className="text-sm font-semibold">Telefone do contato<input value={localPhone} onChange={(event) => setLocalPhone(event.target.value)} placeholder="(00) 00000-0000" className="mt-1 w-full rounded-lg border p-2.5 font-normal" /></label></div><label className="text-sm font-semibold">Observações para o técnico<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Acesso ao local, restrições, materiais ou orientações para a visita." className="mt-1 w-full rounded-lg border p-2.5 font-normal" /></label></div><div className="grid content-start gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="border-b border-slate-200 pb-2"><p className="text-xs font-semibold uppercase tracking-[.14em] text-[#0a5261]">2 · Técnico e região</p><p className="mt-1 text-xs text-slate-500">Escolha o profissional compatível com a cobertura do polo.</p></div><label className="text-sm font-semibold">Técnico responsável<select value={technicianId} onChange={(event) => setTechnicianId(event.target.value)} required className="mt-1 w-full rounded-lg border bg-white p-2.5 font-normal"><option value="">Selecione técnico Servicia ou parceiro</option><optgroup label="Técnicos Servicia">{technicians.filter((item) => item.kind === "Interno").map((item) => <option key={item.id} value={item.id}>{item.name} · {item.team} · {item.coverage || "Cobertura a definir"}</option>)}</optgroup><optgroup label="Técnicos parceiros">{technicians.filter((item) => item.kind === "Parceiro").map((item) => <option key={item.id} value={item.id}>{item.name} · {item.team} · {item.coverage || "Cobertura a definir"}</option>)}</optgroup></select></label>{chosenTech && <div className="rounded-lg border bg-white p-3 text-sm"><p className="font-semibold">{chosenTech.name} <span className="font-normal text-slate-500">· {chosenTech.kind === "Interno" ? "Técnico Servicia" : "Técnico parceiro"}</span></p><p className="mt-1 text-slate-600">{chosenTech.team} · {chosenTech.phone}</p><p className="mt-1 text-xs text-slate-500">Cobertura: {chosenTech.coverage || "A definir"} · Região da OS: {departmentContext.region}</p>{(!chosenTech.coverage || chosenTech.coverage === "A definir") && <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Cobertura não cadastrada: confirme a região antes de liberar.</p>}{chosenTech.kind === "Parceiro" && <p className="mt-1 text-xs text-orange-600">Parceiro: registre a OS da empresa parceira para conciliação.</p>}</div>}<div className="border-t border-slate-200 pt-3"><p className="text-xs font-semibold uppercase tracking-[.14em] text-[#0a5261]">3 · Rota e comunicação</p><p className="mt-1 text-xs text-slate-500">Registre referência externa e precificação para liberar a visita.</p></div><label className="text-sm font-semibold">OS externa do cliente/parceiro<input value={externalOs} onChange={(event) => setExternalOs(event.target.value)} placeholder="Ex.: OS-SABESP-2026-014" className="mt-1 w-full rounded-lg border bg-white p-2.5 font-normal" /></label><label className="text-sm font-semibold">Tabela LPU aplicada<select value={lpuCode} onChange={(event) => chooseLpu(event.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2.5 font-normal"><option value="">Selecionar posteriormente</option>{lpuItems.filter((item) => item.active).map((item) => <option key={item.id} value={item.code}>{item.code} · {item.description} · R$ {item.price.toFixed(2)}</option>)}</select></label><label className="text-sm font-semibold">Valor previsto<input type="number" min="0" step="0.01" value={quotedAmount} onChange={(event) => setQuotedAmount(event.target.value)} placeholder="0,00" className="mt-1 w-full rounded-lg border bg-white p-2.5 font-normal" /></label><a href="/demo/field-service/settings" className="text-sm font-semibold text-orange-600">Configurar LPU e tabelas de preço →</a></div></div><footer className="flex justify-end gap-3 border-t p-5"><button type="button" onClick={() => setShowDispatch(false)} className="rounded-lg border px-4 py-2 text-sm font-semibold">Cancelar</button><button className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white">Criar OS e despachar</button></footer></form></div>}
    {selected && <section className="mx-3 mb-6 rounded-xl border border-violet-200 bg-white p-5 shadow-sm sm:mx-4"><div className="flex flex-wrap items-start justify-between gap-3 border-b border-violet-100 pb-4"><div><p className="text-xs font-semibold tracking-[.12em] text-violet-700">FILA DO GESTOR · VALIDAÇÃO E MEDIÇÃO</p><h2 className="mt-1 text-lg font-semibold">Encerramento administrativo da OS {selected.ticket}</h2><p className="mt-1 text-sm text-slate-600">O técnico registra a solução e as evidências; o gestor confere a execução, a composição financeira e então fecha o chamado no OneIT.</p></div><span className={selected.state === "Aguardando validação do gestor" ? "rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-800" : selected.state === "Concluído" ? "rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800" : "rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700"}>{selected.state}</span></div><div className="mt-4 grid gap-4 lg:grid-cols-2"><div className="space-y-4"><label className="block text-sm font-semibold">Resolução técnica<textarea value={selected.technicalResolution} onChange={(event) => updateSelected({ technicalResolution: event.target.value })} rows={4} placeholder="Descreva o diagnóstico, o que foi executado e o resultado obtido." className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 font-normal" /></label><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Quantidade de fotos<input type="number" min="0" value={selected.photoCount} onChange={(event) => updateSelected({ photoCount: Number(event.target.value || 0) })} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 font-normal" /></label><label className="text-sm font-semibold">Referência no sistema do cliente<input value={selected.customerAttachmentReference} onChange={(event) => updateSelected({ customerAttachmentReference: event.target.value })} placeholder="Ex.: anexo na OS 12345" className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 font-normal" /></label></div><label className="block text-sm font-semibold">Evidências e validações do técnico<textarea value={selected.evidenceNotes} onChange={(event) => updateSelected({ evidenceNotes: event.target.value })} rows={3} placeholder="Fotos, testes executados, aceite do local ou outras evidências." className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 font-normal" /></label></div><div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-semibold">Conferência do gestor</p><p className="mt-1 text-xs text-slate-600">Medição atual: <strong>R$ {measurementValue(selected).toFixed(2)}</strong> · LPU: <strong>{selected.lpuCode || "não aplicada"}</strong> · Fotos: <strong>{selected.photoCount}</strong></p><label className="mt-4 block text-sm font-semibold">Parecer / observações do gestor<textarea value={selected.managerNotes} onChange={(event) => updateSelected({ managerNotes: event.target.value })} rows={4} placeholder="Registre divergências, ajustes de preço, aceite ou motivo de reprovação." className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 font-normal" /></label><div className="mt-4 flex flex-wrap gap-2">{selected.state !== "Aguardando validação do gestor" && selected.state !== "Concluído" && <button onClick={sendToManagerValidation} className="rounded-lg bg-violet-700 px-3 py-2 text-sm font-semibold text-white">Encerrar execução e enviar ao gestor</button>}{selected.state === "Aguardando validação do gestor" && <button onClick={validateAndClose} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white">Validar e fechar no OneIT</button>}<button onClick={generateTechnicalReport} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Gerar relatório completo</button></div>{selected.state === "Concluído" && <p className="mt-3 text-xs text-emerald-700">Validado por {selected.managerValidatedBy || "gestor"}{selected.managerValidatedAt ? " em " + new Date(selected.managerValidatedAt).toLocaleString("pt-BR") : ""}. {selected.customerAttachmentReference ? "Referência externa registrada: " + selected.customerAttachmentReference : "Registre a referência após anexar o relatório no sistema do cliente."}</p>}</div></div></section>}
    {selected?.state === "Aguardando validação do gestor" && <section className="mx-3 mb-6 rounded-xl border border-cyan-200 bg-cyan-50 p-4 sm:mx-4"><p className="text-sm font-semibold text-cyan-950">Aceite recebido do técnico</p><p className="mt-1 text-sm text-cyan-900">{selected.customerSignatureName || "Responsável não informado"}{selected.signedAt ? " · " + new Date(selected.signedAt).toLocaleString("pt-BR") : ""}</p>{selected.signatureDataUrl && <img src={selected.signatureDataUrl} alt="Assinatura do responsável pelo aceite" className="mt-3 h-24 w-full rounded-lg border border-cyan-200 bg-white object-contain" />}<p className="mt-2 text-xs text-cyan-800">Confira o aceite junto às evidências e valide a OS antes do fechamento.</p><button type="button" onClick={returnForCorrection} className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700">Devolver para correção</button></section>}
    {showWhatsAppPhone && selected?.partner && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"><form role="dialog" aria-modal="true" aria-label="Telefone do técnico parceiro" onSubmit={(event) => { event.preventDefault(); shareTicketWhatsApp(whatsAppPhone); }} className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl"><p className="text-xs font-semibold uppercase tracking-[.14em] text-emerald-700">WhatsApp do parceiro</p><h2 className="mt-1 text-lg font-semibold">Informe o telefone para envio</h2><p className="mt-2 text-sm text-slate-600">O telefone informado será usado somente para preparar a mensagem desta OS.</p><label className="mt-4 block text-sm font-semibold">Telefone com DDD<input autoFocus required value={whatsAppPhone} onChange={(event) => setWhatsAppPhone(event.target.value)} placeholder="(11) 99999-9999" className="mt-1 w-full rounded-lg border p-2.5 font-normal" /></label><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setShowWhatsAppPhone(false)} className="rounded-lg border px-3 py-2 text-sm font-semibold">Cancelar</button><button className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white">Abrir WhatsApp</button></div></form></div>}
  </main>;
}








