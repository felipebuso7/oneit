import { requireUser } from "@/lib/auth/current-user";
import Link from "next/link";
import { OneitEmptyState, OneitPageHeader, OneitSection } from "@/components/oneit";

type PageProps = { searchParams: Promise<{ from?: string; to?: string; ticket?: string; technician?: string }> };

export default async function FieldServiceReportsPage({ searchParams }: PageProps) {
  const { supabase, user } = await requireUser();
  const filters = await searchParams;
  const { data: roles, error: roleError } = await supabase.from("user_roles").select("organization_id").eq("user_id", user.id).in("role", ["MANAGER", "ORG_ADMIN", "SUPER_ADMIN"]);
  if (roleError) throw new Error("Não foi possível validar o acesso aos RTOs.");
  const organizationIds = (roles ?? []).map((role) => role.organization_id);
  const { data: reports, error } = organizationIds.length ? await supabase.from("field_service_rto_reports").select("id, service_order_id, ticket_id, report_version, generated_at, sha256").in("organization_id", organizationIds).order("generated_at", { ascending: false }).limit(100) : { data: [], error: null };
  if (error) throw new Error("Não foi possível carregar os RTOs de Field Service.");
  const orderIds = (reports ?? []).map((report) => report.service_order_id);
  const ticketIds = (reports ?? []).map((report) => report.ticket_id);
  const [{ data: orders }, { data: tickets }] = await Promise.all([
    orderIds.length ? supabase.from("service_orders").select("id,technician_id").in("id", orderIds) : Promise.resolve({ data: [] }),
    ticketIds.length ? supabase.from("tickets").select("id,ticket_number,operational_status").in("id", ticketIds) : Promise.resolve({ data: [] }),
  ]);
  const technicianIds = [...new Set((orders ?? []).map((order) => order.technician_id).filter(Boolean))];
  const { data: technicians } = technicianIds.length ? await supabase.from("technicians").select("id,full_name").in("id", technicianIds) : { data: [] };
  const orderById = new Map((orders ?? []).map((order) => [order.id, order]));
  const ticketById = new Map((tickets ?? []).filter((ticket) => ticket.operational_status !== "CANCELLED").map((ticket) => [ticket.id, ticket]));
  const technicianById = new Map((technicians ?? []).map((technician) => [technician.id, technician.full_name]));
  const normalizedTicket = (filters.ticket ?? "").trim().toLocaleLowerCase("pt-BR");
  const normalizedTechnician = (filters.technician ?? "").trim().toLocaleLowerCase("pt-BR");
  const filteredReports = (reports ?? []).filter((report) => {
    const generated = report.generated_at.slice(0, 10);
    const ticketNumber = ticketById.get(report.ticket_id)?.ticket_number?.toLocaleLowerCase("pt-BR") ?? "";
    const technicianName = technicianById.get(orderById.get(report.service_order_id)?.technician_id ?? "")?.toLocaleLowerCase("pt-BR") ?? "";
    return (!filters.from || generated >= filters.from) && (!filters.to || generated <= filters.to) && (!normalizedTicket || ticketNumber.includes(normalizedTicket) || report.ticket_id.toLocaleLowerCase().includes(normalizedTicket)) && (!normalizedTechnician || technicianName.includes(normalizedTechnician));
  });
  const formatDate = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium", timeZone: "America/Sao_Paulo" }).format(new Date(value));
  return <main className="mx-auto max-w-5xl p-6 sm:p-8"><OneitPageHeader eyebrow="Field Service · Documentos" title="RTO Encerrados" description="Relatórios técnicos aprovados, versionados e armazenados com hash de integridade." /><form method="get" className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"><label className="grid gap-1 text-sm font-medium">De<input type="date" name="from" defaultValue={filters.from} className="rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label><label className="grid gap-1 text-sm font-medium">Até<input type="date" name="to" defaultValue={filters.to} className="rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label><label className="grid gap-1 text-sm font-medium">Chamado<input name="ticket" placeholder="FSM-2026-000001" defaultValue={filters.ticket} className="rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label><label className="grid gap-1 text-sm font-medium">Técnico<input name="technician" placeholder="Nome do técnico" defaultValue={filters.technician} className="rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label><div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-4"><button className="oneit-btn oneit-btn--primary" type="submit">Filtrar RTOs</button><Link href="/portal/field-service-reports" className="oneit-btn oneit-btn--secondary">Limpar filtros</Link><span className="text-sm text-slate-500">{filteredReports.length} relatório(s)</span></div></form><OneitSection className="mt-6" title="Relatórios disponíveis" description="Faça o download da versão registrada para consulta ou envio ao cliente.">{filteredReports.length ? <div className="-mx-5 divide-y divide-slate-100">{filteredReports.map((report) => { const ticket = ticketById.get(report.ticket_id); const technician = technicianById.get(orderById.get(report.service_order_id)?.technician_id ?? ""); return <article key={report.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"><div><p className="font-semibold">OS {report.service_order_id} · Chamado {ticket?.ticket_number ?? report.ticket_id}</p><p className="mt-1 text-sm text-slate-500">Técnico: {technician ?? "Não identificado"} · Versão {report.report_version} · {formatDate(report.generated_at)}</p><p className="mt-1 font-mono text-xs text-slate-400">SHA-256: {report.sha256 ?? "pendente"}</p></div><Link href={`/api/field-service/rto?reportId=${report.id}&redirect=1`} target="_blank" rel="noreferrer" className="oneit-btn oneit-btn--primary">Baixar PDF</Link></article>; })}</div> : <OneitEmptyState title="Nenhum RTO encontrado" description="Ajuste os filtros ou gere um RTO após a aprovação de uma OS." />}</OneitSection></main>;
}
