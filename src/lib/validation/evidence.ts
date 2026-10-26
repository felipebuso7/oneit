import { z } from "zod";

export const MAX_EVIDENCE_BYTES = 4 * 1024 * 1024;
export const evidenceTypes = ["ARRIVAL", "BEFORE", "DURING", "AFTER", "TEST_RESULT", "MATERIAL", "ACCESS_EXCEPTION", "SAFETY", "OTHER"] as const;
export const evidenceSchema = z.object({ ticketId: z.uuid(), evidenceType: z.enum(evidenceTypes) });
export const materialUsageSchema = z.object({
  ticketId: z.uuid(), materialId: z.uuid(), quantity: z.coerce.number().positive().max(100000)
    .refine((value) => Math.abs(value * 1000 - Math.round(value * 1000)) < 0.00001, "Use até três casas decimais."),
});

export function validateEvidenceBytes(bytes: Uint8Array, claimedMime: string): "image/jpeg" | "image/png" | "image/webp" {
  if (!bytes.length || bytes.length > MAX_EVIDENCE_BYTES) throw new Error("A foto deve ter até 4 MB.");
  const starts = (prefix: number[]) => prefix.every((value, index) => bytes[index] === value);
  let mime: "image/jpeg" | "image/png" | "image/webp";
  if (bytes.length >= 4 && starts([0xff, 0xd8, 0xff])) mime = "image/jpeg";
  else if (bytes.length >= 24 && starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) mime = "image/png";
  else if (bytes.length >= 16 && starts([0x52, 0x49, 0x46, 0x46]) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) mime = "image/webp";
  else throw new Error("Formato de imagem não reconhecido.");
  if (mime !== claimedMime) throw new Error("O conteúdo da imagem não corresponde ao formato informado.");
  return mime;
}
