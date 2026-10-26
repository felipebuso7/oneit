export type DemoCatalogService = {
  id: string;
  category: string;
  subcategory: string;
  name: string;
  resolution: string;
  active: boolean;
};

export const catalogCategoryIcons: Record<string, string> = {
  "Acessos": "⌁",
  "Approvo": "✓",
  "Banco de Dados": "▣",
  "B.I": "▤",
  "BPO - Implantação": "⌂",
  "Gestão de TI": "⚙",
  "GMUD": "↺",
  "Google": "@",
  "Hardware": "▰",
  "HCM": "♟",
  "Impressora": "▤",
  "Konviva": "◇",
  "MEGA": "▦",
  "Melhoria": "↑",
  "Não Conformidade": "!",
  "Projetos TI": "◉",
  "Redes": "⌘",
  "Segurança": "◈",
  "Software": "▱",
  "Telefonia Fixa": "☎",
  "Telefonia Móvel": "▯",
};

export const catalogCategoryVisuals: Record<string, string> = {
  "Acessos": "🗝️", "Approvo": "✅", "Banco de Dados": "🗄️", "B.I": "📊", "BPO - Implantação": "🏗️",
  "Gestão de TI": "⚙️", "GMUD": "🔄", "Google": "☁️", "Hardware": "🖥️", "HCM": "👥",
  "Impressora": "🖨️", "Konviva": "◇", "MEGA": "▦", "Melhoria": "📈", "Não Conformidade": "⚠️",
  "Projetos TI": "🎯", "Redes": "🌐", "Segurança": "🔒", "Software": "💻", "Telefonia Fixa": "☎️", "Telefonia Móvel": "📱",
};

type SeedEntry = readonly [name: string, resolution: string];
type SeedGroup = readonly [category: string, entries: readonly SeedEntry[]];

