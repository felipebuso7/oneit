"use client";

import { useEffect, useMemo, useState } from "react";
import { DemoSidebar } from "@/components/demo-sidebar";
import { catalogCategoryIcons, catalogCategoryVisuals, catalogPriority, demoCatalogServices } from "@/lib/demo/service-catalog";

type Status = "Aberto" | "Pendente" | "Pendente validação" | "SLA vencido" | "Fechado";
type Ticket = { id: string; subject: string; requester: string; technician: string; priority: string; sla: string; status: Status; department: string; service: string; category?: string; subcategory?: string; createdAt: number; company?: string; type?: string; urgency?: string; impact?: string; level?: string; criticality?: string; assetId?: string; supplierId?: string; problemId?: string; changeId?: string; pendingReason?: string; resolution?: string; resolutionValidated?: boolean; firstResponseAt?: string; fieldVisitId?: string; fieldStatus?: string; fieldReport?: { status: "gerado" | "pendente"; fileName: string; generatedAt: string; summary: string; signatureCaptured?: boolean; signatureName?: string; signatureDataUrl?: string }; fieldMaterialTotal?: number; };
type TimelineEntry = { at: string; text: string; kind: "cliente" | "interna"; author?: string };
type AssetReference = { id: string; name: string; type: string; serial: string; status: string; company: string; department: string };
type SupplierReference = { id: string; name: string; contact: string; email: string; sla: string; active: boolean };
type ProblemReference = { id: string; title: string; status: string };
type ChangeReference = { id: string; title: string; status: string };
type RequesterProfile = { name: string; company: string; department: string; email?: string; notifyOnCreate?: boolean; notifyOnMessage?: boolean; notifyOnClose?: boolean };
type EmailOutboxEntry = { id: string; ticketId: string; recipient: string; event: "abertura" | "comunicação" | "fechamento"; subject: string; createdAt: string; author: string; status: "Pendente de conector" };

const initialTickets: Ticket[] = [
  { id: "INC-0142", subject: "VPN indisponível para operação comercial", requester: "Rafael Bonato", technician: "Felipe Buso", priority: "P1", sla: "18 min", status: "SLA vencido", department: "Comercial", service: "Acesso remoto · Incidente", createdAt: 5 },
  { id: "REQ-0289", subject: "Preparação de notebook para novo colaborador", requester: "Mariana Lopes", technician: "Camila Souza", priority: "P3", sla: "4h 12m", status: "Aberto", department: "Pessoas e Cultura", service: "Equipamentos · Novo notebook", createdAt: 4 },
  { id: "INC-0141", subject: "Falha de impressão no centro de distribuição", requester: "Lucas Mendes", technician: "Rafael Bonato", priority: "P2", sla: "1h 08m", status: "Pendente", department: "Logística", service: "Impressão · Incidente", pendingReason: "Aguardando janela autorizada para intervenção.", createdAt: 3 },
  { id: "REQ-0287", subject: "Acesso a grupo corporativo", requester: "Ana Ribeiro", technician: "Felipe Buso", priority: "P4", sla: "Em pausa", status: "Pendente", department: "Financeiro", service: "Identidade · Grupo corporativo", pendingReason: "Aguardando aprovação do gestor solicitante.", createdAt: 2 },
  { id: "INC-0139", subject: "Monitor sem sinal na sala de reunião", requester: "Gabriel Lopes", technician: "Camila Souza", priority: "P2", sla: "SLA atendido", status: "Fechado", department: "Diretoria", service: "Audiovisual · Incidente", createdAt: 1 },
];

