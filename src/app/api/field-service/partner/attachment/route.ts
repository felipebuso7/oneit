import { createClient } from "@/lib/supabase/server";
import { createStorageAdmin } from "@/lib/supabase/storage-admin";
import { z } from "zod";

const schema = z.object({ token: z.string().min(32).max(128), code: z.string().regex(/^\d{6}$/), path: z.string().min(8).max(500) });

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ code: "INVALID_ATTACHMENT_REQUEST" }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_partner_service_order_context", { target_token: parsed.data.token, target_code: parsed.data.code });
  const attachment = data?.[0]?.requester_attachments?.find((item: { storagePath?: string }) => item.storagePath === parsed.data.path);
  if (error || !attachment) return Response.json({ code: "ATTACHMENT_NOT_FOUND" }, { status: 404 });
  const { data: signed, error: signedError } = await createStorageAdmin("ticket-attachments").createSignedUrl(parsed.data.path, 300);
  if (signedError || !signed?.signedUrl) return Response.json({ code: "ATTACHMENT_UNAVAILABLE" }, { status: 503 });
  return Response.json({ url: signed.signedUrl }, { headers: { "Cache-Control": "private, max-age=300" } });
}
