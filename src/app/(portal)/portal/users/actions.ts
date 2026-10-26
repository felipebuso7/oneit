"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { createAuthAdmin } from "@/lib/supabase/auth-admin";
import { changeOrganizationRoleSchema, inviteOrganizationUserSchema, revokeOrganizationRoleSchema } from "@/lib/validation/user-management";
export async function inviteOrganizationUser(formData: FormData) {
  const parsed = inviteOrganizationUserSchema.safeParse({ organizationId: formData.get("organizationId"), email: formData.get("email"), fullName: formData.get("fullName"), role: formData.get("role") });
  if (!parsed.success) redirect("/portal/users?message=Dados+de+usuário+inválidos.");
  const { supabase, user } = await requireUser(); const value = parsed.data;
  const { data: authorization } = await supabase.from("user_roles").select("id").eq("user_id", user.id).eq("organization_id", value.organizationId).in("role", ["SUPER_ADMIN", "ORG_ADMIN"]).maybeSingle();
  if (!authorization) redirect("/portal/users?message=Você+não+tem+permissão+para+convidar+usuários+nesta+organização.");
  let admin; try { admin = createAuthAdmin(); } catch { redirect("/portal/users?message=Convites+ainda+não+estão+configurados+no+servidor."); }
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(value.email);
  if (inviteError || !invited.user) redirect("/portal/users?message=Não+foi+possível+enviar+o+convite.+Verifique+o+e-mail+e+a+configuração+do+Auth.");
  const { error: provisionError } = await admin.rpc("provision_organization_member", {
    target_user_id: invited.user.id,
    target_email: value.email,
    target_full_name: value.fullName,
    target_organization_id: value.organizationId,
    target_role: value.role,
    target_actor_id: user.id,
  });
  if (provisionError) redirect("/portal/users?message=Convite+enviado,+mas+o+vínculo+organizacional+não+foi+gravado.+Requer+reconciliação+administrativa.");
  revalidatePath("/portal/users"); redirect("/portal/users?message=Convite+enviado+e+papel+atribuído.");
}

export async function revokeOrganizationRole(formData: FormData) {
  const parsed = revokeOrganizationRoleSchema.safeParse({ organizationId: formData.get("organizationId"), userId: formData.get("userId"), role: formData.get("role") });
  if (!parsed.success) redirect("/portal/users?message=Dados+de+revogação+inválidos.");
  const { supabase, user } = await requireUser(); const value = parsed.data;
  const { data: authorization } = await supabase.from("user_roles").select("id").eq("user_id", user.id).eq("organization_id", value.organizationId).in("role", ["SUPER_ADMIN", "ORG_ADMIN"]).maybeSingle();
  if (!authorization) redirect("/portal/users?message=Você+não+tem+permissão+para+revogar+acessos+nesta+organização.");
  let admin; try { admin = createAuthAdmin(); } catch { redirect("/portal/users?message=Administração+de+acessos+ainda+não+está+configurada+no+servidor."); }
  const { error } = await admin.rpc("revoke_organization_role", { target_user_id: value.userId, target_organization_id: value.organizationId, target_role: value.role, target_actor_id: user.id });
  if (error) redirect("/portal/users?message=Não+foi+possível+revogar+o+papel.+O+último+administrador+da+organização+é+protegido.");
  revalidatePath("/portal/users"); redirect("/portal/users?message=Papel+revogado+com+auditoria.");
}

export async function changeOrganizationRole(formData: FormData) {
  const parsed = changeOrganizationRoleSchema.safeParse({
    organizationId: formData.get("organizationId"), userId: formData.get("userId"),
    currentRole: formData.get("currentRole"), role: formData.get("role"),
  });
  if (!parsed.success) redirect("/portal/users?message=Dados+de+papel+inválidos.");

  const { supabase, user } = await requireUser();
  const value = parsed.data;
  if (value.currentRole === value.role) redirect("/portal/users?message=Selecione+um+papel+diferente.");

  const { data: authorization } = await supabase.from("user_roles").select("id").eq("user_id", user.id).eq("organization_id", value.organizationId).in("role", ["SUPER_ADMIN", "ORG_ADMIN"]).maybeSingle();
  if (!authorization) redirect("/portal/users?message=Você+não+tem+permissão+para+alterar+acessos+nesta+organização.");

  let admin; try { admin = createAuthAdmin(); } catch { redirect("/portal/users?message=Administração+de+acessos+ainda+não+está+configurada+no+servidor."); }
  const { error } = await admin.rpc("change_organization_member_role", {
    target_user_id: value.userId, target_organization_id: value.organizationId,
    current_role: value.currentRole, target_role: value.role, target_actor_id: user.id,
  });
  if (error) redirect("/portal/users?message=Não+foi+possível+alterar+o+papel.+O+último+administrador+da+organização+é+protegido.");
  revalidatePath("/portal/users"); redirect("/portal/users?message=Papel+alterado+com+auditoria.");
}
