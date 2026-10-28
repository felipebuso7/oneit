"use client";
/* eslint-disable react-hooks/set-state-in-effect -- navegação sincroniza preferência e raiz ativa com a URL. */

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { OneitNavIcon, navIconName } from "@/components/oneit-nav-icon";

type DemoSidebarProps = {
  active: "overview" | "tickets" | "inbox" | "inventory" | "field-service" | "field-overview" | "field-validation" | "field-queue" | "field-finance" | "field-fiscal" | "field-fiscal-history" | "problems" | "knowledge" | "changes" | "suppliers" | "reports" | "settings" | "about" | "service-catalog" | "field-service-settings" | "field-service-units" | "field-service-lpu" | "field-service-regions" | "requesters" | "technicians" | "sgsti" | "sgsti-dashboard" | "sgsti-alerts" | "sgsti-planner" | "sgsti-decisions" | "sgsti-context" | "sgsti-risks" | "sgsti-performance" | "sgsti-suppliers" | "sgsti-continuity" | "sgsti-requirements" | "sgsti-experience" | "sgsti-management-review" | "sgsti-action-plan" | "sgsti-audits" | "sgsti-audit-findings" | "sgsti-audit-pack" | "sgsti-assurance" | "sgsti-controls" | "sgsti-nonconformities" | "sgsti-capa" | "sgsti-5w2h" | "sgsti-templates" | "sgsti-documents" | "sgsti-structure" | "sgsti-competence" | "sgsti-communications" | "sgsti-records" | "sgsti-settings";
};

type ModuleKey = "OPERATION" | "SERVICE_MANAGEMENT" | "FIELD_SERVICE" | "FISCAL" | "SGSTI" | "ADMINISTRATION";

const menuRoots = [
  { id: "dashboard", label: "Dashboard", icon: "report", modules: ["OPERATION"] as ModuleKey[], itemIds: ["overview"] },
  { id: "operation", label: "Operação", icon: "ticket", modules: ["OPERATION", "FIELD_SERVICE"] as ModuleKey[] },
  { id: "billing", label: "Faturamento", icon: "document", modules: ["FISCAL"] as ModuleKey[] },
  { id: "administration", label: "Administração", icon: "settings", modules: ["ADMINISTRATION"] as ModuleKey[] },
] as const;

// Módulos preservados para evolução futura, mas fora da operação atual.
const activeProductModules: ModuleKey[] = ["OPERATION", "FIELD_SERVICE", "FISCAL", "ADMINISTRATION"];

