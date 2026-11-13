import { OneitPageHeader } from "@/components/oneit-page-header";
import { requireUser } from "@/lib/auth/current-user";
import { setFeatureFlag } from "./actions";

type PageProps = { searchParams: Promise<{ message?: string }> };

export default async function FeatureFlagsPage({ searchParams }: PageProps) {
  const [{ supabase, user }, { message }] = await Promise.all([requireUser(), searchParams]);
  const { data: roles } = await supabase.from("user_roles").select("organization_id").eq("user_id", user.id).in("role", ["SUPER_ADMIN", "ORG_ADMIN"]);
  const organizationIds = [...new Set((roles ?? []).map((role) => role.organization_id))];
  const [{ data: organizations }, { data: flags }] = await Promise.all([
    organizationIds.length ? supabase.from("organizations").select("id,display_name").in("id", organizationIds).order("display_name") : Promise.resolve({ data: [] }),
    organizationIds.length ? supabase.from("organization_feature_flags").select("id,organization_id,flag_key,enabled,updated_at").in("organization_id", organizationIds).order("updated_at", { ascending: false }) : Promise.resolve({ data: [] }),
  ]);
  const organizationName = new Map((organizations ?? []).map((organization) => [organization.id, organization.display_name]));
  return <section className="mx-auto max-w-5xl p-5 sm:p-8">
    <OneitPageHeader eyebrow="FUNDAÇÃO · ROLLOUT" title="Feature flags" description="Controle ativações graduais por organização com rastreabilidade." />
    <p className="mt-2 text-sm text-slate-600">Criar uma flag não implementa o módulo: a funcionalidade também precisa verificá-la no backend antes de ficar disponível.</p>
    {message ? <p role="status" className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">{message}</p> : null}
    <form action={setFeatureFlag} className="oneit-card mt-6 grid gap-3 p-5 sm:grid-cols-3">
      <h2 className="sm:col-span-3 text-base font-semibold text-slate-900">Nova configuração</h2>
      <select aria-label="Organização" name="organizationId" required defaultValue="" className="rounded-lg border border-slate-300 p-2"><option disabled value="">Organização</option>{(organizations ?? []).map((organization) => <option key={organization.id} value={organization.id}>{organization.display_name}</option>)}</select>
      <input aria-label="Chave da flag" name="flagKey" required pattern="[a-z][a-z0-9_]{2,79}" className="rounded-lg border border-slate-300 p-2" placeholder="Ex.: csat_pilot" />
      <select aria-label="Estado" name="enabled" defaultValue="false" className="rounded-lg border border-slate-300 p-2"><option value="false">Desativada</option><option value="true">Ativada</option></select>
      <button className="w-fit rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 sm:col-span-3">Salvar flag</button>
    </form>
    <div className="oneit-card mt-6 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">Organização</th><th className="p-3">Flag</th><th className="p-3">Estado</th><th className="p-3">Atualizada</th></tr></thead><tbody>{(flags ?? []).map((flag) => <tr className="border-t" key={flag.id}><td className="p-3">{organizationName.get(flag.organization_id) ?? "—"}</td><td className="p-3 font-mono">{flag.flag_key}</td><td className="p-3">{flag.enabled ? "Ativada" : "Desativada"}</td><td className="p-3">{new Date(flag.updated_at).toLocaleString("pt-BR")}</td></tr>)}{!(flags ?? []).length ? <tr><td colSpan={4} className="p-8 text-center text-sm text-slate-500">Nenhuma feature flag configurada.</td></tr> : null}</tbody></table></div>
  </section>;
}
