# Auditoria do catálogo de serviços

## Situação

Há uma tela de portal (`src/app/(portal)/portal/service-catalog/page.tsx`) e uma tela demo (`src/app/demo/settings/service-catalog/page.tsx`). A coexistência é fato; a equivalência funcional entre ambas não foi comprovada. O catálogo deve ser separado conceitualmente de LPU: catálogo descreve o serviço solicitável; LPU precifica execução/material/composição.

## Modelo recomendado

`service_category` → `service` → `service_offering` (elegibilidade, SLA, contrato) → `request form`. Preço de execução deve permanecer em `field_service_lpu_items`/`field_service_lpu_compositions`, com vigência e snapshot no atendimento.

## Alternativas

1. **Catálogo por tabela + drawer:** mais simples e compatível com o portal; recomendado para operação corporativa.
2. **Catálogo por cards/categorias:** melhor descoberta para poucos serviços, pior para volume e administração.

Recomendação: tabela com busca/filtros para administração e catálogo guiado para solicitante. Ativar/inativar deve ser soft state; exclusão física somente quando não houver referência.

## Critérios de aceite

Criar, editar, inativar, consultar no formulário de chamado, filtrar por organização/contrato, preservar histórico e não duplicar serviço ao editar. Testar que alterações de catálogo não alteram snapshots históricos de LPU/RTO.
