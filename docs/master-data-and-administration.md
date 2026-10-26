# OneIT — cadastros mestres e administração conectada

## Princípio obrigatório

O OneIT é um sistema relacional: telas operacionais não recriam cadastros. Elas selecionam entidades mestres previamente administradas, respeitando organização, RBAC e histórico.

## Hierarquia de dados

```text
Organização (tenant lógico)
├── Empresas / unidades organizacionais
│   ├── Departamentos
│   ├── Centros de custo
│   └── Locais de trabalho
├── Colaboradores / usuários
│   └── gestor, departamento, centro de custo e empresa
├── Catálogo operacional
│   ├── Categorias e subcategorias
│   ├── Serviços
│   ├── Impacto, urgência e prioridades
│   ├── SLA, OLA e calendários
│   └── Grupos de suporte
├── Inventário
│   ├── Tipos de ativo
│   ├── Ativos
│   └── alocação a colaborador, empresa, departamento e local
└── Ecossistema externo
    ├── Clientes e contratos
    ├── Fornecedores
    └── Serviços/SLAs contratados
```

## Consumo obrigatório por módulo

| Módulo | Dados que deve selecionar, não duplicar |
| --- | --- |
| Usuários e colaboradores | empresa/unidade, departamento, centro de custo, gestor e permissões |
| Ativos | tipo de ativo, fornecedor, local, departamento, colaborador e contrato quando aplicável |
| Chamados | solicitante, categoria, subcategoria, serviço, impacto, urgência, prioridade, SLA/OLA, contrato e grupo responsável |
| Ordens de serviço | chamado, contrato, local, técnico, fornecedor e ativos relacionados |
| Conhecimento | categoria, serviço, chamados, problemas, mudanças e ativos relacionados |

## Área Configurações

Cadastros mestres ficam sob **Configurações**, visíveis apenas a `SUPER_ADMIN`, `ORG_ADMIN` e, quando explicitamente permitido, `MANAGER`. A área terá grupos:

1. Organização: empresa/unidades, departamentos, centros de custo, locais e colaboradores.
2. Atendimento: categorias, subcategorias, catálogo, prioridades, SLA/OLA, calendários e grupos.
3. Inventário: tipos de ativo, campos extras e regras de garantia.
4. Governança: templates, workflows, feature flags, comunicação e branding.
5. Segurança: usuários, perfis, permissões, auditoria e acesso de suporte.

Telas operacionais exibem apenas seletores dependentes e dados em contexto. Exclusão de cadastros com dependências deve ser substituída por inativação, preservando histórico.

## Próximo incremento arquitetural

Criar o shell de Configurações com grupos de navegação e mover gradualmente os cadastros administrativos para ele, sem quebrar rotas existentes. Em seguida, completar as validações de escopo: ativo deve pertencer à mesma organização de seu colaborador, departamento, local e fornecedor.

## Validação prática — cadastros Field Service (2026-10-23)

- O cadastro de LPU para `RJ45`, unidade `unidade` e valor `R$ 5,00` foi salvo com sucesso no ambiente demonstrativo.
- O cadastro de técnico `Joãozinho` foi salvo com e-mail, cargo, telefone, celular e custo/hora preenchidos; o histórico confirmou o salvamento.
- Foi identificado um gap: a lista de unidades da LPU ainda não oferece `metro`. O cadastro de cabo de rede a `R$ 10,00/m` não deve ser salvo com unidade incorreta.

### Sprint de correção — unidades de medição da LPU

1. Incluir `metro` na lista de unidades do cadastro demonstrativo e no domínio persistente da LPU. O catálogo central foi criado em `src/lib/field-service/lpu-units.ts` com metro, centímetro, peça, unidade, hora, visita e quilômetro; falta conectá-lo à tela legada de cadastro.
2. Validar que itens classificados como material aceitem unidade `metro` e `unidade`.
3. Criar teste de regressão para cabo de rede (10,00/m) e RJ45 (5,00/unidade).
4. Exibir a unidade no despacho, na composição da OS, no BM e no PDF RTO/BM.
5. Reexecutar o cadastro pela interface e confirmar persistência após recarregar a página.

### Homologação demonstrativa concluída

- Sabesp foi cadastrada como empresa.
- Atibaia, Bragança e Mairiporã foram cadastrados como polos vinculados à Sabesp.
- RJ45 foi cadastrado na LPU como unidade, a R$ 5,00.
- Joãozinho foi cadastrado como técnico de Field Service.
- A tela de unidades está disponível em `/demo/settings/field-service/units` e exibe o catálogo padronizado.

### Gap de integração identificado no despacho

- O item `LPU-MAT-RJ45-001` aparece no campo “Tabela LPU aplicada” do despacho.
- O item `LPU-MAT-CABO-001` cadastrado pela nova tela ainda não aparece nessa lista.
- Causa provável confirmada por inspeção da tela: o despacho mantém opções demonstrativas próprias e ainda não lê integralmente a chave persistida da LPU.

### Sprint de integração LPU → despacho

1. Extrair a leitura da LPU para um repositório compartilhado.
2. Fazer o despacho carregar todos os itens ativos persistidos.
3. Exibir unidade (`metro`, `unidade` etc.) no seletor e no valor previsto.
4. Impedir aplicação de item inativo ou inexistente.
5. Repetir o teste com cabo de rede e RJ45 antes de liberar a OS.
