"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/current-user";

export async function markSgstiNotificationRead(formData: FormData) {
  const notificationId = z.string().uuid().safeParse(formData.get("notificationId"));
  if (!notificationId.success) redirect("/portal/sgsti/notifications?message=Notifica%C3%A7%C3%A3o+inv%C3%A1lida.");
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("mark_sgsti_notification_read", { target_notification_id: notificationId.data });
  if (error) redirect("/portal/sgsti/notifications?message=N%C3%A3o+foi+poss%C3%ADvel+marcar+a+notifica%C3%A7%C3%A3o.");
  revalidatePath("/portal/sgsti/notifications");
  redirect("/portal/sgsti/notifications?message=Notifica%C3%A7%C3%A3o+marcada+como+lida.");
}
