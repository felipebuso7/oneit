# Segunda auditoria sistêmica — estado atual e plano de melhoria

## Escopo e evidências

Auditoria estática do repositório atual, migrations, APIs, componentes, testes e documentos 01–08. Não houve conexão com PostgreSQL/Supabase, provedor de e-mail, Google Workspace, Microsoft 365, navegador autenticado ou VPS nesta rodada.

Verificação adicional da Sprint A: foram encontrados **162 arquivos de migration**, sem timestamps duplicados. O `compose.vps.yml` depende do healthcheck da imagem da aplicação, mas o build ainda recebe argumentos públicos Supabase enquanto o `.env.example` seleciona `self_hosted`; essa combinação precisa ser resolvida antes do release para não produzir uma imagem com perfil divergente do runtime.

Inspeção estática adicional: não foram encontrados comandos `DROP TABLE`, `DROP COLUMN`,
`DROP SCHEMA` ou `DROP INDEX` nas migrations. Foram encontrados **294 comandos CREATE sem
cláusula de idempotência** (`IF NOT EXISTS`, conforme o padrão procurado). Isso pode ser
normal na migration fundacional, mas precisa ser validado em instalação limpa e em upgrade
incremental; não é seguro concluir que as migrations podem ser reaplicadas sem erro.

Higiene do repositório: há grande volume de arquivos não rastreados em `.edge-agenda-check/`
(perfil/cache de navegador) e alterações locais em arquivos de configuração. Esses artefatos
não devem entrar no commit ou na imagem de produção. Não foram removidos nesta auditoria,
pois a limpeza é uma operação destrutiva sobre o estado local e requer revisão do responsável.

A checagem seguinte identificou ainda diretórios gerados `.next-*`/`tmp` e perfis `.edge-*`
entre os não rastreados, além de arquivos reais em `src`, `supabase`, `tests`, `docs`, `deploy`
e `public`. Portanto, não é seguro aplicar uma limpeza ampla por padrão: os artefatos gerados
devem ser isolados de forma explícita e os arquivos de produto devem ser revisados antes do
primeiro commit de release.

## Parecer executivo preliminar

| Dimensão | Classificação | Evidência confirmada |
|---|---|---|
| Arquitetura | Requer melhorias | Há separação razoável entre portal, demo, APIs, domínio e migrations, mas a árvore contém grande volume de arquivos não rastreados e componentes demonstrativos misturados ao produto. |
| Banco e integridade | Requer melhorias | Há RLS, funções transacionais e constraints, porém as 149+ migrations não foram executadas nesta auditoria contra PostgreSQL real. |
| Backend | Requer melhorias | Field Service possui contratos e guards relevantes; idempotência final do `SUBMIT` e worker financeiro ainda não estão comprovados. |
| Segurança | Requer melhorias | Login Supabase e OIDC self-hosted existem; contas de e-mail OAuth/SMTP centralizadas ainda não existem. Link parceiro foi endurecido, mas compatibilidade legada permanece. |
| Fluxos operacionais | Parcial | O fluxo mobile e validação de OS estão modelados; materiais técnicos e composição LPU foram conscientemente separados, mas a decisão ainda não está implementada como novo contrato. |
| Desempenho | Não validada | Existem limites de lista, mas não foram executados benchmarks, planos de consulta ou carga. |
| Infraestrutura | Crítica para produção | Docker/VPS e readiness existem como base, mas build limpo, migrations, storage, backup/restauração e deploy Linux não foram comprovados. |
| Testes | Requer melhorias | Suíte automatizada atual: 78 arquivos e 150 testes aprovados; não substitui E2E, SQL, provedor externo ou dispositivo móvel. |

## Funcionalidades por estado

- **Funcional com evidência automatizada:** fluxo de acesso parceiro, sequência mobile, upload validado, RTO, fila de validação, guards financeiros, headers básicos e limites de listas.
- **Parcial:** autenticação self-hosted, links legados, readiness, devolução/reenvio, idempotência de `SUBMIT`, paginação por cursor e materiais/LPU.
- **Não comprovada:** RLS/grants reais, instalação limpa das migrations, worker financeiro, OAuth Google/Microsoft, SMTP corporativo, entrega de e-mail, mapa/roteirização real, BM conectado a dados persistentes e deploy VPS.
- **Demonstração/local:** partes de tickets, inventário e financeiro ainda usam estado demonstrativo/local; não devem ser consideradas prontas para produção.

## Plano proposto antes de mudanças estruturais

### Sprint A — Evidência de ambiente e release (P0)

