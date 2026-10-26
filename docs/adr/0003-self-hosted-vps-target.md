# ADR 0003 — Operação autogerenciada em VPS

## Decisão

O ambiente de produção do OneIT será operado em VPS própria. O alvo é:

- PostgreSQL 16 para dados transacionais;
- armazenamento S3 compatível (MinIO) para anexos e evidências;
- serviço de identidade OIDC autogerenciado;
- aplicação OneIT em container;
- Caddy como proxy HTTPS;
- backup criptografado fora da VPS, monitoramento e restauração testada.

## Fato atual

O código existente usa APIs do Supabase para autenticação, consultas, RPCs e
storage. Portanto, apontar o container atual diretamente para PostgreSQL não
funciona e não é uma implantação sem Supabase.

## Consequência

A migração será feita por uma camada de acesso própria, em etapas:

1. sessão/OIDC e autorização do lado do servidor;
2. adaptador PostgreSQL para consultas e comandos;
3. storage S3 compatível para evidências;
4. migração das regras SQL, auditoria e jobs;
5. remoção dos clientes e variáveis Supabase.

Durante a transição, o perfil antigo só pode ser usado em desenvolvimento
temporário. Ele não é a topologia de produção aprovada.

## Critérios de aceite

- nenhum segredo, banco ou console de storage exposto publicamente;
- aplicação opera sem variáveis NEXT_PUBLIC_SUPABASE;
- identidade, permissões organizacionais e auditoria continuam aplicadas;
- backup e restauração de banco e anexos são demonstrados antes do go-live;
- homologação valida chamados, SLA, OS, rotas e evidências ponta a ponta.
