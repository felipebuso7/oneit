import { listAvailableOrganizations } from "@/lib/organizations/queries";

import { updateOrganization } from "./actions";
import { OneitButton, OneitEmptyState, OneitPageHeader } from "@/components/oneit";

type PageProps = { searchParams: Promise<{ message?: string }> };

export default async function OrganizationsPage({ searchParams }: PageProps) {
  const [organizations, { message }] = await Promise.all([listAvailableOrganizations(), searchParams]);

  return (
    <section className="mx-auto max-w-4xl p-8">
      <OneitPageHeader eyebrow="Administração" title="Organizações" description="Dados institucionais utilizados para separar a operação e as permissões." />
      {message ? <p className="mt-4 rounded bg-sky-100 p-3 text-sm text-sky-900">{message}</p> : null}
      {!organizations.length ? <div className="mt-6"><OneitEmptyState title="Nenhuma organização disponível" description="Seu perfil ainda não possui uma organização autorizada." /></div> : null}
      <div className="mt-6 space-y-4">
        {organizations.map((organization) => (
          <form action={updateOrganization} className="rounded-xl border bg-white p-5 shadow-sm" key={organization.id}>
            <input name="id" type="hidden" value={organization.id} />
            <label className="block text-sm font-medium">Nome de exibição</label>
            <input className="mt-1 w-full rounded border p-2" defaultValue={organization.display_name} name="displayName" required />
            <label className="mt-4 block text-sm font-medium">Razão social</label>
            <input className="mt-1 w-full rounded border p-2" defaultValue={organization.legal_name} name="legalName" required />
            <OneitButton className="mt-4" type="submit">Salvar</OneitButton>
          </form>
        ))}
      </div>
    </section>
  );
}
