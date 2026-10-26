import { describe, expect, it } from "vitest";
import { featureFlagSchema } from "./feature-flag";
describe("feature flag", () => it("allows stable lower-case module flags", () => { const base = { organizationId: "019cda50-f764-7a5e-9101-513020ce22e8", flagKey: "csat_pilot", enabled: true }; expect(featureFlagSchema.safeParse(base).success).toBe(true); expect(featureFlagSchema.safeParse({ ...base, flagKey: "CSAT pilot" }).success).toBe(false); }));
