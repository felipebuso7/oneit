import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const contextRoute = readFileSync("src/app/api/field-service/partner/context/route.ts", "utf8");
const eventRoute = readFileSync("src/app/api/field-service/partner/event/route.ts", "utf8");
const uploadRoute = readFileSync("src/app/api/field-service/partner/upload/route.ts", "utf8");

describe("handoff seguro do técnico parceiro", () => {
  it("valida token/código e não permite respostas cacheadas", () => {
    expect(contextRoute).toContain("z.string().min(32).max(128)");
    expect(contextRoute).toContain("z.string().regex(/^\\d{6}$/)");
    expect(contextRoute).toContain('"Cache-Control": "no-store"');
    expect(contextRoute).toContain("record_partner_access_failure");
    expect(contextRoute).toContain("get_partner_access_progress");
  });

  it("mantém eventos restritos à máquina de estados do parceiro", () => {
    expect(eventRoute).toContain('z.enum(["ACCEPT", "TRAVEL_STARTED", "CHECK_IN", "CHECK_OUT", "SUBMIT"])');
    expect(eventRoute).toContain("accept_partner_service_order");
    expect(eventRoute).toContain("submit_partner_service_order_event");
    expect(eventRoute).toContain('"Cache-Control": "no-store"');
  });

  it("valida upload e associa a evidência à OS retornada pelo token", () => {
    expect(uploadRoute).toContain("multipart/form-data");
    expect(uploadRoute).toContain("get_partner_service_order_context");
    expect(uploadRoute).toContain('"ACCESS_INVALID"');
    expect(uploadRoute).toContain("createStorageAdmin");
  });
});
