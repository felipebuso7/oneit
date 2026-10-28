import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams; const sheetId = params.get("measurementSheetId"); const organizationId = params.get("organizationId");
  if ((!sheetId || !z.string().uuid().safeParse(sheetId).success) && (!organizationId || !z.string().uuid().safeParse(organizationId).success)) return Response.json({ code: "SHEET_OR_ORGANIZATION_REQUIRED" }, { status: 400 });
  const supabase = await createClient(); const { data: auth, error: authError } = await supabase.auth.getUser(); if (authError || !auth.user) return Response.json({ code: "AUTH_REQUIRED" }, { status: 401 });
  let authorizationOrganizationId = organizationId;
  if (!authorizationOrganizationId && sheetId) {
    const { data: sheet, error: sheetError } = await supabase.from("measurement_sheets").select("organization_id").eq("id", sheetId).maybeSingle();
    if (sheetError) return Response.json({ code: "FISCAL_AUDIT_AUTHORIZATION_UNAVAILABLE" }, { status: 503 });
    if (!sheet) return Response.json({ code: "SHEET_NOT_FOUND" }, { status: 404 });
    authorizationOrganizationId = sheet.organization_id;
  }
  const { data: role, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", auth.user.id).eq("organization_id", authorizationOrganizationId as string).in("role", ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER", "FINANCE"]).limit(1).maybeSingle();
  if (roleError) return Response.json({ code: "FISCAL_AUDIT_AUTHORIZATION_UNAVAILABLE" }, { status: 503 }); if (!role) return Response.json({ code: "FISCAL_AUDIT_NOT_AUTHORIZED" }, { status: 403 });
  let query = supabase.from("measurement_sheet_events").select("id,measurement_sheet_id,measurement_sheet_version_id,event_type,actor_id,metadata,created_at").order("created_at", { ascending: false }).limit(200);
  query = sheetId ? query.eq("measurement_sheet_id", sheetId) : query.eq("organization_id", organizationId as string);
  const { data, error } = await query; if (error) return Response.json({ code: "FISCAL_AUDIT_UNAVAILABLE" }, { status: 503 });
  return Response.json({ events: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}
