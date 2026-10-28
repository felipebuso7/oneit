import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!z.string().uuid().safeParse(id).success) return Response.json({ code: "INVALID_BATCH_ID" }, { status: 400 });
  const supabase = await createClient(); const { data: auth, error: authError } = await supabase.auth.getUser(); if (authError || !auth.user) return Response.json({ code: "AUTH_REQUIRED" }, { status: 401 });
  const { data: batch } = await supabase.from("fiscal_batches").select("id,organization_id,batch_number,competence,status,measurement_sheet_ids,total_amount").eq("id", id).maybeSingle(); if (!batch) return Response.json({ code: "FISCAL_BATCH_NOT_FOUND" }, { status: 404 });
  const { data: role, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", auth.user.id).eq("organization_id", batch.organization_id).in("role", ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER", "FINANCE"]).limit(1).maybeSingle();
  if (roleError) return Response.json({ code: "FISCAL_BATCH_AUTHORIZATION_UNAVAILABLE" }, { status: 503 }); if (!role) return Response.json({ code: "FISCAL_BATCH_NOT_AUTHORIZED" }, { status: 403 });
  const sheetIds = Array.isArray(batch.measurement_sheet_ids) ? batch.measurement_sheet_ids.filter((value): value is string => typeof value === "string" && value.length > 0) : [];
  if (!sheetIds.length) return Response.json({ batch, controls: { grandTotal: 0, extraTotal: 0 }, summary: [] }, { headers: { "Cache-Control": "private, no-store" } });
  const { data: lines, error } = await supabase.from("measurement_sheet_lines").select("lpu_code,description,quantity,total_price,line_kind").in("measurement_sheet_id", sheetIds); if (error) return Response.json({ code: "MEASUREMENT_LINES_UNAVAILABLE" }, { status: 503 });
  const map = new Map<string, { code: string | null; description: string; lineKind: string; quantity: number; total: number }>(); (lines ?? []).forEach((line) => { const key = `${line.line_kind}:${line.lpu_code ?? line.description}`; const current = map.get(key) ?? { code: line.lpu_code, description: line.description, lineKind: line.line_kind, quantity: 0, total: 0 }; current.quantity += Number(line.quantity); current.total += Number(line.total_price); map.set(key, current); });
  const summary = [...map.values()].map((item) => ({ ...item, total: Number(item.total.toFixed(2)), quantity: Number(item.quantity.toFixed(3)) }));
  const grandTotal = summary.reduce((sum, item) => sum + item.total, 0);
  const extraTotal = summary.filter((item) => item.lineKind === "EXTRA").reduce((sum, item) => sum + item.total, 0);
  return Response.json({ batch, controls: { grandTotal: Number(grandTotal.toFixed(2)), extraTotal: Number(extraTotal.toFixed(2)) }, summary }, { headers: { "Cache-Control": "private, no-store" } });
}
