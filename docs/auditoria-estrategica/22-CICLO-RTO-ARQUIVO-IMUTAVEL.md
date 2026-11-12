# Ciclo 22 — persistência segura do PDF RTO

## Achado

O registro SQL do RTO protege o caminho e o hash do arquivo já associado, mas `storeFieldServiceRtoPdf` enviava o PDF com `upsert: true` antes de chamar essa validação. Uma nova execução podia sobrescrever o objeto armazenado antes de o banco rejeitar o registro.

## Correção

- Se o relatório já aponta para um PDF, a função retorna um link temporário para o arquivo existente, sem renderizar ou enviar outro PDF.
- Para um relatório ainda sem arquivo, o upload usa `upsert: false`.
- Se um upload anterior tiver sido concluído e apenas o registro no banco tiver falhado, a nova tentativa só reutiliza o objeto quando seu SHA-256 coincide com o PDF gerado. Conteúdo diferente não é registrado.

## Validação

Três testes comportamentais em `tests/field-service-rto-storage.test.ts` passaram, cobrindo arquivo já registrado, repetição idêntica e objeto divergente. Três testes de contrato existentes do RTO também passaram. TypeScript e ESLint passaram. Não houve teste real de Storage, Supabase ou download em produção, nem publicação desta mudança.
