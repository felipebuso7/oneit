"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { featureFlagSchema } from "@/lib/validation/feature-flag";
export async function setFeatureFlag(formData: FormData) { const parsed = featureFlagSchema.safeParse({ organizationId: formData.get("organizationId"), flagKey: formData.get("flagKey"), enabled: formData.get("enabled") === "true" }); if (!parsed.success) redirect("/portal/feature-flags?message=Dados+da+flag+inv%C3%A1lidos."); const { supabase } = await requireUser(); const value = parsed.data; const { error } = await supabase.rpc("set_organization_feature_flag", { target_organization_id: value.organizationId, target_flag_key: value.flagKey, target_enabled: value.enabled }); if (error) redirect("/portal/feature-flags?message=N%C3%A3o+foi+poss%C3%ADvel+atualizar+a+flag."); revalidatePath("/portal/feature-flags"); redirect("/portal/feature-flags?message=Feature+flag+atualizada+com+auditoria."); }
