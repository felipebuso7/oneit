import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { renderSgstiActivityPdf } from "./activity-pdf";

describe("SGSTI activity PDF", () => {
  it("generates a readable dossier for a formal activity record", async () => {
    const bytes = await renderSgstiActivityPdf({ organization: "Servicia", title: "Análise crítica da direção", activityType: "Análise crítica", competence: "2026-10-01", plannedAt: "2026-10-17", dueAt: "2026-10-17", status: "COMPLETED", requirement: "ISO 20000-1 9.3", meetingStartedAt: "2026-10-17T09:00:00Z", meetingEndedAt: "2026-10-17T10:00:00Z", meetingLocation: "Teams", facilitator: "Governança", attendees: "Diretoria", attendeeRoles: "Diretoria — presente", minutes: "Discussão registrada sobre desempenho, riscos e oportunidades de melhoria.", decisions: "Aprovar plano de ação.", actions: "Atualizar indicadores.", result: "Rito concluído.", evidences: [{ title: "Dashboard", kind: "DASHBOARD", reference: "https://example.com/dashboard" }], submittedAt: "2026-10-17T11:00:00Z", reviewedAt: "2026-10-17T12:00:00Z", reviewerComment: "Evidências conferidas.", approvedAt: "2026-10-17T13:00:00Z", generatedAt: "2026-10-17T14:00:00Z" });
    const document = await PDFDocument.load(bytes);
    expect(document.getPageCount()).toBeGreaterThan(0);
    expect(bytes.byteLength).toBeGreaterThan(800);
  });
});
