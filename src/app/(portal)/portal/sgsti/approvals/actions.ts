"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/current-user";

const path = "/portal/sgsti/approvals";
const id = z.object({ occurrenceId: z.uuid() });

export async function submitSgstiActivity(formData: FormData) {
  const parsed = id.safeParse({ occurrenceId: formData.get("occurrenceId") });
  if (!parsed.success) redirect(`${path}?message=Atividade+inv%C3%A1lida.`);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("submit_sgsti_activity_for_approval", { target_occurrence_id: parsed.data.occurrenceId });
  if (error) redirect(`${path}?message=Envio+para+aprova%C3%A7%C3%A3o+recusado.+Confirme+ata%2C+resultado+e+evid%C3%AAncia.`);
  revalidatePath(path); revalidatePath("/portal/sgsti");
  redirect(`${path}?message=Atividade+enviada+para+aprova%C3%A7%C3%A3o.`);
}

export async function reviewSgstiActivity(formData: FormData) {
  const occurrenceId = z.string().uuid().safeParse(formData.get("occurrenceId"));
  const comment = z.string().trim().min(10).max(10000).safeParse(formData.get("comment"));
  if (!occurrenceId.success || !comment.success) redirect(`${path}?message=Registre+um+coment%C3%A1rio+de+revis%C3%A3o+com+ao+menos+10+caracteres.`);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("review_sgsti_activity", { target_occurrence_id: occurrenceId.data, target_comment: comment.data });
  if (error) redirect(`${path}?message=Revis%C3%A3o+recusada.+Confirme+o+papel%2C+a+segrega%C3%A7%C3%A3o+e+o+estado+da+atividade.`);
  revalidatePath(path); revalidatePath("/portal/sgsti");
  redirect(`${path}?message=Revis%C3%A3o+registrada+e+atividade+encaminhada+para+aprova%C3%A7%C3%A3o.`);
}

export async function decideSgstiActivity(formData: FormData) {
  const parsed = z.object({ occurrenceId: z.uuid(), decision: z.enum(["APPROVE", "REJECT"]), comment: z.string().trim().max(10000).optional() }).safeParse({ occurrenceId: formData.get("occurrenceId"), decision: formData.get("decision"), comment: formData.get("comment") || undefined });
  if (!parsed.success) redirect(`${path}?message=Decis%C3%A3o+de+aprova%C3%A7%C3%A3o+inv%C3%A1lida.`);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("decide_sgsti_activity_approval", { target_occurrence_id: parsed.data.occurrenceId, target_decision: parsed.data.decision, target_comment: parsed.data.comment ?? null });
  if (error) redirect(`${path}?message=A+decis%C3%A3o+n%C3%A3o+foi+aceita.+N%C3%A3o+%C3%A9+permitido+aprovar+o+pr%C3%B3prio+registro.`);
  revalidatePath(path); revalidatePath("/portal/sgsti");
  redirect(`${path}?message=Decis%C3%A3o+registrada+com+trilha+de+auditoria.`);
}
