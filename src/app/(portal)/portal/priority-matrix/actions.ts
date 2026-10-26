"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { priorityPolicySchema } from "@/lib/validation/priority-policy";

export async function savePriorityPolicy(formData: FormData) {
  const parsed = priorityPolicySchema.safeParse({ organizationId: formData.get("organizationId"), impact: formData.get("impact"), urgency: formData.get("urgency"), priority: formData.get("priority") });
  if (!parsed.success) redirect("/portal/priority-matrix?message=Política+de+prioridade+inválida.");
  const { supabase } = await requireUser(); const value = parsed.data;
  const { error } = await supabase.from("ticket_priority_policies").upsert({ organization_id: value.organizationId, impact: value.impact, urgency: value.urgency, priority: value.priority, active: true }, { onConflict: "organization_id,impact,urgency" });
  if (error) redirect("/portal/priority-matrix?message=Não+foi+possível+salvar+a+matriz.");
  revalidatePath("/portal/priority-matrix"); redirect("/portal/priority-matrix?message=Matriz+de+prioridade+salva.");
}
