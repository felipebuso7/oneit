import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSelfHostedLoginConfiguration, getSelfHostedOidcConfiguration } from "@/lib/auth/self-hosted-oidc";

const tenMinutes = 10 * 60;

function randomState() {
  return crypto.randomUUID() + crypto.randomUUID();
}

function createPkcePair() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/portal";
}

export async function GET(request: NextRequest) {
  const oidc = getSelfHostedOidcConfiguration();
  const login = getSelfHostedLoginConfiguration();
  const discoveryResponse = await fetch(oidc.issuer + "/.well-known/openid-configuration", {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!discoveryResponse.ok) {
    return Response.json({ error: "identity_provider_unavailable" }, { status: 503 });
  }

  const discovery = await discoveryResponse.json() as { authorization_endpoint?: string };
  if (!discovery.authorization_endpoint) {
    return Response.json({ error: "identity_provider_misconfigured" }, { status: 503 });
  }

  const state = randomState();
  const { verifier, challenge } = createPkcePair();
  const callbackUrl = new URL("/api/auth/oidc/callback", login.appUrl).toString();
  const authorization = new URL(discovery.authorization_endpoint);
  authorization.search = new URLSearchParams({
    response_type: "code",
    client_id: oidc.clientId,
    redirect_uri: callbackUrl,
    scope: "openid profile email",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();

  const response = NextResponse.redirect(authorization);
  const cookie = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/api/auth/oidc", maxAge: tenMinutes };
  response.cookies.set("oneit_oidc_state", state, cookie);
  response.cookies.set("oneit_oidc_verifier", verifier, cookie);
  response.cookies.set("oneit_oidc_next", safeNext(request.nextUrl.searchParams.get("next")), cookie);
  return response;
}
