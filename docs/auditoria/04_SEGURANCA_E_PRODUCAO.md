# Segurança e prontidão — levantamento inicial

## P0 — antes de expor a produção

- **Link e código juntos:** `src/app/demo/field-service/dispatch/confirmed/page.tsx` adiciona `token` e `code` à mesma URL; `partner/access/page.tsx` também os coloca na URL. Histórico, logs, compartilhamento e cabeçalhos podem expor ambos. A exigência de um código separado perde valor se o mesmo link o contém. Não foram examinados logs de infraestrutura reais. Redesenhar entrega do código, sessão temporária e política de expiração; não publicar acesso sensível antes de teste de ameaça.
- **Limite de tentativas:** verificar e corrigir transação de `assert_partner_access`; ver documento 02. Exigir limitação no limite de entrada e teste real com múltiplas tentativas e processos.
- **Modos de identidade:** `requireUser` usa Supabase, enquanto o login self-hosted oferece OIDC. O readiness self-hosted verifica presença de variáveis, não compatibilidade das rotas ou conectividade. Confirmar fluxos de autenticação/logout e uma única identidade fim a fim.
- **Fluxo financeiro demonstrativo:** armazenamento local e mensagens de envio/imutabilidade não são comprovação de fechamento seguro.
- **Teste multiempresa ausente:** policies SQL e checks precisam ser exercitados com organizações A/B e perfis distintos, incluindo chamadas diretas de RPC e storage. Não há evidência nesta auditoria de que o isolamento funcione ou tenha sido violado.

## Outros controles a verificar

Revisar headers globais, CSRF nas ações, CSP apropriada, criptografia e retenção LGPD, segredos, limites de upload sem `Content-Length`, tipos reais dos arquivos, download com autorização, sessões, logs sem tokens e contas privilegiadas. A validação de imagem e o armazenamento privado aparecem em `partner/upload/route.ts`, mas não substituem teste de segurança real.

Auditoria não inclui pentest, DAST/SAST completo, exploração real, revisão jurídica LGPD ou verificação de provedores. Classificar riscos como pendentes de validação quando dependerem de configuração real.
