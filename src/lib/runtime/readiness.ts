function isHttpUrl(value?: string) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isDatabaseUrl(value?: string) {
  return Boolean(value && /^(postgres(?:ql)?|mysql|mariadb):\/\//i.test(value));
}

/**
 * The portal must never silently run in the legacy/demo runtime in production.
 * Keeping this check in one small, side-effect-free helper makes the guard
 * testable and avoids duplicating environment semantics across routes.
 */
export function isSupportedProductionDeploymentMode(value?: string) {
  return value === "supabase" || value === "self_hosted";
}

export function hasRequiredPublicEnvironment(environment: { NEXT_PUBLIC_SUPABASE_URL?: string; NEXT_PUBLIC_SUPABASE_ANON_KEY?: string }) {
  return isHttpUrl(environment.NEXT_PUBLIC_SUPABASE_URL) && Boolean(environment.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim());
}

export function hasRequiredSupabaseEnvironment(environment: {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}) {
  return hasRequiredPublicEnvironment(environment) && Boolean(environment.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

export function hasRequiredSelfHostedEnvironment(environment: {
  ONEIT_DATABASE_URL?: string;
  ONEIT_AUTH_ISSUER?: string;
  ONEIT_AUTH_CLIENT_ID?: string;
  ONEIT_S3_ENDPOINT?: string;
  ONEIT_S3_BUCKET?: string;
}) {
  return isDatabaseUrl(environment.ONEIT_DATABASE_URL) &&
    isHttpUrl(environment.ONEIT_AUTH_ISSUER) &&
    Boolean(environment.ONEIT_AUTH_CLIENT_ID?.trim()) &&
    isHttpUrl(environment.ONEIT_S3_ENDPOINT) &&
    Boolean(environment.ONEIT_S3_BUCKET?.trim());
}
