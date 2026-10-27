import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { fieldServiceRtoSnapshotSchema, renderFieldServiceRtoPdf } from "../src/domain/reports/pdf";
import { normalizeEvidenceImage } from "../src/lib/reports/normalize-evidence-image";

describe("relatório fotográfico do RTO", () => {
  it("converte uma foto WebP e a incorpora ao PDF", async () => {
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
    const webp = await sharp(png).webp().toBuffer();
    const image = await normalizeEvidenceImage(new Uint8Array(webp), "image/webp");
    expect(image.mimeType).toBe("image/jpeg");
    expect(Array.from(image.bytes.slice(0, 3))).toEqual([0xff, 0xd8, 0xff]);

    const snapshot = fieldServiceRtoSnapshotSchema.parse({
      service_order_id: "00000000-0000-4000-8000-000000000001",
      ticket_id: "00000000-0000-4000-8000-000000000002",
      order_number: "OS-FOTO-001",
      status: "VALIDATED",
      evidence: [{ storagePath: "partner/example/photo.webp", mime: "image/webp" }],
    });
    const pdf = await PDFDocument.load(await renderFieldServiceRtoPdf(snapshot, [image]));
    expect(pdf.getPageCount()).toBeGreaterThan(0);
    expect(pdf.context.enumerateIndirectObjects().some(([, value]) =>
      String(value).includes("/Subtype /Image"))).toBe(true);
  });
});
