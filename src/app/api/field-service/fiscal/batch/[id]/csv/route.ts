import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { validateBillingLineReadiness } from "@/lib/field-service/billing-readiness";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!z.string().uuid().safeParse(id).success) return Response.json({ code: "INVALID_BATCH_ID" }, { status: 400 });
  const supabase = await createClient(); const { data: auth, error: authError } = await supabase.auth.getUser(); if (authError || !auth.user) return Response.json({ code: "AUTH_REQUIRED" }, { status: 401 });
  const { data: batch, error: batchError } = await supabase.from("fiscal_batches").select("id,batch_number,competence,measurement_sheet_ids").eq("id", id).maybeSingle(); if (batchError) return Response.json({ code: "FISCAL_BATCH_UNAVAILABLE" }, { status: 503 }); if (!batch) return Response.json({ code: "FISCAL_BATCH_NOT_FOUND" }, { status: 404 });
  const { data: lines, error } = await supabase.from("measurement_sheet_lines").select("ticket_number,lpu_code,description,quantity,unit_price,total_price,line_kind,source_reference,service_date,service_location").in("measurement_sheet_id", batch.measurement_sheet_ids ?? []).order("ticket_number"); if (error) return Response.json({ code: "MEASUREMENT_LINES_UNAVAILABLE" }, { status: 503 });
  const incomplete = (lines ?? []).map((line) => ({ ticket: line.ticket_number, missing: validateBillingLineReadiness(line).missing })).filter((line) => line.missing.length); if (incomplete.length) return Response.json({ code: "BILLING_EXPORT_INCOMPLETE", incomplete }, { status: 422 });
  const rows = [["Lote", "Competência", "OS", "Tipo", "Código LPU", "Descrição", "Quantidade", "Preço unitário", "Total", "Data", "Local", "Referência"], ...(lines ?? []).map((line) => [batch.batch_number, batch.competence, line.ticket_number, line.line_kind, line.lpu_code ?? "", line.description, line.quantity, Number(line.unit_price).toFixed(2), Number(line.total_price).toFixed(2), line.service_date ?? "", line.service_location ?? "", line.source_reference ?? ""])];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";")).join("\n");
  return new Response("\uFEFF" + csv, { headers: { "Content-Type": "text/csv;charset=utf-8", "Content-Disposition": `attachment; filename="${batch.batch_number}.csv"`, "Cache-Control": "private, no-store" } });
}
