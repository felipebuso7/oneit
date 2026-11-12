import type { SupabaseClient } from "@supabase/supabase-js";
import { ticketFieldProgress, type TicketFieldProgress } from "./ticket-progress";

/** Read through the authenticated client: no admin key or local data fallback. */
export async function loadTicketFieldProgress(
  supabase: SupabaseClient,
  tickets: Array<{ id: string; administrative_status: string }>,
): Promise<Map<string, TicketFieldProgress | null>> {
  const result = new Map<string, TicketFieldProgress | null>();
  // Small ID batches keep URLs bounded. Paginate instead of truncating OS history.
  for (let batch = 0; batch < tickets.length; batch += 100) {
    const subset = tickets.slice(batch, batch + 100);
    const latestOrders = new Map<string, { id: string; status: string }>();
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from("service_orders")
        .select("id,ticket_id,status,created_at").in("ticket_id", subset.map((ticket) => ticket.id))
        .order("created_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + 499);
      if (error) throw new Error("Não foi possível consultar a etapa das OS. Atualize a fila para tentar novamente.");
      for (const order of data ?? []) if (!latestOrders.has(order.ticket_id)) latestOrders.set(order.ticket_id, order);
      if ((data?.length ?? 0) < 500) break;
    }
    const approvedIds = [...latestOrders.values()].filter((order) => order.status === "VALIDATED").map((order) => order.id);
    const reports = new Map<string, { storage_path: string | null }>();
    if (approvedIds.length) {
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from("field_service_rto_reports")
          .select("id,service_order_id,storage_path,report_version").in("service_order_id", approvedIds)
          .order("report_version", { ascending: false }).order("id", { ascending: false }).range(offset, offset + 499);
        if (error) throw new Error("Não foi possível consultar os RTOs. Atualize a fila para tentar novamente.");
        for (const report of data ?? []) if (!reports.has(report.service_order_id)) reports.set(report.service_order_id, report);
        if ((data?.length ?? 0) < 500) break;
      }
    }
    for (const ticket of subset) {
      const order = latestOrders.get(ticket.id);
      result.set(ticket.id, ticketFieldProgress(ticket.administrative_status, order, order ? reports.get(order.id) : undefined));
    }
  }
  return result;
}
