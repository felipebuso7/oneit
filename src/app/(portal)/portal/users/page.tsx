import { requireUser } from "@/lib/auth/current-user";
import { assignableRoles } from "@/lib/validation/user-management";
import { changeOrganizationRole, inviteOrganizationUser, revokeOrganizationRole } from "./actions";

type PageProps = { searchParams: Promise<{ message?: string }> };

export default async function UsersPage({ searchParams }: PageProps) {
  const [{ supabase, user }, { message }] = await Promise.all([requireUser(), searchParams]);
  const { data: adminRoles } = await supabase
    .from("user_roles")
    .select("organization_id")
    .eq("user_id", user.id)
    .in("role", ["SUPER_ADMIN", "ORG_ADMIN"]);
  const organizationIds = [...new Set((adminRoles ?? []).map((item) => item.organization_id))];

  if (!organizationIds.length) {
    return <section className="p-8"><h1 className="text-2xl font-semibold">Usuários e acessos</h1><p className="mt-3">Somente administradores organizacionais podem provisionar acessos.</p></section>;
  }

  const [{ data: organizations }, { data: memberships }] = await Promise.all([
    supabase.from("organizations").select("id, display_name").in("id", organizationIds).eq("active", true).order("display_name"),
    supabase.from("user_roles").select("user_id, organization_id, role, created_at").in("organization_id", organizationIds).order("created_at", { ascending: false }),
  ]);
  const memberIds = [...new Set((memberships ?? []).map((item) => item.user_id))];
  const { data: profiles } = memberIds.length
    ? await supabase.from("user_profiles").select("id, full_name, email, active").in("id", memberIds)
    : { data: [] };
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const organizationById = new Map((organizations ?? []).map((organization) => [organization.id, organization.display_name]));

  return <section className="mx-auto max-w-6xl p-5 sm:p-8">
    <p className="text-sm font-semibold tracking-[0.15em] text-cyan-700">GOVERNANÇA DE ACESSO</p>
    <h1 className="mt-2 text-3xl font-semibold">Usuários e permissões</h1>
    <p className="mt-2 max-w-3xl text-sm text-slate-600">Convide usuários e atribua um papel por organização. Este fluxo não permite criar SUPER_ADMIN e registra a concessão na auditoria.</p>
    {message ? <p role="status" className="mt-4 rounded bg-sky-100 p-3 text-sm">{message}</p> : null}
    <form action={inviteOrganizationUser} className="mt-6 grid gap-3 rounded-xl border bg-white p-5 sm:grid-cols-2">
      <h2 className="sm:col-span-2 font-semibold">Convidar usuário</h2>
      <select name="organizationId" required defaultValue="" className="rounded border p-2"><option disabled value="">Organização</option>{(organizations ?? []).map((organization) => <option key={organization.id} value={organization.id}>{organization.display_name}</option>)}</select>
      <select name="role" required defaultValue="" className="rounded border p-2"><option disabled value="">Papel de acesso</option>{assignableRoles.map((role) => <option key={role} value={role}>{role}</option>)}</select>
      <input name="fullName" required minLength={3} maxLength={200} placeholder="Nome completo" className="rounded border p-2" />
      <input name="email" required type="email" placeholder="E-mail corporativo" className="rounded border p-2" />
      <button className="w-fit rounded bg-slate-900 px-4 py-2 text-white sm:col-span-2">Enviar convite e atribuir acesso</button>
    </form>
    <section className="mt-6 overflow-hidden rounded-xl border bg-white">
      <h2 className="border-b p-5 font-semibold">Membros com acesso</h2>
      <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">Usuário</th><th className="p-3">Organização</th><th className="p-3">Papel</th><th className="p-3">Situação</th><th className="p-3">Ação</th></tr></thead><tbody>{(memberships ?? []).map((membership) => { const profile = profileById.get(membership.user_id); return <tr key={`${membership.user_id}-${membership.organization_id}-${membership.role}`} className="border-t"><td className="p-3"><p className="font-medium">{profile?.full_name ?? "Perfil pendente"}</p><p className="text-slate-500">{profile?.email ?? "—"}</p></td><td className="p-3">{organizationById.get(membership.organization_id) ?? "—"}</td><td className="p-3">{membership.role}</td><td className="p-3">{profile?.active === false ? "Inativo" : "Ativo"}</td><td className="p-3">{membership.role === "SUPER_ADMIN" ? "Protegido" : <div className="flex items-center gap-3"><form action={changeOrganizationRole} className="flex items-center gap-2"><input type="hidden" name="organizationId" value={membership.organization_id} /><input type="hidden" name="userId" value={membership.user_id} /><input type="hidden" name="currentRole" value={membership.role} /><select aria-label="Novo papel" name="role" defaultValue={membership.role} className="rounded border p-1 text-xs">{assignableRoles.map((role) => <option key={role} value={role}>{role}</option>)}</select><button className="font-medium text-cyan-800">Alterar</button></form><form action={revokeOrganizationRole}><input type="hidden" name="organizationId" value={membership.organization_id} /><input type="hidden" name="userId" value={membership.user_id} /><input type="hidden" name="role" value={membership.role} /><button className="font-medium text-rose-700">Revogar</button></form></div>}</td></tr>; })}</tbody></table></div>
      {!memberships?.length ? <p className="p-5 text-sm text-slate-600">Nenhum acesso encontrado.</p> : null}
    </section>
  </section>;
}
