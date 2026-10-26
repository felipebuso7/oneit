import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";

const governanceRoles = ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER", "AUDITOR"];
const dateOnly = () => new Date().toISOString().slice(0, 10);
const addDays = (date: string, days: number) => { const result = new Date(`${date}T00:00:00Z`); result.setUTCDate(result.getUTCDate() + days); return result.toISOString().slice(0, 10); };
const number = (value: unknown[] | null | undefined) => value?.length ?? 0;

function Metric({ label, value, note, tone = "slate" }: { label: string; value: number; note: string; tone?: "slate" | "blue" | "amber" | "rose" | "green" }) {
  const colors = { slate: "border-slate-200 bg-white", blue: "border-sky-200 bg-sky-50", amber: "border-amber-200 bg-amber-50", rose: "border-rose-200 bg-rose-50", green: "border-emerald-200 bg-emerald-50" };
  return <article className={`rounded-xl border p-4 shadow-sm ${colors[tone]}`}><p className="text-sm text-slate-600">{label}</p><p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-500">{note}</p></article>;
}

type DashboardProps = { searchParams: Promise<{ competence?: string }> };

export default async function SgstiDashboardPage({ searchParams }: DashboardProps) {
  const [{ supabase, user }, query] = await Promise.all([requireUser(), searchParams]);
  const { data: roles } = await supabase.from("user_roles").select("organization_id").eq("user_id", user.id).in("role", governanceRoles);
  const organizationIds = [...new Set((roles ?? []).map((role) => role.organization_id))];
  if (!organizationIds.length) return <main className="mx-auto max-w-5xl p-6 sm:p-8"><h1 className="text-3xl font-semibold">Dashboard SGSTI</h1><p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Não há organizações de Governança vinculadas ao seu perfil.</p></main>;
  const today = dateOnly();
  const dueSoonLimit = addDays(today, 15);
  const documentReviewLimit = addDays(today, 30);
  const requestedCompetence = /^\d{4}-\d{2}$/.test(query.competence ?? "") ? query.competence! : today.slice(0, 7);
  const competenceStart = `${requestedCompetence}-01`;
  const competenceEndDate = new Date(`${competenceStart}T00:00:00Z`);
  competenceEndDate.setUTCMonth(competenceEndDate.getUTCMonth() + 1);
  const competenceEnd = competenceEndDate.toISOString().slice(0, 10);
  const [activities, documents, controlledDocuments, sgstiAudits, internalAudits, nonconformities, initiatives, actionPlans, approvals, controls, notifications, assuranceRequests] = await Promise.all([
    supabase.from("sgsti_activity_occurrences").select("id,title,status,due_at,planned_at,result_summary").in("organization_id", organizationIds).gte("competence", competenceStart).lt("competence", competenceEnd).limit(1000),
    supabase.from("sgsti_documents").select("id,status,document_kind,next_review_at").in("organization_id", organizationIds).limit(1000),
    supabase.from("controlled_documents").select("id,status,approved_at").in("organization_id", organizationIds).limit(1000),
    supabase.from("sgsti_audits").select("id,title,status,planned_at").in("organization_id", organizationIds).limit(1000),
    supabase.from("internal_audits").select("id,title,status,planned_at").in("organization_id", organizationIds).limit(1000),
    supabase.from("nonconformities").select("id,description,status,due_at,record_type").in("organization_id", organizationIds).limit(1000),
    supabase.from("sgsti_initiatives").select("id,title,status,due_at,priority").in("organization_id", organizationIds).limit(1000),
    supabase.from("action_plans").select("id,description,status,due_at,priority").in("organization_id", organizationIds).limit(1000),
    supabase.from("sgsti_activity_occurrences").select("id,title,submitted_at,due_at,organization_id,approval_status").in("organization_id", organizationIds).in("approval_status", ["PENDING_REVIEW", "PENDING_APPROVAL"]).limit(1000),
    supabase.from("sgsti_controls").select("id,title,next_test_at,active").in("organization_id", organizationIds).eq("active", true).limit(1000),
    supabase.from("sgsti_notification_deliveries").select("id,notification_type,title,target_path,delivered_at").eq("recipient_id", user.id).is("read_at", null).limit(1000),
    supabase.from("sgsti_assurance_requests").select("id,title,due_at,status").in("organization_id", organizationIds).limit(1000),
  ]);
  const activityRows = activities.data ?? [];
  const documentRows = documents.data ?? [];
  const ncRows = nonconformities.data ?? [];
  const initiativeRows = initiatives.data ?? [];
  const actionRows = actionPlans.data ?? [];
  const approvalRows = approvals.data ?? [];
  const controlRows = controls.data ?? [];
  const unreadNotifications = notifications.data ?? [];
  const assuranceRows = assuranceRequests.data ?? [];
  const activeActivity = activityRows.filter((item) => !["COMPLETED", "CANCELLED"].includes(item.status));
  const overdueActivity = activeActivity.filter((item) => item.due_at < today);
  const dueSoon = activeActivity.filter((item) => item.due_at >= today && item.due_at <= dueSoonLimit);
  const documentReview = documentRows.filter((item) => item.document_kind === "DOCUMENT" && item.next_review_at && item.next_review_at.slice(0, 10) <= documentReviewLimit);
  const openNc = ncRows.filter((item) => !["COMPLETED", "CANCELLED", "CLOSED"].includes(item.status));
  const overdueNc = openNc.filter((item) => item.due_at && item.due_at.slice(0, 10) < today);
  const activeInitiatives = initiativeRows.filter((item) => !["COMPLETED", "CANCELLED"].includes(item.status));
  const openActions = actionRows.filter((item) => !["COMPLETED", "EFFECTIVENESS_VERIFIED", "CANCELLED"].includes(item.status));
  const activeAudits = [...(sgstiAudits.data ?? []), ...(internalAudits.data ?? [])].filter((item) => !["COMPLETED", "CANCELLED"].includes(item.status));
  const overdueControls = controlRows.filter((item) => item.next_test_at && item.next_test_at < today);
  const openAssurance = assuranceRows.filter((item) => !["ACCEPTED", "CANCELLED"].includes(item.status));
  const overdueAssurance = assuranceRows.filter((item) => item.status === "OVERDUE" || (item.status === "OPEN" && item.due_at < today));
  const criticalItems = [
    ...overdueActivity.map((item) => ({ id: `activity-${item.id}`, title: item.title, detail: `Rito vencido em ${new Date(`${item.due_at}T00:00:00`).toLocaleDateString("pt-BR")}`, href: "/portal/sgsti", tone: "text-rose-700" })),
    ...overdueNc.map((item) => ({ id: `nc-${item.id}`, title: item.description, detail: `NC pendente · prazo ${new Date(item.due_at!).toLocaleDateString("pt-BR")}`, href: "/portal/nonconformities", tone: "text-rose-700" })),
    ...openActions.filter((item) => item.due_at && item.due_at.slice(0, 10) < today).map((item) => ({ id: `action-${item.id}`, title: item.description, detail: "Plano de ação em atraso", href: "/portal/action-plans", tone: "text-rose-700" })),
    ...overdueControls.map((item) => ({ id: `control-${item.id}`, title: item.title, detail: `Teste de controle vencido${item.next_test_at ? ` em ${new Date(`${item.next_test_at}T00:00:00`).toLocaleDateString("pt-BR")}` : ""}`, href: "/portal/sgsti/controls", tone: "text-rose-700" })),
    ...overdueAssurance.map((item) => ({ id: `assurance-${item.id}`, title: item.title, detail: `Evidência SGSTI em atraso · prazo ${new Date(`${item.due_at}T00:00:00`).toLocaleDateString("pt-BR")}`, href: "/portal/sgsti/assurance", tone: "text-rose-700" })),
    ...approvalRows.map((item) => ({ id: `approval-${item.id}`, title: item.title, detail: item.approval_status === "PENDING_REVIEW" ? "Rito aguardando revisão independente" : "Rito aguardando aprovação independente", href: "/portal/sgsti/approvals", tone: item.approval_status === "PENDING_REVIEW" ? "text-sky-700" : "text-amber-700" })),
  ].slice(0, 8);
  const executionRate = activityRows.length ? Math.round((activityRows.filter((item) => item.status === "COMPLETED").length / activityRows.length) * 100) : 0;

  return <main className="mx-auto max-w-7xl p-5 sm:p-8"><header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold tracking-[.15em] text-cyan-700">SGSTI · SUMÁRIO EXECUTIVO</p><h1 className="mt-2 text-3xl font-semibold">Dashboard SGSTI</h1><p className="mt-2 max-w-3xl text-sm text-slate-600">Visão consolidada para gestão e auditoria. Indicadores mostram o estado registrado no sistema; a validade da evidência deve ser avaliada no rito, documento ou auditoria correspondente.</p></div><div className="flex gap-2"><Link href="/portal/sgsti" className="rounded-lg bg-[#093d8f] px-4 py-2 text-sm font-semibold text-white">Abrir agenda</Link><Link href="/portal/sgsti/organograma" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Organograma</Link></div></header><form className="mt-5 flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4"><label className="text-sm font-medium">Competência<input name="competence" type="month" defaultValue={requestedCompetence} className="ml-2 rounded-lg border p-2" /></label><button className="rounded-lg border border-[#093d8f] px-4 py-2 text-sm font-semibold text-[#093d8f]">Atualizar visão</button><p className="text-xs text-slate-500">Os indicadores de ritos são filtrados pela competência selecionada. Documentação, auditorias, NCs e melhorias refletem o estado atual.</p></form>
    <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Ritos em acompanhamento" value={number(activeActivity)} note={`${number(overdueActivity)} em atraso`} tone={overdueActivity.length ? "rose" : "blue"}/><Metric label="Execução dos ritos" value={executionRate} note="% concluída no recorte carregado" tone={executionRate >= 85 ? "green" : "amber"}/><Metric label="Auditorias abertas" value={number(activeAudits)} note="Internas e SGSTI" tone="blue"/><Metric label="Não conformidades abertas" value={number(openNc)} note={`${number(overdueNc)} vencida(s)`} tone={overdueNc.length ? "rose" : "amber"}/></section>
    <section className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Documentos SGSTI" value={number(documentRows.filter((item) => item.document_kind === "DOCUMENT"))} note={`${number(documentReview)} revisão(ões) em até 30 dias`}/><Metric label="Documentos controlados" value={number(controlledDocuments.data)} note={`${number((controlledDocuments.data ?? []).filter((item) => item.status === "APPROVED"))} aprovados`}/><Metric label="Melhorias em curso" value={number(activeInitiatives)} note="Iniciativas do plano mestre" tone="blue"/><Metric label="Planos de ação abertos" value={number(openActions)} note="Correções, ações e melhorias" tone={openActions.length ? "amber" : "green"}/></section>
    <section className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Aprovações pendentes" value={number(approvalRows)} note="Ritos aguardando decisão independente" tone={approvalRows.length ? "amber" : "green"}/><Metric label="Controles a testar" value={number(overdueControls)} note={`${number(controlRows)} controles ativos cadastrados`} tone={overdueControls.length ? "rose" : "green"}/><Metric label="Evidências pendentes" value={number(openAssurance)} note={`${number(overdueAssurance)} em atraso`} tone={overdueAssurance.length ? "rose" : openAssurance.length ? "amber" : "green"}/><Metric label="Meus alertas não lidos" value={number(unreadNotifications)} note="Lembretes entregues no OneIT" tone={unreadNotifications.length ? "blue" : "green"}/></section>
    <section className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><article className="rounded-xl border bg-white shadow-sm"><div className="flex items-center justify-between border-b p-5"><div><h2 className="font-semibold">Atenção imediata</h2><p className="mt-1 text-sm text-slate-500">Itens vencidos que exigem avaliação do responsável.</p></div><Link href="/portal/sgsti" className="text-sm font-semibold text-cyan-800">Ver agenda</Link></div><ul className="divide-y">{criticalItems.map((item) => <li key={item.id} className="p-4"><Link href={item.href} className="font-medium text-slate-900 hover:underline">{item.title}</Link><p className={`mt-1 text-sm ${item.tone}`}>{item.detail}</p></li>)}{!criticalItems.length ? <li className="p-5 text-sm text-emerald-700">Não há itens vencidos no recorte carregado.</li> : null}</ul></article><article className="rounded-xl border bg-white p-5 shadow-sm"><h2 className="font-semibold">Próximos 15 dias</h2><p className="mt-1 text-sm text-slate-500">Ritos com prazo próximo.</p><ul className="mt-4 space-y-3">{dueSoon.slice(0, 6).map((item) => <li key={item.id} className="rounded-lg bg-slate-50 p-3"><p className="font-medium text-sm">{item.title}</p><p className="mt-1 text-xs text-slate-500">Prazo: {new Date(`${item.due_at}T00:00:00`).toLocaleDateString("pt-BR")}</p></li>)}{!dueSoon.length ? <li className="text-sm text-slate-500">Nenhum rito com prazo nos próximos 15 dias.</li> : null}</ul></article></section>
    <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Link href="/portal/nonconformities" className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-cyan-700"><h2 className="font-semibold">NCs e melhorias</h2><p className="mt-2 text-sm text-slate-600">Origem, correção, análise causal, ações e eficácia em uma única jornada rastreável.</p><p className="mt-4 text-sm font-semibold text-cyan-800">Abrir registros →</p></Link><Link href="/portal/controlled-documents" className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-cyan-700"><h2 className="font-semibold">Documentação controlada</h2><p className="mt-2 text-sm text-slate-600">Versionamento, revisão e aprovação segregada de documentos.</p><p className="mt-4 text-sm font-semibold text-cyan-800">Abrir documentos →</p></Link><Link href="/portal/internal-audits" className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-cyan-700"><h2 className="font-semibold">Auditorias e constatações</h2><p className="mt-2 text-sm text-slate-600">Planejamento, escopo, evidência e vínculo com não conformidades.</p><p className="mt-4 text-sm font-semibold text-cyan-800">Abrir auditorias →</p></Link><Link href="/portal/sgsti/assurance" className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-cyan-700"><h2 className="font-semibold">Asseguração contínua</h2><p className="mt-2 text-sm text-slate-600">Pedidos de evidência, devoluções e comprovação dos controles.</p><p className="mt-4 text-sm font-semibold text-cyan-800">Abrir pedidos →</p></Link></section>
  </main>;
}
