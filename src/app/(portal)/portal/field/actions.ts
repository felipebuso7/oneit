"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";

import { fieldEventSchema } from "@/lib/validation/field-event";

export async function recordFieldEvent(formData: FormData) {
  const optionalNumber = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" && value.trim() ? Number(value) : undefined;
  };
  const parsed = fieldEventSchema.safeParse({
    ticketId: formData.get("ticketId"), eventType: formData.get("eventType"),
    latitude: optionalNumber("latitude"), longitude: optionalNumber("longitude"),
    accuracy: optionalNumber("accuracy"), justification: formData.get("justification") || undefined,
  });
  if (!parsed.success) redirect("/portal/field?message=Informe+uma+localização+válida+ou+justifique+a+ausência+de+GPS.");
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("record_ticket_field_event", {
    target_ticket_id: parsed.data.ticketId, target_event: parsed.data.eventType,
    target_latitude: parsed.data.latitude ?? null, target_longitude: parsed.data.longitude ?? null,
    target_accuracy: parsed.data.accuracy ?? null, target_justification: parsed.data.justification ?? null,
  });
  if (error) redirect("/portal/field?message=Não+foi+possível+registrar+o+evento.+Recarregue+a+OS.");
  revalidatePath("/portal/field"); revalidatePath("/portal/tickets");
  redirect("/portal/field?message=Evento+registrado.");
}