const items = [
  { id: "overview", icon: "⌂", label: "Visão geral", href: "/demo", group: "Operação", module: "OPERATION" },
  { id: "tickets", icon: "▣", label: "Chamados", href: "/demo/tickets", group: "Operação", module: "OPERATION" },
  { id: "field-overview", icon: "⌂", label: "Visão geral Field Service", href: "/demo/field-service/overview", group: "Operação", module: "FIELD_SERVICE" },
  { id: "field-queue", icon: "≡", label: "Fila Field Service", href: "/demo/field-service/queue-v2", group: "Operação", module: "FIELD_SERVICE" },
  { id: "field-validation", icon: "✓", label: "Validação de OS", href: "/demo/field-service/validation-v2", group: "Operação", module: "FIELD_SERVICE" },
  { id: "field-finance", icon: "▤", label: "BM e faturamento", href: "/demo/field-service/finance", group: "Faturamento", module: "FISCAL" },
  { id: "field-fiscal", icon: "▥", label: "Lote fiscal", href: "/demo/field-service/fiscal", group: "Faturamento", module: "FISCAL" },
  { id: "field-fiscal-history", icon: "◷", label: "Histórico de faturamento", href: "/demo/field-service/fiscal/history", group: "Faturamento", module: "FISCAL" },
  { id: "problems", icon: "?", label: "Problemas", href: "/demo/problems", group: "Gestão de serviços", module: "SERVICE_MANAGEMENT" },
  { id: "changes", icon: "↺", label: "Mudanças", href: "/demo/changes", group: "Gestão de serviços", module: "SERVICE_MANAGEMENT" },
  { id: "inventory", icon: "▦", label: "Ativos", href: "/demo/inventory", group: "Gestão de serviços", module: "SERVICE_MANAGEMENT" },
  { id: "suppliers", icon: "◇", label: "Fornecedores", href: "/demo/suppliers", group: "Gestão de serviços", module: "SERVICE_MANAGEMENT" },
  { id: "sgsti-dashboard", icon: "▤", label: "Dashboard SGSTI", href: "/demo/sgsti/dashboard", group: "SGSTI", module: "SGSTI" },
  { id: "sgsti-alerts", icon: "◉", label: "Alertas e prazos", href: "/demo/sgsti/alerts", group: "SGSTI", module: "SGSTI" },
  { id: "sgsti", icon: "✓", label: "Agenda e ritos", href: "/demo/sgsti", group: "Agenda e ritos", module: "SGSTI" },
  { id: "sgsti-decisions", icon: "→", label: "Decisões e ações", href: "/demo/sgsti/decisions", group: "Agenda e ritos", module: "SGSTI" },
  { id: "sgsti-action-plan", icon: "☑", label: "Plano mestre e ações", href: "/demo/sgsti/action-plan", group: "Agenda e ritos", module: "SGSTI" },
  { id: "sgsti-documents", icon: "▤", label: "Registro documental ISO", href: "/demo/sgsti/documents", group: "Documentação ISO", module: "SGSTI" },
  { id: "sgsti-records", icon: "□", label: "Retenção e registros", href: "/demo/sgsti/records", group: "Documentação ISO", module: "SGSTI" },
  { id: "sgsti-assurance", icon: "◌", label: "Controles e evidências", href: "/demo/sgsti/assurance", group: "Conformidade", module: "SGSTI" },
  { id: "sgsti-controls", icon: "☑", label: "Matriz de controles", href: "/demo/sgsti/controls", group: "Conformidade", module: "SGSTI" },
  { id: "sgsti-audits", icon: "◈", label: "Auditorias internas", href: "/demo/sgsti/audits", group: "Conformidade", module: "SGSTI" },
  { id: "sgsti-audit-findings", icon: "!", label: "Achados de auditoria", href: "/demo/sgsti/audit-findings", group: "Conformidade", module: "SGSTI" },
  { id: "sgsti-audit-pack", icon: "▤", label: "Dossiê de auditoria", href: "/demo/sgsti/audit-pack", group: "Conformidade", module: "SGSTI" },
  { id: "sgsti-nonconformities", icon: "!", label: "NCs e melhorias", href: "/demo/sgsti/nonconformities", group: "Conformidade", module: "SGSTI" },
  { id: "sgsti-capa", icon: "↳", label: "CAPA e causa raiz", href: "/demo/sgsti/capa", group: "Conformidade", module: "SGSTI" },
  { id: "sgsti-5w2h", icon: "☑", label: "Planos 5W2H", href: "/demo/sgsti/5w2h", group: "Conformidade", module: "SGSTI" },
  { id: "sgsti-context", icon: "◎", label: "Contexto e objetivos", href: "/demo/sgsti/context", group: "Direção", module: "SGSTI" },
  { id: "sgsti-risks", icon: "△", label: "Riscos e oportunidades", href: "/demo/sgsti/risks", group: "Direção", module: "SGSTI" },
  { id: "sgsti-performance", icon: "▤", label: "Indicadores e medição", href: "/demo/sgsti/performance", group: "Direção", module: "SGSTI" },
  { id: "sgsti-suppliers", icon: "◇", label: "Avaliação de fornecedores", href: "/demo/sgsti/suppliers", group: "Direção", module: "SGSTI" },
  { id: "sgsti-continuity", icon: "↺", label: "Continuidade e testes", href: "/demo/sgsti/continuity", group: "Direção", module: "SGSTI" },
  { id: "sgsti-requirements", icon: "§", label: "Requisitos e obrigações", href: "/demo/sgsti/requirements", group: "Direção", module: "SGSTI" },
  { id: "sgsti-experience", icon: "◌", label: "Satisfação e experiência", href: "/demo/sgsti/experience", group: "Direção", module: "SGSTI" },
  { id: "sgsti-management-review", icon: "◈", label: "Análise crítica", href: "/demo/sgsti/management-review", group: "Direção", module: "SGSTI" },
  { id: "reports", icon: "▤", label: "Relatórios", href: "/demo/reports", group: "Administração", module: "ADMINISTRATION" },
  { id: "settings", icon: "⚙", label: "Configurações", href: "/demo/settings", group: "Administração", module: "ADMINISTRATION" },
  { id: "about", icon: "◌", label: "Sobre o OneIT", href: "/demo/settings/about", group: "Administração", module: "ADMINISTRATION" },
  { id: "service-catalog", icon: "▤", label: "Catálogo de serviços", href: "/demo/settings/service-catalog", group: "Administração", module: "ADMINISTRATION" },
  { id: "field-service-settings", icon: "▦", label: "Cadastros Field Service", href: "/demo/settings/field-service", group: "Administração", module: "ADMINISTRATION" },
  { id: "field-service-lpu", icon: "¤", label: "Cadastro LPU", href: "/demo/settings/field-service/lpu", group: "Administração", module: "ADMINISTRATION" },
  { id: "sgsti-settings", icon: "⚙", label: "Configurações SGSTI", href: "/demo/settings/sgsti", group: "Administração", module: "SGSTI" },
  { id: "requesters", icon: "◌", label: "Solicitantes", href: "/demo/requesters", group: "Administração", module: "ADMINISTRATION" },
  { id: "technicians", icon: "◉", label: "Usuários e técnicos", href: "/demo/technicians", group: "Administração", module: "ADMINISTRATION" },
] as const;

