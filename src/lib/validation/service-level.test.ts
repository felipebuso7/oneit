import { describe, expect, it } from "vitest";
import { serviceLevelPolicySchema } from "./service-level";
const base = { contractId: "019cda50-f764-7a5e-9101-513020ce22e9", priority: "1", responseMinutes: "60", resolutionMinutes: "240", olaMinutes: "120" };
describe("service level policy", () => it("requires explicit bounded targets and coherent response/resolution", () => { expect(serviceLevelPolicySchema.safeParse(base).success).toBe(true); expect(serviceLevelPolicySchema.safeParse({ ...base, resolutionMinutes: "30" }).success).toBe(false); expect(serviceLevelPolicySchema.safeParse({ ...base, olaMinutes: "0" }).success).toBe(false); }));
