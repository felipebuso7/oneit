import { requireUser } from "@/lib/auth/current-user";
import { redirect } from "next/navigation";
import { CheckInForm } from "@/components/field/check-in-form";
import { ExecutionForm } from "@/components/field/execution-form";
import { Attachments } from "@/components/field/attachments";
import { CompletionForm } from "@/components/field/completion-form";
import { PendingForm } from "@/components/field/pending-form";
import { OfflineQueue } from "@/components/field/offline-queue";
import { OfflineMaterialQueue } from "@/components/field/offline-material-queue";
import { SaveOfflineAgenda } from "@/components/field/save-offline-agenda";
import { agendaSchema } from "@/lib/offline/agenda";
import { OneitEmptyState, OneitPageHeader, OneitStatusBadge } from "@/components/oneit";

type PageProps = { searchParams: Promise<{ message?: string }> };
const actions = {
  ASSIGNED: ["TRAVEL_STARTED", "Iniciar deslocamento"],
  TRAVEL_STARTED: ["ARRIVAL", "Registrar chegada"],
  ON_SITE: ["WORK_STARTED", "Iniciar atendimento"],
} as const;
const statusLabels: Record<string, string> = { ASSIGNED: "Atribuído", TRAVEL_STARTED: "Em deslocamento", ON_SITE: "No local", WORK_STARTED: "Atendimento iniciado", IN_PROGRESS: "Em execução" };

