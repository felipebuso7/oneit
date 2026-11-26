import { describe, expect, it, vi } from "vitest";
import { logger } from "@/lib/observability/logger";

describe("logger estruturado", () => {
  it("não grava segredos nem tokens", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    logger.info("evento", { requestId: "r1", token: "secret", password: "x", count: 2 });
    const line = String(spy.mock.calls[0]?.[0]);
    expect(line).toContain('"requestId":"r1"');
    expect(line).toContain('"count":2');
    expect(line).not.toContain("secret");
    expect(line).not.toContain("password");
    spy.mockRestore();
  });
});
