"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { reviewSchema } from "@/lib/validation/completion";
import { storeFieldServiceRtoPdf } from "@/lib/reports/store-field-service-rto";

export async function reviewTicket(formData: FormData) {
  const parsed = reviewSchema.safeParse({ ticketId: formData.get("ticketId"), version: formData.get("version"), decision: formData.get("decision"), reason: formData.get("reason") });
  if (!parsed.success) redirect("/portal/review?message=Informe+a+decisão+e+uma+justificativa+de+ao+menos+10+caracteres.");
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("review_ticket", { target_ticket_id: parsed.data.ticketId, expected_version: parsed.data.version, target_decision: parsed.data.decision, target_reason: parsed.data.reason });
  if (error) redirect("/portal/review?message=Revisão+não+aceita.+Verifique+permissão,+versão+e+segregação+de+funções.");
  revalidatePath("/portal/review"); revalidatePath("/portal/field"); revalidatePath("/portal/tickets");
  redirect("/portal/review?message=Revisão+registrada.");
}

export async function reviewFieldServiceOrder(formData: FormData) {
  const queueId = String(formData.get("queueId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(queueId) || !["APPROVE", "RETURN"].includes(decision) || reason.length < 10 || reason.length > 2000) {
    redirect("/portal/review?message=Informe+uma+decisão+e+uma+justificativa+de+ao+menos+10+caracteres.");
  }
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("review_field_service_order", { target_queue_id: queueId, target_decision: decision, target_reason: reason });
  if (error) redirect("/portal/review?message=Não+foi+possível+registrar+a+validação+da+OS.");
  revalidatePath("/portal/review"); revalidatePath("/portal/service-orders");
  redirect("/portal/review?message=Validação+da+OS+registrada.");
}

export async function addFieldServiceOrderLpuLine(formData: FormData) {
  const serviceOrderId = String(formData.get("serviceOrderId") ?? "");
  const lpuItemId = String(formData.get("lpuItemId") ?? "");
  const quantity = Number(formData.get("quantity"));
  if (!/^[0-9a-f-]{36}$/i.test(serviceOrderId) || !/^[0-9a-f-]{36}$/i.test(lpuItemId) || !Number.isFinite(quantity) || quantity <= 0) {
    redirect("/portal/review?message=Informe+um+item+LPU+e+uma+quantidade+válida.");
  }
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("add_field_service_order_lpu_line", { target_service_order_id: serviceOrderId, target_lpu_item_id: lpuItemId, target_quantity: quantity });
  if (error) redirect("/portal/review?message=Não+foi+possível+lançar+o+item+LPU.");
  revalidatePath("/portal/review");
  redirect("/portal/review?message=Item+LPU+lançado+na+OS.");
}

export async function generateFieldServiceRto(formData: FormData) {
  const queueId = String(formData.get("queueId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(queueId)) redirect("/portal/review?message=Fila+de+RTO+inválida.");
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("generate_field_service_rto", { target_queue_id: queueId });
  if (error) redirect("/portal/review?message=RTO+não+gerado.+A+OS+precisa+estar+aprovada+e+com+dados+completos.");
  try {
    await storeFieldServiceRtoPdf(supabase, data);
  } catch {
    redirect("/portal/review?message=RTO+registrado,+mas+o+PDF+não+foi+salvo.+Tente+gerar+novamente.");
  }
  revalidatePath("/portal/review"); revalidatePath("/portal/field-service-reports");
  redirect(`/portal/review?message=RTO+e+PDF+gerados%3A+${data}`);
}
