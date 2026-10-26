"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";

const page = "/portal/routes";
const invalid = (message: string) => redirect(page + "?message=" + encodeURIComponent(message));

export async function createRoute(formData: FormData) {
  const technicianId = formData.get("technicianId");
  const routeDate = formData.get("routeDate");
  if (typeof technicianId !== "string" || typeof routeDate !== "string" || !routeDate) invalid("Dados de rota inválidos.");
  const { supabase } = await requireUser();
  const { data: technician } = await supabase.from("technicians").select("organization_id").eq("id", technicianId).maybeSingle();
  if (!technician) { invalid("Técnico não encontrado."); return; }
  const { error } = await supabase.rpc("create_field_service_route", { target_organization_id: technician.organization_id, target_technician_id: technicianId, target_route_date: routeDate, target_start_location: {}, target_end_location: {} });
  if (error) invalid("Não foi possível criar a rota. Verifique técnico e permissões.");
  revalidatePath(page);
  redirect(page + "?message=" + encodeURIComponent("Rota criada ou atualizada."));
}

export async function addRouteStop(formData: FormData) {
  const routeId = formData.get("routeId");
  const serviceOrderId = formData.get("serviceOrderId");
  const plannedStart = formData.get("plannedStart");
  const plannedEnd = formData.get("plannedEnd");
  if (typeof routeId !== "string" || typeof serviceOrderId !== "string") invalid("Dados da parada inválidos.");
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("add_service_order_to_field_route", { target_route_id: routeId, target_service_order_id: serviceOrderId, target_planned_start_at: typeof plannedStart === "string" && plannedStart ? new Date(plannedStart).toISOString() : null, target_planned_end_at: typeof plannedEnd === "string" && plannedEnd ? new Date(plannedEnd).toISOString() : null });
  if (error) invalid("Não foi possível adicionar a OS. Ela deve estar despachada para o técnico da rota.");
  revalidatePath(page);
  redirect(page + "?message=" + encodeURIComponent("Ordem de serviço adicionada à rota."));
}

export async function moveRouteStop(formData: FormData) {
  const routeId = formData.get("routeId");
  const stopId = formData.get("stopId");
  const direction = formData.get("direction");
  if (typeof routeId !== "string" || typeof stopId !== "string" || (direction !== "up" && direction !== "down")) {
    invalid("Movimentação de rota inválida.");
    return;
  }
  const { supabase } = await requireUser();
  const { data: stops, error: stopsError } = await supabase.from("field_service_route_stops").select("id").eq("route_id", routeId).order("sequence_number");
  if (stopsError || !stops) {
    invalid("Não foi possível carregar a sequência da rota.");
    return;
  }
  const index = stops.findIndex((stop) => stop.id === stopId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapIndex < 0 || swapIndex >= stops.length) {
    invalid("Esta parada não pode ser movida nessa direção.");
    return;
  }
  const ordered = stops.map((stop) => stop.id);
  [ordered[index], ordered[swapIndex]] = [ordered[swapIndex], ordered[index]];
  const { error } = await supabase.rpc("resequence_field_service_route", { target_route_id: routeId, target_stop_ids: ordered });
  if (error) invalid("Não foi possível reordenar a rota.");
  revalidatePath(page);
  redirect(page + "?message=" + encodeURIComponent("Sequência da rota atualizada."));
}

export async function removeRouteStop(formData: FormData) {
  const stopId = formData.get("stopId");
  if (typeof stopId !== "string") invalid("Parada inválida.");
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("remove_service_order_from_field_route", { target_route_stop_id: stopId });
  if (error) invalid("Não foi possível remover a parada. Visitas iniciadas não podem ser removidas.");
  revalidatePath(page);
  redirect(page + "?message=" + encodeURIComponent("Parada removida da rota."));
}
