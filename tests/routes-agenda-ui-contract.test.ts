import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routes = readFileSync("src/app/(portal)/portal/routes/page.tsx", "utf8");
const scheduling = readFileSync("src/app/(portal)/portal/scheduling/page.tsx", "utf8");
const dispatch = readFileSync("src/app/(portal)/portal/field-service/dispatch-workspace.tsx", "utf8");

describe("field service daily planning UI", () => {
  it("filters routes by day and groups them into periods", () => {
    expect(routes).toContain('name="date"');
    expect(routes).toContain("const selectedDate = /^\\d{4}-\\d{2}-\\d{2}$/");
    expect(routes).not.toContain("const selectedDate = /^\\\\d{4}-\\\\d{2}-\\\\d{2}$/");
    expect(routes).toContain("Manhã");
    expect(routes).toContain("Tarde");
    expect(routes).toContain("Noite");
    expect(routes).toContain("timeZone: businessTimeZone");
    expect(routes).not.toContain("/portal/tickets?ticket=");
  });

  it("renders scheduled appointments by technician and day with distinct colors", () => {
    expect(scheduling).toContain('name="date"');
    expect(scheduling).toContain("const selectedDate = /^\\d{4}-\\d{2}-\\d{2}$/");
    expect(scheduling).not.toContain("const selectedDate = /^\\\\d{4}-\\\\d{2}-\\\\d{2}$/");
    expect(scheduling).toContain('from("service_orders")');
    expect(scheduling).toContain("agendaEntries");
    expect(scheduling).toContain("technicianColorById");
    expect(scheduling).not.toContain("/portal/tickets?ticket=");
  });

  it("visually emphasizes pending dispatch statuses", () => {
    expect(dispatch).toContain("pendingTicketStatuses");
    expect(dispatch).toContain("border-orange-400");
  });
});
