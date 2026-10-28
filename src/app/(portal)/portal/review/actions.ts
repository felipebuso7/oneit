"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { reviewSchema } from "@/lib/validation/completion";
import { storeFieldServiceRtoPdf } from "@/lib/reports/store-field-service-rto";

function reviewMessage(message: string | undefined): string {
  if (message?.includes("FIELD_REVIEW_SUBMISSION_REQUIRED")) return "A execução do técnico não foi encontrada. Não é seguro aprovar esta OS.";
  if (message?.includes("FIELD_REVIEW_INVALID_STATE")) return "Esta OS já foi revisada. Atualize a fila antes de tentar novamente.";
  if (message?.includes("FIELD_REVIEW_ORDER_NOT_COMPLETED")) return "A OS não está mais no estado aguardando validação.";
  if (message?.includes("FIELD_REVIEW_NOT_AUTHORIZED")) return "Seu perfil não pode validar esta OS.";
  if (message?.includes("FIELD_REVIEW_CONCURRENT_UPDATE")) return "A OS foi atualizada por outro usuário. Recarregue a fila.";
  return "Não foi possível registrar a validação da OS.";
}

function closureMessage(message: string | undefined): string {
  if (message?.includes("FIELD_CLOSURE_VERSION_CONFLICT")) return "O chamado foi atualizado por outra pessoa. Recarregue a fila antes de encerrar.";
  if (message?.includes("FIELD_CLOSURE_ALREADY_CLOSED")) return "Este chamado já foi encerrado.";
  if (message?.includes("FIELD_CLOSURE_ORDER_NOT_VALIDATED")) return "A OS ainda não está aprovada para encerramento.";
  if (message?.includes("FIELD_CLOSURE_REVIEW_REQUIRED")) return "Valide a OS antes de encerrar o chamado.";
  if (message?.includes("FIELD_CLOSURE_PDF_REQUIRED")) return "Gere e salve o PDF do RTO antes de encerrar o chamado.";
  if (message?.includes("FIELD_CLOSURE_SELF_APPROVAL_FORBIDDEN")) return "O técnico responsável não pode aprovar o próprio atendimento.";
  return "Encerramento não aceito. Confira o PDF, a versão do chamado e a permissão.";
}

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
  if (error) redirect(`/portal/review?message=${encodeURIComponent(reviewMessage(error.message))}`);
  revalidatePath("/portal/review"); revalidatePath("/portal/service-orders"); revalidatePath("/portal/field-service"); revalidatePath("/portal/tickets");
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
  if (error) redirect(`/portal/review?message=${encodeURIComponent(error.message.includes("LPU") ? "Item LPU inválido ou incompatível com a organização." : "Não foi possível lançar o item LPU.")}`);
  revalidatePath("/portal/review"); revalidatePath("/portal/field-service");
  redirect("/portal/review?message=Item+LPU+lançado+na+OS.");
}

export async function generateFieldServiceRto(formData: FormData) {
  const queueId = String(formData.get("queueId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(queueId)) redirect("/portal/review?message=Fila+de+RTO+inválida.");
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("generate_field_service_rto", { target_queue_id: queueId });
  if (error) redirect(`/portal/review?message=${encodeURIComponent(error.message.includes("RTO_REVIEW_REQUIRED") ? "A OS precisa ser aprovada antes de gerar o RTO." : error.message.includes("RTO_DATA_INCOMPLETE") ? "Faltam dados do atendimento técnico para gerar o RTO." : "Não foi possível gerar o RTO.")}`);
  try {
    await storeFieldServiceRtoPdf(supabase, data);
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "RTO_STORAGE_UNAVAILABLE";
    // Keep the user-facing message actionable while preserving the internal
    // code for Vercel diagnostics. Do not log snapshot contents or credentials.
    console.error("[RTO] PDF persistence failed", { code, reportId: data });
    if (code === "RTO_DOWNLOAD_UNAVAILABLE") {
      redirect("/portal/review?message=O+RTO+foi+gerado,+mas+o+download+não+ficou+disponível.+Verifique+o+armazenamento+antes+de+encerrar.");
    }
    const message = code === "RTO_SNAPSHOT_UNAVAILABLE"
      ? "O snapshot do RTO não pôde ser lido. Atualize a fila e tente novamente."
      : code === "RTO_REVIEWER_UNAVAILABLE"
        ? "O usuário validador não possui nome cadastrado. Atualize o perfil antes de gerar o RTO."
        : code === "RTO_FILE_ALREADY_REGISTERED"
          ? "Este RTO já possui um PDF registrado. Consulte ou baixe a versão existente antes de tentar gerar outra."
        : code === "RTO_REGISTER_FAILED"
          ? "O PDF foi enviado, mas não foi possível registrar o arquivo no RTO. Tente novamente."
          : "O RTO foi registrado, mas o PDF não foi salvo. Tente novamente.";
    redirect(`/portal/review?message=${encodeURIComponent(message)}`);
  }
  revalidatePath("/portal/review"); revalidatePath("/portal/field-service-reports"); revalidatePath("/portal/field-service");
  redirect(`/portal/review?message=RTO+e+PDF+gerados%3A+${data}`);
}

export async function closeFieldServiceTicket(formData: FormData) {
  const ticketId = String(formData.get("ticketId") ?? "");
  const reportId = String(formData.get("reportId") ?? "");
  const version = Number(formData.get("version"));
  const reason = String(formData.get("reason") ?? "").trim();
  const exceptionReason = String(formData.get("exceptionReason") ?? "").trim();
  const exceptionAcknowledged = formData.get("exceptionAcknowledged") === "on";
  if (!/^[0-9a-f-]{36}$/i.test(ticketId) || !/^[0-9a-f-]{36}$/i.test(reportId)
    || !Number.isInteger(version) || version < 1 || reason.length < 10 || reason.length > 2000
    || exceptionReason.length < 10 || exceptionReason.length > 2000 || !exceptionAcknowledged) {
    redirect("/portal/review?message=Informe+o+parecer+e+reconheça+a+pendência+de+sincronização+externa.");
  }
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("close_field_service_ticket", {
    target_ticket_id: ticketId,
    expected_version: version,
    target_report_id: reportId,
    target_closure_reason: reason,
    target_exception_reason: exceptionReason,
    exception_acknowledged: exceptionAcknowledged,
  });
  if (error) redirect(`/portal/review?message=${encodeURIComponent(closureMessage(error.message))}`);
  revalidatePath("/portal/review"); revalidatePath("/portal/tickets"); revalidatePath("/portal/field"); revalidatePath("/portal/field-service");
  redirect("/portal/review?message=RTO+validado+e+chamado+encerrado.");
}
