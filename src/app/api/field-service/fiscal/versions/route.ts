import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams; const sheetId = params.get("measurementSheetId"); if (!sheetId || !z.string().uuid().safeParse(sheetId).success) return Response.json({ code: "MEASUREMENT_SHEET_REQUIRED" }, { status: 400 });
  const supabase = await createClient(); const { data: auth, error: authError } = await supabase.auth.getUser(); if (authError || !auth.user) return Response.json({ code: "AUTH_REQUIRED" }, { status: 401 });
  const { data, error } = await supabase.from("measurement_sheet_versions").select("id,measurement_sheet_id,billing_period_id,version,status,source_version_id,total_orders,total_amount,calculation_hash,snapshot,issued_at,issued_by,superseded_at,created_at").eq("measurement_sheet_id", sheetId).order("version", { ascending: false }).limit(50);
  if (error) return Response.json({ code: "MEASUREMENT_VERSIONS_UNAVAILABLE" }, { status: 503 }); return Response.json({ versions: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}
