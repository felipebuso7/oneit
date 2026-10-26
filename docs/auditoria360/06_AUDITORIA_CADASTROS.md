# Auditoria de cadastros

## Cadastros encontrados

- Técnicos e parceiros.
- Empresas e polos.
- LPU e unidades de medida.
- Catálogo/serviços.
- Organizações, usuários e perfis.
- Contratos, clientes, locais e ativos.

## Riscos identificados

1. A informação de endereço/polo precisa ser reutilizada no despacho; redigitação em OS é erro operacional.
2. Técnico deve possuir tipo (interno/parceiro), contato, ativo/inativo e competências reutilizáveis.
3. LPU precisa diferenciar item informado pelo técnico de composição precificada pelo gestor.
4. Inativação deve preservar histórico e impedir novas atribuições, sem apagar registros passados.
5. Duplicidade de empresa, polo, técnico e unidade precisa de regra clara no backend.

## Critérios de validação

- E-mail e telefone validados no backend.
- Empresa/polo vinculados por chave, não por texto livre.
- Unidade de medida padronizada e reutilizável.
- Edição e inativação auditáveis.
- Cadastro criado em uma organização não aparece em outra.
