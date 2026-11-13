import { OneitPageHeader } from "@/components/oneit-page-header";
import { requireUser } from "@/lib/auth/current-user";
import { createServiceCalendar } from "./actions";

type PageProps = { searchParams: Promise<{ message?: string }> };

export default async function CalendarsPage({ searchParams }: PageProps) {
  const [{ supabase, user }, { message }] = await Promise.all([requireUser(), searchParams]);
  const { data: roles } = await supabase.from("user_roles").select("organization_id").eq("user_id", user.id).in("role", ["SUPER_ADMIN", "ORG_ADMIN"]);
  const organizationIds = [...new Set((roles ?? []).map((role) => role.organization_id))];
  if (!organizationIds.length) return <section className="p-8"><h1 className="text-2xl font-semibold">Calendários operacionais</h1><p className="mt-3">Somente administradores configuram calendários.</p></section>;
  const [{ data: organizations }, { data: calendars }] = await Promise.all([
    supabase.from("organizations").select("id,display_name").in("id", organizationIds),
    supabase.from("service_calendars").select("id,organization_id,code,name,timezone,calendar_type").in("organization_id", organizationIds).order("name"),
  ]);
  const organizationById = new Map((organizations ?? []).map((organization) => [organization.id, organization.display_name]));
  return <section className="mx-auto max-w-6xl p-5 sm:p-8">
    <OneitPageHeader eyebrow="SLA ENGINE · CONFIGURAÇÃO" title="Calendários operacionais" description="Mantenha fuso e janelas de atendimento auditáveis para as políticas de SLA." />
    <p className="mt-2 text-sm text-slate-600">A aplicação aos deadlines de SLA será ativada no próximo incremento do motor.</p>
    {message ? <p role="status" className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">{message}</p> : null}
    <form action={createServiceCalendar} className="oneit-card mt-6 grid gap-3 p-5 sm:grid-cols-2">
      <h2 className="sm:col-span-2 text-base font-semibold text-slate-900">Novo calendário</h2>
      <select aria-label="Organização" name="organizationId" required defaultValue="" className="rounded-lg border border-slate-300 p-2"><option disabled value="">Organização</option>{(organizations ?? []).map((organization) => <option key={organization.id} value={organization.id}>{organization.display_name}</option>)}</select>
      <select aria-label="Modelo" name="calendarType" required defaultValue="" className="rounded-lg border border-slate-300 p-2"><option disabled value="">Modelo</option><option value="TWENTY_FOUR_SEVEN">24x7</option><option value="BUSINESS_HOURS">Comercial padrão (seg–sex, 08h–18h)</option></select>
      <input aria-label="Código" name="code" required placeholder="Código, ex.: BUSINESS" className="rounded-lg border border-slate-300 p-2" />
      <input aria-label="Nome" name="name" required placeholder="Nome" className="rounded-lg border border-slate-300 p-2" />
      <input aria-label="Fuso horário" name="timezone" required defaultValue="America/Sao_Paulo" className="rounded-lg border border-slate-300 p-2 sm:col-span-2" />
      <button className="w-fit rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 sm:col-span-2">Criar calendário</button>
    </form>
    <div className="oneit-card mt-6 overflow-hidden"><ul className="divide-y divide-slate-200">{(calendars ?? []).map((calendar) => <li key={calendar.id} className="p-4 text-sm"><strong className="text-slate-900">{calendar.code} — {calendar.name}</strong><p className="mt-1 text-slate-600">{organizationById.get(calendar.organization_id) ?? "—"} · {calendar.calendar_type} · {calendar.timezone}</p></li>)}{!(calendars ?? []).length ? <li className="p-8 text-center text-sm text-slate-500">Nenhum calendário cadastrado.</li> : null}</ul></div>
  </section>;
}
