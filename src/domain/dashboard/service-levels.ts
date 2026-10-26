const terminal = new Set(["TECHNICALLY_COMPLETED", "OUT_OF_SCOPE", "CANCELLED", "DUPLICATE", "INVALID"]);
export type ServiceLevelTicket = { id: string; operational_status: string };
export type ServiceLevelSnapshot = { ticket_id: string; response_due_at: string; resolution_due_at: string; ola_due_at: string; response_met_at: string | null; ola_met_at: string | null };
type DueField = "response_due_at" | "resolution_due_at" | "ola_due_at";
type MetField = "response_met_at" | "ola_met_at" | null;
function metricsFor(tickets: ServiceLevelTicket[], levels: ServiceLevelSnapshot[], dueField: DueField, metField: MetField, pausedTicketIds: readonly string[] = [], now = Date.now()) {
  const active = new Map(tickets.filter((ticket) => !terminal.has(ticket.operational_status)).map((ticket) => [ticket.id, ticket]));
  const visible = levels.filter((level) => active.has(level.ticket_id));
  const paused = new Set(pausedTicketIds);
  const pending = metField ? visible.filter((level) => level[metField] === null) : visible;
  return { configured: visible.length, paused: pending.filter((level) => paused.has(level.ticket_id)).length, overdue: pending.filter((level) => !paused.has(level.ticket_id) && Date.parse(level[dueField]) < now).length };
}
export function resolutionMetrics(tickets: ServiceLevelTicket[], levels: ServiceLevelSnapshot[], pausedTicketIds: readonly string[] = [], now = Date.now()) { return metricsFor(tickets, levels, "resolution_due_at", null, pausedTicketIds, now); }
export function responseMetrics(tickets: ServiceLevelTicket[], levels: ServiceLevelSnapshot[], pausedTicketIds: readonly string[] = [], now = Date.now()) { return metricsFor(tickets, levels, "response_due_at", "response_met_at", pausedTicketIds, now); }
export function olaMetrics(tickets: ServiceLevelTicket[], levels: ServiceLevelSnapshot[], pausedTicketIds: readonly string[] = [], now = Date.now()) { return metricsFor(tickets, levels, "ola_due_at", "ola_met_at", pausedTicketIds, now); }
