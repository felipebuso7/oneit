import { requireUser } from "@/lib/auth/current-user";
import { createServiceOrder, dispatchServiceOrder } from "./actions";
import { OneitButton, OneitEmptyState, OneitPageHeader, OneitSection, OneitStatusBadge } from "@/components/oneit";

type PageProps = { searchParams: Promise<{ message?: string }> };
const statusLabels: Record<string, string> = { TRIAGE: "Aguardando despacho", ASSIGNED: "Atribuída", TRAVEL_STARTED: "Em deslocamento", ON_SITE: "No local", IN_PROGRESS: "Em execução", COMPLETED: "Concluída", CANCELLED: "Cancelada" };

export default async function ServiceOrdersPage({ searchParams }: PageProps) {
  const { supabase, user } = await requireUser();
  const { message } = await searchParams;
  const { data: roles } = await supabase.from("user_roles").select("organization_id").eq("user_id", user.id).in("role", ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER", "DISPATCHER"]);
  const organizationIds = [...new Set((roles ?? []).map((role) => role.organization_id))];
  const [{ data: tickets }, { data: orders }, { data: technicians }] = await Promise.all([
    supabase.from("tickets").select("id,ticket_number,title,location_id").in("organization_id", organizationIds).order("created_at", { ascending: false }).limit(100),
    supabase.from("service_orders").select("id,order_number,status,scheduled_at,technician_id,ticket_id").in("organization_id", organizationIds).order("created_at", { ascending: false }).limit(200),
    supabase.from("technicians").select("id,full_name").in("organization_id", organizationIds).eq("active", true).order("full_name").limit(200),
  ]);
  const techniciansById = new Map((technicians ?? []).map((technician) => [technician.id, technician.full_name]));
  const ticketsById = new Map((tickets ?? []).map((ticket) => [ticket.id, ticket]));

  const statusTone = (status: string) => status === "COMPLETED" ? "success" as const : status === "IN_PROGRESS" ? "info" as const : status === "CANCELLED" ? "danger" as const : "neutral" as const;
  return <main className="mx-auto max-w-6xl space-y-6 p-6 sm:p-8">
    <OneitPageHeader eyebrow="Field Service · Despacho" title="Ordens de serviço" description="Crie uma ordem a partir do chamado e despache para um técnico responsável." />
    {message && <p role="status" className="rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">{message}</p>}
    <form action={createServiceOrder} className="grid gap-4 rounded-xl border bg-white p-5 md:grid-cols-[1fr_auto_auto]">
      <label className="grid gap-1 text-sm font-medium">Chamado<select name="ticketId" required className="rounded-lg border px-3 py-2 font-normal"><option value="">Selecione o chamado</option>{(tickets ?? []).map((ticket) => <option key={ticket.id} value={ticket.id}>{ticket.ticket_number} · {ticket.title}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-medium">Agenda inicial<input name="scheduledAt" type="datetime-local" className="rounded-lg border px-3 py-2 font-normal" /></label>
      <div className="flex items-end"><OneitButton type="submit" className="w-full">Criar OS</OneitButton></div>
    </form>
    <OneitSection title="Fila de ordens" description="O despacho e a agenda ficam registrados com rastreabilidade.">{(orders ?? []).length === 0 ? <OneitEmptyState title="Nenhuma ordem de serviço" description="Crie uma OS a partir de um chamado para iniciar o despacho." /> : <div className="-mx-5 divide-y divide-slate-100">{(orders ?? []).map((order) => { const ticket = ticketsById.get(order.ticket_id); return <article key={order.id} className="px-5 py-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold text-[#0b4a64]">{order.order_number}</p><p className="mt-1 text-sm text-slate-600">{ticket ? ticket.ticket_number + " · " + ticket.title : "Chamado associado"}</p></div><div className="text-right text-sm"><OneitStatusBadge tone={statusTone(order.status)}>{statusLabels[order.status] ?? order.status}</OneitStatusBadge><p className="mt-1 text-slate-500">{order.scheduled_at ? new Date(order.scheduled_at).toLocaleString("pt-BR") : "Sem agenda"}</p></div></div>{order.status === "TRIAGE" ? <form action={dispatchServiceOrder} className="mt-4 flex flex-wrap gap-2"><input type="hidden" name="orderId" value={order.id}/><select name="technicianId" required className="rounded-lg border px-3 py-2 text-sm"><option value="">Selecionar técnico</option>{(technicians ?? []).map((technician) => <option key={technician.id} value={technician.id}>{technician.full_name}</option>)}</select><input name="scheduledAt" type="datetime-local" className="rounded-lg border px-3 py-2 text-sm"/><button className="rounded-lg border border-[#0b4a64] px-3 py-2 text-sm font-semibold text-[#0b4a64]">Despachar</button></form> : <p className="mt-3 text-sm text-slate-500">Técnico: {order.technician_id ? techniciansById.get(order.technician_id) ?? "Não encontrado" : "Não atribuído"}</p>}</article>; })}</div>}</OneitSection>
  </main>;
}
