# Validação PMO — processos ITSM e integração operacional

Data da revisão: 13/10/2026  
Referência de desenho: ISO/IEC 20000-1:2018, ITIL 4 e práticas de governança.

## Limite desta validação

Esta é uma validação de desenho e de funcionalidades implementadas no OneIT. Ela não
constitui certificação ISO/IEC 20000-1. Uma certificação demanda escopo do SGSTI,
políticas aprovadas, operação sustentada, métricas históricas, auditoria interna,
análise crítica da direção e auditoria independente.

## Fluxo operacional validado

| Processo | Vínculos e controles confirmados | Situação de desenho |
| --- | --- | --- |
| Abertura e registro | Portal abre chamado pelo catálogo; fila permite criação e importação demonstrativa. Solicitante, departamento, analista e histórico ficam no registro. | Implementado no demonstrativo |
| Classificação | Catálogo possui categoria, serviço e SLA/OLA parametrizáveis; o serviço aplicado atualiza prioridade e SLA do chamado. | Implementado no demonstrativo |
| SLA e primeiro atendimento | Indicadores visuais, status de SLA, histórico e confirmação de primeiro atendimento estão presentes. | Implementado no demonstrativo |
| Pendência | Chamados pendentes exigem motivo, preservado no próprio chamado. A pausa/cálculo real de SLA ainda depende do motor persistente da VPS. | Parcialmente implementado |
| Comunicação | Comunicações externas e internas são separadas; eventos entram no histórico. Conector real de e-mail é etapa posterior. | Parcialmente implementado |
| Incidentes e problemas | Chamado pode ser vinculado a problema; problema guarda impacto, causa, workaround, chamados relacionados e ciclo de investigação. | Implementado no demonstrativo |
| Erro conhecido e conhecimento | Artigos possuem ciclo rascunho/revisão/publicado/obsoleto, público e problema relacionado. | Implementado no demonstrativo |
| Mudanças (GMUD) | Chamado pode ser vinculado a GMUD; a mudança contém tipo, risco, impacto, janela, aprovação e retorno. | Implementado no demonstrativo |
| Ativos / CMDB | Chamado vincula ativo; ativo é associado à empresa e ao departamento. | Implementado no demonstrativo |
| Fornecedores | Chamado vincula fornecedor; fornecedor mantém contato, SLA contratado, medição e ação diante de descumprimento. | Implementado no demonstrativo |
| Encerramento | Resolução e validação de aceite são requeridas antes do fechamento; o portal permite avaliação posterior. | Implementado no demonstrativo |
| Melhoria contínua | Satisfação, SLA e fornecedores são apresentados em dashboard/relatórios. O registro formal de CSI e sua aprovação são o próximo incremento. | Parcialmente implementado |

## Cadeia de rastreabilidade requerida

Solicitante / empresa / departamento → catálogo → chamado → SLA/OLA →
ativo/CI e fornecedor → problema/erro conhecido → GMUD, quando necessária →
resolução validada → pesquisa de satisfação → indicadores e melhoria contínua.

## Pontos obrigatórios para o go-live em VPS

1. Substituir armazenamento do navegador por PostgreSQL, com identificadores e relações
   referencialmente íntegros.
2. Implementar autenticação, RBAC e segregação efetiva: solicitante, analista,
   dispatcher, gestor, administrador, fornecedor e técnico externo.
3. Ativar motor de SLA/OLA com calendários, pausa por motivo permitido, escalonamento e
   notificações auditáveis.
4. Integrar e-mail de entrada/saída com correlação de conversa, antirrepetição e
   registro de falha.
5. Consolidar CMDB: relacionar ativo, fornecedor, serviço, contrato e mudança impactada.
6. Formalizar workflow de aprovação de GMUD/CAB, evidências de implementação e PIR.
7. Criar backlog de melhoria contínua (CSI) alimentado por violações de SLA,
   recorrência de problemas e avaliações baixas.
8. Implantar trilha de auditoria imutável, retenção, backup/restore testado e
   monitoramento da VPS.

## Critério PMO de aceite do próximo marco

Um processo só será considerado pronto para operação quando puder responder, por meio
de dados persistidos: quem executou a ação, quando, sob qual regra de serviço/SLA,
qual evidência foi produzida, qual decisão foi tomada e qual relação existe com os
demais processos.
