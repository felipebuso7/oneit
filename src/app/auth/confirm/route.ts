import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const requestedNext = request.nextUrl.searchParams.get("next");
  const next = requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
    ? requestedNext
    : "/portal";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const fallback = new URL("/forgot-password", request.url);
      fallback.searchParams.set("message", "O link expirou ou é inválido. Solicite uma nova redefinição.");
      return NextResponse.redirect(fallback);
    }
  }

  return NextResponse.redirect(new URL(next, request.url));
}
