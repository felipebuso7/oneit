# Homologação — Sprint A (release e ambiente)

## Objetivo

Validar o OneIT em ambiente isolado antes de qualquer promoção para produção. Este roteiro
não usa dados reais e não substitui backup ou aprovação de mudança.

## Pré-requisitos

- PostgreSQL/Supabase de homologação isolado.
- Storage de homologação.
- Arquivo `.env.production` criado fora do Git, a partir do `.env.example`.
- Node na versão definida para o release e Docker disponível em Linux/CI.
- Usuários de teste com organizações e perfis distintos.

## Ordem de execução

1. Validar secrets obrigatórios sem imprimir valores.
2. Aplicar migrations em banco vazio.
3. Executar smoke test de `/api/ready` e `/api/health`.
4. Criar segundo banco/cópia e executar upgrade incremental.
5. Testar RLS/grants com administrador, gestor, técnico e organização distinta.
6. Executar fluxo Field Service: despacho, aceite, deslocamento, check-in, evidências,
   assinatura, checkout, validação e devolução.
7. Executar fluxo BM/fiscal sem provedor real, usando conta de teste ou mock autorizado.
8. Gerar backup, restaurar em banco separado e repetir os smoke tests.
9. Construir a imagem Docker e iniciar o Compose com healthcheck.
10. Registrar logs, versões, hashes das migrations e resultados.

## Critérios de aceite

- Todas as migrations aplicadas sem erro.
- Nenhum usuário acessa dados de outra organização.
- `/api/ready` retorna `ready` somente com dependências configuradas.
- Ações críticas são idempotentes sob retry.
- RTO, anexos e assinatura permanecem íntegros.
- BM não fecha sem evidência da etapa fiscal exigida.
- Backup restaurado inicia e passa nos smoke tests.
- Container inicia sem depender de arquivos locais do checkout.

## Evidências obrigatórias

- Log de aplicação das migrations.
- Resultado dos testes automatizados.
- Resultado dos testes de autorização/RLS.
- Identificador do build e da imagem.
- Resultado do healthcheck.
- Evidência de backup e restauração.
- Lista de limitações e pendências remanescentes.

## Bloqueios atuais

Este roteiro ainda não foi executado porque não há banco, storage, Docker ou provedor de
e-mail de homologação disponíveis neste ambiente.
