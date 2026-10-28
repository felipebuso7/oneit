import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("authenticated technician journey", () => {
  it("loads persisted status history and renders the journey timeline", () => {
    const page = readFileSync("src/app/(portal)/portal/field/page.tsx", "utf8");
    const component = readFileSync("src/components/field/journey-timeline.tsx", "utf8");
    expect(page).toContain('from("ticket_status_history")');
    expect(page).toContain("<JourneyTimeline");
    expect(component).toContain("Jornada da OS");
    expect(component).toContain("evidenceCount >= 3");
  });
});
