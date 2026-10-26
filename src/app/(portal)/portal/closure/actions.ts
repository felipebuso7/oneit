"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/current-user";
import { closureSchema, closureErrorMessages } from "@/lib/validation/closure";

function returnMessage(message: string): never { redirect(`/portal/closure?message=${encodeURIComponent(message)}`); }

export async function closeTicket(formData: FormData) {
  const parsed = closureSchema.safeParse({
    ticketId: formData.get("ticketId"), reportId: formData.get("reportId"), version: formData.get("version"),
    closureReason: formData.get("closureReason"), exceptionReason: formData.get("exceptionReason"),
    exceptionAcknowledged: formData.get("exceptionAcknowledged") === "on",
  });
  if (!parsed.success) returnMessage("Preencha os motivos e confirme a exceção de sincronização.");
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("close_ticket", {
    target_ticket_id: parsed.data.ticketId, expected_version: parsed.data.version, target_report_id: parsed.data.reportId,
    target_closure_reason: parsed.data.closureReason, target_exception_reason: parsed.data.exceptionReason,
    exception_acknowledged: parsed.data.exceptionAcknowledged,
  });
  if (error) returnMessage(closureErrorMessages[error.message] ?? "Não foi possível encerrar a OS. Recarregue e tente novamente.");
  for (const path of ["/portal/closure", "/portal/tickets", "/portal/reports"]) revalidatePath(path);
  returnMessage("OS encerrada com exceção de sincronização registrada.");
}
