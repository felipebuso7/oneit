import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { PortalSidebarLight as PortalSidebar } from "@/components/portal-sidebar-light";

const navigation = [
  { title: "Operação", links: [["Visão geral", "/portal"], ["Chamados", "/portal/tickets"], ["Agendamento de OS", "/portal/field-service"], ["Validação de OS", "/portal/review"], ["Agenda Técnicos", "/portal/field"], ["Rotas planejadas", "/portal/routes"], ["Relatórios", "/portal/reports"], ["RTO Encerrados", "/portal/field-service-reports"]] },
  { title: "Serviços", links: [["Catálogo", "/portal/service-catalog"], ["SLA e OLA", "/portal/sla"], ["Grupos de suporte", "/portal/support-groups"], ["Escalonamentos", "/portal/escalations"], ["Prioridades", "/portal/priority-matrix"], ["Calendários", "/portal/calendars"]] },
  { title: "Administração", links: [["Configurações", "/portal/settings"], ["Organizações", "/portal/organizations"], ["Usuários", "/portal/users"], ["Clientes", "/portal/customers"], ["Localidades", "/portal/locations"], ["Técnicos", "/portal/technicians"], ["Contratos", "/portal/contracts"], ["Fornecedores", "/portal/suppliers"], ["SLA de fornecedores", "/portal/supplier-performance"], ["Ações de fornecedores", "/portal/supplier-actions"], ["Painel de fornecedores", "/portal/supplier-performance/dashboard"]] },
] as const;

export default async function PortalLayout({ children }: Readonly<{ children: ReactNode }>) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (process.env.NODE_ENV !== "production") redirect("/demo");
    redirect("/login?error=environment");
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  return <main className="min-h-screen bg-slate-100 text-slate-900"><PortalSidebar navigation={navigation}/><section data-oneit-portal-sidebar-offset className="min-h-screen">{children}</section></main>;
}
