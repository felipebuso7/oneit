import { requireUser } from "@/lib/auth/current-user";
import Link from "next/link";
import { OneitEmptyState, OneitPageHeader, OneitSection } from "@/components/oneit";

export default async function FieldServiceReportsPage() {
  const { supabase, user } = await requireUser();
  const { data: roles, error: roleError } = await supabase.from("user_roles").select("organization_id").eq("user_id", user.id).in("role", ["MANAGER", "ORG_ADMIN", "SUPER_ADMIN"]);
  if (roleError) throw new Error("Não foi possível validar o acesso aos RTOs.");
  const organizationIds = (roles ?? []).map((role) => role.organization_id);
  const { data: reports, error } = organizationIds.length ? await supabase.from("field_service_rto_reports").select("id, service_order_id, ticket_id, report_version, generated_at, sha256").in("organization_id", organizationIds).order("generated_at", { ascending: false }).limit(100) : { data: [], error: null };
  if (error) throw new Error("Não foi possível carregar os RTOs de Field Service.");
  const formatDate = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium", timeZone: "America/Sao_Paulo" }).format(new Date(value));
  return <main className="mx-auto max-w-5xl p-6 sm:p-8"><OneitPageHeader eyebrow="Field Service · Documentos" title="RTO Encerrados" description="Relatórios técnicos aprovados, versionados e armazenados com hash de integridade." /><OneitSection className="mt-6" title="Relatórios disponíveis" description="Faça o download da versão registrada para consulta ou envio ao cliente.">{(reports ?? []).length ? <div className="-mx-5 divide-y divide-slate-100">{(reports ?? []).map((report) => <article key={report.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"><div><p className="font-semibold">OS {report.service_order_id} · Chamado {report.ticket_id}</p><p className="mt-1 text-sm text-slate-500">Versão {report.report_version} · {formatDate(report.generated_at)}</p><p className="mt-1 font-mono text-xs text-slate-400">SHA-256: {report.sha256 ?? "pendente"}</p></div><Link href={`/api/field-service/rto?reportId=${report.id}&redirect=1`} target="_blank" rel="noreferrer" className="oneit-btn oneit-btn--primary">Baixar PDF</Link></article>)}</div> : <OneitEmptyState title="Nenhum RTO gerado" description="Após a aprovação de uma OS, o relatório técnico aparecerá nesta lista." />}</OneitSection></main>;
}
