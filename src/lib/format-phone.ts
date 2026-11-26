export function formatPhone(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/\D/g, "");
  const normalized = digits.length === 13 && digits.startsWith("55") ? digits.slice(2) : digits;

  if (normalized.length === 11) {
    return `(${normalized.slice(0, 2)}) ${normalized.slice(2, 7)}-${normalized.slice(7)}`;
  }

  if (normalized.length === 10) {
    return `(${normalized.slice(0, 2)}) ${normalized.slice(2, 6)}-${normalized.slice(6)}`;
  }

  return value?.trim() || "Não informado";
}