export function DemoSidebar({ active }: DemoSidebarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [visibleModules, setVisibleModules] = useState<ModuleKey[]>(activeProductModules);
  const [openRoots, setOpenRoots] = useState<Record<string, boolean>>({});

  useEffect(() => {
    document.documentElement.dataset.oneitSidebar = "expanded";
    const updateModules = () => {
      try {
        const stored = JSON.parse(window.localStorage.getItem("oneit.demo.current-access.v1") ?? "[]") as unknown;
        if (Array.isArray(stored) && stored.length) {
          const allowed = stored.filter((item): item is ModuleKey => typeof item === "string" && activeProductModules.includes(item as ModuleKey));
          // Gestores e administradores precisam enxergar o ciclo financeiro que
          // fecha a operação (BM → fiscal). Versões anteriores gravavam esses
          // perfis sem FISCAL; a compatibilidade evita que a seção desapareça
          // até que o usuário revise seus privilégios novamente.
          if (allowed.includes("ADMINISTRATION") && !allowed.includes("FISCAL")) allowed.push("FISCAL");
          setVisibleModules(allowed.length ? allowed : activeProductModules);
        }
      } catch { /* A navegação mantém todos os módulos se a preferência local estiver inválida. */ }
    };
    updateModules();
    window.addEventListener("oneit-demo-access-updated", updateModules);
    return () => window.removeEventListener("oneit-demo-access-updated", updateModules);
  }, []);

  const visibleItems = items.filter((item) => visibleModules.includes(item.module));
  const activeItem = items.find((item) => item.id === (active === "field-service" ? "field-queue" : active));

  useEffect(() => {
    const root = menuRoots.find((item) => activeItem && item.modules.includes(activeItem.module));
    if (!root) return;
    setOpenRoots((all) => ({ ...all, [root.id]: true }));
  }, [active, activeItem]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileMenuOpen]);

  return (
    <>
    <aside aria-label="Navegação principal" data-mobile-menu-open={mobileMenuOpen} className="oneit-demo-sidebar fixed inset-y-0 left-0 z-30 flex w-64 flex-col px-3 py-0 text-slate-700">
      <div className="flex h-20 items-center justify-center border-b border-slate-200 max-md:h-16 max-md:justify-between">
        <Link href="/demo" aria-label="OneIT · Dashboard" className="relative block h-12 w-[180px] shrink-0 overflow-hidden" onClick={() => setMobileMenuOpen(false)}>
          <Image src="/oneit-logo-cropped.png" alt="OneIT" width={900} height={386} priority className="absolute left-0 top-[-7px] h-auto w-[180px] max-w-none" />
        </Link>
        <button type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-[#062c59] md:hidden" aria-controls="oneit-demo-navigation" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((value) => !value)}>{mobileMenuOpen ? "Fechar" : "Menu"}</button>
      </div>

      <nav id="oneit-demo-navigation" className="mt-3 space-y-1 overflow-y-auto pb-3">
        {menuRoots.map((root) => {
          const rootItems = visibleItems.filter((item) => ("itemIds" in root && root.itemIds ? root.itemIds.some((id) => id === item.id) : root.modules.includes(item.module) && item.id !== "overview"));
          if (!rootItems.length) return null;
          if (root.id === "dashboard") return <Link key={root.id} href="/demo" aria-current={active === "overview" ? "page" : undefined} onClick={() => setMobileMenuOpen(false)} className="flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"><OneitNavIcon name="report" className="h-5 w-5 shrink-0" /><span>Dashboard</span></Link>;
          const isOpen = openRoots[root.id] ?? false;
          const toggleRoot = () => setOpenRoots((all) => ({ ...all, [root.id]: !isOpen }));
          return <section key={root.id} className="border-b border-slate-100 pb-2 last:border-b-0">
            <button type="button" onClick={toggleRoot} data-oneit-label={root.label} aria-expanded={isOpen} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100"><OneitNavIcon name={root.icon} className="h-5 w-5 shrink-0" /><span className="flex-1 truncate">{root.label}</span><span className="text-xs text-slate-500">{isOpen ? "⌄" : "›"}</span></button>
            {isOpen && <div className="ml-3 mt-1 border-l border-slate-200 pl-2">{rootItems.map((item) => <Link key={item.id} href={item.href} data-oneit-label={item.label} aria-current={item.id === active ? "page" : undefined} onClick={() => setMobileMenuOpen(false)} className={(item.id === active ? "bg-[#eaf1fa] font-semibold text-[#062c59]" : "text-slate-600 hover:bg-slate-100") + " flex items-center gap-3 rounded-md px-2 py-2 text-sm transition"}><OneitNavIcon name={navIconName(item.label)} className="h-[18px] w-[18px] shrink-0" /><span className="truncate">{item.label}</span></Link>)}</div>}
          </section>;
        })}
      </nav>

      <div className="mt-auto border-t border-slate-200 px-3 pt-4">
        <p className="text-xs font-semibold text-slate-700">OneIT Service Management</p><p className="pb-4 text-xs text-slate-500">Ambiente demonstrativo</p>
      </div>
    </aside>
    {mobileMenuOpen && <button type="button" className="fixed inset-0 z-20 hidden bg-slate-950/20 max-md:block" aria-label="Fechar menu" onClick={() => setMobileMenuOpen(false)} />}
    </>
  );
}
