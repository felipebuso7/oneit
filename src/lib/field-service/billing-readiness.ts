export type BillingLineReadiness = { ready: boolean; missing: string[] };

export function validateBillingLineReadiness(line: { ticket_number?: string; description?: string; quantity?: number; unit_price?: number; service_date?: string | null; service_location?: string | null }): BillingLineReadiness {
  const missing: string[] = [];
  if (!line.ticket_number?.trim()) missing.push("OS/chamado");
  if (!line.description?.trim()) missing.push("descrição");
  if (!Number.isFinite(Number(line.quantity)) || Number(line.quantity) <= 0) missing.push("quantidade");
  if (!Number.isFinite(Number(line.unit_price)) || Number(line.unit_price) < 0) missing.push("preço unitário");
  if (!line.service_date) missing.push("data de execução");
  if (!line.service_location?.trim()) missing.push("local/polo");
  return { ready: missing.length === 0, missing };
}
