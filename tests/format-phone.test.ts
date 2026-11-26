import { describe, expect, it } from "vitest";

import { formatPhone } from "@/lib/format-phone";

describe("formatPhone", () => {
  it("formats Brazilian mobile numbers", () => {
    expect(formatPhone("11999998888")).toBe("(11) 99999-8888");
  });

  it("formats Brazilian landline numbers", () => {
    expect(formatPhone("1133334444")).toBe("(11) 3333-4444");
  });

  it("accepts a country-code prefixed number", () => {
    expect(formatPhone("5511999998888")).toBe("(11) 99999-8888");
  });

  it("keeps unknown values visible instead of inventing a mask", () => {
    expect(formatPhone("1195555550000")).toBe("1195555550000");
    expect(formatPhone(null)).toBe("Não informado");
  });
});
