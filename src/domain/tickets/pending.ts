export const pendingLabels = {
  PENDING_CUSTOMER: "Aguardando cliente", PENDING_ACCESS: "Acesso indisponível", PENDING_MATERIAL: "Aguardando material",
  PENDING_THIRD_PARTY: "Dependência de terceiro", PENDING_CLIENT_IT: "Dependência de TI do cliente", WAITING_AUTHORIZATION: "Aguardando autorização",
} as const;
export type PendingStatus = keyof typeof pendingLabels;
const previousStates: Record<PendingStatus, readonly string[]> = {
  PENDING_CUSTOMER: ["TRIAGE", "IN_PROGRESS"], PENDING_ACCESS: ["TRAVEL_STARTED", "ON_SITE"],
  PENDING_MATERIAL: ["AWAITING_SCHEDULING", "WORK_STARTED", "IN_PROGRESS"], PENDING_THIRD_PARTY: ["IN_PROGRESS"],
  PENDING_CLIENT_IT: ["ON_SITE", "WORK_STARTED", "IN_PROGRESS"], WAITING_AUTHORIZATION: ["AWAITING_SCHEDULING"],
};
export function pendingOptions(status: string): PendingStatus[] {
  return (Object.keys(pendingLabels) as PendingStatus[]).filter((reason) => previousStates[reason].includes(status));
}
