# Extensão CMMS — arquitetura de evolução

## Decisão de arquitetura

O CMMS deve ser uma **linha operacional adicional** da mesma plataforma OneIT, e não
um segundo sistema. O núcleo atual já cobre a cadeia necessária:

`demanda → OS → planejamento → técnico → evidências → validação → RTO → medição → fiscal`

O novo domínio será chamado inicialmente de `MAINTENANCE`; o atual será normalizado
como `CABLING`. Cada registro operacional precisa conhecer o domínio ao qual pertence.

## O que permanece compartilhado

- Autenticação, organizações, clientes, contratos, polos e usuários.
- Cadastro e agenda de técnicos, inclusive parceiros.
- Agenda, despacho, WhatsApp, link externo e trilha de eventos.
- Evidências, assinatura, RTO, aprovação gerencial, LPU, BM e trilha fiscal.
- Padrões visuais, auditoria, observabilidade e políticas de retenção.

## O que será segregado por domínio

| Item | Cabling | Manutenção / CMMS |
| --- | --- | --- |
| Catálogo | instalação, cabeamento, rede | preventiva, corretiva, inspeção, emergência |
| Checklist | execução de infraestrutura | segurança, diagnóstico, inspeção, teste funcional |
| LPU | materiais e mão de obra de cabling | peças, hora-homem, deslocamento, aluguel e extras |
| Técnicos | competências de rede/cabeamento | especialidades, certificações e NR aplicáveis |
| Ativos | opcionalmente vinculados | ativo/equipamento obrigatório quando aplicável |
| Indicadores | OS, SLA, materiais, polos | backlog por ativo, MTTR, recorrência, preventiva x corretiva, indisponibilidade |
| Financeiro | BM por contrato/competência | BM pelo mesmo mecanismo, filtrado por domínio/contrato |

## Modelo de dados-alvo

1. `operational_domains`: catálogo de domínios (`CABLING`, `MAINTENANCE`).
2. `contract_operational_domains`: quais domínios cada contrato permite, com vigência.
3. `technician_operational_domains`: elegibilidade do técnico, especialidade e vigência.
4. `service_offerings.operational_domain_id`: serviço pertencente a um domínio.
5. `tickets.operational_domain_id` e `service_orders.operational_domain_id`: snapshot
   imutável do domínio selecionado na abertura/despacho.
6. `maintenance_plans`, `maintenance_plan_assets` e `maintenance_cycles`: preventivas
   planejadas. A execução sempre gera uma OS normal.
7. `service_order_assets`: ativos afetados por uma OS, com condição antes/depois,
   medição, falha e causa.
8. `service_order_checklist_instances`: snapshot do checklist aplicável, para que uma
   alteração futura no template não modifique uma OS histórica.

## Segregação de acesso

O isolamento deve ser aplicado no banco, e não apenas na navegação. O usuário terá
escopo de domínio por organização. Consultas, criação de OS, despacho, validação,
RTO e faturamento devem exigir esse escopo. Administrador da organização poderá ter
ambos; gestor/técnico terá somente os domínios explicitamente concedidos.

Enquanto as políticas RLS atuais não forem migradas para esse escopo, a separação
visual não deve ser apresentada como segregação de segurança.

## Fluxo CMMS proposto

1. Uma preventiva programada ou ocorrência corretiva cria ticket/OS no domínio
   Manutenção, já ligado ao ativo, local, contrato e prioridade.
2. O gestor usa a mesma fila de planejamento para comparar agenda, especialidade,
   região e capacidade do técnico.
3. O técnico recebe link de execução e registra deslocamento, chegada, checklist,
   leituras, peças, fotos, assinatura e saída.
4. A OS retorna para validação; o gestor confere evidências, complementa/preço LPU,
   aprova RTO e encerra.
5. No fechamento mensal, o BM consolida somente OS validadas do domínio/contrato e
   mantém o mesmo ciclo de conferência comercial e fiscal já definido.

## Sprints recomendadas

### CMMS-1 — fundação de domínio e segurança

- Criar tabelas e vínculos de domínio operacional.
- Migrar Cabling como domínio inicial sem alterar suas OS existentes.
- Criar escopo de domínio por usuário/técnico e aplicar RLS/RPCs.
- Exibir seletor de domínio no contexto do gestor, sem misturar filas.
- Criar testes de isolamento: um gestor de Manutenção não lê/despacha Cabling.

### CMMS-2 — ativos e corretivas

- Vincular OS a um ou mais ativos.
- Registrar defeito, diagnóstico, causa, ação, condição antes/depois e parada.
- Criar catálogo e LPU de Manutenção independentes.
- Adequar RTO com bloco de ativo e diagnóstico técnico.

### CMMS-3 — preventivas e plano de manutenção

- Planos por ativo/tipo de ativo, periodicidade e checklist versionado.
- Geração programada de OS sem duplicidade.
- Alertas de vencimento e painel de preventivas planejadas, vencidas e concluídas.

### CMMS-4 — indicadores e financeiro

- Backlog por criticidade, MTTR, recorrência, cumprimento de preventiva e custo por ativo.
- BM por competência, contrato e domínio, preservando os itens unitários e extras.
- Auditoria de aprovação e bloqueio fiscal idênticos ao fluxo financeiro existente.

## Critérios para iniciar a implementação de dados

- Definir quais contratos e quais técnicos serão Cabling, Manutenção ou ambos.
- Definir a taxonomia inicial de ativos e criticidade.
- Validar os campos do checklist de segurança e as especialidades obrigatórias.
- Confirmar a política de aprovação comercial para peças/serviços extras.

Esses itens são escolhas operacionais; não devem ser inferidos automaticamente pelo
sistema.