1. Criar banco Supabase/PostgreSQL de homologação isolado.
2. Aplicar migrations em instalação limpa e upgrade incremental.
3. Validar grants/RLS com perfis e organizações distintas.
4. Reproduzir build em Linux/CI e corrigir o bloqueio de filesystem do Windows somente se necessário.
5. Definir artefato de release e remover dependência de diretórios `.next` locais.

### Sprint B — E-mail corporativo central (P1)

1. Modelar contas de e-mail por organização, sem armazenar segredo em claro.
2. Implementar OAuth Google/Microsoft somente com Authorization Code + PKCE, state e escopos mínimos.
3. Definir SMTP seguro como alternativa explícita.
4. Centralizar fila, templates, anexos, retry, auditoria e estados de entrega.
5. Integrar BM e notificações ao serviço central.

### Sprint C — BM persistente e auditável (P0/P1)

1. Retirar dependência de `localStorage` do ciclo financeiro real.
2. Validar cálculo contra contrato e composição LPU.
3. Implementar preview/versionamento/aprovação.
4. Enviar por e-mail central e registrar message-id, destinatários e status do provedor.
5. Bloquear fechamento/faturamento sem evidência apropriada.

### Sprint D — Field Service integrado (P1)

1. Executar fluxo ponta a ponta em homologação.
2. Resolver idempotência transacional de `SUBMIT`.
3. Validar agenda, conflitos, localização e roteirização com dados reais autorizados.
4. Decidir e implementar o contrato de observações de materiais versus composição LPU faturável.
5. Executar E2E em navegador e dispositivo móvel.

### Sprint E — Segurança, desempenho e operação (P1/P2)

1. Matriz de permissões e testes A/B por organização.
2. Rate limiting, MFA para administradores e revisão de sessão.
3. Benchmarks, índices e paginação por cursor.
4. Backup/restauração, observabilidade, alertas e rollback.

### Decisão de runtime (evidência da Sprint A)

O mapeamento estático confirma que o caminho efetivamente integrado ainda é o Supabase:
a maior parte das rotas de chamados, Field Service, financeiro, parceiro e anexos utiliza
o cliente Supabase diretamente. O perfil `self_hosted` possui adaptadores parciais, mas
não é utilizado de forma uniforme pelos módulos críticos.

Este é um fato observado no código, não uma suposição de capacidade de produção.

**Recomendação:** homologar o próximo ambiente produtivo pelo caminho Supabase gerenciado,
com secrets e RLS revisados, enquanto o VPS self-hosted permanece em trilha separada. O
VPS só deve ser promovido após banco, autenticação, armazenamento e rotas críticas
utilizarem o mesmo adaptador e serem validados em Linux equivalente.

Também foi confirmada uma divergência de configuração: `compose.vps.yml` injeta variáveis
públicas Supabase no build, enquanto `.env.example` seleciona `ONEIT_DEPLOYMENT_MODE=self_hosted`.
Essa divergência é bloqueio de release e não deve ser resolvida por tentativa em produção.

O pipeline GitHub executa lint, TypeScript, testes e build em Ubuntu com Node 24, enquanto
o `Dockerfile` constrói com Node 20 Alpine. Essa diferença não causou falha comprovada,
mas é uma fonte real de divergência entre CI e imagem de produção; deve ser alinhada ou
explicitamente testada antes do release.

O Compose depende de `.env.production`, que não existe no checkout atual (corretamente não
versionado). O arquivo de exemplo contém as variáveis necessárias, mas ainda falta um
procedimento documentado e validado para gerar o arquivo de produção, conferir secrets
obrigatórios e impedir inicialização com perfil incompleto.

O `package.json` não declara `engines` nem `packageManager`. O ambiente atual usa Node
24.15.0/npm 11.12.1, o CI usa Node 24 e o Docker usa Node 20. Sem uma política explícita
de versão, reproduções podem divergir. Recomenda-se fixar a versão suportada após validar
o build Linux, em vez de escolher uma versão apenas por conveniência.

O readiness atual já define dois contratos distintos: no modo legado exige URL HTTP(S) e
chave pública Supabase; no modo `self_hosted` exige DSN PostgreSQL/MySQL/MariaDB, issuer
HTTP(S), client id, endpoint S3 HTTP(S) e bucket. Essa checagem é útil, mas valida formato
e presença, não conectividade, grants, storage, OAuth ou execução das migrations.

## Recomendação atual

**NÃO APTO PARA PRODUÇÃO.** O produto possui uma base funcional relevante e uma suíte automatizada forte para contratos, mas faltam evidências de banco, integrações externas, build/deploy Linux, backup, worker de e-mail e fluxo financeiro persistente. Mudanças estruturais devem começar pela Sprint A.
