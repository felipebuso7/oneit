const terminal = new Set(["TECHNICALLY_COMPLETED", "OUT_OF_SCOPE", "CANCELLED", "DUPLICATE", "INVALID"]);

export type InsightTicket = { operational_status: string; priority: number; opened_at: string };

function countBy<T extends string | number>(values: T[]) {
  return [...values.reduce((result, value) => result.set(value, (result.get(value) ?? 0) + 1), new Map<T, number>()).entries()].sort(([, left], [, right]) => right - left);
}

export function operationalInsights(tickets: InsightTicket[], days: number, now = Date.now()) {
  const start = now - days * 24 * 60 * 60_000;
  const active = tickets.filter((ticket) => !terminal.has(ticket.operational_status));
  return {
    openedInPeriod: tickets.filter((ticket) => Date.parse(ticket.opened_at) >= start).length,
    activeByStatus: countBy(active.map((ticket) => ticket.operational_status)),
    activeByPriority: countBy(active.map((ticket) => ticket.priority)),
  };
}
