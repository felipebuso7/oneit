/* eslint-disable @next/next/no-img-element -- assinatura usa data URL privada e não deve passar pelo optimizer remoto. */
import Link from "next/link";
import { reviewHref, reviewOrderId, reviewPageNumber, reviewPageSize } from "@/lib/field-service/review-navigation";
import { requireUser } from "@/lib/auth/current-user";
import { createStorageAdmin } from "@/lib/supabase/storage-admin";
import { addFieldServiceOrderLpuComposition, addFieldServiceOrderLpuLine, closeFieldServiceTicket, generateFieldServiceRto, reviewFieldServiceOrder, reviewTicket } from "./actions";
import { OneitEmptyState, OneitPageHeader } from "@/components/oneit";

type PageProps = { searchParams: Promise<{ message?: string; order?: string; page?: string }> };
type ReviewEvidence = { id?: string; name?: string; storagePath?: string; mime?: string };
type ReviewSubmission = {
  id: string;
  execution_report: string | null;
  customer_signature_name: string | null;
  customer_signature_data_url: string | null;
  submitted_at: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  evidence: ReviewEvidence[];
};
type ReviewTicket = {
  id: string;
  ticket_number: string;
  title: string;
  service_type_code: string | null;
  customer_id: string;
  location_id: string;
};
type OrderMaterial = { service_order_id: string; lpu_item_id: string; material_code: string; material_name: string; unit: string; quantity: number };
type ReviewComposition = { id: string; organization_id: string; code: string; description: string };
type ReviewCompositionLine = { composition_id: string; lpu_item_id: string; quantity: number; unit_price: number };
type ReviewLpuItem = { id: string; code: string; description: string; unit: string };

