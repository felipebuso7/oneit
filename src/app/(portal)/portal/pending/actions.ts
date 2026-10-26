"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { pendingSchema, resumeSchema, rescheduleSchema } from "@/lib/validation/pending";

function message(value: string): never { redirect(`/portal/pending?message=${encodeURIComponent(value)}`); }
function refresh() { for (const path of ["/portal/pending", "/portal/field", "/portal/scheduling", "/portal/tickets"]) revalidatePath(path); }
const base = (form: FormData) => ({ ticketId: form.get("ticketId"), version: form.get("version"), reason: form.get("reason") });

export async function markPending(form: FormData) {
  const parsed = pendingSchema.safeParse({ ...base(form), status: form.get("status") });
  if (!parsed.success) message("Selecione o motivo e preencha a justificativa.");
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("mark_ticket_pending", { target_ticket_id: parsed.data.ticketId, expected_version: parsed.data.version, target_status: parsed.data.status, target_reason: parsed.data.reason });
  if (error) message("Não foi possível registrar a pendência. Verifique o estado e recarregue a OS.");
  refresh(); message("Pendência registrada.");
}
export async function resumeTicket(form: FormData) {
  const parsed = resumeSchema.safeParse(base(form));
  if (!parsed.success) message("Justifique a resolução da pendência.");
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("resume_ticket", { target_ticket_id: parsed.data.ticketId, expected_version: parsed.data.version, target_reason: parsed.data.reason });
  if (error) message("Retomada não autorizada ou OS alterada. Recarregue.");
  refresh(); message("Pendência resolvida. OS retomada na etapa anterior.");
}
export async function rescheduleTicket(form: FormData) {
  const parsed = rescheduleSchema.safeParse({ ...base(form), technicianId: form.get("technicianId"), start: form.get("start"), end: form.get("end") });
  if (!parsed.success) message("Informe horários com fuso, técnico e motivo válidos.");
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("reschedule_ticket", { target_ticket_id: parsed.data.ticketId, expected_version: parsed.data.version, target_technician_id: parsed.data.technicianId, target_start: parsed.data.start, target_end: parsed.data.end, target_reason: parsed.data.reason });
  if (error) message("Reagendamento não concluído. Confira conflitos, estado e permissões.");
  refresh(); message("OS reagendada. Confirme a atribuição do técnico na agenda.");
}
