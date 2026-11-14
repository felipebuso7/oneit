"use client";

import { useState } from "react";

type Mask = "phone" | "cpf" | "cnpj" | "cep";

function format(value: string, mask: Mask) {
  const digits = value.replace(/\D/g, "");
  if (mask === "phone") {
    const d = digits.slice(0, 11);
    return d.length <= 10 ? d.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*$/, (_, a, b, c) => [a && `(${a}`, a && b ? ") " : "", b, b && c ? "-" : "", c].join("")) : d.replace(/^(\d{0,2})(\d{0,5})(\d{0,4}).*$/, (_, a, b, c) => [a && `(${a}`, a && b ? ") " : "", b, b && c ? "-" : "", c].join(""));
  }
  if (mask === "cpf") return digits.slice(0, 11).replace(/^(\d{0,3})(\d{0,3})(\d{0,3})(\d{0,2}).*$/, (_, a, b, c, d) => [a, b && `.${b}`, c && `.${c}`, d && `-${d}`].join(""));
  if (mask === "cnpj") return digits.slice(0, 14).replace(/^(\d{0,2})(\d{0,3})(\d{0,3})(\d{0,4})(\d{0,2}).*$/, (_, a, b, c, d, e) => [a, b && `.${b}`, c && `.${c}`, d && `/${d}`, e && `-${e}`].join(""));
  return digits.slice(0, 8).replace(/^(\d{0,5})(\d{0,3}).*$/, (_, a, b) => [a, b && `-${b}`].join(""));
}

export function OneitMaskedInput({ mask, defaultValue = "", ...props }: React.InputHTMLAttributes<HTMLInputElement> & { mask: Mask }) {
  const [value, setValue] = useState(() => format(String(defaultValue ?? ""), mask));
  return <input {...props} value={value} onChange={(event) => setValue(format(event.target.value, mask))} />;
}
