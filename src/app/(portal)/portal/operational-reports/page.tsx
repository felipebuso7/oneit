import { operationalReportMetrics } from "@/domain/reports/operational-metrics";
import { requireUser } from "@/lib/auth/current-user";
import { currentEpochMilliseconds } from "@/lib/time/clock";

type PageProps = { searchParams: Promise<{ period?: string }> };
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const hours = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 });

export default async function OperationalReportsPage({ searchParams }: PageProps) {
  const { period: requestedPeriod } = await searchParams;
  const period = requestedPeriod === "30" || requestedPeriod === "90" || requestedPeriod === "365" ? Number(requestedPeriod) : 30;
  const endAt = currentEpochMilliseconds(); const startAt = endAt - period * 24 * 60 * 60_000; const startIso = new Date(startAt).toISOString();
  const { supabase, user } = await requireUser();
  const { data: roles, error: roleError } = await supabase.from("user_roles").select("organization_id").eq("user_id", user.id).in("role", ["MANAGER", "DISPATCHER", "ORG_ADMIN", "SUPER_ADMIN"]);
  if (roleError) throw new Error("Não foi possível validar acesso aos indicadores.");
  if (!roles?.length) return <section className="p-8"><h1 className="text-2xl font-semibold">Relatório operacional</h1><p className="mt-3">Seu perfil não possui acesso a indicadores operacionais.</p></section>;
  const organizationIds = [...new Set(roles.map((role) => role.organization_id))];
  const { data: tickets, error } = await supabase.from("tickets").select("id,opened_at,closed_at").in("organization_id", organizationIds).or(`opened_at.gte.${startIso},closed_at.gte.${startIso}`).order("updated_at", { ascending: false }).limit(1000);
  if (error) throw new Error("Não foi possível carregar os dados do relatório.");
  const ids = (tickets ?? []).map((ticket) => ticket.id);
  const { data: levels, error: levelError } = ids.length ? await supabase.from("ticket_service_levels").select("ticket_id,resolution_due_at").in("ticket_id", ids) : { data: [], error: null };
  if (levelError) throw new Error("Não foi possível carregar as metas de SLA.");
  const metrics = operationalReportMetrics(tickets ?? [], levels ?? [], startAt, endAt);
  const cards: Array<[string, string, string]> = [
    ["Entradas", String(metrics.opened), `OS abertas nos últimos ${period} dias`],
    ["Fechamentos administrativos", String(metrics.closed), "Somente OS com fechamento administrativo registrado"],
    ["Taxa de fechamento", metrics.closureRate === null ? "—" : `${number.format(metrics.closureRate)}%`, "Fechamentos do período ÷ entradas do período; não é uma métrica de coorte"],
    ["Tempo médio até fechamento", metrics.averageClosureHours === null ? "—" : `${hours.format(metrics.averageClosureHours)} h`, "Da abertura ao fechamento administrativo"],
    ["Fechamentos com SLA", String(metrics.closedWithSla), "Fechamentos que possuíam snapshot de meta de resolução"],
    ["Conformidade de resolução", metrics.resolutionCompliance === null ? "—" : `${number.format(metrics.resolutionCompliance)}%`, `${metrics.resolutionMet} de ${metrics.closedWithSla} fechamentos no prazo registrado`],
  ];
  return <section className="mx-auto max-w-6xl p-5 sm:p-8"><p className="text-sm font-semibold tracking-[0.15em] text-cyan-700">RELATÓRIOS OPERACIONAIS</p><h1 className="mt-2 text-3xl font-semibold">Indicadores de ciclo e fechamento</h1><p className="mt-2 text-sm text-slate-600">Dados das organizações autorizadas. Consulta limitada a até 1.000 OS relevantes, ordenadas pela atualização mais recente.</p><div className="mt-4 flex flex-wrap gap-2 text-sm">{[30, 90, 365].map((days) => <a key={days} href={`/portal/operational-reports?period=${days}`} className={`rounded px-3 py-2 ${period === days ? "bg-slate-900 text-white" : "border bg-white"}`}>Últimos {days} dias</a>)}</div><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{cards.map(([label, value, note]) => <article key={label} className="rounded-xl border bg-white p-5"><p className="text-sm text-slate-600">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p><p className="mt-2 text-xs text-slate-500">{note}</p></article>)}</div><section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950"><h2 className="font-semibold">Leitura correta dos indicadores</h2><p className="mt-2">A métrica de SLA considera a meta de resolução gravada no ticket e o horário do fechamento administrativo. O calendário comercial ainda não está aplicado ao cálculo de prazo; portanto, esta visão usa a regra de minutos corridos atualmente homologada no código.</p></section></section>;
}
