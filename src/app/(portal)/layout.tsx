import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { PortalSidebarV2 as PortalSidebar } from "@/components/portal-sidebar-v2";

const navigation = [
  { title: "Operação", links: [["Visão geral", "/portal"], ["Chamados", "/portal/tickets"], ["Central Field Service", "/portal/field-service"], ["Validação de OS", "/portal/review"], ["Minha agenda", "/portal/field"], ["Rotas", "/portal/routes"], ["Ativos", "/portal/assets"], ["Conhecimento", "/portal/knowledge"], ["Relatórios", "/portal/reports"], ["RTOs Field Service", "/portal/field-service-reports"]] },
  { title: "Serviços", links: [["Catálogo", "/portal/service-catalog"], ["SLA e OLA", "/portal/sla"], ["Grupos de suporte", "/portal/support-groups"], ["Escalonamentos", "/portal/escalations"], ["Prioridades", "/portal/priority-matrix"], ["Calendários", "/portal/calendars"]] },
  { title: "Administração", links: [["Configurações", "/portal/settings"], ["Organizações", "/portal/organizations"], ["Usuários", "/portal/users"], ["Clientes", "/portal/customers"], ["Contratos", "/portal/contracts"], ["Fornecedores", "/portal/suppliers"], ["SLA de fornecedores", "/portal/supplier-performance"], ["Ações de fornecedores", "/portal/supplier-actions"], ["Painel de fornecedores", "/portal/supplier-performance/dashboard"]] },
] as const;

export default async function PortalLayout({ children }: Readonly<{ children: ReactNode }>) {
  // Allow stakeholders to navigate a realistic preview before Supabase is provisioned.
  // Authenticated portal routes resume automatically once the environment is configured.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect("/demo");
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  return <main className="min-h-screen bg-slate-100 text-slate-900"><PortalSidebar navigation={navigation}/><section data-oneit-portal-sidebar-offset className="min-h-screen">{children}</section></main>;
}