const seedGroups: readonly SeedGroup[] = [
  ["Acessos", [
    ["Acesso a sistemas críticos", "4h"], ["Acesso privilegiado (admin)", "4h"], ["Bloqueio de Acesso", "4h"], ["Bloqueio temporário", "4h"], ["Criação de Acesso", "4h"], ["MFA / autenticação multifator", "4h"], ["Revisão periódica de acessos", "4h"],
  ]],
  ["Approvo", [
    ["Ajuste de alçada", "8h"], ["Alteração de acesso", "8h"], ["Criação de acesso", "8h"], ["Criação de alçada", "8h"], ["Desbloqueio de acesso", "8h"], ["Erro", "8h"], ["Inativar Usuário", "8h"], ["Indisponibilidade", "4h"], ["Reset de senha", "4h"], ["Substituição temporária de aprovador", "8h"],
  ]],
  ["Banco de Dados", [
    ["Ajustes DB", "48h"], ["Criação DB", "48h"], ["Importação DB", "48h"], ["Otimização DB", "48h"],
  ]],
  ["B.I", [
    ["Ajuste de dashboard (Complexo)", "30 dias"], ["Ajuste de dashboard (Simples)", "72h"], ["Approvo - Manutenção", "8h"], ["Approvo - Novo Acesso", "8h"], ["Criação de acesso - Report Load", "24h"], ["Criação de Dashboard", "30 dias"], ["Falha de atualização", "8h"], ["Incidente Crítico", "4h"], ["Indisponibilidade - Report Load", "4h"], ["Liberação de acesso a BI", "8h"], ["Reset de Senha - Report Load", "12h"],
  ]],
  ["BPO - Implantação", [
    ["Abertura de Cadastro - Cloud Provider", "72h"], ["Abertura de Cadastro - Distribuidor de Equipamento", "72h"], ["Abertura de Cadastro - Registro Novo Domínio", "72h"], ["Abertura de Cadastro - Telefonia Móvel", "72h"], ["Contratação - CFTV Canteiro", "72h"], ["Contratação - Link de Internet", "72h"], ["Infraestrutura física do Canteiro", "72h"], ["Registro de Novo Domínio", "72h"], ["Solicitação de Locação de Impressora", "72h"],
  ]],
  ["Gestão de TI", [
    ["Auditoria", "72h"], ["Auditoria - Validação de Ativos", "72h"], ["Criação de Documentação", "72h"], ["Criação de Fluxo", "72h"], ["Criação de Política", "72h"], ["Criação de Procedimento", "72h"], ["GMUD", "72h"], ["Lançamentos de NFs", "72h"], ["Relatório - Gestão IT", "72h"], ["Revisão de Acessos e BKP de Contas Encerradas", "72h"], ["Revisão de Acessos MEGA", "72h"],
  ]],
  ["GMUD", [
    ["GMUD - Cloud", "24h"], ["GMUD - Infraestrutura", "24h"], ["GMUD - Segurança da Informação", "24h"], ["GMUD - Sistemas", "24h"],
  ]],
  ["Google", [
    ["Compartilhamento de Arquivo", "4h"], ["Criação de Assinatura", "4h"], ["Criar novo diretório", "4h"], ["Google - Configurações", "4h"], ["Inclusão em Grupo", "4h"], ["Liberação de acesso a Drive", "4h"], ["Reset de Senha", "4h"],
  ]],
  ["Hardware", [
    ["Cadastro de Facial na porta", "72h"], ["Devolução de Equipamento", "4h"], ["Gerar Termo de Responsabilidade", "12h"], ["Manutenção de Equipamento", "4h"], ["Padronização e Inventário de Equipamento", "72h"], ["Preparar novo notebook", "48h"], ["Solicitação de Equipamento", "4h"], ["Solicitação de Equipamento - Obra", "4h"],
  ]],
  ["HCM", [
    ["Alteração de acesso", "24h"], ["Criação de acesso", "8h"], ["Desbloqueio de acesso", "8h"], ["Inativar usuário", "8h"], ["Incidente Crítico", "4h"], ["Indisponibilidade", "4h"], ["Reset de senha", "8h"],
  ]],
  ["Impressora", [
    ["Cadastro de E-mail no Scanner", "4h"], ["Configurar Impressora", "72h"], ["Erro na Impressora", "4h"], ["Troca de Tonner", "4h"],
  ]],
  ["Konviva", [
    ["Desabilitar Acesso", "8h"], ["Dúvidas e Orientações", "8h"], ["Erro no sistema", "8h"], ["Gerar Certificado", "8h"], ["Indisponibilidade", "8h"], ["Liberação de Trilha", "8h"], ["Novo Acesso", "8h"],
  ]],
  ["MEGA", [
    ["Acesso a Módulo", "72h"], ["Ajuste de item", "8h"], ["Ajuste de relatório", "8h"], ["Alteração de acesso", "8h"], ["Cadastro de item", "8h"], ["Cadastro de nova empresa", "48h"], ["Configurar Certificado Digital no MEGA", "72h"], ["Configurar De/Para Sênior x Mega", "8h"], ["Configurar office banking", "8h"], ["Configurar processo CIF", "8h"], ["Criação de ação/tipo documento", "8h"], ["Criação de acesso", "8h"], ["Criação de projeto/c. custo", "8h"], ["Desbloqueio de acesso", "8h"], ["Desenvolvimento de MI", "72h"], ["Desenvolvimento de relatório", "72h"], ["Desenvolvimento de trava", "72h"], ["Dúvida", "8h"], ["Erro - Acesso", "8h"], ["Erro - Agentes", "8h"], ["Erro - Contabilidade", "8h"], ["Erro - Contas a Pagar", "8h"], ["Erro - Contas a Receber", "8h"], ["Erro - Contrato/Aditivo de Empreiteiros", "8h"], ["Erro - Cotação", "8h"], ["Erro de server", "8h"], ["Erro - Faturamento", "8h"], ["Erro - Gerenciador de Notas", "8h"], ["Erro - Medição", "8h"], ["Erro MEGA", "8h"], ["Erro - Patrimônio", "8h"], ["Erro - Pedido de compra", "8h"], ["Erro - Recebimento", "8h"], ["Erro - Relatório", "8h"], ["Erro - Solicitação", "8h"], ["Erro - Tributário", "8h"], ["Implantação de módulo", "72h"], ["Inativação de projeto/c. custo", "8h"], ["Inativar Usuário", "8h"], ["Incidente Crítico", "4h"], ["Indisponibilidade MEGA", "4h"], ["Liberação de acesso a Filial", "8h"], ["Liberação de Alçada", "8h"], ["Liberação de Empresa", "8h"], ["Liberação de projeto/c. custo usuário", "8h"], ["Manutenção Agendada MEGA", "72h"], ["MEGA - Manutenção", "8h"], ["MEGA - Solicitação diversa", "8h"], ["Reset de senha", "8h"], ["Solicitação diversa", "8h"],
  ]],
  ["Melhoria", [
    ["MEGA - Recebimento", "72h"], ["Melhoria - Approvo", "72h"], ["Melhoria - BI", "72h"], ["Melhoria - Infraestrutura", "72h"], ["Melhoria - MEGA - ADO", "72h"], ["Melhoria - MEGA - Contabilidade", "72h"], ["Melhoria - MEGA - Contas Pagar", "72h"], ["Melhoria - MEGA - Contas Receber", "72h"], ["Melhoria - MEGA - Estoque", "72h"], ["Melhoria - MEGA - Gerenciador de Notas", "72h"], ["Melhoria - MEGA - Pedido de Compras", "72h"], ["Melhoria - Processos e Governança", "72h"], ["Melhoria - Segurança da Informação", "72h"], ["Melhoria - Suporte e Service Desk", "72h"],
  ]],
  ["Não Conformidade", [
    ["NC - Acessos e Segurança", "72h"], ["NC - Ativos de TI", "72h"], ["NC - Fornecedores / Terceiros", "72h"], ["NC - Governança / Processos", "72h"], ["NC - Infraestrutura", "72h"], ["NC MEGA - Cadastro de itens", "72h"], ["NC MEGA - Gestão de Acessos", "72h"], ["NC - Suporte / Service Desk", "72h"],
  ]],
  ["Projetos TI", [["Projetos TI", "72h"]]],
  ["Redes", [
    ["Backup de Arquivos", "8h"], ["Backup de Drive", "8h"], ["Indisponibilidade na Internet", "2h"], ["Lentidão na internet", "30 min"], ["Liberação de Acesso - Pasta Sharepoint", "24h"], ["Manutenção Preventiva de TI", "72h"], ["Monitoramento Link Internet", "4h"], ["Redes - Auxílio / Orientação", "8h"], ["Restore de Arquivos", "8h"], ["Site Institucional", "8h"], ["Wi-Fi Oscilando", "30 min"],
  ]],
  ["Segurança", [
    ["Acesso Indevido", "4h"], ["Análise de vírus", "8h"], ["Ataque Ransomware", "4h"], ["Bloqueio de Spam", "8h"], ["Compartilhamento indevido de arquivos", "4h"], ["Incidente com Terceiros", "4h"], ["Liberação de Spam", "8h"], ["Malware", "4h"], ["Phishing", "4h"], ["Vazamento de Dados", "4h"],
  ]],
  ["Software", [
    ["Configuração de Software", "12h"], ["Dúvida e Apoio Técnico", "12h"], ["Instalação de Software", "12h"], ["Manutenção Windows", "12h"],
  ]],
  ["Telefonia Fixa", [["Manutenção PABX", "24h"], ["Solicitação de Ramal", "24h"]]],
  ["Telefonia Móvel", [
    ["Bloqueio de Linha", "24h"], ["Configuração de E-mail no Celular", "24h"], ["Troca de Celular", "24h"], ["Manutenção de Celular", "24h"], ["Preparação de Novo Celular", "72h"], ["Problema na linha", "8h"], ["Solicitação de Celular", "24h"], ["Troca de Chip", "72h"],
  ]],
];

export const demoCatalogServices: DemoCatalogService[] = seedGroups.flatMap(([category, entries]) =>
  entries.map(([name, resolution], index) => ({
    id: "catalog-" + category.toLocaleLowerCase("pt-BR").replaceAll(/[^a-z0-9]+/g, "-") + "-" + index,
    category,
    subcategory: category,
    name,
    resolution,
    active: true,
  })),
);

export function catalogPriority(resolution: string) {
  if (resolution === "30 min" || resolution === "2h" || resolution === "4h") return "P1";
  if (resolution === "8h" || resolution === "12h") return "P2";
  if (resolution === "24h" || resolution === "48h") return "P3";
  return "P4";
}
