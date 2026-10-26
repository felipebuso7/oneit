import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getPublicEnvironment } from "@/lib/env";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isolatedDemoPreview = process.env.VERCEL_ENV === "preview" && process.env.ONEIT_PREVIEW_MODE === "demo";
  if (process.env.NODE_ENV === "production" && !isolatedDemoPreview &&
      (pathname === "/demo" || pathname.startsWith("/demo/") ||
       pathname === "/api/demo" || pathname.startsWith("/api/demo/"))) {
    return new NextResponse("Not found", { status: 404 });
  }
  const response = NextResponse.next({ request });

  // Do not make the app unusable before local or remote Supabase is configured.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response;
  }

  const environment = getPublicEnvironment();
  const supabase = createServerClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
      },
    },
  );

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|offline.html|offline-app.js|manifest.webmanifest|pwa/icons/).*)"],
};
