# Plano de VPS autogerenciada

Este plano substitui a suposição de Supabase gerenciado como destino de
produção. Ele não autoriza subir dados reais antes dos critérios de aceite.

## Topologia-alvo

Internet -> Caddy HTTPS -> OneIT app -> PostgreSQL
                                  -> MinIO anexos e evidências
                      -> Keycloak OIDC -> PostgreSQL de identidade

Backups criptografados recebem cópias de PostgreSQL e MinIO.

PostgreSQL, MinIO e o provedor de identidade ficam na rede Docker privada.
Somente Caddy publica 80 e 443.

## Entrega adicionada

O arquivo deploy/self-hosted/compose.foundation.yml prepara PostgreSQL 16 e
MinIO sem publicar suas portas. É uma fundação de infraestrutura; ainda não
inicia o portal em produção porque o adaptador próprio de banco, OIDC e S3
ainda está em desenvolvimento.

## Ordem de desenvolvimento

1. Criar adaptador de sessão OIDC e substituir autenticação Supabase.
2. Criar acesso PostgreSQL server-side e migrar módulos por domínio:
   administração, chamados, catálogo/SLA, ativos, field service e governança.
3. Transferir anexos para MinIO com URLs temporárias e validação de tipo/tamanho.
4. Criar executor versionado das migrations PostgreSQL e substituir auth.uid()
   por contexto de sessão seguro.
5. Adicionar app, OIDC e Caddy ao compose de produção após os adaptadores.
6. Implementar backup, restore, alertas, atualização de segurança e runbooks.

## Operação inicial segura

1. Crie uma VPS Linux com disco suficiente para banco, anexos e crescimento.
2. Instale Docker Engine e Docker Compose Plugin.
3. Copie o arquivo .env.foundation.example para .env.foundation, fora do Git,
   e substitua todos os segredos.
4. Suba somente a fundação com Docker Compose.
5. Valide healthchecks e configure backup externo antes de receber dados.

Não exponha as portas de PostgreSQL, MinIO ou seus consoles. A autenticação,
aplicação e proxy ainda serão adicionados como parte da migração de código.

## Progresso da migração

A primeira camada server-side de PostgreSQL está em src/lib/database/postgres.ts.
Ela valida a URL, usa pool limitado e não expõe a string de conexão ao browser.
Ainda não substitui consultas do portal; o próximo corte move a autenticação e
o primeiro domínio de consulta para esse adaptador.

O init da VPS também cria um usuário de banco sem privilégios administrativos,
um esquema auth próprio e as funções auth.uid e auth.role necessárias para
preservar as regras SQL existentes. A aplicação deve usar somente
ONEIT_DATABASE_URL; migrations usam a conexão de proprietário separada.

## Migrations no banco próprio

O comando npm run migrate:self-hosted aplica, em ordem, as migrations de
domínio já existentes. Cada arquivo recebe checksum e é executado dentro de
uma transação; uma migration alterada após aplicação interrompe o processo.

Execute-o somente com ONEIT_MIGRATION_DATABASE_URL e ONEIT_DB_APP_USER
configurados na VPS. A conta de migração é diferente da conta usada pelo
portal. Faça backup antes de qualquer execução em homologação ou produção.

## Identidade

O perfil de infraestrutura inclui Keycloak como provedor OIDC interno, em banco
separado do OneIT. O domínio público de identidade será publicado depois pelo
proxy Caddy; a porta do Keycloak não é exposta pelo Compose. O administrador de
bootstrap precisa ser trocado, guardado em cofre e usado somente na configuração
inicial do realm, clientes e políticas de MFA.

O adaptador do portal valida assinatura, emissor e audiência do token OIDC antes
de sincronizar a identidade. A sincronização não recebe senha e não confere
papéis de operação; esses papéis permanecem no RBAC do OneIT.
