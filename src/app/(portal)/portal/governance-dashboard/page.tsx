import { governanceMetrics } from "@/domain/dashboard/governance";
import { requireUser } from "@/lib/auth/current-user";
import { OneitPageHeader } from "@/components/oneit-page-header";

export default async function GovernanceDashboardPage() {
  const { supabase, user } = await requireUser();
  const { data: roles, error: roleError } = await supabase.from("user_roles").select("organization_id").eq("user_id", user.id).in("role", ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER", "AUDITOR"]);
  if (roleError) throw new Error("Não foi possível validar acesso ao painel de governança.");
  const organizationIds = [...new Set((roles ?? []).map((role) => role.organization_id))];
  if (!organizationIds.length) return <section className="p-8"><h1 className="text-2xl font-semibold">Painel de governança</h1><p className="mt-3">Seu perfil não possui acesso ao painel de governança.</p></section>;
  const [{ data: nonconformities }, { data: risks }, { data: audits }, { data: objectives }, { data: reviews }, { data: controls }] = await Promise.all([
    supabase.from("nonconformities").select("status").in("organization_id", organizationIds),
    supabase.from("risks").select("status").in("organization_id", organizationIds),
    supabase.from("internal_audits").select("status").in("organization_id", organizationIds),
    supabase.from("service_objectives").select("status").in("organization_id", organizationIds),
    supabase.from("management_reviews").select("status").in("organization_id", organizationIds),
    supabase.from("governance_controls").select("status,evidence_description,review_frequency_days,last_reviewed_at").in("organization_id", organizationIds),
  ]);
  const metrics = governanceMetrics({ nonconformities: nonconformities ?? [], risks: risks ?? [], audits: audits ?? [], objectives: objectives ?? [], reviews: reviews ?? [] });
  const controlMetrics = { total: (controls ?? []).length, effective: (controls ?? []).filter((control) => control.status === "EFFECTIVE").length, needsImprovement: (controls ?? []).filter((control) => control.status === "NEEDS_IMPROVEMENT").length, withoutEvidence: (controls ?? []).filter((control) => !control.evidence_description).length, withoutReviewFrequency: (controls ?? []).filter((control) => !control.review_frequency_days).length };
  const cards: Array<[string, number, string, string]> = [
    ["Não Conformidades abertas", metrics.openNonconformities, "NCs ainda não encerradas", "/portal/nonconformities"],
    ["Riscos em tratamento", metrics.risksInTreatment, `${metrics.activeRisks} riscos ativos`, "/portal/risks"],
    ["Auditorias em aberto", metrics.activeAudits, "Planejadas ou em execução", "/portal/internal-audits"],
    ["Objetivos ativos", metrics.objectivesActive, `${metrics.objectivesAchieved} atingidos · ${metrics.objectivesNotAchieved} não atingidos`, "/portal/service-objectives"],
    ["Análises críticas abertas", metrics.reviewsOpen, "Planejadas ou em andamento", "/portal/management-reviews"],
    ["Controles de gestão", controlMetrics.total, `${controlMetrics.effective} efetivos · ${controlMetrics.needsImprovement} requerem melhoria`, "/portal/governance-controls"],
    ["Lacunas de evidência", controlMetrics.withoutEvidence + controlMetrics.withoutReviewFrequency, `${controlMetrics.withoutEvidence} sem evidência · ${controlMetrics.withoutReviewFrequency} sem revisão definida`, "/portal/governance-controls"],
  ];
  return <section className="mx-auto max-w-6xl p-5 sm:p-8"><OneitPageHeader eyebrow="GOVERNANÇA SGSTI" title="Painel de governança" description="Consolidação dos registros visíveis às suas organizações para orientar a análise crítica." /><p className="mt-2 text-sm text-slate-600">Indicadores são contagens atuais e não substituem análise de causa, decisão ou evidência individual.</p><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{cards.map(([label, value, note, href]) => <a key={label} href={href} className="oneit-card p-5 transition hover:-translate-y-0.5 hover:border-cyan-700"><p className="text-sm text-slate-600">{label}</p><p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p><p className="mt-2 text-xs text-slate-500">{note}</p></a>)}</div><section className="mt-6 rounded-xl border border-sky-200 bg-sky-50 p-5 text-sm text-slate-700"><h2 className="font-semibold">Uso recomendado</h2><p className="mt-2">Use o painel como porta de entrada para análise crítica. As decisões devem ser registradas na reunião de gestão, e as evidências permanecem nos respectivos módulos.</p></section></section>;
}
