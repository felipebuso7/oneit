import { describe, expect, it } from "vitest";
import { priorityPolicySchema } from "./priority-policy";

describe("priority policy", () => it("accepts only supported impact, urgency and priority", () => {
  const base = { organizationId: "019cda50-f764-7a5e-9101-513020ce22e8", impact: "HIGH", urgency: "MEDIUM", priority: "2" };
  expect(priorityPolicySchema.safeParse(base).success).toBe(true);
  expect(priorityPolicySchema.safeParse({ ...base, priority: "6" }).success).toBe(false);
  expect(priorityPolicySchema.safeParse({ ...base, impact: "CRITICAL" }).success).toBe(false);
}));
