import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/current-user";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new NextResponse("Evidência não encontrada.", { status: 404 });
  const { supabase } = await requireUser();
  const { data } = await supabase.from("ticket_evidences").select("storage_path").eq("id", id).single();
  if (!data) return new NextResponse("Evidência não encontrada.", { status: 404 });
  const { data: signed, error } = await supabase.storage.from("ticket-evidences").createSignedUrl(data.storage_path, 60);
  if (error || !signed) return new NextResponse("Imagem temporariamente indisponível.", { status: 503 });
  const response = NextResponse.redirect(signed.signedUrl);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
