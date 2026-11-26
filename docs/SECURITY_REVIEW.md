# Revisão de segurança e privacidade

## Controles confirmados

- Autorização por organização é verificada nas rotas financeiras, administrativas e RPCs.
- RLS é aplicado nas tabelas operacionais e financeiras.
- Downloads de RTO/BM usam Storage privado e URLs assinadas.
- Worker interno exige segredo Bearer e comparação em tempo constante.
- Uploads de evidências validam caminho, MIME, tamanho e quantidade no banco.
- Coordenadas são armazenadas em eventos/submissões protegidos pelo tenant.
- Assinaturas são limitadas a PNG base64 e tamanho máximo.
- Dados financeiros e contratos são filtrados por organização.
- Cabeçalhos agora incluem HSTS, `X-Frame-Options`, `nosniff`, Referrer-Policy e Permissions-Policy.

## Riscos residuais

- Não foi feita análise jurídica de LGPD, retenção formal ou base legal.
- Não foi executado E2E bilateral com duas contas reais nesta sessão.
- Rate limiting de aplicação depende da infraestrutura/proxy externo; não há mecanismo próprio global identificado.
- CSP abrangente não foi adicionada porque exige inventário dos scripts inline e pode quebrar o runtime; deve ser implantada em etapa controlada.
