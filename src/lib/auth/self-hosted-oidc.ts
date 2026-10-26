import { SignJWT, createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { z } from "zod";
import { queryPostgres } from "../database/postgres";

const oidcEnvironmentSchema = z.object({
  ONEIT_AUTH_ISSUER: z.url(),
  ONEIT_AUTH_CLIENT_ID: z.string().min(1),
});

const identitySchema = z.object({
  sub: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1).optional(),
  preferred_username: z.string().min(1).optional(),
});

export type SelfHostedIdentity = {
  id: string;
  subject: string;
  email: string;
  fullName: string | null;
};

type LoginEnvironment = {
  ONEIT_APP_URL?: string;
  ONEIT_SESSION_SECRET?: string;
  NODE_ENV?: string;
  [key: string]: string | undefined;
};

export function getSelfHostedOidcConfiguration(environment: {
  ONEIT_AUTH_ISSUER?: string;
  ONEIT_AUTH_CLIENT_ID?: string;
  NODE_ENV?: string;
} = process.env) {
  const configuration = oidcEnvironmentSchema.parse({
    ONEIT_AUTH_ISSUER: environment.ONEIT_AUTH_ISSUER,
    ONEIT_AUTH_CLIENT_ID: environment.ONEIT_AUTH_CLIENT_ID,
  });
  const issuer = configuration.ONEIT_AUTH_ISSUER.replace(/\/$/, "");

  if (environment.NODE_ENV === "production" && !issuer.startsWith("https://")) {
    throw new Error("ONEIT_AUTH_ISSUER must use HTTPS in production.");
  }

  return {
    issuer,
    clientId: configuration.ONEIT_AUTH_CLIENT_ID,
    jwksUri: issuer + "/protocol/openid-connect/certs",
  };
}

export function identityFromOidcClaims(claims: JWTPayload) {
  const value = identitySchema.parse(claims);
  return {
    subject: value.sub,
    email: value.email.toLowerCase(),
    fullName: value.name ?? value.preferred_username ?? null,
  };
}

function sessionSecret(environment: LoginEnvironment = process.env) {
  const value = environment.ONEIT_SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("ONEIT_SESSION_SECRET must contain at least 32 characters.");
  }
  return new TextEncoder().encode(value);
}

export function getSelfHostedLoginConfiguration(environment: LoginEnvironment = process.env) {
  const appUrl = environment.ONEIT_APP_URL;
  if (!appUrl) throw new Error("ONEIT_APP_URL is required.");
  const parsed = new URL(appUrl);
  if (environment.NODE_ENV === "production" && parsed.protocol !== "https:") {
    throw new Error("ONEIT_APP_URL must use HTTPS in production.");
  }
  return { appUrl: parsed.origin };
}

export async function createSelfHostedSession(identity: SelfHostedIdentity, environment: LoginEnvironment = process.env) {
  return new SignJWT({ email: identity.email, name: identity.fullName })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(identity.id)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(sessionSecret(environment));
}

export async function readSelfHostedSession(token: string, environment: LoginEnvironment = process.env) {
  const { payload } = await jwtVerify(token, sessionSecret(environment), { algorithms: ["HS256"] });
  const id = payload.sub;
  const email = typeof payload.email === "string" ? payload.email : null;
  const fullName = typeof payload.name === "string" ? payload.name : null;
  if (!id || !email) throw new Error("INVALID_SELF_HOSTED_SESSION");
  return { id, email, fullName };
}

export async function verifySelfHostedOidcToken(token: string) {
  const configuration = getSelfHostedOidcConfiguration();
  const keys = createRemoteJWKSet(new URL(configuration.jwksUri));
  const { payload } = await jwtVerify(token, keys, {
    issuer: configuration.issuer,
    audience: configuration.clientId,
  });
  return identityFromOidcClaims(payload);
}

export async function synchronizeSelfHostedIdentity(
  identity: ReturnType<typeof identityFromOidcClaims>,
): Promise<SelfHostedIdentity> {
  const result = await queryPostgres<{
    id: string;
    oidc_subject: string;
    email: string;
    full_name: string | null;
  }>(
    "select id, oidc_subject, email, full_name from auth.upsert_oidc_user($1, $2, $3)",
    [identity.subject, identity.email, identity.fullName],
  );
  const user = result.rows[0];
  if (!user) throw new Error("OIDC_IDENTITY_SYNC_FAILED");

  return {
    id: user.id,
    subject: user.oidc_subject,
    email: user.email,
    fullName: user.full_name,
  };
}
