"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { organizationSaasSettingsSchema } from "@/lib/validation/organization-saas-settings";
import { organizationEmailSettingsSchema } from "@/lib/validation/organization-email-settings";

export async function setOrganizationSaasSettings(formData: FormData) {
  const parsed = organizationSaasSettingsSchema.safeParse({
    organizationId: formData.get("organizationId"), locale: formData.get("locale"), timezone: formData.get("timezone"),
    primaryColor: formData.get("primaryColor"), secondaryColor: formData.get("secondaryColor"),
  });
  if (!parsed.success) redirect("/portal/saas-settings?message=Configura%C3%A7%C3%A3o+inv%C3%A1lida.");
  const { supabase } = await requireUser();
  const settings = parsed.data;
  const { error } = await supabase.rpc("set_organization_saas_settings", {
    target_organization_id: settings.organizationId, target_locale: settings.locale, target_timezone: settings.timezone,
    target_primary_color: settings.primaryColor, target_secondary_color: settings.secondaryColor,
  });
  if (error) redirect("/portal/saas-settings?message=N%C3%A3o+foi+poss%C3%ADvel+salvar+as+configura%C3%A7%C3%B5es.");
  revalidatePath("/portal/saas-settings");
  redirect("/portal/saas-settings?message=Configura%C3%A7%C3%B5es+salvas+e+auditadas.");
}

export async function setOrganizationEmailSettings(formData: FormData) {
  const parsed = organizationEmailSettingsSchema.safeParse({
    organizationId: formData.get("organizationId"), provider: formData.get("provider"), fromEmail: formData.get("fromEmail"),
  });
  if (!parsed.success) redirect("/portal/saas-settings?message=Configuração+de+e-mail+inválida.");
  const { supabase } = await requireUser();
  const settings = parsed.data;
  const { error } = await supabase.rpc("set_organization_email_settings", {
    target_organization_id: settings.organizationId, target_provider: settings.provider, target_from_email: settings.fromEmail,
  });
  if (error) redirect("/portal/saas-settings?message=Não+foi+possível+salvar+o+e-mail+de+disparos.");
  revalidatePath("/portal/saas-settings");
  redirect("/portal/saas-settings?message=Configuração+de+e-mail+salva.+A+conexão+do+provedor+ainda+precisa+ser+validada.");
}
