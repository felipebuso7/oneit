import { hasRequiredPublicEnvironment, hasRequiredSelfHostedEnvironment, hasRequiredSupabaseEnvironment } from "@/lib/runtime/readiness";
import { createStorageAdmin } from "@/lib/supabase/storage-admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const selfHosted = process.env.ONEIT_DEPLOYMENT_MODE === "self_hosted";
  const supabase = process.env.ONEIT_DEPLOYMENT_MODE === "supabase";
  const deploymentMode = selfHosted ? "self_hosted" : supabase ? "supabase" : "legacy";
  const ready = selfHosted
    ? hasRequiredSelfHostedEnvironment({
        ONEIT_DATABASE_URL: process.env.ONEIT_DATABASE_URL,
        ONEIT_AUTH_ISSUER: process.env.ONEIT_AUTH_ISSUER,
        ONEIT_AUTH_CLIENT_ID: process.env.ONEIT_AUTH_CLIENT_ID,
        ONEIT_S3_ENDPOINT: process.env.ONEIT_S3_ENDPOINT,
        ONEIT_S3_BUCKET: process.env.ONEIT_S3_BUCKET,
      })
    : supabase
      ? hasRequiredSupabaseEnvironment({
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        })
    : hasRequiredPublicEnvironment({
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      });

  if (!ready) {
    return Response.json(
      { status: "not_ready", deploymentMode },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const storageCheck = new URL(request.url).searchParams.get("storage") === "1";
  if (storageCheck && supabase) {
    try {
      const { error } = await createStorageAdmin("ticket-evidences").list("", { limit: 1 });
      return Response.json(
        { status: error ? "not_ready" : "ready", deploymentMode, storage: error ? "error" : "ready" },
        { status: error ? 503 : 200, headers: { "Cache-Control": "no-store" } },
      );
    } catch {
      return Response.json(
        { status: "not_ready", deploymentMode, storage: "error" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
  }

  return Response.json(
    { status: "ready", deploymentMode },
    { headers: { "Cache-Control": "no-store" } },
  );
}
