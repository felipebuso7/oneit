/** Helpers for preparing a WhatsApp conversation; they do not send a message. */
export function whatsappRecipient(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) return digits;
  return "";
}

export function isShareableAccessLink(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return (url.protocol === "https:" || url.protocol === "http:")
      && host !== "localhost" && !host.endsWith(".localhost")
      && !host.startsWith("127.") && host !== "[::1]" && host !== "0.0.0.0";
  } catch {
    return false;
  }
}
