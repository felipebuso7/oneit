# Decisão técnica — materiais no atendimento Field Service

## Situação confirmada

A tela do técnico registra execução, evidências e assinatura, mas ainda não registra consumo de materiais. A aplicação de linhas LPU existente é restrita ao gestor e ocorre após a OS concluída.

## Recomendação

O técnico deve registrar o que foi executado, incluindo observações e materiais utilizados quando isso for operacionalmente útil. O gestor continua responsável por selecionar a composição LPU faturável correta antes do RTO definitivo e do BM. O registro do técnico não determina, sozinho, cobrança.

## Fluxo proposto

1. Técnico registra atividade executada, evidências e observações de materiais.
2. Checkout envia a OS para `AGUARDANDO_VALIDACAO`.
3. Gestor seleciona a composição LPU correspondente ao serviço realizado.
4. Gestor revisa a composição e pode devolver a OS com justificativa.
5. Apenas a composição LPU validada entra no RTO e no cálculo do BM.

## Regras obrigatórias

- Materiais embutidos na composição não podem ser lançados novamente como cobrança separada.
- Uma OS pode ter somente mão de obra e não exige justificativa de “sem material”.
- A descrição técnica do técnico deve permanecer separada da composição financeira escolhida pelo gestor.
- Alterações do gestor geram histórico; não sobrescrever silenciosamente a decisão anterior.
- O backend deve validar organização, estado da OS e concorrência.

## Impactos

- Registro operacional de materiais/atividades do técnico, sem transformar esse registro automaticamente em cobrança.
- Composição LPU selecionada pelo gestor como fonte financeira do RTO/BM.
- Ajuste do RTO para separar descrição técnica de composição financeira validada.
- BM deve considerar somente linhas validadas.
- Testes de autorização, concorrência, retry e cálculo financeiro são obrigatórios.

## Não implementado nesta etapa

Nenhuma migration ou alteração de permissão foi aplicada. A implementação deve começar após aprovação desta regra, em lote separado e com PostgreSQL de homologação.
