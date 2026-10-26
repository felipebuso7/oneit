import { describe, expect, it } from "vitest";
import { inboundEmailExclusionSchema, inboundEmailInboxSchema } from "./inbound-email";

const organizationId = "e29bea2f-a630-47eb-b8a5-326555915e02";
describe("inbound email validation", () => {
  it("accepts a Gmail app-password secret reference and a two-minute polling schedule", () => {
    expect(inboundEmailInboxSchema.safeParse({ organizationId, displayName: "Suporte", mailboxAddress: "suporte@empresa.com.br", provider: "GMAIL_IMAP", credentialSecretRef: "vault://oneit/inboxes/suporte", pollingIntervalMinutes: 2 }).success).toBe(true);
  });
  it("does not accept a raw password as the secret reference", () => {
    expect(inboundEmailInboxSchema.safeParse({ organizationId, displayName: "Suporte", mailboxAddress: "suporte@empresa.com.br", provider: "GMAIL_IMAP", credentialSecretRef: "senha com espaço", pollingIntervalMinutes: 2 }).success).toBe(false);
  });
  it("requires a justification for a blocked sender", () => {
    expect(inboundEmailExclusionSchema.safeParse({ inboxId: organizationId, senderEmail: "spam@exemplo.com", reason: "Spam recorrente sem solicitação de atendimento." }).success).toBe(true);
    expect(inboundEmailExclusionSchema.safeParse({ inboxId: organizationId, senderEmail: "spam@exemplo.com", reason: "spam" }).success).toBe(false);
  });
});

