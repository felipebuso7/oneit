# Ciclo 21 — pendências aprovadas antes da paginação

## Evidência

A fila de revisão paginava todos os registros `APPROVED` e só depois separava os chamados `CLOSED` na interface. Uma página preenchida por encerrados podia deixar OS aprovadas ainda sem RTO ou sem fechamento em páginas posteriores.

## Correção local

A consulta da fila usa a relação existente `field_service_review_queue.ticket_id → tickets.id`. Para a visão geral, registros aprovados com chamado `CLOSED` são excluídos no banco antes da contagem e da paginação. A consulta de uma OS específica continua incluindo o registro encerrado, para consulta do RTO. O indicador da visão geral foi renomeado para expressar que conta aprovações ainda pendentes de conclusão.

## Verificação e limite

`npx tsc --noEmit` e ESLint passaram. A relação foi confirmada na migration `20261025100000_field_service_review_queue.sql`. O comportamento da consulta e das políticas RLS no Supabase remoto ainda exige homologação; nenhuma migration nem publicação foi feita.
