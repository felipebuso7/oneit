import { requireUser } from "@/lib/auth/current-user";
import {
  addCollaboratorAlias,
  assignCollaboratorOrganization,
  createCollaborator,
  createOrganizationUnit,
  updateCollaborator,
  verifyCollaboratorAlias,
} from "./actions";
import { OneitPageHeader } from "@/components/oneit";

type PageProps = { searchParams: Promise<{ message?: string }> };
const collaboratorStatusLabel: Record<string, string> = { ACTIVE: "Ativo", INACTIVE: "Inativo" };

export default async function CollaboratorsPage({ searchParams }: PageProps) {
  const [{ supabase, user }, { message }] = await Promise.all([requireUser(), searchParams]);
  const { data: roles } = await supabase
    .from("user_roles")
    .select("organization_id,role")
    .eq("user_id", user.id)
    .in("role", ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER", "AUDITOR"]);
  const organizationIds = [...new Set((roles ?? []).map((role) => role.organization_id))];
  const canManage = (roles ?? []).some((role) => ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER"].includes(role.role));
  const canVerifyAlias = (roles ?? []).some((role) => ["SUPER_ADMIN", "ORG_ADMIN"].includes(role.role));

  const [{ data: organizations }, { data: collaborators }, { data: units }, { data: aliases }, { data: locations }] = await Promise.all([
    supabase.from("organizations").select("id,display_name").in("id", organizationIds).order("display_name"),
    supabase
      .from("collaborators")
      .select("id,organization_id,employee_number,full_name,status,created_at")
      .in("organization_id", organizationIds)
      .order("full_name"),
    supabase
      .from("organization_units")
      .select("id,organization_id,unit_type,code,name")
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
          <form action={createCollaborator} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-slate-950">Novo colaborador</h2>
            <select name="organizationId" required aria-label="Organização do colaborador" className="w-full rounded border border-slate-300 bg-white p-2 text-sm text-slate-900">
              <option value="">Organização</option>
              {(organizations ?? []).map((organization) => <option key={organization.id} value={organization.id}>{organization.display_name}</option>)}
            </select>
            <input name="employeeNumber" required maxLength={80} placeholder="Matrícula" aria-label="Matrícula" className="w-full rounded border border-slate-300 bg-white p-2 text-sm text-slate-900" />
            <input name="fullName" required maxLength={180} placeholder="Nome completo" aria-label="Nome completo" className="w-full rounded border border-slate-300 bg-white p-2 text-sm text-slate-900" />
            <input name="phone" maxLength={30} placeholder="Telefone de contato" aria-label="Telefone de contato" className="w-full rounded border border-slate-300 bg-white p-2 text-sm text-slate-900" />
            <select name="locationId" aria-label="Polo do solicitante" className="w-full rounded border border-slate-300 bg-white p-2 text-sm text-slate-900"><option value="">Polo / localidade</option>{(locations ?? []).map((location) => <option key={location.id} value={location.id}>{location.name} · {location.city}</option>)}</select>
            <select name="managerCollaboratorId" aria-label="Gestor imediato" className="w-full rounded border border-slate-300 bg-white p-2 text-sm text-slate-900"><option value="">Gestor imediato</option>{(collaborators ?? []).map((collaborator) => <option key={collaborator.id} value={collaborator.id}>{collaborator.full_name}</option>)}</select>
            <input name="primaryEmail" type="email" maxLength={320} placeholder="E-mail principal (opcional)" aria-label="E-mail principal" className="w-full rounded border border-slate-300 bg-white p-2 text-sm text-slate-900" />
            <button className="rounded bg-sky-950 px-3 py-2 text-sm font-semibold text-white">Cadastrar</button>
          </form>

          <form action={createOrganizationUnit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-slate-950">Nova unidade</h2>
            <select name="organizationId" required aria-label="Organização da unidade" className="w-full rounded border border-slate-300 bg-white p-2 text-sm text-slate-900">
              <option value="">Organização</option>
              {(organizations ?? []).map((organization) => <option key={organization.id} value={organization.id}>{organization.display_name}</option>)}
            </select>
            <select name="type" required aria-label="Tipo da unidade" className="w-full rounded border border-slate-300 bg-white p-2 text-sm text-slate-900">
              <option value="COMPANY">Empresa</option><option value="DEPARTMENT">Departamento</option><option value="COST_CENTER">Centro de custo</option><option value="WORK_SITE">Local de trabalho</option>
            </select>
            <input name="code" required maxLength={80} placeholder="Código" aria-label="Código da unidade" className="w-full rounded border border-slate-300 bg-white p-2 text-sm text-slate-900" />
            <input name="name" required maxLength={180} placeholder="Nome" aria-label="Nome da unidade" className="w-full rounded border border-slate-300 bg-white p-2 text-sm text-slate-900" />
            <button className="rounded bg-sky-950 px-3 py-2 text-sm font-semibold text-white">Criar unidade</button>
          </form>

          <form action={addCollaboratorAlias} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-slate-950">E-mail adicional</h2>
            <select name="collaboratorId" required aria-label="Colaborador do e-mail adicional" className="w-full rounded border border-slate-300 bg-white p-2 text-sm text-slate-900">
              <option value="">Colaborador</option>
              {(collaborators ?? []).map((collaborator) => <option key={collaborator.id} value={collaborator.id}>{collaborator.full_name}</option>)}
            </select>
            <input name="email" type="email" required maxLength={320} placeholder="email@empresa.com" aria-label="E-mail adicional" className="w-full rounded border border-slate-300 bg-white p-2 text-sm text-slate-900" />
            <label className="flex items-center gap-2 text-sm text-slate-700"><input name="isPrimary" type="checkbox" value="true" /> Definir como e-mail principal</label>
            <button className="rounded bg-sky-950 px-3 py-2 text-sm font-semibold text-white">Adicionar e-mail</button>
          </form>
        </section>
      )}

      {canManage ? (
        <form action={assignCollaboratorOrganization} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-5">
          <select name="collaboratorId" required aria-label="Colaborador" className="rounded border border-slate-300 bg-white p-2 text-sm text-slate-900"><option value="">Colaborador</option>{(collaborators ?? []).map((collaborator) => <option key={collaborator.id} value={collaborator.id}>{collaborator.full_name}</option>)}</select>
          <select name="departmentUnitId" aria-label="Departamento" className="rounded border border-slate-300 bg-white p-2 text-sm text-slate-900"><option value="">Departamento</option>{(units ?? []).filter((unit) => unit.unit_type === "DEPARTMENT").map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select>
          <select name="costCenterUnitId" aria-label="Centro de custo" className="rounded border border-slate-300 bg-white p-2 text-sm text-slate-900"><option value="">Centro de custo</option>{(units ?? []).filter((unit) => unit.unit_type === "COST_CENTER").map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select>
          <input name="startsOn" type="date" required aria-label="Início do vínculo" className="rounded border border-slate-300 bg-white p-2 text-sm text-slate-900" />
          <button className="rounded bg-sky-950 px-3 py-2 text-sm font-semibold text-white">Registrar vínculo</button>
        </form>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-slate-950">Colaboradores cadastrados</h2>
        <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="p-2">Nome</th><th className="p-2">Matrícula</th><th className="p-2">E-mail principal</th><th className="p-2">Status</th><th className="p-2">Ação</th></tr></thead><tbody>{(collaborators ?? []).map((collaborator) => <tr key={collaborator.id} className="border-t border-slate-200 text-slate-700"><td className="p-2">{collaborator.full_name}</td><td className="p-2">{collaborator.employee_number}</td><td className="p-2">{primaryEmail.get(collaborator.id) ?? "—"}</td><td className="p-2">{collaboratorStatusLabel[collaborator.status] ?? collaborator.status}</td><td className="p-2"><details><summary className="cursor-pointer text-sky-900">Editar</summary><form action={updateCollaborator} className="mt-2 grid min-w-64 gap-2 rounded border border-slate-200 bg-slate-50 p-3"><input type="hidden" name="collaboratorId" value={collaborator.id} /><input type="hidden" name="organizationId" value={collaborator.organization_id} /><input name="fullName" required maxLength={240} defaultValue={collaborator.full_name} aria-label="Nome completo" className="rounded border border-slate-300 bg-white p-2 text-sm text-slate-900" /><input name="employeeNumber" required maxLength={100} defaultValue={collaborator.employee_number} aria-label="Matrícula" className="rounded border border-slate-300 bg-white p-2 text-sm text-slate-900" /><select name="status" defaultValue={collaborator.status} aria-label="Status" className="rounded border border-slate-300 bg-white p-2 text-sm text-slate-900"><option value="ACTIVE">Ativo</option><option value="INACTIVE">Inativo</option></select><button className="rounded bg-sky-950 px-3 py-2 text-sm font-semibold text-white">Salvar</button></form></details></td></tr>)}</tbody></table></div>
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
