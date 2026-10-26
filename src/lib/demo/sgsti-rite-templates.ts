export type RiteTemplate = {
  id: string;
  title: string;
  process: string;
  periodicity: string;
  reference: string;
  defaultResponsible: string;
  participants: string[];
  sections: string[];
  evidence: string;
  active: boolean;
};

export const riteTemplatesStorageKey = "oneit.demo.sgsti.rite-templates.v1";

export const defaultRiteTemplates: RiteTemplate[] = [
  { id: "direction", title: "Análise crítica da direção", process: "Governança do SGSTI", periodicity: "Anual", reference: "ISO/IEC 20000-1 9.3", defaultResponsible: "Diretoria", participants: ["Diretoria", "Gestor do SGSTI", "Responsável por Qualidade"], sections: ["Entradas obrigatórias", "Decisões", "Conclusão sobre adequação e eficácia", "Ações"], evidence: "Ata assinada, indicadores, decisões e plano de ação", active: true },
  { id: "audit", title: "Auditoria interna do SGSTI", process: "Auditoria Interna", periodicity: "Semestral", reference: "ISO/IEC 20000-1 9.2", defaultResponsible: "Qualidade", participants: ["Auditor interno", "Gestor do processo auditado", "Responsável por Qualidade"], sections: ["Escopo e critérios", "Constatações", "Evidências", "Achados e recomendações"], evidence: "Programa, checklist, relatório e evidências", active: true },
  { id: "kpi", title: "Revisão mensal dos KPIs", process: "Monitoramento e Medição", periodicity: "Mensal", reference: "ISO/IEC 20000-1 9.1", defaultResponsible: "Gestor do SGSTI", participants: ["Gestor do SGSTI", "Líderes de operação", "Qualidade"], sections: ["Indicadores", "Tendências", "Desvios", "Decisões e ações"], evidence: "Painel, relatório de indicadores e ata", active: true },
  { id: "supplier", title: "Avaliação de fornecedor", process: "Gestão de Fornecedores", periodicity: "Trimestral", reference: "ISO/IEC 20000-1 8", defaultResponsible: "Suprimentos", participants: ["Suprimentos", "Gestor do contrato", "Gestor do SGSTI"], sections: ["Escopo contratado", "Desempenho", "Riscos", "Ações"], evidence: "Relatório do fornecedor e avaliação", active: true },
];

export function normalizeRiteTemplate(value: Partial<RiteTemplate>): RiteTemplate {
  return {
    id: value.id ?? `template-${Date.now()}`,
    title: value.title ?? "Rito sem nome",
    process: value.process ?? "Governança do SGSTI",
    periodicity: value.periodicity ?? "Anual",
    reference: value.reference ?? "",
    defaultResponsible: value.defaultResponsible ?? "",
    participants: Array.isArray(value.participants) ? value.participants.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [],
    sections: Array.isArray(value.sections) ? value.sections.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [],
    evidence: value.evidence ?? "",
    active: value.active !== false,
  };
}
