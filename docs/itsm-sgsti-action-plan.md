# Plano de ação ITSM / SGSTI

## Escopo e limite

O plano usa ITIL 4, COBIT 2019 e ISO/IEC 20000-1:2018 como referências de desenho. A plataforma pode produzir evidências e apoiar um SGSTI; ela não certifica uma organização por si só.

## Estado encontrado em 06/10/2026

| Requisito | Situação | Impacto | Ação priorizada |
| --- | --- | --- | --- |
| Multiempresa, Auth e RBAC | Parcial | Alto | Homologar RLS e fluxo de convite no Supabase; ampliar segregação por processo. |
| Cadastro operacional e catálogo | Parcial | Alto | Evoluir oferta para serviço com owner, criticidade, ciclo de vida e dependências. |
| Tickets e FSM | Parcial | Alto | Tipificar incidente/requisição, criar filas, grupos e escalonamento N1–N3. |
| Histórico de status e execução | Existe | Alto | Consolidar em timeline universal, com atribuições e transferências. |
| Audit log | Parcial | Crítico | Tornar append-only, adicionar integridade e consulta autorizada. |
| Evidências | Parcial | Alto | Generalizar evidências e distinguir data do evento da data de upload. |
| SLA/OLA | Parcial | Crítico | Calendário, regras configuráveis de pausa, memória de cálculo e alertas. |
| Matriz de prioridade | Ausente | Alto | Configurar impacto × urgência por organização, com snapshot no ticket. |
| Problema, RCA e Known Error | Ausente | Alto | Criar após relacionamentos genéricos e timeline. |
| GMUD, aprovação, CAB e PIR | Ausente | Alto | Criar mecanismo genérico de aprovação antes de Change Enablement. |
| Melhoria, ações, NC e auditoria | Ausente | Alto | Construir entidades de governança reutilizáveis depois da cadeia de evidências. |
| Documentos controlados | Ausente | Médio | Implementar versionamento, vigência e aprovação após governança-base. |
| Integrações externas | Ausente por decisão | Médio | Permanecer após o núcleo e a homologação local. |

## Sequência otimizada

1. **Fundação auditável:** trilha imutável, relacionamentos entre entidades, evidências generalizadas e timeline.
2. **Core ITSM:** tipos de ticket, prioridade configurável, grupos/N1–N3, atribuição e escalonamentos.
3. **SLA Engine:** calendário, política de pausa por relógio, snapshot de regra, memória de cálculo e alertas.
4. **Controle operacional:** incidentes maiores, problemas, RCA, erros conhecidos e base de conhecimento.
5. **Mudanças:** GMUD, risco, aprovação genérica, CAB e PIR.
6. **Governança SGSTI:** planos de ação, NC, riscos, auditorias, reuniões, análise crítica e objetivos.
7. **Documentação e reporting:** documentos controlados, pacote de evidências, relatórios congelados e indicadores.
8. **Hardening e integrações:** E2E, RLS em ambiente real, observabilidade, retenção, backup e somente então conectores externos.

## Critérios de pronto por incremento

- migration versionada e sem apagar dados;
- autorização/RLS definida;
- histórico e audit log quando a operação for relevante;
- validação de entrada, tratamento de erro e teste automatizado pertinente;
- UI só quando houver persistência real;
- documentação de decisão quando a regra afetar rastreabilidade ou cálculo.

## Riscos conhecidos

- Migrations e RLS ainda não foram homologadas no Supabase real; testes locais não demonstram isolamento real.
- Prazos de SLA seguem em minutos corridos; não representam calendário comercial até o motor de calendário.
- Convite de usuários exige configuração segura da service role e do provedor de e-mail no ambiente.
- A ISO/IEC 20000-1:2018 é referência de gestão; a interpretação para certificação deve ser validada por responsável de compliance/auditoria.

## Requisitos evolutivos complementares

As capacidades de e-mail, colaboradores, satisfação, portal, licenças, telefonia, termos e agente Windows recebidas em 07/10/2026 foram reconciliadas em [evolutionary-requirements-roadmap.md](./evolutionary-requirements-roadmap.md). Elas entram após as fundações de identidade temporal, outbox/worker e flags por organização; integrações externas não devem antecipar essas dependências.
