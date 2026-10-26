import { describe, expect, it } from "vitest";
import { decideEmailIntake } from "./email-intake";

const base = { senderEmail: "Suporte@Empresa.com.br", subject: "Ajuda", body: "Preciso de atendimento.", providerMessageId: "provider-123", blockedSenders: [], processedMessageIds: [] };
describe("email intake decision", () => {
  it("creates a ticket only for a valid new message", () => expect(decideEmailIntake(base)).toEqual({ status: "CREATE_TICKET", normalizedSender: "suporte@empresa.com.br" }));
  it("prevents the same provider message from creating a duplicate", () => expect(decideEmailIntake({ ...base, processedMessageIds: ["provider-123"] }).status).toBe("IGNORE_DUPLICATE"));
  it("blocks a configured sender before creating a ticket", () => expect(decideEmailIntake({ ...base, blockedSenders: ["suporte@empresa.com.br"] }).status).toBe("IGNORE_BLOCKLIST"));
});

