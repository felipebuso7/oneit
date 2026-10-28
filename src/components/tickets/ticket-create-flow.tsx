"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { createTicket } from "@/app/(portal)/portal/tickets/actions";

type Props = {
  organizations: { id: string; display_name: string }[];
  customers: { id: string; organization_id: string; name: string }[];
  contracts: { id: string; organization_id: string; customer_id: string; code: string; name: string }[];
  locations: { id: string; organization_id: string; customer_id: string; name: string; city: string }[];
  categories: { id: string; organization_id: string; name: string }[];
  subcategories: { id: string; category_id: string; name: string }[];
  offerings: { id: string; subcategory_id: string; code: string; name: string }[];
  collaborators: { id: string; organization_id: string; full_name: string }[];
  departments: { id: string; organization_id: string; name: string }[];
};

export function TicketCreateFlow(props: Props) {
  const { organizations, customers, contracts, locations, categories, subcategories, offerings, collaborators, departments } = props;
  const [step, setStep] = useState<"closed" | "catalog" | "form">("closed");
  const [organizationId, setOrganizationId] = useState(organizations.length === 1 ? organizations[0].id : "");
  const [customerId, setCustomerId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [search, setSearch] = useState("");
  const [offeringId, setOfferingId] = useState("");
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
  const customerContracts = contracts.filter((item) => item.organization_id === organizationId && item.customer_id === customerId);

  return <>
    <button type="button" onClick={() => setStep("catalog")} className="rounded-lg bg-sky-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-900">+ Novo chamado</button>
    {step !== "closed" && <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/45" onMouseDown={(event) => { if (event.target === event.currentTarget) setStep("closed"); }}>
      <section role="dialog" aria-modal="true" aria-label={step === "catalog" ? "Catálogo para novo chamado" : "Preenchimento do chamado"} className="flex h-full w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-7"><div><p className="text-xs font-semibold uppercase tracking-wider text-sky-800">Novo chamado · {step === "catalog" ? "1 de 2" : "2 de 2"}</p><h2 className="mt-1 text-xl font-semibold">{step === "catalog" ? "Escolha o serviço" : "Dados da solicitação"}</h2></div><button type="button" onClick={() => setStep("closed")} aria-label="Fechar" className="rounded-lg px-3 py-2 text-lg hover:bg-slate-100">×</button></header>
        {step === "catalog" ? <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
          <p className="text-sm text-slate-600">Selecione um serviço do catálogo antes de preencher a solicitação.</p>
          {organizations.length > 1 && <label className="mt-5 block text-sm font-medium">Organização<select aria-label="Organização do catálogo" value={organizationId} onChange={(event) => { setOrganizationId(event.target.value); setCategoryId(""); }} className={field}><option value="">Selecione</option>{organizations.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}</select></label>}
          <label className="mt-5 block text-sm font-medium">Buscar serviço<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome ou código" className={field} /></label>
          <div className="mt-5 flex flex-wrap gap-2" aria-label="Categorias"><button type="button" aria-pressed={!categoryId} onClick={() => setCategoryId("")} className={`rounded-full px-3 py-1.5 text-sm ${!categoryId ? "bg-sky-950 text-white" : "bg-slate-100"}`}>Todos</button>{categories.filter((item) => item.organization_id === organizationId).map((item) => <button key={item.id} type="button" aria-pressed={categoryId === item.id} onClick={() => setCategoryId(item.id)} className={`rounded-full px-3 py-1.5 text-sm ${categoryId === item.id ? "bg-sky-950 text-white" : "bg-slate-100"}`}>{item.name}</button>)}</div>
          <div className="mt-5 divide-y divide-slate-200 rounded-xl border border-slate-200">{visible.map((item) => <button key={item.offering.id} type="button" onClick={() => { setOfferingId(item.offering.id); setStep("form"); }} className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-sky-50"><span><strong className="block text-sm">{item.offering.name}</strong><small className="text-slate-600">{item.category.name} · {item.subcategory?.name} · {item.offering.code}</small></span><span aria-hidden>→</span></button>)}{!visible.length && <p className="p-5 text-sm text-slate-600">Nenhum serviço disponível. <Link href="/portal/service-catalog" className="font-semibold text-sky-900 underline">Abrir catálogo</Link></p>}</div>
        </div> : <form action={createTicket} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 sm:p-7">
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm"><span className="text-slate-600">Serviço selecionado</span><strong className="mt-1 block">{selected?.offering.name}</strong><small>{selected?.category.name} · {selected?.subcategory?.name}</small></div>
            <input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="serviceOfferingId" value={offeringId} />
            <label className="block text-sm font-semibold">Chamado do cliente (ServiceNow)<span className="ml-1 font-normal text-slate-500">opcional</span><input name="servicenowNumber" maxLength={160} placeholder="Ex.: INC0012345" className={field} /><small className="mt-1 block font-normal text-slate-500">A referência externa ficará vinculada ao número interno gerado pelo OneIT.</small></label>
            <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Cliente *<select name="customerId" required value={customerId} onChange={(event) => { setCustomerId(event.target.value); setLocationId(""); }} className={field}><option value="">Selecione</option>{orgCustomers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-sm font-medium">Localidade *<select key={customerId} name="locationId" required value={locationId} onChange={(event) => setLocationId(event.target.value)} disabled={!customerId} className={field}><option value="">Selecione</option>{customerLocations.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.city}</option>)}</select></label><label className="text-sm font-medium">Tipo *<select name="ticketType" defaultValue="INCIDENT" className={field}><option value="INCIDENT">Incidente</option><option value="SERVICE_REQUEST">Solicitação de serviço</option><option value="ACCESS_REQUEST">Solicitação de acesso</option><option value="PREVENTIVE">Preventivo</option><option value="CONSULTATION">Consulta</option><option value="EVENT">Evento convertido</option></select></label><label className="text-sm font-medium">Contrato<select key={customerId} name="contractId" defaultValue="" disabled={!customerId} className={field}><option value="">Sem contrato</option>{customerContracts.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label><label className="text-sm font-medium">Solicitante<select name="requesterCollaboratorId" defaultValue="" className={field}><option value="">Não identificado</option>{collaborators.filter((item) => item.organization_id === organizationId).map((item) => <option key={item.id} value={item.id}>{item.full_name}</option>)}</select></label><label className="text-sm font-medium">Departamento<select name="departmentUnitId" defaultValue="" className={field}><option value="">Não definido</option>{departments.filter((item) => item.organization_id === organizationId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
            {!collaborators.some((item) => item.organization_id === organizationId) && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">Nenhum solicitante ativo nesta organização. <Link href="/portal/collaborators" className="font-semibold underline">Cadastrar solicitante</Link> para vinculá-lo ao chamado.</p>}
            <label className="block text-sm font-medium">Assunto *<input name="title" required minLength={5} maxLength={240} defaultValue={selected?.offering.name} className={field} /><small className="mt-1 block font-normal text-slate-500">Mínimo de 5 caracteres.</small></label><label className="block text-sm font-medium">Descrição *<textarea name="description" required minLength={10} maxLength={10000} rows={6} placeholder="Descreva o problema e as informações úteis ao atendimento." className={field} /><small className="mt-1 block font-normal text-slate-500">Mínimo de 10 caracteres para orientar o atendimento.</small></label>
            <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Impacto<select name="impact" defaultValue="LOW" className={field}><option value="LOW">Baixo</option><option value="MEDIUM">Médio</option><option value="HIGH">Alto</option></select></label><label className="text-sm font-medium">Urgência<select name="urgency" defaultValue="LOW" className={field}><option value="LOW">Baixa</option><option value="MEDIUM">Média</option><option value="HIGH">Alta</option></select></label></div>
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