const tabs = ["Principal", "Comunicações", "Comunicação interna", "Atividades", "Resolução", "Histórico", "Vinculados", "Ativos", "Fornecedor"] as const;
type Tab = (typeof tabs)[number];
type CatalogService = { id: string; name: string; category: string; subcategory?: string; detail: string; resolution?: string; active: boolean };
type ConfiguredServiceLevel = { serviceId: string; priority: string; resolution: string; ola: string; type?: string; urgency?: string; impact?: string; level?: string; criticality?: string; active: boolean };
const defaultCatalogServices: CatalogService[] = demoCatalogServices.map((item) => ({ ...item, detail: item.subcategory + " · SLA de resolução " + item.resolution }));
const settingsStorageKey = "oneit.demo.settings.v1";
const ticketsStorageKey = "oneit.demo.tickets.v1";
const statusClass = (status: Status) => status === "Aberto" ? "bg-emerald-100 text-emerald-800" : status === "Pendente" ? "bg-amber-100 text-amber-800" : status === "Pendente validação" ? "bg-violet-100 text-violet-800" : status === "SLA vencido" ? "bg-red-100 text-red-800" : "bg-slate-200 text-slate-700";
const priorityClass = (priority: string) => priority === "P1" ? "bg-red-50 text-red-700" : priority === "P2" ? "bg-orange-50 text-orange-700" : "bg-slate-100 text-slate-700";
const uniqueTickets = (items: Ticket[]) => items.filter((ticket, index, collection) => collection.findIndex((candidate) => candidate.id === ticket.id) === index);
const nextRequestId = (items: Ticket[]) => {
  const highestRequest = items.reduce((highest, ticket) => {
    const match = /^REQ-(\d+)$/.exec(ticket.id);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 289);
  return "REQ-" + String(highestRequest + 1).padStart(4, "0");
};

export default function TicketDemo() {
  const [tickets, setTickets] = useState(initialTickets);
  const [selectedId, setSelectedId] = useState(initialTickets[0].id);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("Principal");
  const [service, setService] = useState(initialTickets[0].service);
  const [draftCategory, setDraftCategory] = useState("");
  const [draftSubcategory, setDraftSubcategory] = useState("");
  const [parentNumber, setParentNumber] = useState("");
  const [firstResponseStarted, setFirstResponseStarted] = useState<Record<string, boolean>>({});
  const [firstResponsePrompt, setFirstResponsePrompt] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogServices, setCatalogServices] = useState<CatalogService[]>(defaultCatalogServices);
  const [catalogSelection, setCatalogSelection] = useState<CatalogService>(defaultCatalogServices[0]);
  const [catalogCategory, setCatalogCategory] = useState<string | null>(null);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogMode, setCatalogMode] = useState<"create" | "apply">("create");
  const [configuredRequesters, setConfiguredRequesters] = useState<string[]>([]);
  const [requesterProfiles, setRequesterProfiles] = useState<RequesterProfile[]>([]);
  const [newRequesterName, setNewRequesterName] = useState("");
  const [configuredServiceLevels, setConfiguredServiceLevels] = useState<ConfiguredServiceLevel[]>([]);
  const [draftStatus, setDraftStatus] = useState<Status>(initialTickets[0].status);
  const [draftSubject, setDraftSubject] = useState(initialTickets[0].subject);
  const [draftRequester, setDraftRequester] = useState(initialTickets[0].requester);
  const [draftDepartment, setDraftDepartment] = useState(initialTickets[0].department);
  const [draftCompany, setDraftCompany] = useState(initialTickets[0].company ?? "");
  const [draftTechnician, setDraftTechnician] = useState(initialTickets[0].technician);
  const [fieldDate, setFieldDate] = useState("2026-10-11");
  const [fieldWindow, setFieldWindow] = useState("09:00 — 10:00");
  const [assetOptions, setAssetOptions] = useState<AssetReference[]>([]);
  const [linkedAssetId, setLinkedAssetId] = useState("");
  const [supplierOptions, setSupplierOptions] = useState<SupplierReference[]>([]);
  const [linkedSupplierId, setLinkedSupplierId] = useState("");
  const [problemOptions, setProblemOptions] = useState<ProblemReference[]>([]);
  const [linkedProblemId, setLinkedProblemId] = useState("");
  const [changeOptions, setChangeOptions] = useState<ChangeReference[]>([]);
  const [linkedChangeId, setLinkedChangeId] = useState("");
  const [draftPendingReason, setDraftPendingReason] = useState("");
  const [resolutionDraft, setResolutionDraft] = useState("");
  const [resolutionValidated, setResolutionValidated] = useState(false);
  const [customerMessage, setCustomerMessage] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [timeline, setTimeline] = useState<Record<string, TimelineEntry[]>>({});
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Todos" | Status>("Todos");
  const [sortBy, setSortBy] = useState<"id" | "subject" | "createdAt" | "sla">("createdAt");
  const [ascending, setAscending] = useState(false);
  const [ticketsHydrated, setTicketsHydrated] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => { try {
      const saved = JSON.parse(window.localStorage.getItem(ticketsStorageKey) ?? "{}") as Partial<{
        tickets: Ticket[];
        timeline: Record<string, TimelineEntry[]>;
        firstResponseStarted: Record<string, boolean>;
      }>;
      if (Array.isArray(saved.tickets) && saved.tickets.length > 0) {
        const hydratedTickets = uniqueTickets(saved.tickets);
        setTickets(hydratedTickets);
        setSelectedId(hydratedTickets[0].id);
      }
      if (saved.timeline && typeof saved.timeline === "object") setTimeline(saved.timeline);
      if (saved.firstResponseStarted && typeof saved.firstResponseStarted === "object") setFirstResponseStarted(saved.firstResponseStarted);
    } catch {
      window.localStorage.removeItem(ticketsStorageKey);
    } finally {
      setTicketsHydrated(true);
    } }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => { const refresh = () => { try { const saved = JSON.parse(window.localStorage.getItem(ticketsStorageKey) ?? "{}") as { tickets?: Ticket[]; timeline?: Record<string, TimelineEntry[]>; firstResponseStarted?: Record<string, boolean> }; if (Array.isArray(saved.tickets) && saved.tickets.length) setTickets(uniqueTickets(saved.tickets)); if (saved.timeline) setTimeline(saved.timeline); if (saved.firstResponseStarted) setFirstResponseStarted(saved.firstResponseStarted); } catch { /* Mantém a fila atual se o cache estiver indisponível. */ } }; const onStorage = (event: StorageEvent) => { if (event.key === ticketsStorageKey) refresh(); }; window.addEventListener("storage", onStorage); window.addEventListener("focus", refresh); return () => { window.removeEventListener("storage", onStorage); window.removeEventListener("focus", refresh); }; }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedTicket = params.get("ticket");
    if (!requestedTicket) return;
    const found = tickets.find((ticket) => ticket.id === requestedTicket);
    if (found) show((params.get("tab") === "Resolução" ? "Resolução" : "Principal") as Tab, found);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a abertura por URL é reavaliada ao sincronizar a fila local.
  }, [tickets]);
  useEffect(() => {
    const timer = window.setTimeout(() => { try { const stored = JSON.parse(window.localStorage.getItem("oneit.demo.suppliers.v1") ?? "{}") as { suppliers?: SupplierReference[] }; if (Array.isArray(stored.suppliers)) setSupplierOptions(stored.suppliers.filter((item) => item.active)); } catch { setSupplierOptions([]); } }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { try { const stored = JSON.parse(window.localStorage.getItem("oneit.demo.problems.v1") ?? "[]") as ProblemReference[]; if (Array.isArray(stored)) setProblemOptions(stored.filter((item) => item.status !== "Resolvido")); } catch { setProblemOptions([]); } }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { try { const stored = JSON.parse(window.localStorage.getItem("oneit.demo.changes.v1") ?? "[]") as ChangeReference[]; if (Array.isArray(stored)) setChangeOptions(stored.filter((item) => item.status !== "Implementada")); } catch { setChangeOptions([]); } }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { try { const assets = JSON.parse(window.localStorage.getItem("oneit.demo.assets.v1") ?? "[]") as AssetReference[]; if (Array.isArray(assets)) setAssetOptions(assets); } catch { setAssetOptions([]); } }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!ticketsHydrated) return;
    window.localStorage.setItem(ticketsStorageKey, JSON.stringify({ tickets, timeline, firstResponseStarted }));
  }, [firstResponseStarted, tickets, ticketsHydrated, timeline]);
  useEffect(() => {
    const timer = window.setTimeout(() => { try {
      const stored = JSON.parse(window.localStorage.getItem(settingsStorageKey) ?? "{}") as {
        services?: Array<{ id: string; name: string; category: string; subcategory: string; active: boolean }>;
        departments?: Array<{ id: string; companyId: string; name: string; active: boolean }>;
        companies?: Array<{ id: string; name: string; active: boolean }>;
        users?: Array<{ name: string; email?: string; departmentId: string; role?: string; active: boolean; notifyOnCreate?: boolean; notifyOnMessage?: boolean; notifyOnClose?: boolean }>;
        levels?: ConfiguredServiceLevel[];
      };
      const savedServices = Array.isArray(stored.services) ? stored.services : [];
      const savedIds = new Set(savedServices.map((item) => item.id));
      const configuredServices = [...defaultCatalogServices.filter((item) => !savedIds.has(item.id)), ...savedServices]
        .filter((item) => item.active)
        .map((item) => {
          const imported = demoCatalogServices.find((seed) => seed.id === item.id);
          const resolution = imported?.resolution;
          return {
          id: item.id,
          name: item.name,
          category: item.category,
          subcategory: item.subcategory,
          detail: item.subcategory + " · " + (resolution ? "SLA de resolução " + resolution : "configurado em Configurações"),
          resolution,
          active: true,
          };
        });

      if (configuredServices.length > 0) {
        setCatalogServices(configuredServices);
        setCatalogSelection(configuredServices[0]);
      }
      setConfiguredRequesters((stored.users ?? []).filter((item) => item.active && item.role === "Solicitante").map((item) => item.name));
      const departmentById = new Map((stored.departments ?? []).map((item) => [item.id, item]));
      const companyById = new Map((stored.companies ?? []).map((item) => [item.id, item.name]));
      setRequesterProfiles((stored.users ?? []).filter((item) => item.active && item.role === "Solicitante").map((item) => {
        const department = departmentById.get(item.departmentId);
        return { name: item.name, department: department?.name ?? "Novo Registro", company: companyById.get(department?.companyId ?? "") ?? "", email: item.email, notifyOnCreate: item.notifyOnCreate, notifyOnMessage: item.notifyOnMessage, notifyOnClose: item.notifyOnClose };
      }));
      setConfiguredServiceLevels((stored.levels ?? []).filter((item) => item.active));
    } catch {
      // Sem configurações locais válidas, o catálogo padrão continua disponível.
    } }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    const refreshCatalog = () => window.location.reload();
    window.addEventListener("oneit-demo-catalog-updated", refreshCatalog);
    return () => window.removeEventListener("oneit-demo-catalog-updated", refreshCatalog);
  }, []);
  const selected = tickets.find((ticket) => ticket.id === selectedId) ?? tickets[0];
  const requesterOptions = Array.from(new Set([selected.requester, ...configuredRequesters].filter(Boolean)));
  const visibleTickets = useMemo(() => tickets.filter((ticket) => {
    const searchable = [ticket.id, ticket.subject, ticket.requester, ticket.technician].join(" ").toLocaleLowerCase();
    return (statusFilter === "Todos" || ticket.status === statusFilter) && searchable.includes(query.trim().toLocaleLowerCase());
  }).sort((left, right) => {
    const leftValue = sortBy === "createdAt" ? left.createdAt : left[sortBy].toLocaleLowerCase();
    const rightValue = sortBy === "createdAt" ? right.createdAt : right[sortBy].toLocaleLowerCase();
    const comparison = typeof leftValue === "number" && typeof rightValue === "number" ? leftValue - rightValue : String(leftValue).localeCompare(String(rightValue), "pt-BR");
    return ascending ? comparison : -comparison;
  }), [tickets, query, statusFilter, sortBy, ascending]);
  const selectRequester = (name: string) => {
    setDraftRequester(name);
    const profile = requesterProfiles.find((item) => item.name === name);
    if (profile) {
      setDraftCompany(profile.company);
      setDraftDepartment(profile.department);
    }
  };
  function show(next: Tab = "Principal", ticket = selected) { const catalogService = catalogServices.find((item) => item.category + " · " + item.name === ticket.service); setService(ticket.service); setDraftCategory(ticket.category ?? catalogService?.category ?? ticket.service.split(" · ")[0] ?? ""); setDraftSubcategory(ticket.subcategory ?? catalogService?.subcategory ?? ""); setDraftStatus(ticket.status); setDraftSubject(ticket.subject); setDraftRequester(ticket.requester); setDraftCompany(ticket.company ?? requesterProfiles.find((item) => item.name === ticket.requester)?.company ?? ""); setDraftDepartment(ticket.department); setDraftTechnician(ticket.technician); setLinkedAssetId(ticket.assetId ?? ""); setLinkedSupplierId(ticket.supplierId ?? ""); setLinkedProblemId(ticket.problemId ?? ""); setLinkedChangeId(ticket.changeId ?? ""); setDraftPendingReason(ticket.pendingReason ?? ""); setResolutionDraft(ticket.resolution ?? ""); setResolutionValidated(Boolean(ticket.resolutionValidated)); setTab(next); setOpen(true); }
  const openFromRow = (ticket: Ticket) => {
    setSelectedId(ticket.id);
    show("Principal", ticket);
    setFirstResponsePrompt(ticket.technician === "Felipe Buso" && !firstResponseStarted[ticket.id]);
  };
  const levelForService = (serviceId: string) => {
    const configured = configuredServiceLevels.find((item) => item.serviceId === serviceId);
    if (configured) return configured;
    const resolution = catalogServices.find((item) => item.id === serviceId)?.resolution;
    return resolution ? { serviceId, priority: catalogPriority(resolution), resolution, ola: resolution, active: true } : undefined;
  };
  const applyCatalogService = (catalogService: CatalogService) => {
    const nextService = catalogService.category + " · " + catalogService.name;
    const level = levelForService(catalogService.id);
    setService(nextService);
    setDraftCategory(catalogService.category); setDraftSubcategory(catalogService.subcategory ?? "");
    setTickets((current) => current.map((ticket) => ticket.id === selected.id ? { ...ticket, service: nextService, category: catalogService.category, subcategory: catalogService.subcategory, priority: level?.priority ?? ticket.priority, sla: level?.resolution ?? ticket.sla, type: level?.type ?? "Solicitação", urgency: level?.urgency ?? "Normal", impact: level?.impact ?? "Afeta o usuário", level: level?.level ?? "Nível 1", criticality: level?.criticality ?? "Normal" } : ticket));
    addTimeline("Serviço aplicado: " + nextService + (level ? ". Prioridade " + level.priority + ", SLA " + level.resolution + ", OLA " + level.ola + "." : "."), "interna");
    setNotice(level ? "Serviço aplicado com " + level.priority + ", SLA de resolução " + level.resolution + " e OLA " + level.ola + "." : "Serviço aplicado ao chamado " + selected.id + ". Configure um SLA/OLA para automatizar os prazos.");
  };
  const applyService = () => {
    const currentService = catalogServices.find((item) => item.category + " · " + item.name === service) ?? catalogServices[0];
    if (!currentService) { setNotice("Não há serviços ativos no catálogo para aplicar."); return; }
    setCatalogSelection(currentService);
    setCatalogCategory(currentService.category);
    setCatalogQuery("");
    setCatalogMode("apply");
    setCatalogOpen(true);
  };
  const saveTicket = () => {
    if (draftStatus === "Pendente" && !draftPendingReason.trim()) {
      setNotice("Informe o motivo da pendência para manter o acompanhamento e a comunicação claros.");
      setTab("Principal");
      return;
    }
    if (draftStatus === "Fechado" && !resolutionDraft.trim()) {
      setNotice("Registre a resolução antes de fechar o chamado.");
      setTab("Resolução");
      return;
    }
    if (draftStatus === "Fechado" && !resolutionValidated) {
      setNotice("Confirme a validação da resolução antes de fechar o chamado.");
      setTab("Resolução");
      return;
    }
    setTickets((current) => current.map((ticket) => ticket.id === selected.id ? { ...ticket, status: draftStatus, subject: draftSubject, requester: draftRequester, company: draftCompany || undefined, department: draftDepartment, technician: draftTechnician, service: service || ticket.service, category: draftCategory || undefined, subcategory: draftSubcategory || undefined, pendingReason: draftStatus === "Pendente" || draftStatus === "Pendente validação" ? draftPendingReason.trim() : undefined, resolution: resolutionDraft.trim() || ticket.resolution, resolutionValidated } : ticket));
    addTimeline(draftStatus === "Fechado" ? "Chamado fechado após resolução e validação registradas." : "Dados principais atualizados: solicitante, departamento, analista ou status.", "interna");
    const closingNotification = draftStatus === "Fechado" && selected.status !== "Fechado" ? queueRequesterEmail("fechamento") : null;
    setNotice(closingNotification ? "Chamado " + selected.id + " fechado. Notificação preparada para " + closingNotification.recipient + " (" + closingNotification.status + ")." : draftStatus === "Fechado" && selected.status !== "Fechado" ? "Chamado " + selected.id + " fechado. Nenhum e-mail foi preparado: confirme o cadastro e a preferência de fechamento do solicitante." : "Chamado " + selected.id + " atualizado e salvo na fila de demonstração.");
  };
  const addTimeline = (text: string, kind: TimelineEntry["kind"]) => { const author = draftTechnician && draftTechnician !== "Aguardando triagem" ? draftTechnician : selected.technician; const at = new Date().toLocaleString("pt-BR") + " · " + author; setTimeline((current) => ({ ...current, [selected.id]: [{ at, author, text, kind }, ...(current[selected.id] ?? [])] })); };
  const queueRequesterEmail = (event: EmailOutboxEntry["event"], ticket = selected, body = "") => {
    const requester = requesterProfiles.find((profile) => profile.name === ticket.requester);
    const enabled = event === "abertura" ? requester?.notifyOnCreate : event === "comunicação" ? requester?.notifyOnMessage : requester?.notifyOnClose;
    if (!requester?.email || !enabled) return null;
    try {
      const current = JSON.parse(window.localStorage.getItem("oneit.demo.outbox.v1") ?? "[]") as EmailOutboxEntry[];
      const author = draftTechnician && draftTechnician !== "Aguardando triagem" ? draftTechnician : ticket.technician;
      const entry: EmailOutboxEntry = { id: "mail-" + Date.now().toString(36), ticketId: ticket.id, recipient: requester.email, event, subject: ticket.id + " · " + ticket.subject + (body ? " · " + body.slice(0, 60) : ""), createdAt: new Date().toLocaleString("pt-BR"), author, status: "Pendente de conector" };
      window.localStorage.setItem("oneit.demo.outbox.v1", JSON.stringify([entry, ...current]));
      addTimeline("Notificação de " + event + " preparada para " + requester.email + ".", "interna");
      return entry;
    } catch {
      // O chamado permanece atualizado mesmo que a fila local de e-mail esteja indisponível.
      return null;
    }
  };
  const sendCustomerMessage = () => { if (!customerMessage.trim()) return; const message = customerMessage.trim(); addTimeline("Comunicação enviada ao solicitante: “" + message + "”", "cliente"); const queued = queueRequesterEmail("comunicação", selected, message); setCustomerMessage(""); setNotice(queued ? "Comunicação registrada para " + queued.recipient + ". Status: " + queued.status + "." : "Comunicação registrada no histórico. Nenhum e-mail foi preparado: confirme o e-mail e a preferência de comunicação do solicitante."); };
  const addInternalNote = () => { if (!internalNote.trim()) return; addTimeline("Nota interna: “" + internalNote.trim() + "”", "interna"); setInternalNote(""); setNotice("Nota interna registrada sem envio ao solicitante."); };
  const relate = (kind: string) => { if (!parentNumber.trim()) { setNotice("Informe o número do chamado de referência."); return; } addTimeline("Chamado " + kind + " ao registro " + parentNumber.trim() + ".", "interna"); setNotice("Chamado " + selected.id + " " + kind + " ao chamado " + parentNumber.trim() + " (demonstração)."); setParentNumber(""); };
  const createFromCatalog = () => {
    if (catalogMode === "apply") {
      applyCatalogService(catalogSelection);
      setCatalogOpen(false);
      return;
    }
    const level = levelForService(catalogSelection.id);
    // O cadastro do solicitante é a fonte de verdade para empresa e departamento.
    // Quando houver perfis configurados, o primeiro é usado como solicitante inicial
    // para que um chamado novo já nasça contextualizado; ele pode ser trocado no detalhe.
    const initialRequester = requesterProfiles.find((profile) => profile.name === newRequesterName);
    const newTicket: Ticket = { id: nextRequestId(tickets), subject: "Novo chamado · " + catalogSelection.name, requester: initialRequester?.name ?? "Solicitante a selecionar", technician: "Aguardando triagem", priority: level?.priority ?? "P3", sla: level?.resolution ?? "A definir", status: "Aberto", department: initialRequester?.department ?? "Novo Registro", company: initialRequester?.company, service: catalogSelection.category + " · " + catalogSelection.name, category: catalogSelection.category, subcategory: catalogSelection.subcategory, type: level?.type ?? "Solicitação", urgency: level?.urgency ?? "Normal", impact: level?.impact ?? "Afeta o usuário", level: level?.level ?? "Nível 1", criticality: level?.criticality ?? "Normal", createdAt: Date.now() };
    setTickets((current) => [newTicket, ...current]);
    setSelectedId(newTicket.id);
    setCatalogOpen(false);
    setNotice("Chamado " + newTicket.id + " criado a partir do catálogo" + (level ? " com " + level.priority + " e SLA " + level.resolution : "") + (initialRequester ? ". Empresa e departamento herdados do cadastro do solicitante." : ". Cadastre um solicitante em Administração para preencher empresa e departamento automaticamente."));
    show("Principal", newTicket);
  };
  const openCatalog = () => {
    setCatalogCategory(null);
    setCatalogQuery("");
    setCatalogMode("create");
    setCatalogOpen(true);
  };
  const dispatchToField = () => {
    const visit = {
      id: "field-" + Date.now(),
      ticket: selected.id,
      title: selected.subject,
      requester: selected.requester,
      company: selected.company ?? "Empresa a confirmar",
      department: selected.department,
      address: "Endereço pendente no cadastro do departamento",
      region: "Não classificada",
      distanceCapitalKm: 0,
      technician: "Não atribuído",
      team: "Sem equipe",
      technicianPhone: "",
      partner: false,
      plannedAt: "",
      window: "",
      sla: selected.sla,
      priority: selected.priority,
      state: "Fila de despacho",
      localContact: selected.requester,
      localPhone: "",
      notes: "Encaminhado pelo chamado " + selected.id + ". Complete técnico, endereço, contato, data e janela antes de liberar a rota.",
      technicalResolution: "",
      evidenceNotes: "",
      photoCount: 0,
      managerNotes: "",
      customerAttachmentReference: "",
      externalOs: "",
      lpuCode: "",
      quotedAmount: 0,
      materials: [],
    };
    try {
      const saved = JSON.parse(window.localStorage.getItem("oneit.demo.field-visits.v1") ?? "[]") as Array<{ ticket: string }>;
      const visits = Array.isArray(saved) ? saved.filter((item) => item.ticket !== selected.id) : [];
      window.localStorage.setItem("oneit.demo.field-visits.v1", JSON.stringify([...visits, visit]));
      setTickets((current) => current.map((ticket) => ticket.id === selected.id ? { ...ticket, status: "Pendente", fieldVisitId: visit.id, fieldStatus: "Fila de despacho", pendingReason: "Aguardando atribuição de técnico e liberação da rota pelo gestor de Field Service." } : ticket));
      addTimeline("Chamado enviado para a fila de despacho do Field Service. O gestor deverá atribuir técnico, rota e janela.", "interna");
      setNotice("Chamado enviado à fila do Field Service. O gestor deve completar o despacho antes de liberar a rota.");
    } catch {
      setNotice("Não foi possível salvar o despacho local. Tente novamente.");
    }
  };
  const linkAsset = () => {
    const asset = assetOptions.find((item) => item.id === linkedAssetId);
    setTickets((current) => current.map((ticket) => ticket.id === selected.id ? { ...ticket, assetId: linkedAssetId || undefined } : ticket));
    addTimeline(asset ? "Ativo vinculado ao chamado: " + asset.name + " (" + asset.id + ")." : "Vínculo de ativo removido do chamado.", "interna");
    setNotice(asset ? "Ativo " + asset.id + " vinculado ao chamado." : "Vínculo de ativo removido.");
  };
  const linkSupplier = () => {
    const supplier = supplierOptions.find((item) => item.id === linkedSupplierId);
    setTickets((current) => current.map((ticket) => ticket.id === selected.id ? { ...ticket, supplierId: linkedSupplierId || undefined } : ticket));
    addTimeline(supplier ? "Fornecedor responsável vinculado: " + supplier.name + "." : "Vínculo de fornecedor removido.", "interna");
    setNotice(supplier ? "Fornecedor vinculado ao chamado; contato e SLA estão disponíveis nesta aba." : "Vínculo de fornecedor removido.");
  };
  const linkProblem = () => {
    const problem = problemOptions.find((item) => item.id === linkedProblemId);
    setTickets((current) => current.map((ticket) => ticket.id === selected.id ? { ...ticket, problemId: linkedProblemId || undefined } : ticket));
    addTimeline(problem ? "Chamado relacionado ao problema " + problem.id + ": " + problem.title + "." : "Vínculo de problema removido.", "interna");
    setNotice(problem ? "Chamado vinculado ao problema " + problem.id + ". A investigação e o workaround ficam rastreáveis." : "Vínculo de problema removido.");
  };
  const linkChange = () => {
    const change = changeOptions.find((item) => item.id === linkedChangeId);
    setTickets((current) => current.map((ticket) => ticket.id === selected.id ? { ...ticket, changeId: linkedChangeId || undefined } : ticket));
    addTimeline(change ? "Chamado relacionado à mudança " + change.id + ": " + change.title + "." : "Vínculo de mudança removido.", "interna");
    setNotice(change ? "Chamado vinculado à GMUD " + change.id + ". Risco, aprovação e plano de retorno ficam rastreáveis." : "Vínculo de mudança removido.");
  };
  const saveResolution = () => {
    if (!resolutionDraft.trim()) { setNotice("Descreva a resolução antes de registrá-la."); return; }
    setTickets((current) => current.map((ticket) => ticket.id === selected.id ? { ...ticket, resolution: resolutionDraft.trim(), resolutionValidated } : ticket));
    addTimeline("Resolução registrada: " + resolutionDraft.trim(), "interna");
    setNotice("Resolução registrada no chamado. A etapa de fechamento pode ser concluída após a validação.");
  };
  const validateFieldTicket = async () => {
    if (selected.status !== "Pendente validação") { setNotice("Este chamado ainda não está aguardando validação do Field Service."); return; }
    if (!resolutionDraft.trim() && !selected.resolution?.trim()) { setNotice("Revise o RTO e registre a resolução antes de fechar."); return; }
    try {
      const rawVisits = JSON.parse(window.localStorage.getItem("oneit.demo.field-visits.v1") ?? "[]") as unknown;
      const visit = Array.isArray(rawVisits) ? rawVisits.find((item) => typeof item === "object" && item && String((item as { ticket?: unknown }).ticket) === selected.id) as { lpuCode?: string; photoCount?: number; evidenceNotes?: string; additionalNotes?: string; customerSignatureName?: string; signatureDataUrl?: string } | undefined : undefined;
      if (!visit?.lpuCode?.trim()) { setNotice("Aplique uma LPU na OS de Field Service antes de validar o RTO e fechar o chamado."); return; }
      if (!visit.customerSignatureName?.trim() || !visit.signatureDataUrl) { setNotice("O aceite assinado do responsável no local é obrigatório antes do fechamento."); return; }
      if (!visit.photoCount && !(visit.evidenceNotes || visit.additionalNotes)?.trim()) { setNotice("Inclua foto(s) ou uma justificativa de evidência antes do fechamento."); return; }
    } catch { setNotice("Não foi possível conferir a LPU da OS de Field Service."); return; }
    const reportId = (selected.fieldReport as (typeof selected.fieldReport & { reportId?: string }) | undefined)?.reportId;
    const isUuid = (value: string | undefined) => Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
    if (isUuid(selected.id) && isUuid(reportId)) {
      try {
        const response = await fetch("/api/tickets/close", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticketId: selected.id, expectedVersion: (selected as Ticket & { version?: number }).version ?? 1, reportId, closureReason: "RTO conferido e encerramento administrativo realizado pelo gestor.", exceptionReason: "Integração com o sistema externo ainda não está habilitada neste ambiente.", exceptionAcknowledged: true }) });
        if (!response.ok) { const payload = await response.json().catch(() => ({})) as { code?: string }; setNotice("A API recusou o fechamento: " + (payload.code ?? "erro desconhecido") + "."); return; }
      } catch { setNotice("Não foi possível concluir o fechamento no servidor."); return; }
    }
    const now = new Date().toISOString();
    try {
      const rawVisits = JSON.parse(window.localStorage.getItem("oneit.demo.field-visits.v1") ?? "[]") as unknown;
      if (Array.isArray(rawVisits)) {
        window.localStorage.setItem("oneit.demo.field-visits.v1", JSON.stringify(rawVisits.map((item) => {
          if (!item || typeof item !== "object" || String((item as { ticket?: unknown }).ticket) !== selected.id) return item;
          return { ...(item as Record<string, unknown>), state: "Concluído", completedAt: now, managerValidatedAt: now, managerValidationNote: "RTO, evidências e LPU conferidos no chamado." };
        })));
      }
    } catch { setNotice("O chamado não foi fechado: não foi possível sincronizar a OS de Field Service."); return; }
    setTickets((current) => current.map((ticket) => ticket.id === selected.id ? { ...ticket, status: "Fechado", fieldStatus: "Concluído", resolution: resolutionDraft.trim() || ticket.resolution, resolutionValidated: true, pendingReason: undefined } : ticket));
    addTimeline("RTO conferido, materiais validados e chamado fechado pelo gestor de Field Service.", "interna");
    setResolutionValidated(true);
    setNotice("Chamado " + selected.id + " fechado após validação do RTO. O relatório operacional pode ser gerado/baixado no Field Service.");
  };
  const startFirstResponse = () => {
    setFirstResponseStarted((current) => ({ ...current, [selected.id]: true }));
    setTickets((current) => current.map((ticket) => ticket.id === selected.id ? { ...ticket, firstResponseAt: new Date().toISOString() } : ticket));
    addTimeline("Primeiro atendimento iniciado pelo analista responsável.", "interna");
    setFirstResponsePrompt(false);
    setNotice("Primeiro atendimento iniciado para " + selected.id + " e registrado no histórico.");
  };
  const action = (label: string, onClick: () => void, primary = false) => <button type="button" onClick={onClick} className={"oneit-grid-action border px-3 py-1.5 text-xs font-medium transition " + (primary ? "border-orange-500 bg-orange-500 text-white hover:bg-orange-600" : "border-slate-300 bg-white text-slate-700 hover:border-[#123f99] hover:text-[#123f99]")}>{label}</button>;
  const sort = (field: typeof sortBy) => { if (field === sortBy) setAscending((current) => !current); else { setSortBy(field); setAscending(field === "createdAt" ? false : true); } };
  const catalogCategories = Array.from(new Set(catalogServices.map((item) => item.category)));
  const availableSubcategories = Array.from(new Set(catalogServices.filter((item) => item.category === draftCategory).map((item) => item.subcategory).filter((item): item is string => Boolean(item)))).sort((left, right) => left.localeCompare(right, "pt-BR"));
  const availableServicesForClassification = catalogServices.filter((item) => item.category === draftCategory && (!draftSubcategory || item.subcategory === draftSubcategory)).sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
  const visibleCatalogServices = catalogServices.filter((item) => item.category === catalogCategory && [item.name, item.detail].join(" ").toLocaleLowerCase().includes(catalogQuery.trim().toLocaleLowerCase())).sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));

  return <main className="min-h-screen bg-[#f5f6f8] text-slate-900">
    <DemoSidebar active="tickets" />
    <div data-oneit-sidebar-offset className="ml-64 min-h-screen">
      <header className="flex min-h-[62px] items-center justify-between border-b border-slate-300 bg-white px-5"><div><p className="text-[11px] font-semibold tracking-[.15em] text-orange-500">ONEIT · CENTRAL DE SERVIÇOS</p><h1 className="mt-0.5 text-lg font-semibold">Chamados</h1></div>{action("+ Novo chamado", openCatalog, true)}</header>
      <section className="p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3"><div><h2 className="text-sm font-semibold text-[#062c59]">Solicitações</h2><p className="mt-0.5 text-xs text-slate-500">Selecione uma linha ou use Abrir chamado para iniciar o atendimento.</p></div><span className="text-xs text-slate-500">{visibleTickets.length} registro(s) visíveis</span></div>
        <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2 [&_button]:min-h-10">{action("Editar selecionado", () => show())}<details className="relative"><summary className="flex min-h-10 cursor-pointer list-none items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">Mais ações</summary><div className="absolute left-0 top-full z-10 mt-1 flex w-48 flex-col gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">{action("Imprimir", () => window.print())}{action("Comunicações", () => show("Comunicações"))}{action("Vincular", () => show("Vinculados"))}{action("Agrupar conversas", () => show("Vinculados"))}</div></details></div>
        <div className="mt-3 flex flex-wrap gap-2 border border-slate-300 bg-white p-2"><input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-64 flex-1 border border-slate-400 px-3 py-2 text-sm" placeholder="Pesquisar ID, assunto, solicitante ou técnico" /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "Todos" | Status)} className="border border-slate-400 px-3 py-2 text-sm"><option value="Todos">Todos os status</option><option value="Aberto">Abertos</option><option value="Pendente">Pendentes</option><option value="Pendente validação">Pendentes de validação</option><option value="SLA vencido">SLA vencido</option><option value="Fechado">Fechados</option></select></div>
        {notice && <p aria-live="polite" className="mt-2 text-xs text-slate-500">{notice}</p>}
