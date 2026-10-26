"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { emailTemplateSchema } from "@/lib/validation/email-template";
export async function saveEmailTemplate(formData: FormData) {
  const parsed=emailTemplateSchema.safeParse({organizationId:formData.get("organizationId"),templateKey:formData.get("templateKey"),subject:formData.get("subject"),bodyText:formData.get("bodyText")});
  if(!parsed.success) redirect("/portal/email-templates?message=Template+inv%C3%A1lido+ou+vari%C3%A1vel+n%C3%A3o+permitida.");
  const {supabase}=await requireUser(); const value=parsed.data;
  const {error}=await supabase.rpc("save_email_template",{target_organization_id:value.organizationId,target_template_key:value.templateKey,target_subject:value.subject,target_body_text:value.bodyText});
  if(error) redirect("/portal/email-templates?message=N%C3%A3o+foi+poss%C3%ADvel+salvar+o+template.");
  revalidatePath("/portal/email-templates"); redirect("/portal/email-templates?message=Nova+vers%C3%A3o+salva+com+auditoria.");
}
