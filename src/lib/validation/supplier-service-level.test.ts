import { describe, expect, it } from "vitest";
import { supplierServiceLevelSchema, supplierSlaRecordSchema } from "./supplier-service-level";

const id = "550e8400-e29b-41d4-a716-446655440000";

describe("supplier service levels", () => {
  it("validates contracted targets and breach records", () => {
    expect(supplierServiceLevelSchema.safeParse({ organizationId: id, supplierId: id, serviceName: "Suporte N1", metricName: "Tempo de resposta", targetValue: 30, unit: "MINUTES", measurementFrequency: "PER_EVENT" }).success).toBe(true);
    expect(supplierSlaRecordSchema.safeParse({ organizationId: id, supplierId: id, serviceLevelId: id, measuredValue: 45, compliant: false, periodStart: "2026-10-01", periodEnd: "2026-10-08" }).success).toBe(true);
    expect(supplierSlaRecordSchema.safeParse({ organizationId: id, supplierId: id, serviceLevelId: id, measuredValue: 45, compliant: false, periodStart: "2026-10-09", periodEnd: "2026-10-08" }).success).toBe(false);
  });
});
