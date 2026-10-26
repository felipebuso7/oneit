export type BillingMaterial = { code?: string; description: string; quantity: number; unitPrice: number };
export type BillingOrder = { id: string; ticket: string; title: string; company?: string; department?: string; technician?: string; externalOs?: string; completedAt?: string; state?: string; administrativeStatus?: string; lpuCode?: string; lpuDescription?: string; servicePrice: number; materials?: BillingMaterial[] };
export type BillingLine = { orderId: string; ticket: string; externalOs?: string; company: string; department: string; technician: string; code?: string; description: string; kind: "SERVICE" | "MATERIAL"; quantity: number; unitPrice: number; total: number };
export type BillingSummary = { competence: string; orders: BillingOrder[]; lines: BillingLine[]; macro: Array<{ code?: string; description: string; kind: BillingLine["kind"]; orders: number; quantity: number; total: number }>; serviceTotal: number; materialTotal: number; total: number };

const cents = (value: number) => Math.round((Number.isFinite(value) ? value : 0) * 100);
const money = (value: number) => cents(value) / 100;

export function buildBillingSummary(competence: string, source: BillingOrder[]): BillingSummary {
  const orders = source.filter((order) => order.completedAt?.startsWith(competence) && (!order.state || order.state === "Concluído") && (!order.administrativeStatus || ["CLOSED", "CONCLUDED", "VALIDATED"].includes(order.administrativeStatus)));
  const lines: BillingLine[] = [];
  orders.forEach((order) => {
    const context = { orderId: order.id, ticket: order.ticket, externalOs: order.externalOs, company: order.company ?? "", department: order.department ?? "", technician: order.technician ?? "" };
    if (order.servicePrice > 0) lines.push({ ...context, code: order.lpuCode, description: order.lpuDescription || order.lpuCode || "Serviço de campo", kind: "SERVICE", quantity: 1, unitPrice: money(order.servicePrice), total: money(order.servicePrice) });
    (order.materials ?? []).filter((item) => item.quantity > 0 && item.unitPrice > 0).forEach((item) => lines.push({ ...context, code: item.code, description: item.description, kind: "MATERIAL", quantity: item.quantity, unitPrice: money(item.unitPrice), total: money(item.quantity * item.unitPrice) }));
  });
  const macroMap = new Map<string, BillingSummary["macro"][number]>();
  lines.forEach((line) => { const key = `${line.kind}:${line.code ?? line.description}`; const current = macroMap.get(key) ?? { code: line.code, description: line.description, kind: line.kind, orders: 0, quantity: 0, total: 0 }; current.orders += 1; current.quantity = money(current.quantity + line.quantity); current.total = money(current.total + line.total); macroMap.set(key, current); });
  const serviceTotal = money(lines.filter((line) => line.kind === "SERVICE").reduce((sum, line) => sum + line.total, 0));
  const materialTotal = money(lines.filter((line) => line.kind === "MATERIAL").reduce((sum, line) => sum + line.total, 0));
  return { competence, orders, lines, macro: [...macroMap.values()], serviceTotal, materialTotal, total: money(serviceTotal + materialTotal) };
}

export function billingCsv(summary: BillingSummary): string {
  const rows = [["Competência", "OS", "Chamado", "Empresa", "Polo", "Técnico", "Tipo", "Código", "Item", "Quantidade", "Preço unitário", "Total"], ...summary.lines.map((line) => [summary.competence, line.externalOs ?? line.orderId, line.ticket, line.company, line.department, line.technician, line.kind === "SERVICE" ? "Serviço" : "Material", line.code ?? "", line.description, line.quantity, line.unitPrice.toFixed(2), line.total.toFixed(2)])];
  return rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";")).join("\n");
}
