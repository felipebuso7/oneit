import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import fixture from "../../../tests/fixtures/report.json";
import { renderTicketPdf, reportSnapshotSchema } from "./pdf";

describe("report PDF", () => {
  it("generates a readable multipage A4 file for long Portuguese descriptions", async () => {
    const snapshot = reportSnapshotSchema.parse({ ...fixture, description: "Descrição com acentuação e observações técnicas. ".repeat(180), solution: "X".repeat(600) });
    const bytes = await renderTicketPdf(snapshot);
    const document = await PDFDocument.load(bytes);
    expect(document.getPageCount()).toBeGreaterThan(1);
    expect(document.getTitle()).toContain(fixture.number);
    for (const page of document.getPages()) expect(page.getWidth()).toBeCloseTo(595.28, 1);
  });
  it("rejects incomplete report snapshots", () => expect(reportSnapshotSchema.safeParse({ number: fixture.number }).success).toBe(false));
  it("embeds a valid photographic evidence image", async () => {
    const snapshot = reportSnapshotSchema.parse(fixture);
    const binary = atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=");
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const pdf = await renderTicketPdf(snapshot, [{ mimeType: "image/png", bytes }]);
    const document = await PDFDocument.load(pdf);
    expect(document.getPageCount()).toBeGreaterThan(0);
  });
});
