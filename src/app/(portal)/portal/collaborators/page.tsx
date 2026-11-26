import { requireUser } from "@/lib/auth/current-user";
import {
  addCollaboratorAlias,
  assignCollaboratorOrganization,
  createCollaborator,
  createOrganizationUnit,
  updateOrganizationUnit,
  updateCollaborator,
  verifyCollaboratorAlias,
} from "./actions";
import { OneitPageHeader } from "@/components/oneit";
import { NewRequesterForm } from "./new-requester-form";

type PageProps = { searchParams: Promise<{ message?: string; q?: string; customerId?: string; locationId?: string; status?: string }> };
const collaboratorStatusLabel: Record<string, string> = { ACTIVE: "Ativo", INACTIVE: "Inativo" };

export default async function CollaboratorsPage({ searchParams }: PageProps) {
  const [{ supabase, user }, params] = await Promise.all([requireUser(), searchParams]);
  const { message } = params;
  const { data: roles } = await supabase
    .from("user_roles")
    .select("organization_id,role")
    .eq("user_id", user.id)
    .in("role", ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER", "AUDITOR"]);
  const organizationIds = [...new Set((roles ?? []).map((role) => role.organization_id))];
  const canManage = (roles ?? []).some((role) => ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER"].includes(role.role));
  const canVerifyAlias = (roles ?? []).some((role) => ["SUPER_ADMIN", "ORG_ADMIN"].includes(role.role));

  const [{ data: organizations }, { data: customers }, { data: collaborators }, { data: units }, { data: aliases }, { data: rawLocations }] = await Promise.all([
    supabase.from("organizations").select("id,display_name").in("id", organizationIds).order("display_name"),
    supabase.from("customers").select("id,organization_id,name").in("organization_id", organizationIds).order("name"),
    supabase
      .from("collaborators")
      .select("id,organization_id,customer_id,employee_number,full_name,status,phone,location_id,department_unit_id,created_at")
      .in("organization_id", organizationIds)
      .order("full_name"),
    supabase
      .from("organization_units")
      .select("id,organization_id,customer_id,unit_type,code,name,active")
      .in("organization_id", organizationIds)
      .order("name"),
    supabase
      .from("collaborator_email_aliases")
      .select("id,collaborator_id,email,is_primary,verified_at,active")
      .in("organization_id", organizationIds)
      .eq("active", true)
      .order("email"),
    supabase.from("customer_locations").select("id,organization_id,name,city").in("organization_id", organizationIds).eq("active", true).order("name"),
  ]);

  const locations = rawLocations ?? [];
  const departments = (units ?? []).filter((unit) => unit.unit_type === "DEPARTMENT");
  const filteredCollaborators = (collaborators ?? []).filter((item) => {
    const q = params.q?.trim().toLowerCase();
    const email = (aliases ?? []).find((alias) => alias.collaborator_id === item.id)?.email ?? "";
    return (!q || item.full_name.toLowerCase().includes(q) || item.employee_number.toLowerCase().includes(q) || email.includes(q) || (customers ?? []).find((customer) => customer.id === item.customer_id)?.name.toLowerCase().includes(q) || locations.find((location) => location.id === item.location_id)?.name.toLowerCase().includes(q)) &&
      (!params.customerId || item.customer_id === params.customerId) &&
      (!params.locationId || item.location_id === params.locationId) && (!params.status || item.status === params.status);
  });
  const primaryEmail = new Map(
    (aliases ?? []).filter((alias) => alias.is_primary).map((alias) => [alias.collaborator_id, alias.email]),
  );
  const pendingAliases = (aliases ?? []).filter((alias) => !alias.verified_at);

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8">
      <OneitPageHeader eyebrow="Configurações · Organização" title="Solicitantes e colaboradores" description="Cadastre pessoas, e-mails e vínculos organizacionais usados na abertura e no acompanhamento dos chamados." />

      {message ? <p role="status" className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">{message}</p> : null}

      {!canManage ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Seu perfil possui acesso somente de consulta a esta área.
        </p>
      ) : (
        <section className="grid gap-4 xl:grid-cols-3">
          <NewRequesterForm customers={customers ?? []} departments={departments} locations={locations} collaborators={collaborators ?? []} />

          <form action={createOrganizationUnit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-slate-950">Novo departamento</h2>
            <select name="customerId" required aria-label="Cliente do departamento" className="w-full rounded border border-slate-300 bg-white p-2 text-sm text-slate-900"><option value="">Cliente</option>{(customers ?? []).map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select>
            <input name="name" required maxLength={180} placeholder="Nome do departamento" aria-label="Nome do departamento" className="w-full rounded border border-slate-300 bg-white p-2 text-sm text-slate-900" />
            <p className="text-xs text-slate-500">O departamento ficará vinculado ao cliente selecionado.</p>
            <button className="rounded bg-sky-950 px-3 py-2 text-sm font-semibold text-white">Criar departamento</button>
          </form>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"><strong className="text-slate-900">Vínculos no cadastro</strong><p className="mt-1">O e-mail principal, o polo e o gestor imediato são definidos no cadastro do solicitante. E-mails adicionais não são necessários para a operação.</p></div>
        </section>
      )}

      <form className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_220px_220px_180px_auto]" method="get"><input name="q" defaultValue={params.q ?? ""} placeholder="Buscar por nome, e-mail, empresa ou polo" className="rounded border border-slate-300 bg-white p-2 text-sm text-slate-900"/><select name="customerId" defaultValue={params.customerId ?? ""} className="rounded border border-slate-300 bg-white p-2 text-sm text-slate-900"><option value="">Todas as empresas</option>{(customers ?? []).map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select><select name="locationId" defaultValue={params.locationId ?? ""} className="rounded border border-slate-300 bg-white p-2 text-sm text-slate-900"><option value="">Todos os polos</option>{(locations ?? []).filter((location) => !params.customerId || (collaborators ?? []).some((item) => item.customer_id === params.customerId && item.location_id === location.id)).map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select><select name="status" defaultValue={params.status ?? ""} className="rounded border border-slate-300 bg-white p-2 text-sm text-slate-900"><option value="">Todos os status</option><option value="ACTIVE">Ativos</option><option value="INACTIVE">Inativos</option></select><button className="rounded bg-sky-950 px-3 py-2 text-sm font-semibold text-white">Filtrar</button></form>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="font-semibold text-slate-950">Departamentos cadastrados</h2><p className="mt-1 text-sm text-slate-500">Cada departamento aparece vinculado à empresa cliente e pode ser editado ou inativado.</p><div className="mt-3 divide-y divide-slate-200">{departments.map((unit) => <details key={unit.id} className="py-3"><summary className="cursor-pointer font-medium text-slate-800">{unit.name} · {(customers ?? []).find((customer) => customer.id === unit.customer_id)?.name ?? "Empresa não identificada"} <span className="ml-2 text-xs text-slate-500">{unit.active ? "Ativo" : "Inativo"}</span></summary><form action={updateOrganizationUnit} className="mt-3 grid gap-2 sm:grid-cols-[1fr_180px_auto]"><input type="hidden" name="unitId" value={unit.id} /><input name="name" defaultValue={unit.name} aria-label="Nome do departamento" className="rounded border border-slate-300 p-2 text-sm" /><select name="active" defaultValue={unit.active ? "true" : "false"} aria-label="Status do departamento" className="rounded border border-slate-300 p-2 text-sm"><option value="true">Ativo</option><option value="false">Inativo</option></select><button className="rounded bg-sky-950 px-3 py-2 text-sm font-semibold text-white">Salvar alteração</button></form></details>)}{!departments.length && <p className="py-5 text-sm text-slate-500">Nenhum departamento cadastrado.</p>}</div></section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap gap-4 text-sm text-slate-600"><span>Total: <strong>{collaborators?.length ?? 0}</strong></span><span>Ativos: <strong>{(collaborators ?? []).filter((item) => item.status === "ACTIVE").length}</strong></span><span>Inativos: <strong>{(collaborators ?? []).filter((item) => item.status === "INACTIVE").length}</strong></span></div><h2 className="font-semibold text-slate-950">Solicitantes cadastrados</h2>
        <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="p-2">Nome</th><th className="p-2">Departamento</th><th className="p-2">Polo</th><th className="p-2">E-mail principal</th><th className="p-2">Status</th><th className="p-2">Ação</th></tr></thead><tbody>{filteredCollaborators.map((collaborator) => <tr key={collaborator.id} className="border-t border-slate-200 text-slate-700"><td className="p-2">{collaborator.full_name}</td><td className="p-2">{departments.find((department) => department.id === collaborator.department_unit_id)?.name ?? "—"}</td><td className="p-2">{locations.find((location) => location.id === collaborator.location_id)?.name ?? "—"}</td><td className="p-2">{primaryEmail.get(collaborator.id) ?? "—"}</td><td className="p-2">{collaboratorStatusLabel[collaborator.status] ?? collaborator.status}</td><td className="p-2"><details><summary className="cursor-pointer text-sky-900">Editar solicitante</summary><form action={updateCollaborator} className="mt-2 grid min-w-64 gap-2 rounded border border-slate-200 bg-slate-50 p-3"><input type="hidden" name="collaboratorId" value={collaborator.id} /><input type="hidden" name="organizationId" value={collaborator.organization_id} /><input type="hidden" name="employeeNumber" value={collaborator.employee_number ?? ""} /><input name="fullName" required maxLength={240} defaultValue={collaborator.full_name} aria-label="Nome completo" className="rounded border border-slate-300 bg-white p-2 text-sm text-slate-900" /><select name="status" defaultValue={collaborator.status} aria-label="Status" className="rounded border border-slate-300 bg-white p-2 text-sm text-slate-900"><option value="ACTIVE">Ativo</option><option value="INACTIVE">Inativo</option></select><textarea name="inactiveReason" minLength={3} placeholder="Motivo (obrigatório ao inativar)" aria-label="Motivo da inativação" className="rounded border border-slate-300 bg-white p-2 text-sm text-slate-900" /><button className="rounded bg-sky-950 px-3 py-2 text-sm font-semibold text-white">Salvar</button></form></details></td></tr>)}</tbody></table></div>
      </section>

      {pendingAliases.length > 0 ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="font-semibold text-amber-950">E-mails aguardando verificação</h2>
          <ul className="mt-3 space-y-2">{pendingAliases.map((alias) => <li key={alias.id} className="flex flex-wrap items-center justify-between gap-3 rounded bg-white p-2 text-sm text-slate-700"><span>{alias.email}</span>{canVerifyAlias ? <form action={verifyCollaboratorAlias}><input type="hidden" name="aliasId" value={alias.id} /><button className="rounded border border-amber-600 px-2 py-1 text-amber-950">Confirmar verificação manual</button></form> : <span className="text-xs text-amber-800">Aguardando administrador</span>}</li>)}</ul>
        </section>
      ) : null}
    </main>
  );
}