<div aria-label="Chamados em tela estreita" className="mt-3 divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white lg:hidden">{visibleTickets.map((ticket) => <article key={ticket.id} className="space-y-2 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-[#062c59]">{ticket.id}</strong><span className={"rounded-full px-2 py-1 text-[11px] font-semibold " + statusClass(ticket.status)}>{ticket.status}</span></div><p className="text-sm font-semibold text-slate-800">{ticket.subject}</p><p className="text-xs text-slate-600">{ticket.requester} · {ticket.technician}</p><div className="flex items-center justify-between gap-2"><span className="text-xs text-slate-600">Prioridade {ticket.priority} · SLA {ticket.sla}</span><button type="button" onClick={() => openFromRow(ticket)} className="min-h-10 whitespace-nowrap text-xs font-semibold text-[#0b4b78]">{ticket.status === "Pendente validação" ? "Validar RTO →" : "Abrir chamado →"}</button></div></article>)}</div>        <div className="mt-3 hidden overflow-x-auto border border-slate-300 bg-white lg:block"><table className="oneit-operational-grid w-full min-w-[1000px] text-left text-xs"><thead className="bg-[#f4f5f7] text-slate-600"><tr><th className="p-3">Status</th><th className="p-3"><button type="button" onClick={() => sort("id")}>ID {sortBy === "id" ? (ascending ? "↑" : "↓") : "↕"}</button></th><th className="p-3"><button type="button" onClick={() => sort("subject")}>Assunto {sortBy === "subject" ? (ascending ? "↑" : "↓") : "↕"}</button></th><th className="p-3">Solicitante</th><th className="p-3">Técnico</th><th className="p-3">Prioridade</th><th className="p-3"><button type="button" onClick={() => sort("sla")}>Vencimento SLA {sortBy === "sla" ? (ascending ? "↑" : "↓") : "↕"}</button></th><th className="p-3">Próxima ação</th></tr></thead><tbody>{visibleTickets.map((ticket) => <tr key={ticket.id} onClick={() => setSelectedId(ticket.id)} onDoubleClick={() => openFromRow(ticket)} className={"cursor-pointer border-t border-slate-300 transition-colors hover:bg-[#eef4ff] " + (selectedId === ticket.id ? "bg-[#edf5ff]" : "bg-white")}><td className="p-3"><span className={"rounded-full px-2 py-1 text-[11px] font-semibold " + statusClass(ticket.status)}>{ticket.status}</span></td><td className="p-3 font-medium text-[#123f99]">{ticket.id}</td><td className="p-3 font-medium text-slate-800">{ticket.subject}</td><td className="p-3 text-slate-600">{ticket.requester}</td><td className="p-3 text-slate-600">{ticket.technician}</td><td className="p-3"><span className={"rounded-full px-2 py-1 text-[11px] font-semibold " + priorityClass(ticket.priority)}>{ticket.priority}</span></td><td className={"p-3 font-medium " + (ticket.status === "SLA vencido" ? "text-red-700" : "text-slate-600")}>{ticket.sla}</td><td className="p-3">{ticket.status === "Pendente validação" ? <button type="button" onClick={(event) => { event.stopPropagation(); openFromRow(ticket); }} className="min-h-9 whitespace-nowrap rounded-md px-2 text-[11px] font-semibold text-[#0b4b78] hover:bg-[#eaf1fa]">Validar RTO →</button> : ticket.status === "Fechado" ? <button type="button" onClick={(event) => { event.stopPropagation(); openFromRow(ticket); }} className="min-h-9 whitespace-nowrap rounded-md px-2 text-[11px] font-semibold text-[#0b4b78] hover:bg-[#eaf1fa]">Ver chamado →</button> : <button type="button" onClick={(event) => { event.stopPropagation(); openFromRow(ticket); }} className="min-h-9 whitespace-nowrap rounded-md px-2 text-[11px] font-semibold text-[#0b4b78] hover:bg-[#eaf1fa]">Abrir chamado →</button>}</td></tr>)}</tbody></table></div>
      </section>
    </div>
    {open && <div className="fixed inset-0 z-50 flex bg-slate-950/30"><button type="button" aria-label="Fechar detalhes" onClick={() => setOpen(false)} className="flex-1 cursor-default" /><aside role="dialog" aria-modal="true" aria-label={"Atendimento do chamado " + selected.id} className="flex h-screen w-full max-w-4xl flex-col bg-white shadow-2xl"><div className="flex items-start justify-between border-b px-7 py-5"><div><p className="text-xs font-semibold tracking-[.14em] text-orange-500">ATENDIMENTO DE CHAMADO</p><h2 className="mt-1 text-lg font-semibold">{selected.id} · {selected.subject}</h2><div className="mt-2 flex flex-wrap items-center gap-2"><span className={"rounded-full px-2 py-1 text-[11px] font-semibold " + statusClass(selected.status)}>{selected.status}</span>{selected.status === "Pendente validação" ? <span className="text-xs font-semibold text-violet-700">Próxima ação: validar RTO</span> : selected.status !== "Fechado" ? <span className="text-xs font-semibold text-orange-700">Próxima ação: atribuir visita</span> : <span className="text-xs text-slate-500">Fluxo encerrado</span>}</div></div><div className="flex items-center gap-2">{selected.status === "Pendente validação" && <button type="button" onClick={() => setTab("Resolução")} className="rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white">Validar RTO</button>}{selected.status !== "Fechado" && selected.status !== "Pendente validação" && <button type="button" onClick={() => setTab("Atividades")} className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white">Atribuir visita</button>}<button type="button" onClick={() => setOpen(false)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100">✕</button></div></div><div className="flex gap-1 overflow-x-auto border-b px-5">{tabs.map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={"whitespace-nowrap border-b-2 px-3 py-3 text-sm " + (tab === item ? "border-orange-500 font-semibold text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800")}>{item}</button>)}</div><div className="flex-1 overflow-y-auto p-7">
      {tab === "Principal" && <div className="grid gap-5 md:grid-cols-2"><label className="md:col-span-2 text-sm font-medium">Assunto<input value={draftSubject} onChange={(event) => setDraftSubject(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" /></label><label className="text-sm font-medium">Solicitante<select value={draftRequester} onChange={(event) => selectRequester(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal">{requesterOptions.map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-sm font-medium">Empresa / departamento<input value={[draftCompany, draftDepartment].filter(Boolean).join(" · ")} readOnly className="mt-1 w-full rounded-lg border bg-slate-50 px-3 py-2 font-normal text-slate-600" /></label><label className="text-sm font-medium">Status<select value={draftStatus} onChange={(event) => setDraftStatus(event.target.value as Status)} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal"><option>Aberto</option><option>Pendente</option><option>SLA vencido</option><option>Fechado</option></select></label><label className="text-sm font-medium">Analista<select value={draftTechnician} onChange={(event) => setDraftTechnician(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal"><option>{selected.technician}</option><option>Felipe Buso</option><option>Camila Souza</option><option>Rafael Bonato</option><option>Aguardando triagem</option></select></label>{draftStatus === "Pendente" && <label className="md:col-span-2 text-sm font-medium">Motivo da pendência<textarea value={draftPendingReason} onChange={(event) => setDraftPendingReason(event.target.value)} className="mt-1 min-h-20 w-full rounded-lg border px-3 py-2 font-normal" placeholder="Ex.: aguardando aprovação, informação, peça, acesso ou janela autorizada." /></label>}<label className="md:col-span-2 text-sm font-medium">Descrição<textarea defaultValue="Registro demonstrativo de chamado. O atendimento, as comunicações e as decisões ficam rastreáveis no histórico." className="mt-1 min-h-36 w-full rounded-lg border px-3 py-2 font-normal" /></label><div className="md:col-span-2 rounded-xl border border-orange-200 bg-orange-50 p-4"><p className="text-sm font-semibold text-slate-800">Classificação pelo catálogo de serviços</p><div className="mt-3 flex flex-wrap gap-3"><select value={service} onChange={(event) => setService(event.target.value)} className="min-w-64 flex-1 rounded-lg border bg-white px-3 py-2 text-sm">{!catalogServices.some((item) => item.category + " · " + item.name === service) && <option value={service}>{service}</option>}{catalogServices.map((item) => <option key={item.id} value={item.category + " · " + item.name}>{item.category + " · " + item.name}</option>)}</select><button type="button" onClick={applyService} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600">Aplicar um serviço</button></div></div></div>}
      {tab === "Comunicações" && <div className="space-y-4"><div className="rounded-xl bg-slate-50 p-4 text-sm"><b>Solicitante</b><p className="mt-1 text-slate-600">Comunicações registradas nesta aba são destinadas ao solicitante.</p></div>{(timeline[selected.id] ?? []).filter((entry) => entry.kind === "cliente").map((entry, index) => <div key={index} className="rounded-xl border border-cyan-100 bg-cyan-50 p-4 text-sm"><p className="font-semibold text-slate-800">{entry.at} · Comunicação ao solicitante</p><p className="mt-1 text-slate-600">{entry.text}</p></div>)}<textarea value={customerMessage} onChange={(event) => setCustomerMessage(event.target.value)} className="min-h-36 w-full rounded-lg border p-3 text-sm" placeholder="Escreva uma atualização para o solicitante. No ambiente integrado, ela será enviada por e-mail." /><button type="button" onClick={sendCustomerMessage} className="rounded-lg bg-[#092f40] px-4 py-2 text-sm font-semibold text-white">Registrar comunicação</button></div>}
      {tab === "Comunicação interna" && <div className="space-y-4">{(timeline[selected.id] ?? []).filter((entry) => entry.kind === "interna").map((entry, index) => <div key={index} className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm"><p className="font-semibold text-slate-800">{entry.at} · Nota interna</p><p className="mt-1 text-slate-600">{entry.text}</p></div>)}<textarea value={internalNote} onChange={(event) => setInternalNote(event.target.value)} className="min-h-48 w-full rounded-lg border p-3 text-sm" placeholder="Anotação interna: não é enviada ao solicitante." /><button type="button" onClick={addInternalNote} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Registrar nota interna</button></div>}
      {tab === "Atividades" && <div className="space-y-4 text-sm"><div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4"><p className="font-semibold text-slate-900">Atribuir visita ao Field Service</p><p className="mt-1 text-slate-600">Agenda o chamado para o técnico responsável e o torna disponível no Field Service.</p><div className="mt-3 grid gap-3 sm:grid-cols-3"><input type="date" value={fieldDate} onChange={(event) => setFieldDate(event.target.value)} className="rounded-lg border bg-white px-3 py-2" /><input value={fieldWindow} onChange={(event) => setFieldWindow(event.target.value)} className="rounded-lg border bg-white px-3 py-2" placeholder="09:00 — 10:00" /><button type="button" onClick={dispatchToField} className="rounded-lg bg-[#092f40] px-4 py-2 font-semibold text-white">Atribuir visita</button></div><p className="mt-2 text-xs text-slate-500">Técnico: {draftTechnician === "Aguardando triagem" ? "A definir" : draftTechnician}</p></div><p className="rounded-lg border p-3">11/10 08:55 · Técnico atribuído a {selected.technician}</p><p className="rounded-lg border p-3">11/10 08:42 · Chamado criado na fila operacional</p></div>}
      {tab === "Principal" && <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl border bg-slate-50 p-4 text-sm md:grid-cols-3"><p><span className="block text-xs text-slate-500">Tipo</span><b>{selected.type ?? "Solicitação"}</b></p><p><span className="block text-xs text-slate-500">Nível</span><b>{selected.level ?? "Nível 1"}</b></p><p><span className="block text-xs text-slate-500">Criticidade</span><b>{selected.criticality ?? "Normal"}</b></p><p><span className="block text-xs text-slate-500">Urgência</span><b>{selected.urgency ?? "Normal"}</b></p><p><span className="block text-xs text-slate-500">Impacto</span><b>{selected.impact ?? "Afeta o usuário"}</b></p><p><span className="block text-xs text-slate-500">SLA de resolução</span><b>{selected.sla}</b></p></div>}
      {tab === "Vinculados" && <div className="space-y-5"><div><p className="text-sm font-semibold">Vincular chamado</p><p className="mt-1 text-sm text-slate-500">Use para relacionar este chamado a um incidente pai.</p><div className="mt-3 flex gap-2"><input value={parentNumber} onChange={(event) => setParentNumber(event.target.value)} placeholder="Ex.: INC-0100" className="flex-1 rounded-lg border px-3 py-2 text-sm" /><button type="button" onClick={() => relate("vinculado")} className="rounded-lg bg-[#092f40] px-4 py-2 text-sm font-semibold text-white">Vincular</button></div></div><div className="border-t pt-5"><p className="text-sm font-semibold">Agrupar conversas</p><p className="mt-1 text-sm text-slate-500">Use quando importações separadas forem parte da mesma conversa.</p><button type="button" onClick={() => relate("agrupado")} className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Agrupar com o número informado</button></div><div className="border-t pt-5"><p className="text-sm font-semibold">Relacionar a um problema</p><p className="mt-1 text-sm text-slate-500">Associe incidentes recorrentes ao registro de causa raiz, workaround e ação corretiva.</p><div className="mt-3 flex flex-wrap gap-3"><select value={linkedProblemId} onChange={(event) => setLinkedProblemId(event.target.value)} className="min-w-64 flex-1 rounded-lg border bg-white px-3 py-2 text-sm"><option value="">Nenhum problema relacionado</option>{problemOptions.map((problem) => <option key={problem.id} value={problem.id}>{problem.id} · {problem.title}</option>)}</select><button type="button" onClick={linkProblem} className="rounded-lg border border-violet-300 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-800">Salvar vínculo</button></div>{selected.problemId && problemOptions.find((problem) => problem.id === selected.problemId) && <p className="mt-3 rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-900">Relacionado a {selected.problemId} · {problemOptions.find((problem) => problem.id === selected.problemId)?.title}</p>}<p className="mt-2 text-xs text-slate-500">Problemas são carregados do módulo Gestão de Problemas.</p></div><div className="border-t pt-5"><p className="text-sm font-semibold">Relacionar a uma GMUD</p><p className="mt-1 text-sm text-slate-500">Use quando a solução depende de mudança controlada, aprovação, janela e plano de retorno.</p><div className="mt-3 flex flex-wrap gap-3"><select value={linkedChangeId} onChange={(event) => setLinkedChangeId(event.target.value)} className="min-w-64 flex-1 rounded-lg border bg-white px-3 py-2 text-sm"><option value="">Nenhuma GMUD relacionada</option>{changeOptions.map((change) => <option key={change.id} value={change.id}>{change.id} · {change.title}</option>)}</select><button type="button" onClick={linkChange} className="rounded-lg border border-cyan-300 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-800">Salvar vínculo</button></div>{selected.changeId && <p className="mt-3 rounded-lg bg-cyan-50 px-3 py-2 text-sm text-cyan-900">Relacionado à GMUD {selected.changeId}{changeOptions.find((change) => change.id === selected.changeId) ? " · " + changeOptions.find((change) => change.id === selected.changeId)?.title : ""}</p>}<p className="mt-2 text-xs text-slate-500">GMUDs são carregadas do módulo Gestão de Mudanças.</p></div></div>}
      {tab === "Ativos" && <div className="space-y-4"><div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4"><p className="font-semibold text-slate-900">Ativo ou item de configuração vinculado</p><p className="mt-1 text-sm text-slate-600">Registre o equipamento relacionado ao atendimento para manter rastreabilidade entre chamado, ativo e histórico.</p><div className="mt-3 flex flex-wrap gap-3"><select value={linkedAssetId} onChange={(event) => setLinkedAssetId(event.target.value)} className="min-w-64 flex-1 rounded-lg border bg-white px-3 py-2 text-sm"><option value="">Nenhum ativo vinculado</option>{assetOptions.map((asset) => <option key={asset.id} value={asset.id}>{asset.name} · {asset.type} · {asset.serial}</option>)}</select><button type="button" onClick={linkAsset} className="rounded-lg bg-[#092f40] px-4 py-2 text-sm font-semibold text-white">Salvar vínculo</button></div></div>{selected.assetId && assetOptions.find((asset) => asset.id === selected.assetId) && <div className="rounded-xl border bg-white p-4 text-sm"><p className="font-semibold text-slate-900">{assetOptions.find((asset) => asset.id === selected.assetId)?.name}</p><p className="mt-1 text-slate-600">{assetOptions.find((asset) => asset.id === selected.assetId)?.company} · {assetOptions.find((asset) => asset.id === selected.assetId)?.department}</p><p className="mt-1 font-mono text-xs text-slate-500">Patrimônio {selected.assetId}</p></div>}<p className="text-xs text-slate-500">Ativos são carregados da Base de ativos do demonstrativo.</p></div>}
      {tab === "Fornecedor" && <div className="space-y-4"><div className="rounded-xl border border-orange-200 bg-orange-50 p-4"><p className="font-semibold text-slate-900">Fornecedor responsável</p><p className="mt-1 text-sm text-slate-600">Vincule o parceiro que atenderá este chamado para consultar contato e obrigação contratual.</p><div className="mt-3 flex flex-wrap gap-3"><select value={linkedSupplierId} onChange={(event) => setLinkedSupplierId(event.target.value)} className="min-w-64 flex-1 rounded-lg border bg-white px-3 py-2 text-sm"><option value="">Nenhum fornecedor vinculado</option>{supplierOptions.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select><button type="button" onClick={linkSupplier} className="rounded-lg bg-[#092f40] px-4 py-2 text-sm font-semibold text-white">Salvar vínculo</button></div></div>{selected.supplierId && supplierOptions.find((supplier) => supplier.id === selected.supplierId) && <div className="rounded-xl border bg-white p-4 text-sm"><p className="font-semibold">{supplierOptions.find((supplier) => supplier.id === selected.supplierId)?.name}</p><p className="mt-1 text-slate-600">Atendimento: {supplierOptions.find((supplier) => supplier.id === selected.supplierId)?.contact} · {supplierOptions.find((supplier) => supplier.id === selected.supplierId)?.email}</p><p className="mt-1 font-medium text-slate-700">SLA contratado: {supplierOptions.find((supplier) => supplier.id === selected.supplierId)?.sla}</p></div>}</div>}
      {tab === "Resolução" && <div className="space-y-4"><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="font-semibold text-slate-900">Registro de resolução</p><p className="mt-1 text-sm text-slate-600">Descreva solução aplicada, causa identificada, evidências e validação. O registro será mantido no histórico antes do encerramento.</p></div>{selected.status === "Pendente validação" && <div className="rounded-xl border border-violet-200 bg-violet-50 p-4"><p className="font-semibold text-violet-950">RTO aguardando validação do gestor</p><p className="mt-1 text-sm text-violet-900">{selected.fieldReport?.fileName ?? "Relatório técnico operacional pendente"} · materiais R$ {(selected.fieldMaterialTotal ?? 0).toFixed(2)}</p><p className="mt-1 text-xs text-violet-800">Confira evidências, medição e resolução antes de encerrar.</p><button type="button" onClick={validateFieldTicket} className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Validar RTO e fechar chamado</button></div>}<textarea value={resolutionDraft} onChange={(event) => setResolutionDraft(event.target.value)} className="min-h-48 w-full rounded-lg border p-3 text-sm" placeholder="Descreva a solução, causa identificada e validação com o solicitante." /><label className="flex items-start gap-3 rounded-lg border bg-white p-4 text-sm"><input type="checkbox" checked={resolutionValidated} onChange={(event) => setResolutionValidated(event.target.checked)} className="mt-0.5 h-4 w-4" /><span><span className="block font-semibold text-slate-900">Resolução validada</span><span className="mt-1 block text-slate-600">Confirmo que a solução foi validada com o solicitante ou conforme o critério de aceite definido para este serviço.</span></span></label><button type="button" onClick={saveResolution} className="rounded-lg bg-[#092f40] px-4 py-2 text-sm font-semibold text-white">Registrar resolução</button>{selected.resolution && <div className="rounded-xl border bg-white p-4 text-sm"><p className="font-semibold">Última resolução registrada</p><p className="mt-1 whitespace-pre-wrap text-slate-600">{selected.resolution}</p><p className={"mt-3 text-xs font-semibold " + (selected.resolutionValidated ? "text-emerald-700" : "text-amber-700")}>{selected.resolutionValidated ? "Validação registrada" : "Validação pendente"}</p></div>}</div>}
      {tab === "Histórico" && <ol className="space-y-4 border-l-2 border-slate-200 pl-5 text-sm">{(timeline[selected.id] ?? []).map((entry, index) => <li key={index}><b>{entry.at}</b><p className="text-slate-600">{entry.text}</p></li>)}<li><b>11/10 08:55</b><p className="text-slate-600">Analista atribuído e atendimento iniciado.</p></li><li><b>11/10 08:46</b><p className="text-slate-600">Chamado classificado no catálogo de serviços.</p></li><li><b>11/10 08:42</b><p className="text-slate-600">Chamado recebido e incluído na fila.</p></li></ol>}
      {tab === "Principal" && <section className="mt-5 rounded-xl border border-blue-100 bg-blue-50/60 p-4"><div><p className="text-xs font-semibold tracking-[.12em] text-[#123f99]">CLASSIFICAÇÃO DO ATENDIMENTO</p><h3 className="mt-1 text-sm font-semibold text-slate-900">Categoria, subcategoria e serviço</h3><p className="mt-1 text-xs text-slate-600">A lista é progressiva: categoria filtra subcategorias; ambas filtram os serviços disponíveis. Ao escolher o serviço, suas regras operacionais são aplicadas.</p></div><div className="mt-4 grid gap-3 md:grid-cols-3"><label className="text-sm font-medium">Categoria<select value={draftCategory} onChange={(event) => { setDraftCategory(event.target.value); setDraftSubcategory(""); setService(""); }} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"><option value="">Selecione a categoria</option>{catalogCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label><label className="text-sm font-medium">Subcategoria<select value={draftSubcategory} onChange={(event) => { setDraftSubcategory(event.target.value); setService(""); }} disabled={!draftCategory} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal disabled:cursor-not-allowed disabled:bg-slate-100"><option value="">{draftCategory ? "Selecione a subcategoria" : "Escolha primeiro uma categoria"}</option>{availableSubcategories.map((subcategory) => <option key={subcategory} value={subcategory}>{subcategory}</option>)}</select></label><label className="text-sm font-medium">Serviço<select value={service} onChange={(event) => { const item = catalogServices.find((candidate) => candidate.category + " · " + candidate.name === event.target.value); if (item) applyCatalogService(item); else setService(""); }} disabled={!draftCategory} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal disabled:cursor-not-allowed disabled:bg-slate-100"><option value="">{draftCategory ? "Selecione o serviço" : "Escolha primeiro uma categoria"}</option>{availableServicesForClassification.map((item) => <option key={item.id} value={item.category + " · " + item.name}>{item.name}</option>)}</select></label></div></section>}
    </div><footer className="flex justify-end gap-3 border-t p-5"><button type="button" onClick={saveTicket} className="rounded-lg bg-[#092f40] px-4 py-2 text-sm font-semibold text-white">Salvar</button><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Fechar</button></footer></aside></div>}
    {firstResponsePrompt && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4"><div role="dialog" aria-modal="true" aria-label="Iniciar primeiro atendimento" className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl"><p className="text-xs font-semibold tracking-[.14em] text-orange-500">MARCO DE SLA</p><h2 className="mt-2 text-lg font-semibold">Iniciar primeiro atendimento?</h2><p className="mt-2 text-sm leading-6 text-slate-600">Confirme quando começar a atender este chamado. Esse marco ficará registrado no histórico e no acompanhamento de SLA.</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => { setFirstResponsePrompt(false); setNotice("Primeiro atendimento ainda não foi iniciado; a confirmação será exibida ao abrir novamente."); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Não agora</button><button type="button" onClick={startFirstResponse} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white">Sim, iniciar</button></div></div></div>}
    {catalogOpen && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-5"><div role="dialog" aria-modal="true" aria-label="Selecionar serviço do catálogo" className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"><div className="flex items-start justify-between border-b px-6 py-5"><div><p className="text-xs font-semibold tracking-[.14em] text-orange-500">NOVO CHAMADO · CATÁLOGO DE SERVIÇOS</p><h2 className="mt-1 text-xl font-semibold">{catalogCategory ? catalogCategory : "Classes de serviços"}</h2><p className="mt-1 text-sm text-slate-500">{catalogCategory ? "Selecione um serviço para continuar o registro." : "Selecione uma categoria para exibir os serviços disponíveis."}</p></div><button type="button" onClick={() => setCatalogOpen(false)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100">✕</button></div><div className="border-b bg-slate-50 px-5 py-3"><p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Classes de serviços</p><div className="flex gap-2 overflow-x-auto pb-1">{catalogCategories.map((category) => { const active = category === catalogCategory; return <button type="button" key={category} title={category} onClick={() => { setCatalogCategory(category); setCatalogQuery(""); const first = catalogServices.find((item) => item.category === category); if (first) setCatalogSelection(first); }} className={"oneit-catalog-class flex w-[88px] shrink-0 flex-col items-center gap-1 px-2 py-2 text-center text-[11px] font-medium transition " + (active ? "text-[#123f99]" : "text-slate-600")}><span className={"oneit-catalog-tile flex h-11 w-11 items-center justify-center text-xl " + (active ? "oneit-catalog-tile-active" : "")}>{catalogCategoryVisuals[category] ?? catalogCategoryIcons[category] ?? "•"}</span><span className="line-clamp-2 leading-3">{category}</span></button>; })}</div></div>{catalogCategory ? <div className="min-h-0 flex-1 overflow-auto px-6 py-5"><div className="mb-4 flex items-center gap-3"><p className="text-sm font-semibold text-slate-800">{visibleCatalogServices.length} serviços em {catalogCategory}</p><input value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} placeholder="Pesquisar serviço" className="ml-auto w-72 max-w-full rounded-lg border px-3 py-2 text-sm" /></div><div className="overflow-hidden rounded-xl border"><div className="grid grid-cols-[minmax(0,1fr)_110px_34px] border-b bg-slate-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><span>Serviço</span><span>SLA</span><span /></div>{visibleCatalogServices.map((item) => <button type="button" key={item.id} onClick={() => setCatalogSelection(item)} className={"grid w-full grid-cols-[minmax(0,1fr)_110px_34px] items-center border-b px-4 py-3 text-left text-sm transition last:border-0 " + (catalogSelection.id === item.id ? "bg-orange-50 ring-1 ring-inset ring-orange-400" : "bg-white hover:bg-slate-50")}><span><span className="block font-medium text-slate-900">{item.name}</span><span className="mt-0.5 block text-xs text-slate-500">{item.detail}</span></span><span className="text-xs font-semibold text-slate-600">{item.resolution ?? item.detail.match(/SLA de resolução (.*)$/)?.[1] ?? "A definir"}</span><span className={"h-4 w-4 rounded-full border-2 " + (catalogSelection.id === item.id ? "border-orange-500 bg-orange-500 shadow-[inset_0_0_0_3px_white]" : "border-slate-300")} /></button>)}{!visibleCatalogServices.length && <p className="p-5 text-sm text-slate-600">Nenhum serviço encontrado nesta categoria.</p>}</div></div> : <div className="flex flex-1 items-center justify-center p-10 text-center text-sm text-slate-500">Escolha uma classe na faixa de ícones acima.</div>}<div className="flex flex-wrap items-center justify-between gap-3 border-t bg-white px-6 py-4"><label className="text-sm font-medium">Solicitante <select aria-label="Solicitante do novo chamado" value={newRequesterName} onChange={(event) => setNewRequesterName(event.target.value)} className="ml-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">Selecione o solicitante</option>{requesterProfiles.map((profile) => <option key={profile.name} value={profile.name}>{profile.name} · {profile.company}</option>)}</select></label><button type="button" onClick={() => setCatalogOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancelar</button>{catalogCategory && <button type="button" onClick={createFromCatalog} disabled={!newRequesterName} className="rounded-lg bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600">Continuar</button>}</div></div></div>}
  </main>;
}








