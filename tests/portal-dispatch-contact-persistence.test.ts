import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspace = readFileSync("src/app/(portal)/portal/field-service/dispatch-workspace.tsx", "utf8");

describe("portal dispatch contact persistence", () => {
  it("sends the selected location contact with the persisted dispatch", () => {
    expect(workspace).toContain("localContactName: contactsByLocationId.get(locationId)?.name");
    expect(workspace).toContain("localContactPhone: contactsByLocationId.get(locationId)?.mobile || contactsByLocationId.get(locationId)?.phone");
  });
});