function UsedMaterialsReview({ orderId, materials, pricedCodes }: { orderId: string; materials: OrderMaterial[]; pricedCodes: Set<string> }) {
  return <section aria-label="Materiais utilizados pelo técnico" className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
    <h5 className="font-semibold text-slate-950">Materiais utilizados pelo técnico</h5>
    {materials.length ? <ul className="mt-2 space-y-2">{materials.map((material) => <li key={material.lpu_item_id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
      <span className="text-slate-700">{material.material_name} · <strong>{material.quantity} {material.unit}</strong></span>
      {pricedCodes.has(material.material_code) ? <span className="text-xs font-semibold text-emerald-700">Na composição LPU</span> : <form action={addFieldServiceOrderLpuLine}>
        <input type="hidden" name="returnOrderId" value={orderId} /><input type="hidden" name="serviceOrderId" value={orderId} />
        <input type="hidden" name="lpuItemId" value={material.lpu_item_id} /><input type="hidden" name="quantity" value={material.quantity} />
        <button className="rounded-lg border border-cyan-700 px-2.5 py-1.5 text-xs font-semibold text-cyan-900">Aplicar à LPU</button>
      </form>}
    </li>)}</ul> : <p className="mt-1 text-slate-600">Nenhum material informado.</p>}
  </section>;
}

function LpuCompositionsReview({ orderId, organizationId, compositions, compositionLines, lpuItems, appliedIds, pricedCodes }: {
  orderId: string; organizationId: string; compositions: ReviewComposition[]; compositionLines: ReviewCompositionLine[];
  lpuItems: ReviewLpuItem[]; appliedIds: Set<string>; pricedCodes: Set<string>;
}) {
  const available = compositions.filter((item) => item.organization_id === organizationId);
  return <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
    <summary className="cursor-pointer font-semibold text-slate-950">Aplicar composição de serviço + materiais</summary>
    <p className="mt-2 text-xs text-slate-600">Confira os itens e o valor base antes de lançar. Uma composição só pode ser aplicada uma vez à OS.</p>
    {available.length ? <div className="mt-3 space-y-2">{available.map((composition) => {
      const lines = compositionLines.filter((line) => line.composition_id === composition.id);
      const items = lines.map((line) => ({ line, item: lpuItems.find((value) => value.id === line.lpu_item_id) }));
      const baseTotal = lines.reduce((sum, line) => sum + Number(line.quantity) * Number(line.unit_price), 0);
      const conflict = items.some(({ item }) => item && pricedCodes.has(item.code));
      const applied = appliedIds.has(composition.id);
      return <section key={composition.id} className="rounded-lg border border-slate-200 bg-white p-3">
        <h6 className="font-semibold text-slate-900">{composition.code} · {composition.description}</h6>
        <ul className="mt-2 space-y-1 text-xs text-slate-700">{items.map(({ line, item }) => <li key={line.lpu_item_id}>{item?.description ?? "Item não identificado"} · {line.quantity} {item?.unit ?? ""} × R$ {Number(line.unit_price).toFixed(2).replace(".", ",")}</li>)}</ul>
        <p className="mt-2 text-sm font-semibold text-slate-900">Total base: R$ {baseTotal.toFixed(2).replace(".", ",")}</p>
        {applied ? <p className="mt-2 text-xs font-semibold text-emerald-700">Composição já aplicada nesta OS.</p> : conflict ? <p className="mt-2 text-xs font-semibold text-amber-800">Um item desta composição já está na LPU da OS. Revise os lançamentos para evitar duplicidade.</p> : !lines.length ? <p className="mt-2 text-xs text-amber-800">Composição sem itens disponíveis.</p> : <form action={addFieldServiceOrderLpuComposition} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="returnOrderId" value={orderId} /><input type="hidden" name="serviceOrderId" value={orderId} /><input type="hidden" name="compositionId" value={composition.id} />
          <label className="text-xs font-medium text-slate-700">Quantidade de composições<input name="quantity" type="number" min="0.001" max="100000" step="0.001" defaultValue="1" required className="mt-1 block w-28 rounded border border-slate-300 p-2 text-sm" /></label>
          <button className="rounded-lg bg-cyan-900 px-3 py-2 text-xs font-semibold text-white">Aplicar composição</button>
        </form>}
      </section>;
    })}</div> : <p className="mt-3 text-xs text-slate-600">Não há composição vigente nesta organização. Cadastre uma em Configurações → LPU.</p>}
  </details>;
}

export default async function ReviewPage({ searchParams }: PageProps) {
  const [{ supabase, user }, { message, order: requestedOrder, page: requestedPage }] = await Promise.all([requireUser(), searchParams]);
  const { data: roles, error: roleError } = await supabase.from("user_roles").select("organization_id").eq("user_id", user.id).in("role", ["MANAGER", "ORG_ADMIN", "SUPER_ADMIN"]);
  if (roleError) throw new Error("Não foi possível validar a permissão de revisão.");
  if (!roles?.length) return <section className="p-8"><OneitPageHeader eyebrow="Validação" title="Revisão gerencial" description="Seu perfil não possui acesso à revisão." /></section>;
  const organizationIds = roles.map((role) => role.organization_id);
  const orderId = reviewOrderId(requestedOrder);
  if (requestedOrder && !orderId) return <section className="p-8"><OneitPageHeader title="OS inválida" description="O endereço de validação não identifica uma OS válida." /><Link href="/portal/review">Voltar à fila</Link></section>;
  const page = orderId ? 1 : reviewPageNumber(requestedPage);
  const start = (page - 1) * reviewPageSize;
  const queueQuery = (status: string) => {
    const activeApproved = status === "APPROVED" && !orderId;
    let query = supabase.from("field_service_review_queue").select("id,organization_id,service_order_id,ticket_id,submission_id,status,created_at,review_reason,reviewed_at,tickets!inner(administrative_status)", { count: "exact" }).in("organization_id", organizationIds).eq("status", status);
    if (activeApproved) query = query.neq("tickets.administrative_status", "CLOSED");
    if (orderId) query = query.eq("service_order_id", orderId);
    return query.order(status === "PENDING" ? "created_at" : "reviewed_at", { ascending: status === "PENDING" }).order("id").range(start, start + reviewPageSize - 1);
  };
  const { data: fieldQueue, error: fieldQueueError, count: pendingCount } = await queueQuery("PENDING");
  if (fieldQueueError) throw new Error("Não foi possível carregar a fila de validação de Field Service.");
  const fieldItems = fieldQueue ?? [];

  const { data: approvedFieldQueue, error: approvedQueueError, count: approvedCount } = await queueQuery("APPROVED");
  const approvedItems = approvedFieldQueue ?? [];
  const { data: returnedFieldQueue, error: returnedQueueError, count: returnedCount } = await queueQuery("RETURNED");
  if (approvedQueueError || returnedQueueError) throw new Error("Não foi possível carregar o histórico da fila de validação.");
  const returnedItems = returnedFieldQueue ?? [];
  const pages = Math.max(1, Math.ceil(Math.max(pendingCount ?? 0, approvedCount ?? 0, returnedCount ?? 0) / reviewPageSize));
  const existingRtosResult = approvedItems.length ? await supabase.from("field_service_rto_reports").select("id, service_order_id, storage_path, report_version").in("service_order_id", approvedItems.map((item) => item.service_order_id)).order("report_version", { ascending: false }) : null;
  if (existingRtosResult?.error) throw new Error("Não foi possível carregar os RTOs registrados.");
  const existingRtos = existingRtosResult?.data ?? [];
  const approvedTicketsResult = approvedItems.length ? await supabase.from("tickets").select("id, ticket_number, version, administrative_status").in("id", approvedItems.map((item) => item.ticket_id)) : null;
  if (approvedTicketsResult?.error) throw new Error("Não foi possível carregar os chamados aprovados.");
  const approvedTickets = approvedTicketsResult?.data ?? [];
  const closedApprovedItems = approvedItems.filter((item) => approvedTickets.find((ticket) => ticket.id === item.ticket_id)?.administrative_status === "CLOSED");
  const actionableApprovedItems = approvedItems.filter((item) => !closedApprovedItems.some((closed) => closed.id === item.id));
  const historyOrderIds = [...new Set([...approvedItems, ...returnedItems].map((item) => item.service_order_id))];
  const historyOrdersResult = historyOrderIds.length ? await supabase.from("service_orders").select("id,order_number").in("id", historyOrderIds) : null;
  if (historyOrdersResult?.error) throw new Error("Não foi possível carregar os números das ordens revisadas.");
  const historyOrders = historyOrdersResult?.data ?? [];
  const fieldOrderIds = fieldItems.map((item) => item.service_order_id);
  const fieldOrdersResult = fieldOrderIds.length ? await supabase.from("service_orders").select("id, order_number, ticket_id, status, scheduled_at, checked_in_at, checked_out_at").in("id", fieldOrderIds) : null;
  const fieldOrders = fieldOrdersResult?.data ?? [];
  const fieldTicketIds = fieldItems.map((item) => item.ticket_id);
  const fieldTicketsResult = fieldTicketIds.length ? await supabase.from("tickets").select("id, ticket_number, title, service_type_code, customer_id, location_id").in("id", fieldTicketIds) : null;
  const fieldTickets = fieldTicketsResult?.data ?? [];
  const reviewCustomerIds = [...new Set((fieldTickets as ReviewTicket[]).map((ticket) => ticket.customer_id).filter(Boolean))];
  const reviewLocationIds = [...new Set((fieldTickets as ReviewTicket[]).map((ticket) => ticket.location_id).filter(Boolean))];
  const [{ data: reviewCustomers, error: reviewCustomersError }, { data: reviewLocations, error: reviewLocationsError }] = await Promise.all([
    reviewCustomerIds.length ? supabase.from("customers").select("id, name").in("id", reviewCustomerIds) : Promise.resolve({ data: [], error: null }),
    reviewLocationIds.length ? supabase.from("customer_locations").select("id, name, street, street_number, city, state_code").in("id", reviewLocationIds) : Promise.resolve({ data: [], error: null }),
  ]);
  const fieldSubmissionIds = fieldItems.map((item) => item.submission_id).filter(Boolean);
  const fieldSubmissionsResult = fieldSubmissionIds.length ? await supabase.from("service_order_partner_submissions").select("id, execution_report, customer_signature_name, customer_signature_data_url, submitted_at, checked_in_at, checked_out_at, evidence").in("id", fieldSubmissionIds as string[]) : null;
  const fieldSubmissions = fieldSubmissionsResult?.data ?? [];
  const { data: fieldCompletions, error: fieldCompletionError } = fieldTicketIds.length ? await supabase.from("ticket_completions").select("id, ticket_id, execution_record_id, evidence_ids, created_at").in("ticket_id", fieldTicketIds).order("created_at", { ascending: false }) : { data: [], error: null };
  const fieldExecutionIds = (fieldCompletions ?? []).map((completion) => completion.execution_record_id).filter(Boolean);
  const { data: fieldExecutions, error: fieldExecutionError } = fieldExecutionIds.length ? await supabase.from("ticket_execution_records").select("id, ticket_id, diagnosis, solution").in("id", fieldExecutionIds as string[]) : { data: [], error: null };
  const { data: fieldLegacyEvidences, error: fieldLegacyEvidenceError } = fieldTicketIds.length ? await supabase.from("ticket_evidences").select("id, ticket_id, evidence_type, storage_path, mime_type").in("ticket_id", fieldTicketIds) : { data: [], error: null };
  const fieldOrderLpuResult = fieldOrderIds.length ? await supabase.from("field_service_order_lpu_lines").select("id, service_order_id, lpu_code, description, unit, quantity, unit_price").in("service_order_id", fieldOrderIds).order("created_at") : null;
  const fieldOrderLpu = fieldOrderLpuResult?.data ?? [];
  const fieldOrderMaterialsResult = fieldOrderIds.length ? await supabase.from("service_order_material_usages").select("service_order_id, lpu_item_id, material_code, material_name, unit, quantity").in("service_order_id", fieldOrderIds).order("created_at") : null;
  const fieldOrderMaterials = fieldOrderMaterialsResult?.data ?? [];
  if (fieldOrdersResult?.error || fieldTicketsResult?.error || reviewCustomersError || reviewLocationsError || fieldSubmissionsResult?.error || fieldOrderLpuResult?.error || fieldOrderMaterialsResult?.error || fieldCompletionError || fieldExecutionError || fieldLegacyEvidenceError) throw new Error("Não foi possível carregar os dados da execução de Field Service.");
  const normalizedFieldSubmissions: ReviewSubmission[] = fieldItems.map((item) => {
    const partner = fieldSubmissions.find((value) => value.id === item.submission_id);
    if (partner) return { ...partner, evidence: Array.isArray(partner.evidence) ? partner.evidence as ReviewEvidence[] : [] };
    const completion = (fieldCompletions ?? []).find((value) => value.ticket_id === item.ticket_id);
    const execution = (fieldExecutions ?? []).find((value) => value.id === completion?.execution_record_id);
    const evidence = (fieldLegacyEvidences ?? []).filter((value) => completion?.evidence_ids?.includes(value.id)).map((value) => ({ id: value.id, name: value.evidence_type, mime: value.mime_type ?? undefined, storagePath: value.storage_path }));
    if (!completion || !execution) return null;
    return { id: `internal-${completion.id}`, execution_report: `Diagnóstico: ${execution.diagnosis ?? "Não informado"}\n\nServiço executado: ${execution.solution ?? "Não informado"}`, customer_signature_name: null, customer_signature_data_url: null, submitted_at: completion.created_at, checked_in_at: null, checked_out_at: null, evidence };
  }).filter((value): value is ReviewSubmission => Boolean(value));
  const { data: fieldLpuItems, error: fieldLpuError } = fieldItems.length
    ? await supabase.from("field_service_lpu_items").select("id, organization_id, code, description, unit, unit_price").in("organization_id", organizationIds).eq("active", true).lte("valid_from", new Date().toISOString().slice(0, 10)).or(`valid_until.is.null,valid_until.gte.${new Date().toISOString().slice(0, 10)}`).order("code")
    : { data: [], error: null };
  if (fieldLpuError) throw new Error("Não foi possível carregar a LPU vigente.");
  const today = new Date().toISOString().slice(0, 10);
  const fieldCompositionsResult = fieldItems.length ? await supabase.from("field_service_lpu_compositions").select("id,organization_id,code,description").in("organization_id", organizationIds).eq("active", true).lte("valid_from", today).or(`valid_until.is.null,valid_until.gte.${today}`).order("code") : null;
  if (fieldCompositionsResult?.error) throw new Error("Não foi possível carregar as composições da LPU.");
  const fieldCompositions = fieldCompositionsResult?.data ?? [];
  const compositionIds = fieldCompositions.map((item) => item.id);
  const compositionLinesResult = compositionIds.length ? await supabase.from("field_service_lpu_composition_lines").select("composition_id,lpu_item_id,quantity,unit_price").in("composition_id", compositionIds) : null;
  if (compositionLinesResult?.error) throw new Error("Não foi possível carregar os itens das composições.");
  const compositionLines = compositionLinesResult?.data ?? [];
  const compositionItemIds = [...new Set(compositionLines.map((item) => item.lpu_item_id))];
  const compositionItemsResult = compositionItemIds.length ? await supabase.from("field_service_lpu_items").select("id,code,description,unit").in("id", compositionItemIds) : null;
  if (compositionItemsResult?.error) throw new Error("Não foi possível conferir os itens da LPU.");
  const compositionItems = compositionItemsResult?.data ?? [];
  const appliedCompositionsResult = fieldOrderIds.length ? await supabase.from("field_service_order_lpu_composition_applications").select("service_order_id,composition_id").in("service_order_id", fieldOrderIds) : null;
  if (appliedCompositionsResult?.error) throw new Error("Não foi possível conferir as composições já lançadas.");
  const appliedCompositions = appliedCompositionsResult?.data ?? [];
  const signedEvidenceUrls = new Map<string, string>();
  if (normalizedFieldSubmissions.length) {
    try {
      const storage = createStorageAdmin("ticket-evidences");
      const paths = normalizedFieldSubmissions.flatMap((submission) => submission.evidence.map((file) => file.storagePath).filter((path): path is string => Boolean(path)));
      await Promise.all(paths.map(async (path) => { const { data } = await storage.createSignedUrl(path, 900); if (data?.signedUrl) signedEvidenceUrls.set(path, data.signedUrl); }));
    } catch {
      // Storage pode não estar configurado em desenvolvimento/homologação.
    }
  }
  const { data: tickets, error } = (orderId ? { data: [], error: null } : await supabase.from("tickets").select("id, ticket_number, title, version").in("organization_id", roles.map((role) => role.organization_id)).eq("administrative_status", "AWAITING_REVIEW").order("updated_at").limit(50));
  if (error) throw new Error("Não foi possível carregar a fila de revisão.");
  // Um atendimento de Field Service também pode manter o status administrativo
  // de revisão no chamado. A fila oficial de OS tem precedência para evitar que
  // o gestor veja a mesma pendência duas vezes e para manter o contador fiel.
  const { data: officialQueue, error: officialQueueError } = tickets?.length
    ? await supabase.from("field_service_review_queue").select("ticket_id").in("organization_id", organizationIds).in("ticket_id", tickets.map((ticket) => ticket.id))
    : { data: [], error: null };
  if (officialQueueError) throw new Error("Não foi possível conferir os vínculos da revisão.");
  const fieldQueueTicketIds = new Set(fieldItems.map((item) => item.ticket_id));
  const legacyTickets = (tickets ?? []).filter((ticket) => !fieldQueueTicketIds.has(ticket.id));
  const reviewQueueCount = fieldItems.length + legacyTickets.length;
  const ids = (tickets ?? []).map((ticket) => ticket.id);
  const [{ data: completions, error: completionError }, { data: evidences, error: evidenceError }, { data: materials, error: materialError }] = await Promise.all([
    ids.length ? supabase.from("ticket_completions").select("id, ticket_id, execution_record_id, materials_used, no_material_reason, evidence_ids, material_ids, created_at").in("ticket_id", ids).order("created_at", { ascending: false }).limit(1000) : Promise.resolve({ data: [], error: null }),
    ids.length ? supabase.from("ticket_evidences").select("id, ticket_id, evidence_type").in("ticket_id", ids) : Promise.resolve({ data: [], error: null }),
    ids.length ? supabase.from("ticket_materials").select("id, ticket_id, material_name, quantity, unit").in("ticket_id", ids) : Promise.resolve({ data: [], error: null }),
  ]);
  if (completionError || evidenceError || materialError) throw new Error("Não foi possível carregar as conclusões.");
  const executionIds = (completions ?? []).map((completion) => completion.execution_record_id);
  const { data: executions, error: executionError } = executionIds.length ? await supabase.from("ticket_execution_records").select("id, diagnosis, solution, checklist_answers").in("id", executionIds) : { data: [], error: null };
  const { data: checklist, error: checklistError } = ids.length ? await supabase.from("ticket_checklist_items").select("ticket_id, item_code, label").in("ticket_id", ids).order("position") : { data: [], error: null };
  if (executionError || checklistError) throw new Error("Não foi possível carregar o diagnóstico e checklist.");

  return <section className="mx-auto max-w-6xl p-6 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><OneitPageHeader eyebrow="Validação" title="Revisão gerencial" description="Confira execução, evidências, assinatura e composição antes de aprovar ou devolver uma OS." /><Link href={orderId ? reviewHref(orderId) : `/portal/review?page=${page}`} className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-sky-400 hover:text-sky-900">Atualizar validação</Link></div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
      {orderId ? <><span>Exibindo somente a OS selecionada.</span><Link href="/portal/review" className="font-semibold text-sky-800 underline">Ver toda a fila</Link></> : <><span>Field Service · {reviewQueueCount} pendência(s) nesta página · página {page} de {pages} · até 50 registros por situação. Revisões legadas aparecem separadamente.</span><nav aria-label="Paginação da validação" className="flex gap-4">{page > 1 ? <Link href={`/portal/review?page=${page - 1}`}>Anterior</Link> : null}{page < pages ? <Link href={`/portal/review?page=${page + 1}`}>Próxima</Link> : null}</nav></>}
    </div>
    {message ? <p role="status" aria-live="polite" className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">{message}</p> : null}
    <div className="mt-6 grid gap-3 sm:grid-cols-3" aria-label="Resumo da validação de Field Service"><div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><span className="block text-sm text-amber-900">Aguardando validação</span><strong className="mt-1 block text-2xl text-amber-950">{pendingCount ?? 0}</strong></div><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><span className="block text-sm text-emerald-900">Aprovadas, aguardando conclusão</span><strong className="mt-1 block text-2xl text-emerald-950">{approvedCount ?? 0}</strong></div><div className="rounded-xl border border-slate-200 bg-white p-4"><span className="block text-sm text-slate-600">Devolvidas</span><strong className="mt-1 block text-2xl text-slate-900">{returnedCount ?? 0}</strong></div></div>
    {!legacyTickets.length && !fieldItems.length && !returnedItems.length && !approvedItems.length ? <div className="mt-6"><OneitEmptyState title={orderId ? "OS não disponível nesta fila" : "Nenhuma OS nesta página"} description={orderId ? "A OS pode não ter sido enviada para validação ou não estar disponível para seu perfil." : "Altere a página ou atualize a fila para consultar os atendimentos."} /></div> : null}
    {fieldItems.length ? <section className="mt-8"><div className="border-b border-slate-300 pb-4"><h2 className="text-xl font-semibold text-slate-950">Fila de validação</h2><p className="mt-1 text-sm text-slate-600">Cada cartão representa uma OS encerrada pelo técnico. Confira os dados, lance a composição e tome uma decisão.</p></div><div className="mt-4 space-y-5">{fieldItems.map((item) => { const order = fieldOrders.find((value) => value.id === item.service_order_id); const ticket = fieldTickets.find((value) => value.id === item.ticket_id) as ReviewTicket | undefined; const customer = reviewCustomers?.find((value) => value.id === ticket?.customer_id); const location = reviewLocations?.find((value) => value.id === ticket?.location_id); const submission = normalizedFieldSubmissions.find((value) => value.id === item.submission_id || value.id === `internal-${(fieldCompletions ?? []).find((completion) => completion.ticket_id === item.ticket_id)?.id}`); const lines = fieldOrderLpu.filter((line) => line.service_order_id === item.service_order_id); const total = lines.reduce((sum, line) => sum + Number(line.quantity) * Number(line.unit_price), 0); const evidence = submission?.evidence ?? []; return <article key={item.id} aria-label={`OS ${order?.order_number ?? "não identificada"} aguardando validação`} className="overflow-hidden rounded-2xl border border-amber-200 border-l-4 border-l-amber-500 bg-white shadow-sm"><div className="border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-800">{order?.order_number ?? "OS"} · {ticket?.ticket_number ?? "Chamado"}</p><h3 className="mt-1 text-xl font-semibold text-slate-950">{ticket?.title ?? "Atendimento de campo"}</h3></div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">Aguardando sua validação</span></div><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-slate-500">Cliente</dt><dd className="font-semibold text-slate-950">{customer?.name ?? "Não informado"}</dd></div><div><dt className="text-slate-500">Polo / local</dt><dd className="font-semibold text-slate-950">{location ? `${location.name} · ${location.city}` : "Não informado"}</dd></div><div><dt className="text-slate-500">Serviço</dt><dd className="font-semibold text-slate-950">{ticket?.service_type_code ?? ticket?.title ?? "Não informado"}</dd></div></dl><p className="mt-2 text-xs text-slate-600">{location ? `${location.street ?? ""} ${location.street_number ?? ""} · ${location.city}${location.state_code ? ` · ${location.state_code}` : ""}`.replace(/\s+/g, " ").trim() : "Endereço não informado"}</p></div><div className="border-b border-slate-200 bg-white px-5 py-4 sm:px-6"><p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Linha do atendimento</p><dl className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-3"><div><dt className="text-slate-500">Agendamento</dt><dd className="font-medium text-slate-950">{order?.scheduled_at ? new Date(order.scheduled_at).toLocaleString("pt-BR") : "Não informado"}</dd></div><div><dt className="text-slate-500">Check-in</dt><dd className="font-medium text-slate-950">{submission?.checked_in_at ? new Date(submission.checked_in_at).toLocaleString("pt-BR") : order?.checked_in_at ? new Date(order.checked_in_at).toLocaleString("pt-BR") : "Não informado"}</dd></div><div><dt className="text-slate-500">Checkout</dt><dd className="font-medium text-slate-950">{submission?.checked_out_at ? new Date(submission.checked_out_at).toLocaleString("pt-BR") : order?.checked_out_at ? new Date(order.checked_out_at).toLocaleString("pt-BR") : "Não informado"}</dd></div></dl></div><div className="grid gap-4 px-5 py-5 text-sm md:grid-cols-2 sm:px-6"><section className="rounded-xl border border-slate-200 p-4"><h4 className="font-semibold text-slate-950">Execução e assinatura</h4><p className="mt-1 whitespace-pre-wrap text-slate-700">{submission?.execution_report ?? "Sem relato."}</p><p className="mt-3 text-slate-600">Responsável: <span className="font-medium text-slate-950">{submission?.customer_signature_name ?? "Não informado"}</span></p>{submission?.customer_signature_data_url ? <img src={submission.customer_signature_data_url} alt="Assinatura do responsável" className="mt-2 max-h-20 rounded border p-1" /> : null}</section><section className="rounded-xl border border-slate-200 p-4"><h4 className="font-semibold text-slate-950">Evidências e composição</h4><p className="mt-1 text-slate-600">{evidence.length ? `${evidence.length} foto(s) registrada(s)` : "Nenhuma foto registrada"}</p><ul className="mt-1 space-y-1">{evidence.map((file, index) => <li key={`${file.storagePath ?? file.name ?? "foto"}-${index}`}>{signedEvidenceUrls.get(file.storagePath ?? "") ? <a className="text-cyan-800 underline" href={signedEvidenceUrls.get(file.storagePath ?? "")} target="_blank" rel="noreferrer">Abrir {file.name ?? "foto"}</a> : <span>{file.name ?? "foto"} (visualização indisponível)</span>}</li>)}</ul><UsedMaterialsReview orderId={item.service_order_id} materials={fieldOrderMaterials.filter((material) => material.service_order_id === item.service_order_id)} pricedCodes={new Set(lines.map((line) => line.lpu_code))} />{lines.length ? <p className="mt-3 font-semibold text-slate-950">LPU: {lines.length} item(ns) · R$ {total.toFixed(2).replace(".", ",")}</p> : <p className="mt-3 text-amber-800">Nenhum item LPU vinculado — pode ser uma visita exclusivamente de mão de obra.</p>}<LpuCompositionsReview orderId={item.service_order_id} organizationId={item.organization_id} compositions={fieldCompositions} compositionLines={compositionLines} lpuItems={compositionItems} appliedIds={new Set(appliedCompositions.filter((entry) => entry.service_order_id === item.service_order_id).map((entry) => entry.composition_id))} pricedCodes={new Set(lines.map((line) => line.lpu_code))} /><form action={addFieldServiceOrderLpuLine} className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3"><div className="flex flex-wrap gap-2"><input type="hidden" name="returnOrderId" value={item.service_order_id} /><input type="hidden" name="serviceOrderId" value={item.service_order_id} /><select name="lpuItemId" required className="min-w-0 flex-1 rounded border border-slate-300 bg-white p-2 text-sm"><option value="">Adicionar item LPU</option>{(fieldLpuItems ?? []).filter((lpu) => lpu.organization_id === item.organization_id).map((lpu) => <option key={lpu.id} value={lpu.id}>{lpu.code} · {lpu.description} · R$ {Number(lpu.unit_price).toFixed(2)} / {lpu.unit}</option>)}</select><input name="quantity" type="number" min="0.001" step="0.001" defaultValue="1" required className="w-24 rounded border border-slate-300 bg-white p-2 text-sm" /><button className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white">Lançar</button></div><p className="text-xs text-slate-500">Informe a quantidade real: metros de cabo, horas extras ou unidades.</p></form></section></div><form action={reviewFieldServiceOrder} aria-label="Decisão do gestor sobre a OS" className="border-t border-slate-200 bg-slate-50 px-5 py-5 sm:px-6"><input type="hidden" name="returnOrderId" value={item.service_order_id} /><input type="hidden" name="queueId" value={item.id} /><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Decisão do gestor</p><p className="mt-1 text-sm text-slate-600">Registre a conferência antes de aprovar ou devolver.</p></div><span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">Ação obrigatória</span></div><label className="mt-3 block text-sm font-medium text-slate-900">Justificativa da decisão<input name="reason" required minLength={10} maxLength={2000} placeholder="Descreva a conferência ou o motivo da devolução (mínimo 10 caracteres)" className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm" /></label><div className="mt-4 flex flex-wrap gap-2"><button name="decision" value="APPROVE" disabled={!submission} className="rounded-lg bg-cyan-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Aprovar OS</button><button name="decision" value="RETURN" className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800">Devolver para correção</button></div>{!submission && <p className="mt-3 text-sm text-amber-800">O relatório do técnico não foi encontrado. Não é seguro aprovar esta OS até recuperar a submissão.</p>}</form></article>; })}</div></section> : null}
    {actionableApprovedItems.length ? <section className="mt-8"><div className="border-b border-slate-300 pb-4"><h2 className="text-xl font-semibold text-slate-950">OS aprovadas e RTO</h2><p className="mt-1 text-sm text-slate-600">A OS foi aprovada. Gere o documento técnico e depois encerre o chamado com o parecer final.</p></div><div className="mt-4 space-y-4">{actionableApprovedItems.map((item) => { const report = existingRtos.find((value) => value.service_order_id === item.service_order_id); const ticket = approvedTickets.find((value) => value.id === item.ticket_id); const order = historyOrders.find((value) => value.id === item.service_order_id); return <article key={item.id} className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-50 px-5 py-4"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-800">Validação aprovada</p><p className="mt-1 font-semibold text-slate-950">{ticket?.ticket_number ?? "Chamado"} · {order?.order_number ?? "OS não identificada"}</p><p className="text-sm text-slate-600">{report ? `RTO versão ${report.report_version} registrada` : "RTO pendente de geração"}</p></div>{report?.storage_path ? <a href={`/api/field-service/rto?reportId=${report.id}&redirect=1`} target="_blank" rel="noreferrer" className="rounded-lg border border-emerald-700 bg-white px-3 py-2 text-sm font-semibold text-emerald-900">Baixar RTO</a> : <form action={generateFieldServiceRto}><input type="hidden" name="returnOrderId" value={item.service_order_id} /><input type="hidden" name="queueId" value={item.id} /><button className="rounded-lg bg-emerald-800 px-3 py-2 text-sm font-semibold text-white">Gerar RTO</button></form>}</div>{report?.storage_path && ticket?.administrative_status !== "CLOSED" && ticket ? <form action={closeFieldServiceTicket} className="space-y-3 bg-slate-50 px-5 py-5"><input type="hidden" name="ticketId" value={ticket.id} /><input type="hidden" name="returnOrderId" value={item.service_order_id} /><input type="hidden" name="reportId" value={report.id} /><input type="hidden" name="version" value={ticket.version} /><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Encerramento do chamado</p><label className="block text-sm font-medium text-slate-900">Parecer final do gestor<input name="reason" minLength={10} maxLength={2000} required className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5" placeholder="Descreva a conferência e a conclusão (mínimo 10 caracteres)" /></label><label className="block text-sm font-medium text-slate-900">Responsável pelo fechamento externo<input name="exceptionReason" minLength={10} maxLength={2000} required className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5" placeholder="Informe o responsável pelo fechamento no sistema do cliente" /></label><label className="flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" name="exceptionAcknowledged" required className="mt-1" />Reconheço que o encerramento no OneIT não fecha automaticamente o chamado no sistema do cliente.</label><button className="w-fit rounded-lg bg-cyan-900 px-4 py-2.5 text-sm font-semibold text-white">Validar RTO e encerrar chamado</button></form> : ticket?.administrative_status === "CLOSED" ? <p className="px-5 py-4 text-sm font-medium text-emerald-800">Chamado encerrado no OneIT.</p> : null}</article>; })}</div></section> : null}
    {closedApprovedItems.length ? <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-base font-semibold text-slate-900">Encerradas nesta página</h2><p className="mt-1 text-sm text-slate-600">Atendimentos concluídos permanecem disponíveis para consulta.</p><ul className="mt-3 divide-y divide-slate-200">{closedApprovedItems.map((item) => { const ticket = approvedTickets.find((value) => value.id === item.ticket_id); const order = historyOrders.find((value) => value.id === item.service_order_id); const report = existingRtos.find((value) => value.service_order_id === item.service_order_id && value.storage_path); return <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span className="font-medium text-slate-900">{ticket?.ticket_number ?? "Chamado"} · {order?.order_number ?? "OS"}</span><span className="text-emerald-800">Encerrado</span>{report ? <a href={`/api/field-service/rto?reportId=${report.id}&redirect=1`} target="_blank" rel="noreferrer" className="font-semibold text-sky-800 underline">Baixar RTO</a> : <span className="text-amber-800">PDF indisponível</span>}</li>; })}</ul></section> : null}
    {returnedItems.length ? <section className="mt-6"><h2 className="text-xl font-semibold">OS devolvidas para correção</h2><div className="mt-3 space-y-3">{returnedItems.map((item) => { const order = historyOrders.find((value) => value.id === item.service_order_id); return <article key={item.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{order?.order_number ?? "OS não identificada"}</p><span className="rounded-full bg-amber-200 px-2 py-1 text-xs font-semibold text-amber-900">Correção pendente</span></div><p className="mt-2 text-sm text-amber-900"><span className="font-medium">Justificativa:</span> {item.review_reason}</p><p className="mt-1 text-xs text-amber-800">Devolvida em {item.reviewed_at ? new Date(item.reviewed_at).toLocaleString("pt-BR") : "data não informada"}. A OS deve ser reenviada pelo técnico após a correção.</p></article>; })}</div></section> : null}
    {legacyTickets.length ? <div className="mt-8 border-t border-slate-200 pt-6"><h2 className="text-lg font-semibold text-slate-900">Chamados legados aguardando revisão</h2><p className="mt-1 text-sm text-slate-600">Pendências do fluxo ITSM anterior, sem OS de Field Service associada.</p><div className="mt-4 space-y-6">{legacyTickets.map((ticket) => {
      const completion = (completions ?? []).find((item) => item.ticket_id === ticket.id);
      const execution = (executions ?? []).find((item) => item.id === completion?.execution_record_id);
      if (!completion || !execution) return <article key={ticket.id} className="rounded border bg-white p-5">{ticket.ticket_number}: dados incompletos para revisão.</article>;
      return <article key={ticket.id} className="rounded-xl border bg-white p-5">
        <h2 className="text-xl font-semibold">{ticket.ticket_number} — {ticket.title}</h2>
        <h3 className="mt-4 font-medium">Diagnóstico</h3><p className="whitespace-pre-wrap text-sm">{execution.diagnosis}</p>
        <h3 className="mt-4 font-medium">Serviço realizado</h3><p className="whitespace-pre-wrap text-sm">{execution.solution}</p>
        <h3 className="mt-4 font-medium">Checklist</h3><ul className="text-sm">{(checklist ?? []).filter((item) => item.ticket_id === ticket.id).map((item) => <li key={item.item_code}>{execution.checklist_answers[item.item_code] ? "Concluído" : "Pendente"}: {item.label}</li>)}</ul>
        <h3 className="mt-4 font-medium">Materiais</h3>{completion.materials_used ? <ul className="text-sm">{(materials ?? []).filter((item) => completion.material_ids.includes(item.id)).map((item) => <li key={item.id}>{item.material_name} — {item.quantity} {item.unit}</li>)}</ul> : <p className="text-sm">Sem consumo de materiais{completion.no_material_reason ? `: ${completion.no_material_reason}` : "."}</p>}
        <h3 className="mt-4 font-medium">Evidências</h3><ul className="space-y-2 text-sm">{(evidences ?? []).filter((item) => completion.evidence_ids.includes(item.id)).map((item) => <li key={item.id}><a className="text-cyan-700 underline" href={`/portal/field/evidence/${item.id}`} target="_blank" rel="noreferrer">Abrir {item.evidence_type}</a></li>)}</ul>
        <form action={reviewTicket} className="mt-5 space-y-3 border-t pt-4"><input name="ticketId" type="hidden" value={ticket.id} /><input name="version" type="hidden" value={ticket.version} />
          <label className="block text-sm">Decisão<select name="decision" required defaultValue="" className="mt-1 block w-full rounded border p-2"><option disabled value="">Selecione</option><option value="APPROVE">Aprovar</option><option value="RETURN">Devolver para correção</option></select></label>
          <label className="block text-sm">Justificativa<textarea name="reason" required minLength={10} maxLength={2000} className="mt-1 block w-full rounded border p-2" /></label>
          <button type="submit" className="rounded bg-slate-900 px-4 py-2 font-semibold text-white">Registrar revisão</button>
        </form>
      </article>;
    })}</div></div> : null}
  </section>;
}
