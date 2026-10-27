import sharp from "sharp";

import type { ReportEvidenceImage } from "@/domain/reports/pdf";
import { validateEvidenceBytes } from "@/lib/validation/evidence";

export async function normalizeEvidenceImage(bytes: Uint8Array, claimedMime: string): Promise<ReportEvidenceImage> {
  validateEvidenceBytes(bytes, claimedMime);
  // O original permanece no storage. O PDF recebe uma cópia menor e orientada corretamente.
  const converted = await sharp(bytes, { limitInputPixels: 20_000_000 })
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 78 })
    .toBuffer();
  return { mimeType: "image/jpeg", bytes: new Uint8Array(converted) };
}
