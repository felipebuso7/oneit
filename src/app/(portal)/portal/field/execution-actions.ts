"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/current-user";
import { executionSchema } from "@/lib/validation/execution";

export async function saveExecution(formData: FormData) {
  const parsed = executionSchema.safeParse({
    ticketId: formData.get("ticketId"), version: formData.get("version"),
    faultDomain: formData.get("faultDomain"), diagnosis: formData.get("diagnosis"), solution: formData.get("solution"),
    answers: Object.fromEntries(formData.getAll("itemCode").map((code) => [String(code), formData.get(`answer:${code}`) === "on"])),
  });
  if (!parsed.success) redirect("/portal/field?message=Preencha+diagnóstico,+solução+e+checklist+válidos.");
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("save_ticket_execution", {
    target_ticket_id: parsed.data.ticketId, expected_version: parsed.data.version,
    target_fault_domain: parsed.data.faultDomain, target_diagnosis: parsed.data.diagnosis,
    target_solution: parsed.data.solution, target_answers: parsed.data.answers,
  });
  if (error) redirect("/portal/field?message=Registro+não+salvo.+Recarregue+a+OS+e+verifique+sua+permissão.");
  revalidatePath("/portal/field"); revalidatePath("/portal/tickets");
  redirect("/portal/field?message=Execução+registrada.");
}
