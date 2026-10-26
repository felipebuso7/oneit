export type BillingEmailRequest = { to: string[]; subject: string; text: string; attachments: Array<{ filename: string; contentType: string; content: Uint8Array }> };
export type BillingEmailResult = { status: "SENT" | "QUEUED"; provider: string; providerMessageId?: string; reason?: string };

/** Contrato único para SMTP/Resend. Por padrão não envia mensagens reais. */
export async function sendBillingEmail(request: BillingEmailRequest): Promise<BillingEmailResult> {
  const mode = process.env.ONEIT_BILLING_EMAIL_MODE ?? "DRY_RUN";
  if (mode === "DRY_RUN") return { status: "QUEUED", provider: "DRY_RUN", reason: "EMAIL_PROVIDER_NOT_CONFIGURED" };
  if (mode === "RESEND") {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.ONEIT_BILLING_FROM_EMAIL;
    if (!apiKey || !from) return { status: "QUEUED", provider: "RESEND", reason: "RESEND_CONFIGURATION_MISSING" };
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: request.to, subject: request.subject, text: request.text, attachments: request.attachments.map((attachment) => ({ filename: attachment.filename, content: Buffer.from(attachment.content).toString("base64") })) }) });
    if (!response.ok) return { status: "QUEUED", provider: "RESEND", reason: `RESEND_HTTP_${response.status}` };
    const data = await response.json() as { id?: string };
    return { status: "SENT", provider: "RESEND", providerMessageId: data.id };
  }
  return { status: "QUEUED", provider: mode, reason: "EMAIL_ADAPTER_PENDING" };
}
