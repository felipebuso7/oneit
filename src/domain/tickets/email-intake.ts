export type EmailIntakeStatus = "CREATE_TICKET" | "IGNORE_BLOCKLIST" | "IGNORE_DUPLICATE" | "REJECT_INVALID";
export type EmailIntakeInput = { senderEmail: string; subject: string; body: string; providerMessageId: string; blockedSenders: string[]; processedMessageIds: string[] };
export type EmailIntakeDecision = { status: EmailIntakeStatus; normalizedSender?: string; reason?: string };

export function decideEmailIntake(input: EmailIntakeInput): EmailIntakeDecision {
  const sender = input.senderEmail.trim().toLocaleLowerCase();
  const messageId = input.providerMessageId.trim();
  if (!/^\S+@\S+\.\S+$/.test(sender) || !messageId || !input.subject.trim() || !input.body.trim()) return { status: "REJECT_INVALID", reason: "Mensagem sem remetente, identificador, assunto ou conteúdo válido." };
  if (input.processedMessageIds.includes(messageId)) return { status: "IGNORE_DUPLICATE", normalizedSender: sender, reason: "Mensagem já processada." };
  if (input.blockedSenders.map((value) => value.trim().toLocaleLowerCase()).includes(sender)) return { status: "IGNORE_BLOCKLIST", normalizedSender: sender, reason: "Remetente bloqueado." };
  return { status: "CREATE_TICKET", normalizedSender: sender };
}

