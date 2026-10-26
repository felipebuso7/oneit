import { describe, expect, it } from "vitest";
import { emailTemplateSchema } from "./email-template";
describe("emailTemplateSchema", () => {
  const valid = { organizationId: "e29bea2f-a630-47eb-b8a5-326555915e02", templateKey: "ticket_created", subject: "Chamado {{ticket.number}}", bodyText: "Olá {{requester.name}}, chamado registrado." };
  it("permits only known placeholders", () => expect(emailTemplateSchema.safeParse(valid).success).toBe(true));
  it("rejects arbitrary markup and variables", () => expect(emailTemplateSchema.safeParse({ ...valid, bodyText: "<script>x</script>{{secret.token}}" }).success).toBe(false));
});
