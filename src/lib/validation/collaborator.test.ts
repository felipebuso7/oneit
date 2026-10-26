import { describe, expect, it } from "vitest";
import { collaboratorSchema } from "./collaborator";
describe("collaborator", () => it("uses an internal identifier and treats email as optional mutable data", () => { const value = { organizationId: "019cda50-f764-7a5e-9101-513020ce22e8", employeeNumber: "EMP-100", fullName: "Pessoa Colaboradora", primaryEmail: "pessoa@oneit.example" }; expect(collaboratorSchema.safeParse(value).success).toBe(true); expect(collaboratorSchema.safeParse({ ...value, primaryEmail: "invalido" }).success).toBe(false); }));
