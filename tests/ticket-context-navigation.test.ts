import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("ticket context navigation", () => {
  it("opens the requested ticket and validation tab from the Field queue", () => {
    const queue = readFileSync("src/app/demo/field-service/queue/page.tsx", "utf8");
    const tickets = readFileSync("src/app/demo/tickets/page.tsx", "utf8");
    expect(queue).toContain("tab=Resolução");
    expect(tickets).toContain("new URLSearchParams(window.location.search)");
    expect(tickets).toContain("requestedTicket");
    expect(tickets).toContain('"Resolução"');
  });
});
