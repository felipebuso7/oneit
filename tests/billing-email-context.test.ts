import { describe, expect, it } from "vitest";
import { billingEmailIdempotencyKey, fiscalEmailAllowed, measurementEmailAllowed } from "../src/lib/field-service/billing-email-context";

describe("contexto de envio do BM", () => {
  it("deduplica a mesma versão e permite uma versão corrigida", () => {
    const first = billingEmailIdempotencyKey({ emailType: "MEASUREMENT", measurementSheetId: "sheet-1", versionId: "version-1" });
    expect(first).toBe(billingEmailIdempotencyKey({ emailType: "MEASUREMENT", measurementSheetId: "sheet-1", versionId: "version-1" }));
    expect(first).not.toBe(billingEmailIdempotencyKey({ emailType: "MEASUREMENT", measurementSheetId: "sheet-1", versionId: "version-2" }));
    expect(billingEmailIdempotencyKey({ emailType: "FISCAL", fiscalBatchId: "batch-1" })).toBe("FISCAL:batch:batch-1");
  });

  it("bloqueia BM ou lote fora das etapas de envio", () => {
    expect(measurementEmailAllowed("READY_FOR_REVIEW", "DRAFT")).toBe(true);
    expect(measurementEmailAllowed("APPROVED", "APPROVED")).toBe(true);
    expect(measurementEmailAllowed("CLOSED", "APPROVED")).toBe(false);
    expect(measurementEmailAllowed("READY_FOR_REVIEW", "SUPERSEDED")).toBe(false);
    expect(fiscalEmailAllowed("READY")).toBe(true);
    expect(fiscalEmailAllowed("CLOSED")).toBe(false);
  });
});
