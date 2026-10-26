export type ValidationPricedVisit = { id: string; state?: string; lpuCode?: string; lpuDescription?: string; quotedAmount?: number };
export type ValidationLpuItem = { code: string; description?: string; price: number; active: boolean };

export function pricePendingVisit<T extends ValidationPricedVisit>(visits: T[], visitId: string, item: ValidationLpuItem): T[] {
  if (!item.active || !item.code.trim() || !Number.isFinite(item.price) || item.price < 0) throw new Error("INVALID_LPU");
  const visit = visits.find((value) => value.id === visitId);
  if (!visit || visit.state !== "Aguardando validação do gestor") throw new Error("VISIT_NOT_PENDING");
  return visits.map((value) => value.id === visitId ? { ...value, lpuCode: item.code, lpuDescription: item.description?.trim() || item.code, quotedAmount: item.price } : value);
}
