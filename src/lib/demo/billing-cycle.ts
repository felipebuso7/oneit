export type DemoCycleStatus = "DRAFT" | "READY_FOR_REVIEW" | "SENT_FOR_CONTESTATION" | "APPROVED" | "SENT_TO_TAX" | "RETURNED_FOR_CORRECTION" | "SENT_TO_BILLING" | "CLOSED";

export type DemoBillingCycle = {
  status: DemoCycleStatus;
  updatedAt?: string;
  total?: number;
  orderCount?: number;
  simulatedBmAt?: string;
  simulatedFiscalAt?: string;
  correctionRequestedAt?: string;
  closedAt?: string;
};

const nextStates: Record<DemoCycleStatus, DemoCycleStatus[]> = {
  DRAFT: ["READY_FOR_REVIEW"],
  READY_FOR_REVIEW: ["SENT_FOR_CONTESTATION"],
  SENT_FOR_CONTESTATION: ["APPROVED"],
  APPROVED: ["SENT_TO_TAX"],
  SENT_TO_TAX: ["RETURNED_FOR_CORRECTION", "SENT_TO_BILLING"],
  RETURNED_FOR_CORRECTION: ["READY_FOR_REVIEW"],
  SENT_TO_BILLING: ["CLOSED"],
  CLOSED: [],
};

/** Apenas progride a demonstração local; não confirma envio, entrega ou bloqueio no servidor. */
export function advanceDemoBillingCycle(
  current: DemoBillingCycle | null,
  next: DemoCycleStatus,
  snapshot: { total: number; orderCount: number; at: string },
): DemoBillingCycle {
  const previous = current?.status ?? "DRAFT";
  if (!nextStates[previous].includes(next)) throw new Error("INVALID_DEMO_BILLING_TRANSITION");
  return {
    ...current,
    status: next,
    updatedAt: snapshot.at,
    total: snapshot.total,
    orderCount: snapshot.orderCount,
    ...(next === "SENT_TO_TAX" ? { simulatedBmAt: snapshot.at } : {}),
    ...(next === "RETURNED_FOR_CORRECTION" ? { correctionRequestedAt: snapshot.at } : {}),
    ...(next === "CLOSED" ? { simulatedFiscalAt: snapshot.at, closedAt: snapshot.at } : {}),
  };
}
