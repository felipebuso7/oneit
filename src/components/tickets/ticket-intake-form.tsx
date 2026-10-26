"use client";

import { useMemo, useState } from "react";

import { createTicket } from "@/app/(portal)/portal/tickets/actions";

type Organization = { id: string; display_name: string };
type Customer = { id: string; organization_id: string; name: string };
type Contract = { id: string; organization_id: string; customer_id: string; code: string; name: string };
type Location = { id: string; organization_id: string; customer_id: string; name: string; city: string };
type Category = { id: string; organization_id: string; name: string };
type Subcategory = { id: string; category_id: string; name: string };
type Offering = { id: string; subcategory_id: string; code: string; name: string };
type Collaborator = { id: string; organization_id: string; full_name: string };
type Department = { id: string; organization_id: string; name: string };

export function TicketIntakeForm({ organizations, customers, contracts, locations, categories, subcategories, offerings, collaborators, departments }: {
  organizations: Organization[]; customers: Customer[]; contracts: Contract[]; locations: Location[];
  categories: Category[]; subcategories: Subcategory[]; offerings: Offering[]; collaborators: Collaborator[]; departments: Department[];
}) {
  const [organizationId, setOrganizationId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const organizationOfferings = useMemo(() => offerings.filter((offering) => {
    const subcategory = subcategories.find((item) => item.id === offering.subcategory_id);
    const category = subcategory ? categories.find((item) => item.id === subcategory.category_id) : undefined;
    return category?.organization_id === organizationId;
  }), [categories, offerings, organizationId, subcategories]);
  const categoryById = useMemo(() => new Map(categories.map((item) => [item.id, item])), [categories]);
  const subcategoryById = useMemo(() => new Map(subcategories.map((item) => [item.id, item])), [subcategories]);
  const organizationCustomers = customers.filter((item) => item.organization_id === organizationId);
  const customerContracts = contracts.filter((item) => item.organization_id === organizationId && item.customer_id === customerId);
  const customerLocations = locations.filter((item) => item.organization_id === organizationId && item.customer_id === customerId);
  const organizationCollaborators = collaborators.filter((item) => item.organization_id === organizationId);
  const organizationDepartments = departments.filter((item) => item.organization_id === organizationId);

  return <form action={createTicket} className="mt-6 grid gap-3 rounded-xl border bg-white p-5 sm:grid-cols-2">
    <div className="sm:col-span-2"><h2 className="font-semibold">Novo chamado</h2><p className="mt-1 text-sm text-slate-500">A seleção é encadeada para evitar combinações inválidas entre organização, cliente, contrato, local e serviço.</p></div>
    <select className="rounded border p-2" name="organizationId" required value={organizationId} onChange={(event) => { setOrganizationId(event.target.value); setCustomerId(""); }}><option disabled value="">Organização</option>{organizations.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}</select>
    <select className="rounded border p-2" name="ticketType" required defaultValue="INCIDENT"><option value="INCIDENT">Incidente</option><option value="SERVICE_REQUEST">Requisição de serviço</option><option value="ACCESS_REQUEST">Solicitação de acesso</option><option value="EVENT">Evento convertido</option><option value="PREVENTIVE">Atendimento preventivo</option><option value="CONSULTATION">Consulta</option></select>
    <select className="rounded border p-2" name="customerId" required value={customerId} disabled={!organizationId} onChange={(event) => setCustomerId(event.target.value)}><option disabled value="">Cliente</option>{organizationCustomers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
    <select className="rounded border p-2" name="contractId" defaultValue="" disabled={!customerId}><option value="">Contrato (opcional)</option>{customerContracts.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</select>
    <select className="rounded border p-2" name="requesterCollaboratorId" defaultValue="" disabled={!organizationId}><option value="">Solicitante não identificado</option>{organizationCollaborators.map((item) => <option key={item.id} value={item.id}>{item.full_name}</option>)}</select>
    <select className="rounded border p-2" name="departmentUnitId" defaultValue="" disabled={!organizationId}><option value="">Departamento não definido</option>{organizationDepartments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
    <select className="rounded border p-2" name="locationId" required defaultValue="" disabled={!customerId}><option disabled value="">Localidade</option>{customerLocations.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.city}</option>)}</select>
    <select className="rounded border p-2" name="serviceOfferingId" defaultValue="" disabled={!organizationId}><option value="">Serviço do catálogo (opcional)</option>{organizationOfferings.map((offering) => { const subcategory = subcategoryById.get(offering.subcategory_id); const category = subcategory ? categoryById.get(subcategory.category_id) : undefined; return <option key={offering.id} value={offering.id}>{category?.name ?? "—"} / {subcategory?.name ?? "—"} / {offering.code} — {offering.name}</option>; })}</select>
    <input className="rounded border p-2 sm:col-span-2" name="title" placeholder="Título do chamado" required /><textarea className="min-h-28 rounded border p-2 sm:col-span-2" name="description" placeholder="Descrição e contexto" required />
    <select className="rounded border p-2" name="impact" defaultValue="LOW"><option value="LOW">Impacto baixo</option><option value="MEDIUM">Impacto médio</option><option value="HIGH">Impacto alto</option></select><select className="rounded border p-2" name="urgency" defaultValue="LOW"><option value="LOW">Urgência baixa</option><option value="MEDIUM">Urgência média</option><option value="HIGH">Urgência alta</option></select>
    <button disabled={!customerId} className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300" type="submit">Abrir chamado</button>
  </form>;
}
