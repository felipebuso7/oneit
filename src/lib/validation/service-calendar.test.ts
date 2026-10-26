import { describe, expect, it } from "vitest";
import { serviceCalendarSchema } from "./service-calendar";
describe("service calendar", () => it("requires a supported calendar model", () => { const base={organizationId:"019cda50-f764-7a5e-9101-513020ce22e8",code:"BUSINESS",name:"Horário comercial",timezone:"America/Sao_Paulo",calendarType:"BUSINESS_HOURS"}; expect(serviceCalendarSchema.safeParse(base).success).toBe(true); expect(serviceCalendarSchema.safeParse({...base,calendarType:"CUSTOM"}).success).toBe(false); }));
