import { requireUser } from "@/lib/auth/current-user";
import {
  addCollaboratorAlias,
  assignCollaboratorOrganization,
  createCollaborator,
  createOrganizationUnit,
  verifyCollaboratorAlias,
} from "./actions";

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

  const [{ data: organizations }, { data: collaborators }, { data: units }, { data: aliases }] = await Promise.all([
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
  ]);

  const primaryEmail = new Map(
    (aliases ?? []).filter((alias) => alias.is_primary).map((alias) => [alias.collaborator_id, alias.email]),
  );
  const pendingAliases = (aliases ?? []).filter((alias) => !alias.verified_at);

  return (
    <main className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-400">Identidade organizacional</p>
        <h1 className="mt-1 text-3xl font-bold text-white">Colaboradores e estrutura</h1>
        <p className="mt-2 max-w-3xl text-slate-300">
          Cadastre identidades corporativas, unidades organizacionais e vínculos temporais. E-mails adicionais exigem
          verificação administrativa antes de serem usados por futuras integrações.
        </p>
      </header>

      {message ? <p className="rounded-lg border border-cyan-500/40 bg-cyan-950/40 p-3 text-sm text-cyan-100">{message}</p> : null}

      {!canManage ? (
        <p className="rounded-lg border border-amber-500/40 bg-amber-950/30 p-4 text-sm text-amber-100">
          Seu perfil possui acesso somente de consulta a esta área.
        </p>
      ) : (
        <section className="grid gap-4 xl:grid-cols-3">
          <form action={createCollaborator} className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <h2 className="font-semibold text-white">Novo colaborador</h2>
            <select name="organizationId" required className="w-full rounded bg-slate-800 p-2 text-sm text-white">
              <option value="">Organização</option>
              {(organizations ?? []).map((organization) => <option key={organization.id} value={organization.id}>{organization.display_name}</option>)}
            </select>
            <input name="employeeNumber" required maxLength={80} placeholder="Matrícula" className="w-full rounded bg-slate-800 p-2 text-sm text-white" />
            <input name="fullName" required maxLength={180} placeholder="Nome completo" className="w-full rounded bg-slate-800 p-2 text-sm text-white" />
            <input name="primaryEmail" type="email" maxLength={320} placeholder="E-mail principal (opcional)" className="w-full rounded bg-slate-800 p-2 text-sm text-white" />
            <button className="rounded bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950">Cadastrar</button>
          </form>

          <form action={createOrganizationUnit} className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <h2 className="font-semibold text-white">Nova unidade</h2>
            <select name="organizationId" required className="w-full rounded bg-slate-800 p-2 text-sm text-white">
              <option value="">Organização</option>
              {(organizations ?? []).map((organization) => <option key={organization.id} value={organization.id}>{organization.display_name}</option>)}
            </select>
            <select name="type" required className="w-full rounded bg-slate-800 p-2 text-sm text-white">
              <option value="COMPANY">Empresa</option><option value="DEPARTMENT">Departamento</option><option value="COST_CENTER">Centro de custo</option><option value="WORK_SITE">Local de trabalho</option>
            </select>
            <input name="code" required maxLength={80} placeholder="Código" className="w-full rounded bg-slate-800 p-2 text-sm text-white" />
            <input name="name" required maxLength={180} placeholder="Nome" className="w-full rounded bg-slate-800 p-2 text-sm text-white" />
            <button className="rounded bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950">Criar unidade</button>
          </form>

          <form action={addCollaboratorAlias} className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <h2 className="font-semibold text-white">E-mail adicional</h2>
            <select name="collaboratorId" required className="w-full rounded bg-slate-800 p-2 text-sm text-white">
              <option value="">Colaborador</option>
              {(collaborators ?? []).map((collaborator) => <option key={collaborator.id} value={collaborator.id}>{collaborator.full_name}</option>)}
            </select>
            <input name="email" type="email" required maxLength={320} placeholder="email@empresa.com" className="w-full rounded bg-slate-800 p-2 text-sm text-white" />
            <label className="flex items-center gap-2 text-sm text-slate-200"><input name="isPrimary" type="checkbox" value="true" /> Definir como e-mail principal</label>
            <button className="rounded bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950">Adicionar e-mail</button>
          </form>
        </section>
      )}

      {canManage ? (
        <form action={assignCollaboratorOrganization} className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-5">
          <select name="collaboratorId" required className="rounded bg-slate-800 p-2 text-sm text-white"><option value="">Colaborador</option>{(collaborators ?? []).map((collaborator) => <option key={collaborator.id} value={collaborator.id}>{collaborator.full_name}</option>)}</select>
          <select name="departmentUnitId" className="rounded bg-slate-800 p-2 text-sm text-white"><option value="">Departamento</option>{(units ?? []).filter((unit) => unit.unit_type === "DEPARTMENT").map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select>
          <select name="costCenterUnitId" className="rounded bg-slate-800 p-2 text-sm text-white"><option value="">Centro de custo</option>{(units ?? []).filter((unit) => unit.unit_type === "COST_CENTER").map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select>
          <input name="startsOn" type="date" required className="rounded bg-slate-800 p-2 text-sm text-white" />
          <button className="rounded bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950">Registrar vínculo</button>
        </form>
      ) : null}

      <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
        <h2 className="font-semibold text-white">Colaboradores cadastrados</h2>
        <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-slate-400"><tr><th className="p-2">Nome</th><th className="p-2">Matrícula</th><th className="p-2">E-mail principal</th><th className="p-2">Status</th></tr></thead><tbody>{(collaborators ?? []).map((collaborator) => <tr key={collaborator.id} className="border-t border-slate-800 text-slate-200"><td className="p-2">{collaborator.full_name}</td><td className="p-2">{collaborator.employee_number}</td><td className="p-2">{primaryEmail.get(collaborator.id) ?? "—"}</td><td className="p-2">{collaboratorStatusLabel[collaborator.status] ?? collaborator.status}</td></tr>)}</tbody></table></div>
      </section>

      {pendingAliases.length > 0 ? (
        <section className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-4">
          <h2 className="font-semibold text-amber-100">E-mails aguardando verificação</h2>
          <ul className="mt-3 space-y-2">{pendingAliases.map((alias) => <li key={alias.id} className="flex flex-wrap items-center justify-between gap-3 rounded bg-slate-900/70 p-2 text-sm text-slate-200"><span>{alias.email}</span>{canVerifyAlias ? <form action={verifyCollaboratorAlias}><input type="hidden" name="aliasId" value={alias.id} /><button className="rounded border border-amber-400 px-2 py-1 text-amber-100">Confirmar verificação manual</button></form> : <span className="text-xs text-amber-200">Aguardando administrador</span>}</li>)}</ul>
        </section>
      ) : null}
    </main>
  );
}
