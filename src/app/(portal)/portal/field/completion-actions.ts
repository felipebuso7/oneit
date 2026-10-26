"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { completionSchema } from "@/lib/validation/completion";

export async function completeTicket(formData: FormData) {
  const parsed = completionSchema.safeParse({ ticketId: formData.get("ticketId"), version: formData.get("version"), materialsUsed: formData.get("materialsUsed"), noMaterialReason: formData.get("noMaterialReason") || undefined });
  if (!parsed.success) redirect("/portal/field?message=Confira+a+declaração+de+materiais+da+OS.");
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("complete_ticket", { target_ticket_id: parsed.data.ticketId, expected_version: parsed.data.version, target_materials_used: parsed.data.materialsUsed === "YES", target_no_material_reason: parsed.data.noMaterialReason ?? null });
  if (error) redirect("/portal/field?message=Conclusão+não+aceita.+Confira+checklist,+fotos,+check-ins+e+materiais;+recarregue+a+OS.");
  revalidatePath("/portal/field"); revalidatePath("/portal/review"); revalidatePath("/portal/tickets");
  redirect("/portal/field?message=OS+concluída+e+enviada+para+revisão.");
}
