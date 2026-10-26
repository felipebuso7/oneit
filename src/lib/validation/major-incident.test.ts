import { describe, expect, it } from "vitest";
import { declareMajorIncidentSchema, majorIncidentCommunicationSchema } from "./major-incident";
const id = "019cda50-f764-7a5e-9101-513020ce22e8";
describe("major incident", () => it("requires an impact summary and an auditable communication", () => { expect(declareMajorIncidentSchema.safeParse({ ticketId: id, impactSummary: "Indisponibilidade ampla do serviço de conectividade." }).success).toBe(true); expect(majorIncidentCommunicationSchema.safeParse({ incidentId: id, audience: "CUSTOMER", message: "Equipes técnicas acionadas e nova atualização em trinta minutos." }).success).toBe(true); }));
