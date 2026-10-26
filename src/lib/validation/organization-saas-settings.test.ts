import { describe, expect, it } from "vitest";
import { organizationSaasSettingsSchema } from "./organization-saas-settings";

describe("organizationSaasSettingsSchema", () => {
  const valid = { organizationId: "ecf91420-c550-4e87-88d9-f76f924a0b41", locale: "pt-BR", timezone: "America/Sao_Paulo", primaryColor: "#0B3558", secondaryColor: "" };
  it("accepts bounded tenant configuration", () => expect(organizationSaasSettingsSchema.safeParse(valid).success).toBe(true));
  it("rejects arbitrary styling", () => expect(organizationSaasSettingsSchema.safeParse({ ...valid, primaryColor: "url(javascript:bad)" }).success).toBe(false));
});
