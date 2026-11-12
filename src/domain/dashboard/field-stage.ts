export type FieldStage = "scheduled" | "traveling" | "onSite" | null;

/** Scheduled work is a commitment, not evidence that execution has started. */
export function fieldStage(status: string, source: "ticket" | "order"): FieldStage {
  if (source === "order") {
    if (status === "DISPATCHED") return "scheduled";
    if (status === "TRAVELING") return "traveling";
    if (["CHECKED_IN", "IN_SERVICE"].includes(status)) return "onSite";
  } else {
    if (["SCHEDULED", "ASSIGNED"].includes(status)) return "scheduled";
    if (status === "TRAVEL_STARTED") return "traveling";
    if (["ON_SITE", "WORK_STARTED", "IN_PROGRESS"].includes(status)) return "onSite";
  }
  return null;
}

export function isInField(status: string, source: "ticket" | "order") {
  const stage = fieldStage(status, source);
  return stage === "traveling" || stage === "onSite";
}
