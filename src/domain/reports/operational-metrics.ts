export type ReportTicket = { id: string; opened_at: string; closed_at: string | null };
export type ReportLevel = { ticket_id: string; resolution_due_at: string };

export function operationalReportMetrics(tickets: ReportTicket[], levels: ReportLevel[], startAt: number, endAt = Date.now()) {
  const inPeriod = (date: string | null) => date !== null && Date.parse(date) >= startAt && Date.parse(date) <= endAt;
  const opened = tickets.filter((ticket) => inPeriod(ticket.opened_at));
  const closed = tickets.filter((ticket) => inPeriod(ticket.closed_at));
  const averageClosureHours = closed.length ? closed.reduce((sum, ticket) => sum + (Date.parse(ticket.closed_at!) - Date.parse(ticket.opened_at)) / 3_600_000, 0) / closed.length : null;
  const levelsByTicket = new Map(levels.map((level) => [level.ticket_id, level]));
  const closedWithSla = closed.filter((ticket) => levelsByTicket.has(ticket.id));
  const resolutionMet = closedWithSla.filter((ticket) => Date.parse(ticket.closed_at!) <= Date.parse(levelsByTicket.get(ticket.id)!.resolution_due_at));
  return {
    opened: opened.length,
    closed: closed.length,
    closureRate: opened.length ? (closed.length / opened.length) * 100 : null,
    averageClosureHours,
    closedWithSla: closedWithSla.length,
    resolutionMet: resolutionMet.length,
    resolutionCompliance: closedWithSla.length ? (resolutionMet.length / closedWithSla.length) * 100 : null,
  };
}
