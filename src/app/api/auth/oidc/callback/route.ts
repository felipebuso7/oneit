import { NextRequest, NextResponse } from "next/server";
import { createSelfHostedSession, getSelfHostedLoginConfiguration, getSelfHostedOidcConfiguration, synchronizeSelfHostedIdentity, verifySelfHostedOidcToken } from "@/lib/auth/self-hosted-oidc";

function safeNext(value: string | undefined) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/portal";
}

function clearTemporaryCookies(response: NextResponse) {
  for (const name of ["oneit_oidc_state", "oneit_oidc_verifier", "oneit_oidc_next"]) {
    response.cookies.set(name, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/api/auth/oidc", maxAge: 0 });
  }
}

export async function GET(request: NextRequest) {
  const expectedState = request.cookies.get("oneit_oidc_state")?.value;
  const verifier = request.cookies.get("oneit_oidc_verifier")?.value;
  const next = request.cookies.get("oneit_oidc_next")?.value;
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  if (!expectedState || !verifier || !code || !state || state !== expectedState) {
    return NextResponse.redirect(new URL("/login?error=oidc_validation", request.url));
  }

  const oidc = getSelfHostedOidcConfiguration();
  const login = getSelfHostedLoginConfiguration();
  const discoveryResponse = await fetch(oidc.issuer + "/.well-known/openid-configuration", {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const discovery = await discoveryResponse.json() as { token_endpoint?: string };
  if (!discoveryResponse.ok || !discovery.token_endpoint) {
    return NextResponse.redirect(new URL("/login?error=identity_provider", login.appUrl));
  }

  const callbackUrl = new URL("/api/auth/oidc/callback", login.appUrl).toString();
  const tokenResponse = await fetch(discovery.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: oidc.clientId,
      code,
      redirect_uri: callbackUrl,
      code_verifier: verifier,
    }),
    cache: "no-store",
  });
  const tokenBody = await tokenResponse.json() as { id_token?: string };
  if (!tokenResponse.ok || !tokenBody.id_token) {
    return NextResponse.redirect(new URL("/login?error=oidc_exchange", login.appUrl));
  }

  const identity = await synchronizeSelfHostedIdentity(await verifySelfHostedOidcToken(tokenBody.id_token));
  const session = await createSelfHostedSession(identity);
  const response = NextResponse.redirect(new URL(safeNext(next), login.appUrl));
  clearTemporaryCookies(response);
  response.cookies.set("oneit_session", session, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
  return response;
}
