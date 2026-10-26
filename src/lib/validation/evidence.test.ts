import { describe, expect, it } from "vitest";
import { MAX_EVIDENCE_BYTES, materialUsageSchema, validateEvidenceBytes } from "./evidence";

describe("evidence validation", () => {
  it("recognizes signatures and rejects mismatched MIME or other files", () => {
    expect(validateEvidenceBytes(new Uint8Array([255, 216, 255, 224]), "image/jpeg")).toBe("image/jpeg");
    expect(() => validateEvidenceBytes(new Uint8Array([255, 216, 255, 224]), "image/png")).toThrow();
    expect(() => validateEvidenceBytes(new TextEncoder().encode("<svg>unsafe</svg>"), "image/png")).toThrow();
  });
  it("rejects empty and oversized uploads", () => {
    expect(() => validateEvidenceBytes(new Uint8Array(), "image/jpeg")).toThrow();
    expect(() => validateEvidenceBytes(new Uint8Array(MAX_EVIDENCE_BYTES + 1), "image/jpeg")).toThrow();
  });
});
describe("material usage", () => {
  const usage = { ticketId: "019cda50-f764-7a5e-9101-513020ce22e8", materialId: "019cda50-f764-7a5e-9101-513020ce22e9" };
  it("allows fractional cable quantities but rejects zero, negative or excessive precision", () => {
    expect(materialUsageSchema.safeParse({ ...usage, quantity: "2.125" }).success).toBe(true);
    for (const quantity of [0, -1, 100001, 0.0001]) expect(materialUsageSchema.safeParse({ ...usage, quantity }).success).toBe(false);
  });
});
