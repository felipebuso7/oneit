import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/current-user";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new NextResponse("Relatório não encontrado.", { status: 404 });
  const { supabase } = await requireUser();
  const { data } = await supabase.from("ticket_reports").select("storage_path").eq("id", id).single();
  if (!data) return new NextResponse("Relatório não encontrado.", { status: 404 });
  const { data: signed } = await supabase.storage.from("ticket-reports").createSignedUrl(data.storage_path, 60);
  if (!signed) return new NextResponse("Relatório indisponível.", { status: 503 });
  const response = NextResponse.redirect(signed.signedUrl);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
