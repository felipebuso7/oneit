# Ciclo 19 — dependência da LPU na revisão

## Problema confirmado no código

`src/app/(portal)/portal/review/page.tsx` consultava `field_service_lpu_items` em toda visita à fila, mesmo quando não havia OS pendente de validação. Uma falha nessa consulta interrompia a tela inteira, inclusive o acesso a OS já aprovadas, à geração de RTO e ao encerramento.

## Ajuste

A consulta da LPU vigente agora ocorre somente quando existem OS pendentes que oferecem lançamento de itens. A revisão das OS aprovadas continua a consultar os seus dados e documentos normalmente.

## Limite

Esta mudança remove uma dependência indevida observada por inspeção do código. Não demonstra que as demais consultas da revisão ou a operação remota estejam livres de falhas. Nenhuma migration ou publicação foi realizada neste ciclo.
