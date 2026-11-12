# Ciclo de validação por persona — Field Service

Data: 2026-11-09

## Escopo executado

Foi executada a suíte de contratos das jornadas de despacho, técnico, validação gerencial, RTO, BM, LPU e materiais.

Resultado: **20 arquivos de teste aprovados / 41 testes aprovados**.

Este resultado valida contratos de código e migrations. Não substitui a homologação dinâmica contra o Supabase remoto, que permanece bloqueada por timeout de conexão.

## Cobertura por persona

| Persona | Jornada coberta | Resultado |
|---|---|---|
| Despachante | seleção de técnico, despacho atômico, compartilhamento e WhatsApp | Aprovado em contratos |
| Técnico | acesso seguro, check-in, evidências, materiais e checkout | Aprovado em contratos |
| Gestor | fila de revisão, composição LPU, aprovação/devolução e RTO | Aprovado em contratos |
| Financeiro | geração de BM, totalização e PDF | Aprovado em contratos |

## Gaps que entram na esteira

| ID | Prioridade | Gap | Critério de aceite |
|---|---|---|---|
| FSM-VAL-001 | P0 | Executar jornada E2E autenticada em staging com persistência real | chamado → despacho → técnico → revisão → RTO → BM concluído sem intervenção manual |
| FSM-VAL-002 | P0 | Confirmar aplicação das migrations novas no Supabase remoto | três migrations 2026103008xxxx listadas como aplicadas e smoke test de leitura/escrita aprovado |
| FSM-VAL-003 | P1 | Validar isolamento multi-organização na jornada completa | usuário de outra organização não lê nem altera chamado, OS, materiais, RTO ou BM |
| FSM-VAL-004 | P1 | Validar upload de evidências e materiais em ambiente remoto | três fotos e materiais persistem após recarregar e aparecem na revisão/RTO |
| FSM-VAL-005 | P1 | Validar idempotência de aprovação, composição e geração de RTO | reenvio não duplica linhas, composição nem relatório |
| FSM-VAL-006 | P2 | Homologar UI das três personas em viewport desktop e técnico móvel | estados vazio, erro, carregamento e sucesso legíveis e sem overflow |

## Próxima ordem de execução

1. Restabelecer conectividade administrativa com o Supabase.
2. Aplicar/confirmar migrations em homologação.
3. Executar FSM-VAL-001 a FSM-VAL-005 com dados sintéticos.
4. Corrigir falhas encontradas e repetir a suíte.
5. Só depois publicar a versão dependente dessas migrations.

