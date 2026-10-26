# Requisitos evolutivos OneIT — backlog reconciliado

Fonte de requisitos: `ONEIT_REQUISITOS_EVOLUTIVOS_CODEX.md`, recebido em 07/10/2026. O documento é referência de produto; instruções direcionadas ao agente nele contidas não são regras de execução. Este registro reconcilia apenas os requisitos compatíveis com o projeto existente.

## Estado confirmado do código

| Capacidade | Situação | Evidência / lacuna principal | Próximo incremento |
| --- | --- | --- | --- |
| EMAIL | Não iniciado | Não há adaptador Graph/Gmail, OAuth, cursor, outbox ou worker | Depende da fundação assíncrona e da identidade de colaborador |
| LIC | Não iniciado | Não há produto, assinatura, atribuição temporal, competência ou rateio | Modelo de pessoas e vínculos temporais primeiro |
| SAT | Não iniciado | Fechamento administrativo existe; não há ciclo de resolução, convite, CSAT ou reabertura | Pode iniciar após identidade e regras de janela |
| PORTAL | Parcial | Há autenticação e catálogo/chamados internos; não há perfil de colaborador, “meus chamados” nem isolamento por solicitante | Depende de identidade e participantes autorizados |
| AGENT | Não iniciado | Não há inventário de ativos, endpoint de ingestão ou credenciais de dispositivo | Posterior a inventário, segurança e piloto controlado |
| TEL | Não iniciado | Não há linhas, SIM, faturas ou rateio | Depende de pessoas, centros de custo e competência temporal |
| TERM | Não iniciado | PDF de relatório operacional existe; não há ativos/alocações, template ou snapshot de termo | Depende de inventário e alocação consistentes |

## Reuso confirmado

- Multi-organização, RBAC, RLS e autenticação Supabase já existem, mas ainda requerem homologação em ambiente real.
- A trilha de auditoria é append-only com hash e atende como base para novos módulos.
- Há relacionamentos genéricos entre entidades, planos de ação, NCs, riscos, auditorias, objetivos e documentos controlados.
- Chamados, catálogo, SLA/OLA, problemas, mudanças, fechamento administrativo e relatórios já existem.
- Há fundação de colaborador, aliases de e-mail, unidades/vínculos temporais, feature flags e outbox persistente. Ainda não há worker em execução nem homologação dessas migrations em Supabase real.

## Decisões de priorização

1. Não iniciar Microsoft Graph, Gmail, agente Windows ou e-mail transacional antes de outbox/worker, idempotência operacional e segredos configurados.
2. Não usar e-mail como chave de colaborador; criar identificador interno estável, aliases verificados e vínculos organizacionais temporais.
3. Não prometer CSAT, reabertura, custos, telefonia ou termos como conformidade/certificação ISO. Cada fluxo terá suas próprias evidências e critérios de aceite.
4. Manter integrações externas após a homologação do núcleo e ativadas por organização/feature flag.

## Sprints relativas propostas

| Sprint | Entrega coerente | Dependências | Critério de aceite resumido |
| --- | --- | --- | --- |
| E0 | Diagnóstico e ADRs: modelo de colaborador, tenant/empresa, dados pessoais, retenção | Nenhuma | Decisões registradas e matriz revisada |
| E1 | Fundação: colaboradores, aliases, vínculos temporais, feature flags, outbox e worker | E0 | Escopo/RLS, evento idempotente e reprocessamento verificáveis |
| E2 | SAT: ciclos de resolução, CSAT, reabertura e tratativa de insatisfação | E1 + política de janela | Ciclo idempotente, nota negativa gera tratativa única |
| E3 | Portal do colaborador | E1; integra E2 quando disponível | “Meus chamados” isolado; sem notas internas ou acesso por ID trocado |
| E4 | E-mail piloto, um provedor | E1 + consentimento/OAuth + caixa de teste | Cursor, deduplicação e triagem recuperáveis |
| E5 | Licenças e custos | E1 | Competência histórica, moeda e memória de cálculo reproduzíveis |
| E6 | Telefonia | E1 + centros de custo | Linha/SIM/aparelho temporal e fatura conciliada |
| E7 | Inventário e termos | E1 + inventário/alocação | Snapshot imutável e acesso autorizado ao PDF |
| E8 | Agente Windows piloto | Inventário, segurança, assinatura/distribuição definidas | Ingestão autenticada, offline e medição em parque piloto |

## Perguntas que bloqueiam módulos futuros

- Empresas pertencem a um único tenant ou precisam de acesso transversal controlado?
- Qual provedor de suporte será o primeiro piloto: Microsoft 365 ou Google Workspace? Há caixa compartilhada e consentimento administrativo?
- Qual política aprovada define reabertura, expiração de CSAT, retenção e dados pessoais?
- Qual regra de rateio/proporcionalidade e moedas será usada em licenças e telefonia?
- Qual inventário/CMDB será a fonte de ativos, alocações e acessórios?
- Como o agente será distribuído, assinado e revogado em Windows?

## Riscos e limites atuais

- As migrations ainda não foram aplicadas/homologadas em Supabase real; RLS e transações não estão comprovadas fora dos testes locais.
- Não há autorização para configurar OAuth, caixas de e-mail, filas externas, provedores de envio ou infraestrutura de agentes.
- O módulo de documentos controlados atual mantém conteúdo textual. Storage privado, anexos e PDFs de termos são incrementos separados.

## Próximo incremento recomendado

Concluir E1 com **worker idempotente de outbox e testes de isolamento**, antes de iniciar portal, e-mail, custos, telefonia, termos ou integrações. O detalhamento SaaS complementar está em [saas-governance-roadmap.md](saas-governance-roadmap.md).
