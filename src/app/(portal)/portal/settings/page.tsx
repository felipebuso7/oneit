import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { OneitPageHeader, OneitSection } from "@/components/oneit";

const groups = [
  { title: "Organização", description: "Empresas, unidades, solicitantes, usuários e permissões.", links: [["Organizações", "/portal/organizations"], ["Empresas e departamentos", "/portal/settings/organizational-units"], ["Clientes", "/portal/customers"], ["Localidades e polos", "/portal/locations"], ["Regiões dos polos", "/portal/regions"], ["Técnicos de campo", "/portal/technicians"], ["Solicitantes e colaboradores", "/portal/collaborators"], ["Usuários", "/portal/users"]] },
  { title: "Atendimento", description: "Catálogo, categorias, prioridades, níveis de serviço e calendários.", links: [["Catálogo de serviços", "/portal/service-catalog"], ["Prioridades", "/portal/priority-matrix"], ["SLA / OLA", "/portal/sla"], ["Calendários", "/portal/calendars"], ["Grupos de suporte", "/portal/support-groups"], ["LPU e materiais", "/portal/settings/field-service/lpu"]] },
  { title: "Inventário", description: "Tipos de ativo, ativos, fornecedores e critérios de garantia.", links: [["Tipos e ativos", "/portal/assets"], ["Fornecedores", "/portal/suppliers"], ["Riscos de fornecedores", "/portal/supplier-risks"]] },
  { title: "Governança e plataforma", description: "Comunicação, conhecimento, feature flags, SaaS e auditoria.", links: [["Conhecimento", "/portal/knowledge"], ["Avisos", "/portal/announcements"], ["Templates", "/portal/email-templates"], ["Configurações SaaS", "/portal/saas-settings"], ["Feature flags", "/portal/feature-flags"], ["Auditoria", "/portal/audit"]] },
];

export default async function SettingsPage() {
  const { supabase, user } = await requireUser();
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id).in("role", ["SUPER_ADMIN", "ORG_ADMIN"]);
  if (!(roles ?? []).length) return <main className="mx-auto max-w-4xl p-8"><h1 className="text-3xl font-semibold">Configurações</h1><p className="mt-4 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Seu perfil não possui permissão para administrar cadastros.</p></main>;
  return <main className="mx-auto max-w-6xl p-6 sm:p-8"><OneitPageHeader eyebrow="Administração" title="Configurações" description="Cadastros mestres conectados da organização. Alterações aqui impactam formulários e fluxos operacionais do OneIT." /><div className="mt-7 grid gap-5 md:grid-cols-2">{groups.map((group) => <OneitSection key={group.title} title={group.title} description={group.description}><div className="flex flex-wrap gap-2">{group.links.map(([label, href]) => <Link key={href} href={href} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-[#0b4a64] transition hover:bg-slate-50">{label}</Link>)}</div></OneitSection>)}</div></main>;
}
