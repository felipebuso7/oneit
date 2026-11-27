"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { createTicket } from "@/app/(portal)/portal/tickets/actions";

type Props = {
  organizations: { id: string; display_name: string }[];
  customers: { id: string; organization_id: string; name: string }[];
  contracts: { id: string; organization_id: string; customer_id: string; code: string; name: string }[];
  slaPolicies: { id: string; organization_id: string; contract_id?: string | null; priority: number; response_minutes: number; resolution_minutes: number; ola_minutes: number; name?: string | null; duration_value?: number | null; duration_unit?: string | null }[];
  locations: { id: string; organization_id: string; customer_id: string; name: string; street?: string | null; street_number?: string | null; complement?: string | null; district?: string | null; city: string; state_code?: string | null; postal_code?: string | null }[];
  categories: { id: string; organization_id: string; name: string }[];
  subcategories: { id: string; category_id: string; name: string }[];
  offerings: { id: string; subcategory_id: string; code: string; name: string }[];
  collaborators: { id: string; organization_id: string; customer_id?: string | null; location_id?: string | null; full_name: string }[];
  requesterEmails?: { collaborator_id: string; email: string }[];
  departments: { id: string; organization_id: string; customer_id?: string | null; name: string }[];
};

export function TicketCreateFlow(props: Props) {
  const { organizations, customers, contracts, slaPolicies, locations, categories, subcategories, offerings, collaborators, requesterEmails = [], departments } = props;
  const [step, setStep] = useState<"closed" | "catalog" | "form">("closed");
  const [organizationId, setOrganizationId] = useState(organizations.length === 1 ? organizations[0].id : "");
  const [customerId, setCustomerId] = useState("");
  const [contractId, setContractId] = useState("");
  const [requesterId, setRequesterId] = useState("");
  const [requesterSearch, setRequesterSearch] = useState("");
  const [requesterOpen, setRequesterOpen] = useState(false);
  const [requesterActiveIndex, setRequesterActiveIndex] = useState(-1);
  const [locationId, setLocationId] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [locationOpen, setLocationOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [search, setSearch] = useState("");
  const [offeringId, setOfferingId] = useState("");
  const [servicenowNumber, setServicenowNumber] = useState("");
  const [servicenowOpenedAt, setServicenowOpenedAt] = useState("");
  const [impact, setImpact] = useState<"LOW" | "MEDIUM" | "HIGH">("LOW");
  const [urgency, setUrgency] = useState<"LOW" | "MEDIUM" | "HIGH">("LOW");
  const [slaPolicyId, setSlaPolicyId] = useState("");
  const catalog = useMemo(() => offerings.flatMap((offering) => {
    const subcategory = subcategories.find((item) => item.id === offering.subcategory_id);
    const category = categories.find((item) => item.id === subcategory?.category_id);
    return category?.organization_id === organizationId ? [{ offering, subcategory, category }] : [];
  }), [offerings, subcategories, categories, organizationId]);
  const selected = catalog.find((item) => item.offering.id === offeringId);
  const visible = catalog.filter((item) => (!categoryId || item.category.id === categoryId) && `${item.offering.name} ${item.offering.code} ${item.subcategory?.name}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));
  const field = "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm";
  const orgCustomers = customers.filter((item) => item.organization_id === organizationId);
  const customerLocations = locations.filter((item) => item.organization_id === organizationId && item.customer_id === customerId);
  const visibleLocations = customerLocations.filter((item) => `${item.name} ${item.city} ${item.street ?? ""} ${item.district ?? ""} ${item.postal_code ?? ""}`.toLocaleLowerCase("pt-BR").includes(locationSearch.toLocaleLowerCase("pt-BR")));
  const selectedLocation = customerLocations.find((item) => item.id === locationId);
  const locationAddress = selectedLocation ? [selectedLocation.street, selectedLocation.street_number, selectedLocation.complement, selectedLocation.district, selectedLocation.city, selectedLocation.state_code, selectedLocation.postal_code].filter(Boolean).join(", ") : "";
  const customerContracts = contracts.filter((item) => item.organization_id === organizationId && item.customer_id === customerId);
  const selectedContractId = contractId || customerContracts[0]?.id || "";
  const selectedPriority = impact === "HIGH" && urgency === "HIGH" ? 1 : impact !== "LOW" && urgency !== "LOW" ? 2 : impact === "LOW" && urgency === "LOW" ? 5 : 3;
  const eligibleSlaPolicies = slaPolicies.filter((item) => (!item.contract_id || item.contract_id === selectedContractId) && (item.contract_id === null || item.priority === selectedPriority));
  const selectedSla = eligibleSlaPolicies.find((item) => item.id === slaPolicyId);
  const customerCollaborators = collaborators.filter((item) => item.organization_id === organizationId && item.customer_id === customerId);
  const visibleRequesters = customerCollaborators.filter((item) => {
    const email = requesterEmails.find((entry) => entry.collaborator_id === item.id)?.email ?? "";
    const polo = locations.find((location) => location.id === item.location_id);
    return `${item.full_name} ${email} ${polo?.name ?? ""}`.toLocaleLowerCase("pt-BR").includes(requesterSearch.toLocaleLowerCase("pt-BR"));
  });
  useEffect(() => { setRequesterActiveIndex(visibleRequesters.length ? 0 : -1); }, [requesterSearch, customerId]);
  useEffect(() => {
    const select = document.querySelector('select[name="contractId"]') as HTMLSelectElement | null;
    if (!select) return;
    const sync = () => setContractId(select.value);
    sync();
    select.addEventListener("change", sync);
    return () => select.removeEventListener("change", sync);
  }, [customerId, customerContracts.length]);
  useEffect(() => {
    const select = document.querySelector('select[name="slaPolicyId"]') as HTMLSelectElement | null;
    if (!select) return;
    const sync = () => setSlaPolicyId(select.value);
    sync();
    select.addEventListener("change", sync);
    return () => select.removeEventListener("change", sync);
  }, [selectedContractId, selectedPriority, eligibleSlaPolicies.length]);
  const openNewTicket = () => {
    setStep("catalog");
    setSearch("");
    setCategoryId("");
    setOfferingId("");
    setCustomerId("");
    setRequesterId("");
    setRequesterSearch("");
    setRequesterOpen(false);
    setLocationId("");
    setLocationSearch("");
    setLocationOpen(false);
    setServicenowNumber("");
    setServicenowOpenedAt("");
    if (organizations.length !== 1) setOrganizationId("");
  };

  useEffect(() => {
    if (step === "closed") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setStep("closed"); };
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKeyDown); };
  }, [step]);

  return <>
    <button type="button" onClick={openNewTicket} className="oneit-btn oneit-btn--primary whitespace-nowrap">+ Novo chamado</button>
    {step !== "closed" && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-[2px] sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setStep("closed"); }}>
      <section role="dialog" aria-modal="true" aria-label={step === "catalog" ? "Catálogo para novo chamado" : "Preenchimento do chamado"} className="flex h-[min(92vh,860px)] max-h-[calc(100vh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,.28)]">
        <header className="border-b border-slate-200 px-5 py-4 sm:px-7"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-sky-800">Novo chamado · {step === "catalog" ? "1 de 2" : "2 de 2"}</p><h2 className="mt-1 text-xl font-semibold">{step === "catalog" ? "Escolha o serviço" : "Dados da solicitação"}</h2></div><button type="button" onClick={() => setStep("closed")} aria-label="Fechar" className="rounded-lg px-3 py-2 text-lg hover:bg-slate-100">×</button></div><div className="mt-4 grid grid-cols-2 gap-2" aria-label="Progresso da abertura"><div><div className={`h-1.5 rounded-full ${step === "catalog" ? "bg-orange-500" : "bg-emerald-500"}`} /><p className="mt-1 text-[11px] font-semibold text-slate-500">1 · Serviço e referência</p></div><div><div className={`h-1.5 rounded-full ${step === "form" ? "bg-orange-500" : "bg-slate-200"}`} /><p className="mt-1 text-[11px] font-semibold text-slate-500">2 · Dados do chamado</p></div></div></header>
        {step === "catalog" ? <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
          <p className="text-sm text-slate-600">Informe o chamado ServiceNow e selecione o serviço antes de preencher a solicitação.</p>
          <label className="mt-5 block text-sm font-semibold">Número do chamado ServiceNow<span className="ml-1 font-normal text-rose-700">obrigatório</span><input value={servicenowNumber} onChange={(event) => setServicenowNumber(event.target.value)} required placeholder="Ex.: INC0012345" className={field} /><small className="mt-1 block font-normal text-slate-500">Essa será a referência do chamado no OneIT.</small></label>
          <label className="mt-5 block text-sm font-semibold">Data de abertura no ServiceNow<span className="ml-1 font-normal text-rose-700">obrigatória</span><input type="date" value={servicenowOpenedAt} onChange={(event) => setServicenowOpenedAt(event.target.value)} required className={field} /><small className="mt-1 block font-normal text-slate-500">Use a data registrada no sistema do cliente.</small></label>
          {organizations.length > 1 && <label className="mt-5 block text-sm font-medium">Organização<select aria-label="Organização do catálogo" value={organizationId} onChange={(event) => { setOrganizationId(event.target.value); setCategoryId(""); setOfferingId(""); setCustomerId(""); setLocationId(""); }} className={field}><option value="">Selecione</option>{organizations.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}</select></label>}
          <label className="mt-5 block text-sm font-medium">Buscar serviço<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome ou código" className={field} /></label>
          <div className="mt-5 flex flex-wrap gap-2" aria-label="Categorias"><button type="button" aria-pressed={!categoryId} onClick={() => setCategoryId("")} className={`rounded-full px-3 py-1.5 text-sm ${!categoryId ? "bg-sky-950 text-white" : "bg-slate-100"}`}>Todos</button>{categories.filter((item) => item.organization_id === organizationId).map((item) => <button key={item.id} type="button" aria-pressed={categoryId === item.id} onClick={() => setCategoryId(item.id)} className={`rounded-full px-3 py-1.5 text-sm ${categoryId === item.id ? "bg-sky-950 text-white" : "bg-slate-100"}`}>{item.name}</button>)}</div>
          <div className="mt-5 divide-y divide-slate-200 rounded-xl border border-slate-200">{visible.map((item) => <button key={item.offering.id} type="button" disabled={!servicenowNumber.trim()} onClick={() => { setOfferingId(item.offering.id); setStep("form"); }} className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"><span><strong className="block text-sm">{item.offering.name}</strong><small className="text-slate-600">{item.category.name} · {item.subcategory?.name} · {item.offering.code}</small></span><span aria-hidden>→</span></button>)}{!visible.length && <p className="p-5 text-sm text-slate-600">Nenhum serviço disponível. <Link href="/portal/service-catalog" className="font-semibold text-sky-900 underline">Abrir catálogo</Link></p>}</div>
        </div> : <form action={createTicket} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 sm:p-7">
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm"><span className="text-slate-600">Serviço selecionado</span><strong className="mt-1 block">{selected?.offering.name}</strong><small>{selected?.category.name} · {selected?.subcategory?.name}</small></div>
            <input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="serviceOfferingId" value={offeringId} /><input type="hidden" name="servicenowNumber" value={servicenowNumber} /><input type="hidden" name="servicenowOpenedAt" value={servicenowOpenedAt} />
            <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Cliente *<select name="customerId" required value={customerId} onChange={(event) => { setCustomerId(event.target.value); setRequesterId(""); setRequesterSearch(""); setLocationId(""); setLocationSearch(""); setLocationOpen(false); }} className={field}><option value="">Selecione</option>{orgCustomers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="text-sm font-medium"><span>Localidade *</span><div className="relative mt-1"><input aria-label="Buscar localidade" value={locationSearch} onFocus={() => { if (customerId) setLocationOpen(true); }} onChange={(event) => { setLocationSearch(event.target.value); setLocationId(""); setLocationOpen(true); }} disabled={!customerId} placeholder={customerId ? "Digite para buscar e selecione" : "Selecione o cliente primeiro"} className={field}/>{customerId && locationOpen && <div className="absolute left-0 right-0 top-full z-20 max-h-56 overflow-y-auto rounded-b-lg border border-slate-300 bg-white shadow-lg" role="listbox" aria-label="Localidades encontradas"><button type="button" className="block w-full border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-500 hover:bg-slate-50" onClick={() => { setLocationId(""); setLocationSearch(""); setLocationOpen(true); }}>Buscar localidade…</button>{visibleLocations.map((item) => <button type="button" role="option" aria-selected={locationId === item.id} key={item.id} className={`block w-full px-3 py-2 text-left text-sm hover:bg-sky-50 ${locationId === item.id ? "bg-sky-50 font-semibold" : ""}`} onClick={() => { setLocationId(item.id); setLocationSearch(`${item.name} · ${item.city}`); setLocationOpen(false); }}>{item.name} · {item.city}</button>)}{!visibleLocations.length && <p className="px-3 py-3 text-sm text-slate-500">Nenhuma localidade encontrada.</p>}</div>}</div><input type="hidden" name="locationId" value={locationId} required />{selectedLocation ? <small className="mt-1 block rounded-md bg-slate-100 p-2 font-normal text-slate-600">Endereço: {locationAddress || "Não informado"}</small> : null}</div><label className="text-sm font-medium">Tipo *<select name="ticketType" defaultValue="INCIDENT" className={field}><option value="INCIDENT">Incidente</option><option value="SERVICE_REQUEST">Solicitação de serviço</option><option value="ACCESS_REQUEST">Solicitação de acesso</option><option value="PREVENTIVE">Preventivo</option><option value="CONSULTATION">Consulta</option><option value="EVENT">Evento convertido</option></select></label><label className="text-sm font-medium">Contrato<select key={customerId} name="contractId" defaultValue="" disabled={!customerId} className={field}><option value="">Sem contrato</option>{customerContracts.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label><label className="text-sm font-medium">Solicitante<div className="relative">{requesterOpen && customerId ? <div role="listbox" aria-label="Solicitantes encontrados" className="absolute left-0 right-0 top-0 z-30 max-h-56 overflow-y-auto rounded-lg border border-slate-300 bg-white shadow-lg"><input autoFocus aria-label="Buscar solicitante" value={requesterSearch} onChange={(event) => { setRequesterSearch(event.target.value); setRequesterId(""); }} placeholder="Buscar nome, e-mail ou polo" className="w-full border-b border-slate-200 p-2.5 text-sm" />{visibleRequesters.map((item) => { const polo = locations.find((location) => location.id === item.location_id); const email = requesterEmails.find((entry) => entry.collaborator_id === item.id)?.email; return <button type="button" role="option" aria-selected={requesterId === item.id} key={item.id} className="block w-full px-3 py-2 text-left text-sm hover:bg-sky-50" onClick={() => { setRequesterId(item.id); setRequesterSearch(item.full_name); setRequesterOpen(false); }}>{item.full_name}{email ? ` · ${email}` : ""}{polo ? ` · Polo: ${polo.name}` : ""}</button>; })}{!visibleRequesters.length ? <p className="px-3 py-3 text-sm text-slate-500">Nenhum solicitante encontrado.</p> : null}</div> : <button type="button" aria-label="Selecionar solicitante" onClick={() => customerId && setRequesterOpen(true)} disabled={!customerId} className={`${field} text-left ${requesterId ? "text-slate-900" : "text-slate-500"}`}>{requesterId ? (visibleRequesters.find((item) => item.id === requesterId)?.full_name ?? requesterSearch) : "Não identificado"}</button>}</div><input type="hidden" name="requesterCollaboratorId" value={requesterId}/><small className="mt-1 block font-normal text-slate-500">O polo do solicitante é apenas uma sugestão; a localidade de execução é selecionada separadamente.</small></label><label className="text-sm font-medium">Departamento<select name="departmentUnitId" defaultValue="" className={field}><option value="">Não definido</option>{departments.filter((item) => item.organization_id === organizationId && (!customerId || item.customer_id === customerId)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
            {customerId && !customerCollaborators.length && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">Nenhum solicitante ativo vinculado a esta empresa. Cadastros antigos sem empresa não são exibidos para evitar acesso cruzado. <Link href="/portal/collaborators" className="font-semibold underline">Regularizar solicitantes</Link>.</p>}
            <label className="block text-sm font-medium">Assunto *<input name="title" required minLength={5} maxLength={240} defaultValue={selected?.offering.name} className={field} /><small className="mt-1 block font-normal text-slate-500">Mínimo de 5 caracteres.</small></label><label className="block text-sm font-medium">Descrição *<textarea name="description" required minLength={10} maxLength={10000} rows={6} placeholder="Descreva o problema e as informações úteis ao atendimento." className={field} /><small className="mt-1 block font-normal text-slate-500">Mínimo de 10 caracteres para orientar o atendimento.</small></label><label className="block text-sm font-medium">Telefone de contato com o cliente<input name="requesterContactPhone" inputMode="tel" placeholder="(11) 99999-8888" className={field} /><small className="mt-1 block font-normal text-slate-500">Telefone usado pelo técnico durante o atendimento.</small></label>
            <label className="block text-sm font-medium">Fotos para orientar o atendimento<input name="attachments" type="file" accept="image/jpeg,image/png,image/webp" multiple className={`${field} file:mr-3 file:rounded-md file:border-0 file:bg-sky-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold`} /><small className="mt-1 block font-normal text-slate-500">Opcional · até 5 fotos de 4 MB. Elas serão exibidas na OS do técnico.</small></label>
            <div className="grid gap-4 sm:grid-cols-3"><label className="text-sm font-medium">Impacto<select name="impact" value={impact} onChange={(e) => setImpact(e.target.value as typeof impact)} className={field}><option value="LOW">Baixo</option><option value="MEDIUM">Médio</option><option value="HIGH">Alto</option></select></label><label className="text-sm font-medium">Urgência<select name="urgency" value={urgency} onChange={(e) => setUrgency(e.target.value as typeof urgency)} className={field}><option value="LOW">Baixa</option><option value="MEDIUM">Média</option><option value="HIGH">Alta</option></select></label><label className="text-sm font-medium">SLA<select name="slaPolicyId" required={Boolean(eligibleSlaPolicies.length)} className={field} disabled={!eligibleSlaPolicies.length}><option value="">{eligibleSlaPolicies.length ? "Selecione o SLA" : "Nenhum SLA habilitado"}</option>{eligibleSlaPolicies.map((sla) => <option key={sla.id} value={sla.id}>{sla.name ?? `SLA P${sla.priority}`} · {sla.duration_value ? `${sla.duration_value} ${sla.duration_unit === "HOURS" ? "h" : sla.duration_unit === "DAYS" ? "dias" : "min"}` : `${sla.resolution_minutes} min`}</option>)}</select><small className="mt-1 block font-normal text-slate-500">Prioridade calculada: P{selectedPriority}</small></label></div>
          </div><footer className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 sm:px-7"><button type="button" onClick={() => setStep("catalog")} className="text-sm font-semibold text-slate-700">← Voltar ao catálogo</button><div className="flex items-center gap-3"><span className="text-xs text-slate-500" aria-live="polite">{!organizationId ? "Selecione a organização" : !customerId ? "Selecione o cliente" : !locationId ? "Selecione a localidade" : ""}</span><SubmitButton disabled={!organizationId || !offeringId || !customerId || !locationId} /></div></footer>
        </form>}
      </section>
    </div>}
  </>;
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={disabled || pending} className="rounded-lg bg-sky-950 px-5 py-2.5 text-sm font-semibold text-white disabled:bg-slate-300">{pending ? "Salvando…" : "Salvar chamado"}</button>;
}


