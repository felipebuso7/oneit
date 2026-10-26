import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import fixture from "./fixtures/report.json";
import { renderTicketPdf, reportSnapshotSchema } from "../src/domain/reports/pdf";

describe("server report photographic evidence", () => {
  it("embeds a valid PNG evidence image in the generated PDF", async () => {
    const snapshot = reportSnapshotSchema.parse(fixture);
    const binary = atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=");
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

    const pdf = await renderTicketPdf(snapshot, [{ mimeType: "image/png", bytes }]);
    const document = await PDFDocument.load(pdf);

    expect(document.getPageCount()).toBeGreaterThan(0);
  });
});
