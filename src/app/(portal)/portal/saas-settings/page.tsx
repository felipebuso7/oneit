import { OneitPageHeader } from "@/components/oneit-page-header";
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
  return <main className="mx-auto max-w-5xl p-5 sm:p-8">
    <OneitPageHeader eyebrow="SAAS · ADMINISTRAÇÃO" title="Configurações por organização" description="Ajuste localização, fuso e cores validadas de cada tenant lógico." />
    <p className="mt-2 text-sm text-slate-600">Upload de logos depende do storage privado futuro; as cores são limitadas ao formato hexadecimal validado.</p>
    {message ? <p role="status" className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">{message}</p> : null}
    <div className="mt-6 space-y-4">{(organizations ?? []).map((organization) => { const setting = settingByOrganization.get(organization.id); return <form key={organization.id} action={setOrganizationSaasSettings} className="oneit-card grid gap-3 p-5 sm:grid-cols-2"><input type="hidden" name="organizationId" value={organization.id} /><h2 className="text-base font-semibold text-slate-900 sm:col-span-2">{organization.display_name}</h2><label className="text-sm text-slate-700">Locale<input aria-label={`Locale de ${organization.display_name}`} name="locale" defaultValue={setting?.locale ?? "pt-BR"} pattern="[a-z]{2,3}(-[A-Z]{2})?" required className="mt-1 w-full rounded-lg border border-slate-300 p-2" /></label><label className="text-sm text-slate-700">Timezone<input aria-label={`Timezone de ${organization.display_name}`} name="timezone" defaultValue={setting?.timezone ?? "America/Sao_Paulo"} required maxLength={80} className="mt-1 w-full rounded-lg border border-slate-300 p-2" /></label><label className="text-sm text-slate-700">Cor primária<input aria-label={`Cor primária de ${organization.display_name}`} name="primaryColor" defaultValue={setting?.primary_color ?? ""} placeholder="#0B3558" pattern="#[0-9A-Fa-f]{6}" className="mt-1 w-full rounded-lg border border-slate-300 p-2" /></label><label className="text-sm text-slate-700">Cor secundária<input aria-label={`Cor secundária de ${organization.display_name}`} name="secondaryColor" defaultValue={setting?.secondary_color ?? ""} placeholder="#FF6B1A" pattern="#[0-9A-Fa-f]{6}" className="mt-1 w-full rounded-lg border border-slate-300 p-2" /></label><button className="w-fit rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 sm:col-span-2">Salvar configurações</button></form>; })}{!(organizations ?? []).length ? <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">Seu perfil não administra organizações.</p> : null}</div>
  </main>;
}
