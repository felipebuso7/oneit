import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createStorageAdmin } from "@/lib/supabase/storage-admin";
import { MAX_EVIDENCE_BYTES, validateEvidenceBytes } from "@/lib/validation/evidence";

const metadataSchema = z.object({ token: z.string().min(32).max(128), code: z.string().regex(/^\d{6}$/) });
const reply = (status: number, code: string) => Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength && contentLength > MAX_EVIDENCE_BYTES + 32 * 1024) return reply(413, "PAYLOAD_TOO_LARGE");
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) return reply(415, "MULTIPART_REQUIRED");
  let form: FormData;
  try { form = await request.formData(); } catch { return reply(400, "INVALID_MULTIPART"); }
  const parsed = metadataSchema.safeParse({ token: form.get("token"), code: form.get("code") });
  const file = form.get("file");
  if (!parsed.success || !(file instanceof File) || !file.size || file.size > MAX_EVIDENCE_BYTES) return reply(400, "INVALID_EVIDENCE");

  const supabase = await createClient();
  const { data: context, error: contextError } = await supabase.rpc("get_partner_service_order_context", { target_token: parsed.data.token, target_code: parsed.data.code });
  const order = Array.isArray(context) ? context[0] : null;
  if (contextError || !order?.service_order_id) return reply(401, "ACCESS_INVALID");

  const bytes = new Uint8Array(await file.arrayBuffer());
  let mime: "image/jpeg" | "image/png" | "image/webp";
  try { mime = validateEvidenceBytes(bytes, file.type); } catch { return reply(422, "EVIDENCE_FILE_INVALID"); }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return reply(503, "EVIDENCE_STORAGE_NOT_CONFIGURED");
  const extension = mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : "webp";
  const storagePath = `partner/${order.service_order_id}/${crypto.randomUUID()}.${extension}`;
  try {
    const storage = createStorageAdmin();
    const { error } = await storage.upload(storagePath, bytes, { contentType: mime, upsert: false });
    if (error) {
      const message = error.message.toLowerCase();
      if (message.includes("bucket") && message.includes("not found")) return reply(503, "EVIDENCE_STORAGE_BUCKET_MISSING");
      if (message.includes("jwt") || message.includes("api key") || message.includes("unauthorized")) return reply(503, "EVIDENCE_STORAGE_CREDENTIALS_INVALID");
      if (message.includes("size") || message.includes("payload") || message.includes("too large")) return reply(413, "EVIDENCE_STORAGE_SIZE_REJECTED");
      return reply(503, "EVIDENCE_STORAGE_UPLOAD_FAILED");
    }
  } catch { return reply(503, "EVIDENCE_STORAGE_UPLOAD_FAILED"); }
  return Response.json({ evidence: { name: file.name.slice(0, 180), storagePath, mime, size: bytes.length } }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