export default async function FieldPage({ searchParams }: PageProps) {
  const [{ supabase, user }, { message }] = await Promise.all([requireUser(), searchParams]);
  const { data: roles, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  if (roleError) throw new Error("Não foi possível validar o perfil do técnico.");
  if (!(roles ?? []).some((item) => item.role === "TECHNICIAN")) redirect("/portal?message=Acesso+restrito+ao+portal+de+campo.");
  const { data: technician, error: technicianError } = await supabase.from("technicians").select("id").eq("user_id", user.id).eq("active", true).maybeSingle();
  if (technicianError) throw new Error("Não foi possível carregar o perfil do técnico.");
  const { data: tickets, error } = await supabase.from("tickets")
    .select("id, organization_id, ticket_number, title, operational_status, administrative_status, scheduled_at, version")
    .eq("assigned_technician_id", technician?.id ?? "00000000-0000-0000-0000-000000000000")
    .in("operational_status", ["ASSIGNED", "TRAVEL_STARTED", "ON_SITE", "WORK_STARTED", "IN_PROGRESS"])
    .order("scheduled_at").limit(50);
  if (error) throw new Error("Não foi possível carregar a agenda.");
  const ids = (tickets ?? []).map((ticket) => ticket.id);
  const [{ data: snapshots, error: snapshotError }, { data: templates, error: templateError }, { data: records, error: recordError }] = await Promise.all([
    ids.length ? supabase.from("ticket_checklist_items").select("ticket_id, item_code, label, position, required").in("ticket_id", ids).order("position") : Promise.resolve({ data: [], error: null }),
    supabase.from("checklist_templates").select("organization_id, item_code, label, position, required").order("position"),
    ids.length ? supabase.from("ticket_execution_records").select("ticket_id, fault_domain, diagnosis, solution, checklist_answers, created_at").in("ticket_id", ids).order("created_at", { ascending: false }).limit(1000) : Promise.resolve({ data: [], error: null }),
  ]);
  if (snapshotError || templateError || recordError) throw new Error("Não foi possível carregar os registros de execução.");

  const { data: reviews, error: reviewsError } = ids.length ? await supabase.from("ticket_reviews").select("ticket_id, decision, reason, created_at").in("ticket_id", ids).order("created_at", { ascending: false }) : { data: [], error: null };
  if (reviewsError) throw new Error("Não foi possível carregar as devoluções.");
  const [{ data: materials, error: materialError }, { data: usages, error: usageError }, { data: evidences, error: evidenceError }] = await Promise.all([
    supabase.from("materials").select("id, organization_id, name, unit").eq("active", true).order("name"),
    ids.length ? supabase.from("ticket_materials").select("id, ticket_id, material_name, unit, quantity").in("ticket_id", ids).order("created_at") : Promise.resolve({ data: [], error: null }),
    ids.length ? supabase.from("ticket_evidences").select("id, ticket_id, evidence_type, size_bytes").in("ticket_id", ids).order("created_at") : Promise.resolve({ data: [], error: null }),
  ]);
  if (materialError || usageError || evidenceError) throw new Error("Não foi possível carregar materiais e evidências.");

  return <section className="mx-auto max-w-5xl p-5 sm:p-8">
    <OneitPageHeader eyebrow="Campo" title="Minha agenda" description="Atendimentos atribuídos, deslocamento e execução da OS." />
    <OfflineQueue ownerId={user.id} />
    <OfflineMaterialQueue ownerId={user.id} />
    <SaveOfflineAgenda agenda={agendaSchema.parse({ ownerId: user.id, fetchedAt: new Date().toISOString(), tickets: (tickets ?? []).map((ticket) => {
      const snapshot = (snapshots ?? []).filter((item) => item.ticket_id === ticket.id);
      const organizationTemplate = (templates ?? []).filter((item) => item.organization_id === ticket.organization_id);
      return { ...ticket, checklist: snapshot.length ? snapshot : organizationTemplate.length ? organizationTemplate : (templates ?? []).filter((item) => item.organization_id === null) };
    }) })} />
    {message ? <p role="status" className="mt-4 rounded bg-sky-100 p-3 text-sm text-sky-900">{message}</p> : null}
    {!tickets?.length ? <div className="mt-6"><OneitEmptyState title="Nenhuma OS atribuída" description="Quando um atendimento for despachado para você, ele aparecerá aqui com as próximas ações disponíveis." /></div> : null}
    <div className="mt-6 space-y-4">{(tickets ?? []).map((ticket) => {
      const action = actions[ticket.operational_status as keyof typeof actions];
      const snapshot = (snapshots ?? []).filter((item) => item.ticket_id === ticket.id);
      const organizationTemplate = (templates ?? []).filter((item) => item.organization_id === ticket.organization_id);
      const items = snapshot.length ? snapshot : organizationTemplate.length ? organizationTemplate : (templates ?? []).filter((item) => item.organization_id === null);
      const previous = (records ?? []).find((record) => record.ticket_id === ticket.id);
      return <article className="rounded-xl border bg-white p-5 shadow-sm" key={ticket.id}>
        <p className="text-sm font-medium text-slate-500">{ticket.ticket_number}</p>
        <h2 className="mt-1 text-lg font-semibold">{ticket.title}</h2>
        <div className="mt-2 flex items-center gap-2 text-sm text-slate-600"><span>Status:</span><OneitStatusBadge tone={ticket.operational_status === "IN_PROGRESS" ? "info" : ticket.operational_status === "ON_SITE" ? "warning" : "neutral"}>{statusLabels[ticket.operational_status] ?? ticket.operational_status}</OneitStatusBadge></div>
        {ticket.administrative_status === "RETURNED_TO_TECHNICIAN" ? <p className="mt-3 rounded bg-amber-100 p-3 text-sm">Correção solicitada: {(reviews ?? []).find((review) => review.ticket_id === ticket.id)?.reason}</p> : null}
        {action ? <CheckInForm ticketId={ticket.id} ownerId={user.id} version={ticket.version} eventType={action[0]} label={action[1]} /> :
          <ExecutionForm key={`${ticket.id}:${ticket.version}`} ownerId={user.id} ticketId={ticket.id} version={ticket.version} items={items} previous={previous} />}
        {["ON_SITE", "WORK_STARTED", "IN_PROGRESS"].includes(ticket.operational_status) ?
          <Attachments ownerId={user.id} ticketId={ticket.id} version={ticket.version} canAddMaterial={ticket.operational_status !== "ON_SITE"}
            materials={(materials ?? []).filter((item) => item.organization_id === null || item.organization_id === ticket.organization_id)}
            usages={(usages ?? []).filter((item) => item.ticket_id === ticket.id)}
            evidences={(evidences ?? []).filter((item) => item.ticket_id === ticket.id)} /> : null}
        {ticket.operational_status === "IN_PROGRESS" ? <CompletionForm ticketId={ticket.id} version={ticket.version} /> : null}
        <PendingForm ticketId={ticket.id} version={ticket.version} status={ticket.operational_status} />
      </article>;
    })}</div>
  </section>;
}
