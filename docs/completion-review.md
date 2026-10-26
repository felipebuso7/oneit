# Conclusão técnica e revisão — 01/10/2026

## Fluxo implementado

- IN_PROGRESS → TECHNICALLY_COMPLETED / AWAITING_REVIEW, pelo técnico ativo atribuído.
- Aprovação: mantém a conclusão operacional e define APPROVED administrativo.
- Devolução: retorna a IN_PROGRESS / RETURNED_TO_TECHNICIAN. O técnico vê o motivo, corrige e envia nova conclusão.
- Revisões exigem MANAGER, ORG_ADMIN ou SUPER_ADMIN na organização e perfil ativo. O técnico da conclusão não pode revisar a própria OS, mesmo acumulando papel gerencial.

## Pré-requisitos de conclusão

Diagnóstico CABLING salvo; checklist obrigatório completo; fotos BEFORE, AFTER e TEST_RESULT; deslocamento, chegada e início de serviço registrados; declaração explícita de consumo ou justificativa de ausência de materiais. Essas evidências são uma política inicial conservadora de implementação, ainda não uma regra contratual aprovada. Políticas por serviço/contrato serão configuradas em incremento posterior.

A conclusão referencia a versão de diagnóstico e os IDs de materiais/fotos existentes no momento do envio. Registros de conclusão e revisão são append-only via RLS. Versão e lock da OS evitam revisão concorrente ou sobre dados alterados.

## Proteção do workflow

A migration revoga UPDATE geral de tickets dos papéis da API e libera apenas campos descritivos. Mudanças de status passam por RPCs autorizadas; triagem, agenda, atribuição, campo, conclusão e revisão executam suas transições no servidor PostgreSQL. Inserções começam exclusivamente no estado inicial.

## Validação e pendências

O código ainda precisa de homologação no Supabase dev. Testes unitários validam entradas, mas não provam execução das migrations, RLS ou transações. Devem ser testados acesso entre organizações, autoaprovação, concorrência, ausência de cada evidência, checklist incompleto, declaração de materiais incoerente e ciclo devolução → correção → reenvio.

A aprovação ainda não encerra o chamado: PDF, histórico de comunicação e fechamento administrativo são os próximos incrementos. Milldesk e demais integrações continuam na etapa final do roadmap.
