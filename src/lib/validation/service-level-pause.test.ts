import { describe, expect, it } from "vitest";
import { serviceLevelPauseSchema } from "./service-level-pause";
describe("service level pause", () => it("requires a versioned ticket and an explicit reason", () => { const value = { ticketId: "019cda50-f764-7a5e-9101-513020ce22e8", version: "3", reason: "Aguardando autorização formal do cliente" }; expect(serviceLevelPauseSchema.safeParse(value).success).toBe(true); expect(serviceLevelPauseSchema.safeParse({ ...value, reason: "curto" }).success).toBe(false); }));
