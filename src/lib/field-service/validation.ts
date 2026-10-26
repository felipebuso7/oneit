/** Regras compartilhadas dos cadastros operacionais do Field Service. */
export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function isValidCnpj(value: string) {
  const digits = digitsOnly(value);
  return digits.length === 14;
}

export function isValidPhone(value: string) {
  const digits = digitsOnly(value);
  return digits.length === 10 || digits.length === 11;
}
