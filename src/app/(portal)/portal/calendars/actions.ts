"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { serviceCalendarSchema } from "@/lib/validation/service-calendar";
export async function createServiceCalendar(formData: FormData) { const parsed=serviceCalendarSchema.safeParse({organizationId:formData.get("organizationId"),code:formData.get("code"),name:formData.get("name"),timezone:formData.get("timezone"),calendarType:formData.get("calendarType")}); if(!parsed.success) redirect("/portal/calendars?message=Dados+do+calendário+inválidos."); const {supabase}=await requireUser(); const value=parsed.data; const {error}=await supabase.rpc("create_service_calendar",{target_organization_id:value.organizationId,target_code:value.code,target_name:value.name,target_timezone:value.timezone,target_type:value.calendarType}); if(error) redirect("/portal/calendars?message=Não+foi+possível+criar+o+calendário."); revalidatePath("/portal/calendars"); redirect("/portal/calendars?message=Calendário+criado+com+auditoria."); }
