import { requireUser } from "@/lib/auth/current-user";
import { setOrganizationSaasSettings } from "./actions";

type PageProps = { searchParams: Promise<{ message?: string }> };

export default async function SaasSettingsPage({ searchParams }: PageProps) {
  const [{ supabase, user }, { message }] = await Promise.all([requireUser(), searchParams]);
  const { data: roles } = await supabase.from("user_roles").select("organization_id,role").eq("user_id", user.id).in("role", ["SUPER_ADMIN", "ORG_ADMIN"]);
  const organizationIds = [...new Set((roles ?? []).map((role) => role.organization_id))];
  const [{ data: organizations }, { data: settings }] = await Promise.all([
    supabase.from("organizations").select("id,display_name").in("id", organizationIds).order("display_name"),
    supabase.from("organization_saas_settings").select("organization_id,locale,timezone,primary_color,secondary_color").in("organization_id", organizationIds),
  ]);
  const settingByOrganization = new Map((settings ?? []).map((setting) => [setting.organization_id, setting]));
  return <main className="mx-auto max-w-5xl space-y-6 p-5 sm:p-8"><header><p className="text-sm font-semibold tracking-[0.15em] text-cyan-700">SAAS · ADMINISTRAÇÃO</p><h1 className="mt-2 text-3xl font-semibold">Configurações por organização</h1><p className="mt-2 text-slate-600">Nesta fase, cada organização corresponde a um tenant lógico. Personalização visual é limitada a cores validadas; upload de logos depende do storage privado futuro.</p></header>{message ? <p className="rounded bg-sky-100 p-3 text-sm text-slate-800">{message}</p> : null}{(organizations ?? []).map((organization) => { const setting = settingByOrganization.get(organization.id); return <form key={organization.id} action={setOrganizationSaasSettings} className="grid gap-3 rounded-xl border bg-white p-5 sm:grid-cols-2"><input type="hidden" name="organizationId" value={organization.id}/><h2 className="font-semibold sm:col-span-2">{organization.display_name}</h2><label className="text-sm">Locale<input name="locale" defaultValue={setting?.locale ?? "pt-BR"} pattern="[a-z]{2,3}(-[A-Z]{2})?" required className="mt-1 w-full rounded border p-2"/></label><label className="text-sm">Timezone<input name="timezone" defaultValue={setting?.timezone ?? "America/Sao_Paulo"} required maxLength={80} className="mt-1 w-full rounded border p-2"/></label><label className="text-sm">Cor primária<input name="primaryColor" defaultValue={setting?.primary_color ?? ""} placeholder="#0B3558" pattern="#[0-9A-Fa-f]{6}" className="mt-1 w-full rounded border p-2"/></label><label className="text-sm">Cor secundária<input name="secondaryColor" defaultValue={setting?.secondary_color ?? ""} placeholder="#FF6B1A" pattern="#[0-9A-Fa-f]{6}" className="mt-1 w-full rounded border p-2"/></label><button className="w-fit rounded bg-slate-900 px-4 py-2 text-white sm:col-span-2">Salvar configurações</button></form>; })}{!(organizations ?? []).length ? <p className="rounded border border-amber-300 bg-amber-50 p-4 text-sm">Seu perfil não administra organizações.</p> : null}</main>;
}
