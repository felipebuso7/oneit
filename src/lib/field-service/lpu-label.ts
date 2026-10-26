export type LpuLabelItem = { code: string; description: string; unit?: string; price: number };

export function formatLpuLabel(item: LpuLabelItem) {
  const unit = item.unit?.trim() || "unidade";
  return `${item.code} · ${item.description} · ${unit} · R$ ${item.price.toFixed(2)}`;
}
