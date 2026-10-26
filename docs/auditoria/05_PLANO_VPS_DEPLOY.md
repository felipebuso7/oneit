# VPS e deploy — proposta inicial

**Parecer: não implantar em produção agora.** O projeto contém `Dockerfile`, `compose.vps.yml`, Caddy e um compose separado de Postgres/MinIO/Keycloak. Não foi demonstrado que essas duas composições formem uma implantação integrada. O cliente de muitas rotas ainda requer Supabase, mesmo quando o readiness de self-hosted considera apenas variáveis OIDC/Postgres/S3.

## Caminho proposto, sujeito a decisão e aprovação

1. Definir perfil de execução efetivo (Supabase com aplicação em VPS, ou self-hosted completo). Mapear compatibilidade, dados, custos e manutenção antes de escolher; não é justificável presumir que os dois já são intercambiáveis.
2. Homologar Linux com imagem reproduzível, usuário não privilegiado, HTTPS e proxy; validar health como liveness e readiness real de dependências, sem expor segredos.
3. Isolar ambientes e identidades, expor apenas 80/443, restringir administração, ativar atualizações de segurança e monitorar CPU, memória, disco, erros e fila de e-mail.
4. Definir RPO/RTO com o negócio. Implementar backup criptografado de banco e objetos fora da VPS, retenção e restauração em ambiente isolado; ensaiar recuperação e rollback de versão e schema.
5. Testar reinício, falhas de armazenamento/provedor, renovação de certificados e alertas. Só então executar go-live controlado.

## Dimensionamento

CPU, memória, disco e número de usuários simultâneos não foram medidos. Não há base para recomendar tamanho de VPS com confiança. Medir imagem, consumo sob carga representativa, crescimento de fotos/PDFs, concorrência e objetivos de disponibilidade antes de contratar. Sem infraestrutura, credenciais ou acesso do usuário não foram executados deploy, backup ou restauração.

## Preflight obrigatório

Antes de iniciar ou atualizar a stack na VPS:

```sh
./deploy/preflight.sh
docker compose -f compose.vps.yml up -d --build
```

O preflight exige `.env.production`, valida a configuração mínima e falha sem iniciar os containers quando houver variáveis ausentes ou inválidas. A execução em uma VPS real e o teste de rollback continuam pendentes.
