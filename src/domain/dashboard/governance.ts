export type GovernanceRecord = { status: string };

export function governanceMetrics(input: { nonconformities: GovernanceRecord[]; risks: GovernanceRecord[]; audits: GovernanceRecord[]; objectives: GovernanceRecord[]; reviews: GovernanceRecord[] }) {
  const count = (records: GovernanceRecord[], status: string) => records.filter((record) => record.status === status).length;
  return {
    openNonconformities: input.nonconformities.filter((record) => record.status !== "CLOSED").length,
    risksInTreatment: count(input.risks, "TREATMENT"),
    activeRisks: input.risks.filter((record) => record.status !== "CLOSED").length,
    activeAudits: input.audits.filter((record) => record.status !== "COMPLETED").length,
    objectivesActive: count(input.objectives, "ACTIVE"),
    objectivesAchieved: count(input.objectives, "ACHIEVED"),
    objectivesNotAchieved: count(input.objectives, "NOT_ACHIEVED"),
    reviewsOpen: input.reviews.filter((record) => record.status !== "COMPLETED").length,
  };
}
