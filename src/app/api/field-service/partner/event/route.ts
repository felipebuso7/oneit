import { createClient } from "@/lib/supabase/server";
import { readLimitedBody } from "@/lib/http/limited-body";
import { z } from "zod";

const inputSchema = z.object({
  token: z.string().min(32).max(128),
  code: z.string().regex(/^\d{6}$/),
  event: z.enum(["ACCEPT", "TRAVEL_STARTED", "CHECK_IN", "CHECK_OUT", "SUBMIT"]),
  location: z.record(z.string(), z.unknown()).nullable().optional(),
  report: z.string().max(10000).optional(),
  evidence: z.array(z.object({ name: z.string().trim().min(1).max(180), storagePath: z.string().regex(/^partner\/[0-9a-f-]+\/[0-9a-f-]+\.(jpg|png|webp)$/i), mime: z.enum(["image/jpeg", "image/png", "image/webp"]), size: z.number().int().positive().max(4 * 1024 * 1024) })).max(8).optional(),
  signatureName: z.string().trim().min(2).max(160).optional(),
  signatureDataUrl: z.string().max(262144).regex(/^data:image\/png;base64,[A-Za-z0-9+/=\s]+$/).optional(),
});

function reply(status: number, code: string) {
  return Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON_REQUIRED");
  // Fotos são enviadas previamente ao storage privado; este comando aceita só metadados e assinatura.
  const raw = await readLimitedBody(request, 256 * 1024);
  if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE");
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) return reply(400, "INVALID_EVENT_DATA");
  const supabase = await createClient();
  const { error } = parsed.data.event === "ACCEPT"
    ? await supabase.rpc("accept_partner_service_order", {
      target_token: parsed.data.token,
      target_code: parsed.data.code,
    })
    : await supabase.rpc("submit_partner_service_order_event", {
      target_token: parsed.data.token,
      target_code: parsed.data.code,
      target_event: parsed.data.event,
      target_location: parsed.data.location ?? null,
      target_report: parsed.data.report ?? null,
      target_evidence: parsed.data.evidence ?? [],
      target_signature_name: parsed.data.signatureName ?? null,
      target_signature_data_url: parsed.data.signatureDataUrl ?? null,
    });
  if (error) {
    const message = error.message ?? "";
    if (message.includes("INVALID_STATE")) return reply(409, "EVENT_INVALID_STATE");
    if (message.includes("REPORT_INVALID") || message.includes("EVIDENCE_INVALID") || message.includes("EVIDENCE_REQUIRED") || message.includes("SIGNATURE_INVALID") || message.includes("SIGNATURE_REQUIRED") || message.includes("SUBMISSION_REQUIRED")) return reply(422, "EVENT_DATA_INVALID");
    if (message.includes("EXPIRED")) return reply(410, "ACCESS_EXPIRED");
    if (message.includes("LOCKED")) return reply(429, "ACCESS_LOCKED");
    return reply(401, "ACCESS_INVALID");
  }
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
