"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/current-user";

const path = "/portal/sgsti/access";
const input = z.object({ organizationId: z.uuid(), userId: z.uuid(), role: z.enum(["AUTHOR", "REVIEWER", "APPROVER", "AUDITOR"]) });

async function updateRole(formData: FormData, method: "grant_sgsti_role" | "revoke_sgsti_role") {
  const parsed = input.safeParse({ organizationId: formData.get("organizationId"), userId: formData.get("userId"), role: formData.get("role") });
  if (!parsed.success) redirect(`${path}?message=Dados+de+permiss%C3%A3o+inv%C3%A1lidos.`);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc(method, { target_organization_id: parsed.data.organizationId, target_user_id: parsed.data.userId, target_role: parsed.data.role });
  if (error) redirect(`${path}?message=Somente+administradores+da+organiza%C3%A7%C3%A3o+podem+alterar+acessos+SGSTI.`);
  revalidatePath(path);
  revalidatePath("/portal/sgsti");
  redirect(`${path}?message=Permiss%C3%A3o+SGSTI+atualizada.`);
}

export async function grantSgstiRole(formData: FormData) { await updateRole(formData, "grant_sgsti_role"); }
export async function revokeSgstiRole(formData: FormData) { await updateRole(formData, "revoke_sgsti_role"); }
