import { OneitPageHeader } from "@/components/oneit-page-header";
import { requireUser } from "@/lib/auth/current-user";
import { saveServiceLevelPolicy } from "./actions";

type PageProps = { searchParams: Promise<{ message?: string }> };

export default async function ServiceLevelPage({ searchParams }: PageProps) {
  const [{ supabase, user }, { message }] = await Promise.all([requireUser(), searchParams]);
  const { data: roles, error: roleError } = await supabase.from("user_roles").select("organization_id").eq("user_id", user.id).in("role", ["ORG_ADMIN", "SUPER_ADMIN"]);
  if (roleError) throw new Error("Não foi possível validar a permissão de SLA.");
  if (!roles?.length) return <section className="p-8"><h1 className="text-2xl font-semibold">SLA e OLA</h1><p className="mt-3">Somente administradores organizacionais configuram políticas.</p></section>;
  const organizationIds = roles.map((role) => role.organization_id);
  const [{ data: contracts }, { data: categories }, { data: calendars }, { data: policies }] = await Promise.all([
    supabase.from("contracts").select("id, code, name").in("organization_id", organizationIds).eq("active", true).order("name"),
    supabase.from("service_categories").select("id").in("organization_id", organizationIds).eq("active", true),
    supabase.from("service_calendars").select("id, code, name").in("organization_id", organizationIds).eq("active", true).order("name"),
    supabase.from("service_level_policies").select("id, contract_id, service_offering_id, calendar_id, priority, response_minutes, resolution_minutes, ola_minutes").in("organization_id", organizationIds).order("priority"),
  ]);
  const categoryIds = (categories ?? []).map((category) => category.id);
  const { data: subcategories } = categoryIds.length ? await supabase.from("service_subcategories").select("id").in("category_id", categoryIds).eq("active", true) : { data: [] };
  const subcategoryIds = (subcategories ?? []).map((subcategory) => subcategory.id);
  const { data: offerings } = subcategoryIds.length ? await supabase.from("service_offerings").select("id, subcategory_id, code, name").in("subcategory_id", subcategoryIds).eq("active", true).order("name") : { data: [] };
  const offeringById = new Map((offerings ?? []).map((offering) => [offering.id, offering]));
  const calendarById = new Map((calendars ?? []).map((calendar) => [calendar.id, calendar]));
  return <section className="mx-auto max-w-5xl p-5 sm:p-8">
    <OneitPageHeader eyebrow="GESTÃO · ACORDOS DE SERVIÇO" title="SLA e OLA por contrato" description="Configure os prazos que serão congelados em novas OS, por contrato, serviço e calendário." />
    <p className="mt-2 text-sm text-slate-600">Os prazos ainda usam minutos corridos até a ativação do cálculo de tempo útil.</p>
    {message ? <p role="status" className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">{message}</p> : null}
    <form action={saveServiceLevelPolicy} className="oneit-card mt-6 grid gap-3 p-5 sm:grid-cols-2">
      <h2 className="sm:col-span-2 text-base font-semibold text-slate-900">Nova política</h2>
      <select aria-label="Contrato" name="contractId" required defaultValue="" className="rounded-lg border border-slate-300 p-2"><option disabled value="">Contrato</option>{(contracts ?? []).map((contract) => <option key={contract.id} value={contract.id}>{contract.code} — {contract.name}</option>)}</select>
      <select aria-label="Serviço" name="serviceOfferingId" defaultValue="" className="rounded-lg border border-slate-300 p-2"><option value="">Todos os serviços do contrato (padrão)</option>{(offerings ?? []).map((offering) => <option key={offering.id} value={offering.id}>{offering.code} — {offering.name}</option>)}</select>
      <select aria-label="Calendário" name="calendarId" defaultValue="" className="rounded-lg border border-slate-300 p-2 sm:col-span-2"><option value="">Sem calendário associado (minutos corridos)</option>{(calendars ?? []).map((calendar) => <option key={calendar.id} value={calendar.id}>{calendar.code} — {calendar.name}</option>)}</select>
      <input aria-label="Prioridade" type="number" name="priority" min="1" max="5" required placeholder="Prioridade (1 a 5)" className="rounded-lg border border-slate-300 p-2" />
      <input aria-label="Resposta em minutos" type="number" name="responseMinutes" min="1" max="525600" required placeholder="Resposta em minutos" className="rounded-lg border border-slate-300 p-2" />
      <input aria-label="Resolução em minutos" type="number" name="resolutionMinutes" min="1" max="525600" required placeholder="Resolução em minutos" className="rounded-lg border border-slate-300 p-2" />
      <input aria-label="OLA em minutos" type="number" name="olaMinutes" min="1" max="525600" required placeholder="OLA em minutos" className="rounded-lg border border-slate-300 p-2" />
      <button className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 sm:col-span-2">Salvar política</button>
    </form>
    <div className="oneit-card mt-6 overflow-hidden"><ul className="divide-y divide-slate-200">{(policies ?? []).map((policy) => { const offering = policy.service_offering_id ? offeringById.get(policy.service_offering_id) : undefined; const calendar = policy.calendar_id ? calendarById.get(policy.calendar_id) : undefined; return <li key={policy.id} className="p-4 text-sm text-slate-700">Contrato {policy.contract_id.slice(0, 8)} · {offering ? `${offering.code} — ${offering.name}` : "Padrão do contrato"} · {calendar ? `calendário ${calendar.code}` : "minutos corridos"} · P{policy.priority}: resposta {policy.response_minutes} min, resolução {policy.resolution_minutes} min, OLA {policy.ola_minutes} min</li>; })}{!(policies ?? []).length ? <li className="p-8 text-center text-sm text-slate-500">Nenhuma política cadastrada.</li> : null}</ul></div>
  </section>;
}
