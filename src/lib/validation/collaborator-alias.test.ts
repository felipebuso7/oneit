import { describe, expect, it } from "vitest";
import { collaboratorAliasSchema } from "./collaborator-alias";
describe("collaborator aliases", () => it("requires a valid email alias", () => { const value = { collaboratorId: "019cda50-f764-7a5e-9101-513020ce22e8", email: "alias@oneit.example", isPrimary: false }; expect(collaboratorAliasSchema.safeParse(value).success).toBe(true); expect(collaboratorAliasSchema.safeParse({ ...value, email: "alias" }).success).toBe(false); }));
