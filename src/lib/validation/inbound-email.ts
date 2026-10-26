import { z } from "zod";

const mailboxAddress = z.string().trim().email().max(320);
const secretReference = z.string().trim().regex(/^[A-Za-z0-9_./:-]{3,240}$/, "Use uma referência de segredo, não a senha.");
export const inboundEmailInboxSchema = z.object({
  organizationId: z.uuid(),
  displayName: z.string().trim().min(3).max(120),
  mailboxAddress,
  provider: z.enum(["GMAIL_IMAP", "OUTLOOK_IMAP", "GENERIC_IMAP"]),
  credentialSecretRef: secretReference,
  pollingIntervalMinutes: z.number().int().min(1).max(60).default(2),
});
export const inboundEmailExclusionSchema = z.object({
  inboxId: z.uuid(),
  senderEmail: mailboxAddress,
  reason: z.string().trim().min(5).max(1000),
});
export const inboundEmailImportSchema = z.object({
  inboxId: z.uuid(),
  organizationId: z.uuid(),
  providerMessageId: z.string().trim().min(1).max(1024),
  senderEmail: mailboxAddress,
  subject: z.string().trim().min(1).max(998),
  receivedAt: z.coerce.date(),
});

