import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!z.string().uuid().safeParse(id).success) return Response.json({ code: "INVALID_BATCH_ID" }, { status: 400 });
  const supabase = await createClient(); const { data: auth, error: authError } = await supabase.auth.getUser(); if (authError || !auth.user) return Response.json({ code: "AUTH_REQUIRED" }, { status: 401 });
  const { data: batch, error: batchError } = await supabase.from("fiscal_batches").select("id,organization_id,competence,batch_number,status,measurement_sheet_ids,total_amount,pdf_hash,sent_at,closed_at,created_at").eq("id", id).maybeSingle(); if (batchError) return Response.json({ code: "FISCAL_BATCH_UNAVAILABLE" }, { status: 503 }); if (!batch) return Response.json({ code: "FISCAL_BATCH_NOT_FOUND" }, { status: 404 });
  const { data: sheets, error: sheetError } = await supabase.from("measurement_sheets").select("id,sheet_number,total_orders,total_amount,sent_to_customer_at,approved_at,sent_to_tax_at").in("id", batch.measurement_sheet_ids ?? []); if (sheetError) return Response.json({ code: "MEASUREMENT_SHEETS_UNAVAILABLE" }, { status: 503 });
  const { data: lines, error: lineError } = await supabase.from("measurement_sheet_lines").select("measurement_sheet_id,ticket_id,ticket_number,lpu_code,description,quantity,unit_price,total_price,line_kind,source_reference,service_date,service_location,order_reference").in("measurement_sheet_id", batch.measurement_sheet_ids ?? []).order("ticket_number"); if (lineError) return Response.json({ code: "MEASUREMENT_LINES_UNAVAILABLE" }, { status: 503 });
  return Response.json({ batch, sheets: sheets ?? [], lines: lines ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}
