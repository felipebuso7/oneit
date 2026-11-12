# Arquitetura-alvo e decisão técnica

## Decisão

Escolher **B — refatoração modular orientada a jornadas**.

| Estratégia | Custo | Risco | Reversibilidade | Decisão |
|---|---|---|---|---|
| A. Incremental | baixo inicial | mantém duplicidades | alta | insuficiente isoladamente |
| B. Modular/jornadas | médio | controlável por fatias | alta | **recomendada** |
| C. Reconstrução | alto | migração/regressão máxima | baixa | sem evidência suficiente |

## Alvo

Portal autenticado como fonte operacional; `/demo` isolado e explicitamente não operacional; Supabase/Postgres como fonte de verdade; domínio dividido em Identity/Org, Catalog, Ticketing, Field Service, Pricing/Measurement, Documents/Notifications; transições críticas por serviços/RPC; histórico imutável; storage privado com URLs temporárias.

## Fases futuras

1. Contenção: eliminar consumo acidental de demo, documentar flags.
2. Domínio: canonicalizar técnico, solicitante, empresa, serviço e LPU.
3. Jornadas: chamado → despacho → execução → review → RTO/BM.
4. Experiência: design system e telas prioritárias.
5. Robustez: E2E, RLS, observabilidade, backup/restore e carga.
