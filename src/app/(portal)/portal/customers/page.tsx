import { listAvailableOrganizations } from "@/lib/organizations/queries";
import { requireUser } from "@/lib/auth/current-user";

import { createCustomer } from "./actions";
import { OneitButton, OneitEmptyState, OneitPageHeader } from "@/components/oneit";

type PageProps = { searchParams: Promise<{ message?: string }> };

export default async function CustomersPage({ searchParams }: PageProps) {
  const [{ supabase }, organizations, { message }] = await Promise.all([requireUser(), listAvailableOrganizations(), searchParams]);
  const organizationIds = organizations.map((organization) => organization.id);
  const { data: customers } = organizationIds.length
    ? await supabase.from("customers").select("id, name, external_code, organization_id").in("organization_id", organizationIds).order("name")
    : { data: [] };

  return (
    <section className="mx-auto max-w-4xl p-8">
      <OneitPageHeader eyebrow="Cadastros" title="Clientes" description="Organizações e códigos externos utilizados na operação." />
      {message ? <p className="mt-4 rounded bg-sky-100 p-3 text-sm text-sky-900">{message}</p> : null}
      <form action={createCustomer} className="mt-6 grid gap-3 rounded-xl border bg-white p-5 sm:grid-cols-2">
        <select className="rounded border p-2" name="organizationId" required defaultValue="">
          <option disabled value="">Organização</option>
          {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.display_name}</option>)}
        </select>
        <input className="rounded border p-2" name="name" placeholder="Nome do cliente" required />
        <input className="rounded border p-2" name="externalCode" placeholder="Código externo (opcional)" />
        <OneitButton type="submit">Cadastrar cliente</OneitButton>
      </form>
      {customers?.length ? <ul className="mt-6 divide-y rounded-xl border bg-white">{customers.map((customer) => <li className="p-4" key={customer.id}><strong>{customer.name}</strong><span className="ml-2 text-sm text-slate-500">{customer.external_code ?? "Sem código externo"}</span></li>)}</ul> : <div className="mt-6"><OneitEmptyState title="Nenhum cliente cadastrado" description="Cadastre o primeiro cliente para começar a operação." /></div>}
    </section>
  );
}
