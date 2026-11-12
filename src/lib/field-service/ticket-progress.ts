export type TicketFieldProgress = {
  label: "Aguardando validação" | "RTO pendente" | "Aguardando encerramento";
  action: "Validar OS" | "Gerar RTO" | "Encerrar chamado";
  orderId: string;
};

export function ticketFieldProgress(
  administrativeStatus: string,
  order: { id: string; status: string } | undefined,
  latestReport: { storage_path: string | null } | undefined,
): TicketFieldProgress | null {
  if (administrativeStatus === "CLOSED" || !order) return null;
  if (order.status === "COMPLETED") return { label: "Aguardando validação", action: "Validar OS", orderId: order.id };
  if (order.status !== "VALIDATED") return null;
  return latestReport?.storage_path?.trim()
    ? { label: "Aguardando encerramento", action: "Encerrar chamado", orderId: order.id }
    : { label: "RTO pendente", action: "Gerar RTO", orderId: order.id };
}
