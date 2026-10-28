import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!z.string().uuid().safeParse(id).success) return Response.json({ code: "INVALID_BATCH_ID" }, { status: 400 });
  const supabase = await createClient(); const { data: auth, error: authError } = await supabase.auth.getUser(); if (authError || !auth.user) return Response.json({ code: "AUTH_REQUIRED" }, { status: 401 });
  const { data: batch } = await supabase.from("fiscal_batches").select("id,organization_id,batch_number,competence,status,measurement_sheet_ids").eq("id", id).maybeSingle(); if (!batch) return Response.json({ code: "FISCAL_BATCH_NOT_FOUND" }, { status: 404 });
  const { data: role, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", auth.user.id).eq("organization_id", batch.organization_id).in("role", ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER", "FINANCE"]).limit(1).maybeSingle();
  if (roleError) return Response.json({ code: "FISCAL_BATCH_AUTHORIZATION_UNAVAILABLE" }, { status: 503 }); if (!role) return Response.json({ code: "FISCAL_BATCH_NOT_AUTHORIZED" }, { status: 403 });
  const sheetIds = Array.isArray(batch.measurement_sheet_ids) ? batch.measurement_sheet_ids.filter((value): value is string => typeof value === "string" && value.length > 0) : [];
  if (!sheetIds.length) return Response.json({ batch, controls: { orderCount: 0, lineCount: 0, extraTotal: 0, grandTotal: 0 }, orders: [] }, { headers: { "Cache-Control": "private, no-store" } });
  const { data: lines, error } = await supabase.from("measurement_sheet_lines").select("ticket_number,description,quantity,unit_price,total_price,line_kind,service_date,service_location,order_reference,lpu_code").in("measurement_sheet_id", sheetIds).order("ticket_number"); if (error) return Response.json({ code: "MEASUREMENT_LINES_UNAVAILABLE" }, { status: 503 });
  type OrderLine = { ticket_number: string; description: string; quantity: number; unit_price: number; total_price: number; line_kind: string; service_date: string | null; service_location: string | null; order_reference: string | null; lpu_code: string | null };
  const orderLines = (lines ?? []) as OrderLine[];
  const map = new Map<string, { ticket: string; location: string | null; date: string | null; reference: string | null; total: number; lines: OrderLine[] }>();
  orderLines.forEach((line) => { const ticket = String(line.ticket_number ?? "").trim(); if (!ticket) return; const current = map.get(ticket) ?? { ticket, location: line.service_location, date: line.service_date, reference: line.order_reference, total: 0, lines: [] }; const lineTotal = Number(line.total_price); current.total += Number.isFinite(lineTotal) ? lineTotal : 0; current.lines.push(line); map.set(ticket, current); });
  const orders = [...map.values()].map((order) => ({ ...order, total: Number(order.total.toFixed(2)) }));
  const grandTotal = orders.reduce((sum, order) => sum + order.total, 0);
  const extraTotal = orderLines.filter((line) => line.line_kind === "EXTRA").reduce((sum, line) => { const value = Number(line.total_price); return sum + (Number.isFinite(value) ? value : 0); }, 0);
  return Response.json({ batch, controls: { orderCount: orders.length, lineCount: orderLines.length, extraTotal: Number(extraTotal.toFixed(2)), grandTotal: Number(grandTotal.toFixed(2)) }, orders }, { headers: { "Cache-Control": "private, no-store" } });
}
