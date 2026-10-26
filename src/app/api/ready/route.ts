import { hasRequiredPublicEnvironment, hasRequiredSelfHostedEnvironment } from "@/lib/runtime/readiness";

export const dynamic = "force-dynamic";

export async function GET() {
  const selfHosted = process.env.ONEIT_DEPLOYMENT_MODE === "self_hosted";
  const ready = selfHosted
    ? hasRequiredSelfHostedEnvironment({
        ONEIT_DATABASE_URL: process.env.ONEIT_DATABASE_URL,
        ONEIT_AUTH_ISSUER: process.env.ONEIT_AUTH_ISSUER,
        ONEIT_AUTH_CLIENT_ID: process.env.ONEIT_AUTH_CLIENT_ID,
        ONEIT_S3_ENDPOINT: process.env.ONEIT_S3_ENDPOINT,
        ONEIT_S3_BUCKET: process.env.ONEIT_S3_BUCKET,
      })
    : hasRequiredPublicEnvironment({
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      });

  if (!ready) {
    return Response.json(
      { status: "not_ready", deploymentMode: selfHosted ? "self_hosted" : "legacy" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return Response.json(
    { status: "ready", deploymentMode: selfHosted ? "self_hosted" : "legacy" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
