import { describe, expect, it } from "vitest";
import { activeNavigationHref } from "@/lib/navigation/active-link";
import { readFileSync } from "node:fs";

const hrefs = ["/portal", "/portal/tickets", "/portal/field-service", "/portal/field-service/finance", "/portal/settings", "/portal/settings/field-service/lpu"];

describe("portal navigation selection", () => {
  it.each([
    ["/portal", "/portal"],
    ["/portal/tickets/abc", "/portal/tickets"],
    ["/portal/field-service", "/portal/field-service"],
    ["/portal/field-service/finance", "/portal/field-service/finance"],
    ["/portal/field-service/finance/history", "/portal/field-service/finance"],
    ["/portal/settings/field-service/lpu", "/portal/settings/field-service/lpu"],
    ["/portal/field-service-reports", undefined],
    ["/portal/unknown", undefined],
  ])("selects only the most specific item for %s", (path, expected) => {
    expect(activeNavigationHref(path!, hrefs)).toBe(expected);
    expect(activeNavigationHref(path!, [...hrefs].reverse())).toBe(expected);
  });

  it("links the manager to scheduling without changing technician authorization", () => {
    const layout = readFileSync("src/app/(portal)/layout.tsx", "utf8");
    expect(layout).toContain('["Agenda Técnicos", "/portal/scheduling"]');
    expect(layout).not.toContain('["Agenda Técnicos", "/portal/field"]');
  });

  it("links appointments and route stops to their ticket detail", () => {
    const agenda = readFileSync("src/app/(portal)/portal/scheduling/page.tsx", "utf8");
    const routes = readFileSync("src/app/(portal)/portal/routes/page.tsx", "utf8");
    expect(agenda).toContain('href={`/portal/tickets/${schedule.ticket_id}`}');
    expect(routes).toContain('/portal/tickets/${');
    for (const source of [agenda, routes]) expect(source).not.toContain('/portal/tickets?ticket=');
  });
});
