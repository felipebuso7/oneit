import { fieldStage, isInField } from "./field-stage";
const pending = new Set(["PENDING_CUSTOMER", "PENDING_ACCESS", "PENDING_MATERIAL", "PENDING_THIRD_PARTY", "PENDING_CLIENT_IT", "WAITING_AUTHORIZATION"]);
const terminal = new Set(["TECHNICALLY_COMPLETED", "OUT_OF_SCOPE", "CANCELLED", "DUPLICATE", "INVALID"]);
export type DashboardTicket = { operational_status: string; administrative_status: string; opened_at: string; updated_at: string };
export function dashboardMetrics(tickets: DashboardTicket[], now = Date.now()) {
  const open = tickets.filter((ticket) => ticket.administrative_status !== "CLOSED" && !terminal.has(ticket.operational_status));
  const dayAgo = now - 24 * 60 * 60_000;
  return {
    total: tickets.length, backlog: open.length, pending: open.filter((ticket) => pending.has(ticket.operational_status)).length,
    field: open.filter((ticket) => isInField(ticket.operational_status, "ticket")).length,
    scheduled: open.filter((ticket) => fieldStage(ticket.operational_status, "ticket") === "scheduled").length,
    awaitingReview: tickets.filter((ticket) => ticket.administrative_status === "AWAITING_REVIEW").length,
    openedLast24h: tickets.filter((ticket) => Date.parse(ticket.opened_at) >= dayAgo).length,
    agedOver48h: open.filter((ticket) => Date.parse(ticket.opened_at) < now - 48 * 60 * 60_000).length,
  };
}
