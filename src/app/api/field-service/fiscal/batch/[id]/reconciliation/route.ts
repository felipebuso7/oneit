import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return Response.json({ code: "INVALID_BATCH_ID" }, { status: 400 });
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return Response.json({ code: "AUTH_REQUIRED" }, { status: 401 });
  const { data: batch } = await supabase.from("fiscal_batches").select("id,batch_number,status,total_amount,measurement_sheet_ids").eq("id", id).maybeSingle();
  if (!batch) return Response.json({ code: "FISCAL_BATCH_NOT_FOUND" }, { status: 404 });
  const sheetIds = Array.isArray(batch.measurement_sheet_ids) ? batch.measurement_sheet_ids.filter((value): value is string => typeof value === "string" && value.length > 0) : [];
  if (!sheetIds.length) return Response.json({ batch, reconciliation: { consistent: Number(batch.total_amount ?? 0) === 0, batchTotal: Number(batch.total_amount ?? 0), lineTotal: 0, difference: Number(batch.total_amount ?? 0), orderCount: 0, lineCount: 0 } }, { headers: { "Cache-Control": "private, no-store" } });
  const { data: lines, error } = await supabase.from("measurement_sheet_lines").select("ticket_number,total_price").in("measurement_sheet_id", sheetIds);
  if (error) return Response.json({ code: "MEASUREMENT_LINES_UNAVAILABLE" }, { status: 503 });
  const validLines = (lines ?? []).filter((line) => typeof line.ticket_number === "string" && line.ticket_number.trim().length > 0);
  const lineTotal = validLines.reduce((sum, line) => { const value = Number(line.total_price); return sum + (Number.isFinite(value) ? value : 0); }, 0);
  const batchTotal = Number(batch.total_amount ?? 0);
  const difference = Number((batchTotal - lineTotal).toFixed(2));
  const orderCount = new Set(validLines.map((line) => line.ticket_number)).size;
  return Response.json({ batch, reconciliation: { consistent: Math.abs(difference) < 0.01, batchTotal: Number(batchTotal.toFixed(2)), lineTotal: Number(lineTotal.toFixed(2)), difference, orderCount, lineCount: validLines.length } }, { headers: { "Cache-Control": "private, no-store" } });
}
