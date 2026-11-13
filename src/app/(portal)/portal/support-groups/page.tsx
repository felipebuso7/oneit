import { OneitPageHeader } from "@/components/oneit-page-header";
import { requireUser } from "@/lib/auth/current-user";
import { createSupportGroup } from "./actions";

type PageProps = { searchParams: Promise<{ message?: string }> };

export default async function SupportGroupsPage({ searchParams }: PageProps) {
  const [{ supabase, user }, { message }] = await Promise.all([requireUser(), searchParams]);
  const { data: roles } = await supabase.from("user_roles").select("organization_id").eq("user_id", user.id).in("role", ["SUPER_ADMIN", "ORG_ADMIN"]);
  const organizationIds = [...new Set((roles ?? []).map((role) => role.organization_id))];
  if (!organizationIds.length) return <section className="p-8"><h1 className="text-2xl font-semibold">Grupos de suporte</h1><p className="mt-3">Somente administradores organizacionais mantêm grupos.</p></section>;
  const [{ data: organizations }, { data: groups }] = await Promise.all([
    supabase.from("organizations").select("id, display_name").in("id", organizationIds).order("display_name"),
    supabase.from("support_groups").select("id, organization_id, code, name, support_level, active").in("organization_id", organizationIds).order("support_level").order("name"),
  ]);
  const organizationById = new Map((organizations ?? []).map((organization) => [organization.id, organization.display_name]));
  return <section className="mx-auto max-w-6xl p-5 sm:p-8">
    <OneitPageHeader eyebrow="ITSM · CONFIGURAÇÃO" title="Grupos e níveis de suporte" description="Configure grupos N1, N2 e N3 para roteamento e escalonamento funcional." />
    <p className="mt-2 text-sm text-slate-600">A composição detalhada dos grupos será o próximo incremento.</p>
    {message ? <p role="status" className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">{message}</p> : null}
    <form action={createSupportGroup} className="oneit-card mt-6 grid gap-3 p-5 sm:grid-cols-2">
      <h2 className="sm:col-span-2 text-base font-semibold text-slate-900">Novo grupo</h2>
      <select aria-label="Organização" name="organizationId" required defaultValue="" className="rounded-lg border border-slate-300 p-2"><option disabled value="">Organização</option>{(organizations ?? []).map((organization) => <option key={organization.id} value={organization.id}>{organization.display_name}</option>)}</select>
      <select aria-label="Nível" name="supportLevel" required defaultValue="" className="rounded-lg border border-slate-300 p-2"><option disabled value="">Nível</option><option value="1">N1 — Atendimento inicial</option><option value="2">N2 — Especialista</option><option value="3">N3 — Avançado/fornecedor</option></select>
      <input aria-label="Código" name="code" required placeholder="Código, ex.: N2_NETWORK" className="rounded-lg border border-slate-300 p-2" />
      <input aria-label="Nome do grupo" name="name" required placeholder="Nome do grupo" className="rounded-lg border border-slate-300 p-2" />
      <button className="w-fit rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 sm:col-span-2">Criar grupo</button>
    </form>
    <div className="oneit-card mt-6 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">Organização</th><th className="p-3">Código</th><th className="p-3">Grupo</th><th className="p-3">Nível</th><th className="p-3">Situação</th></tr></thead><tbody>{(groups ?? []).map((group) => <tr key={group.id} className="border-t"><td className="p-3">{organizationById.get(group.organization_id) ?? "—"}</td><td className="p-3">{group.code}</td><td className="p-3">{group.name}</td><td className="p-3">N{group.support_level}</td><td className="p-3">{group.active ? "Ativo" : "Inativo"}</td></tr>)}{!(groups ?? []).length ? <tr><td colSpan={5} className="p-8 text-center text-sm text-slate-500">Nenhum grupo cadastrado.</td></tr> : null}</tbody></table></div>
  </section>;
}
