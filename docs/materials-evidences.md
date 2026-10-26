# Materiais e evidências — 01/10/2026

Implementação inicial: catálogo básico compartilhado de RJ45, keystone, patch cord e CAT6. Consumo copia código, nome e unidade do material para preservar o registro original. Quantidades são positivas com até três casas decimais. Registros e auditoria são gravados juntos pela função add_ticket_material, exclusiva para técnicos ativos atribuídos a OS em execução.

Fotos JPEG, PNG e WebP são aceitas até 4 MiB. A aplicação confere tamanho, MIME e assinatura do arquivo no servidor. Essa checagem não equivale a decodificação completa ou antivírus. O bucket ticket-evidences é privado; uploads usam service_role exclusivamente em módulo server-only após checagem da sessão e da atribuição. Usuários não possuem políticas de INSERT/UPDATE/DELETE no Storage desse bucket. A função de registro verifica o objeto e a autorização novamente sob lock da OS.

Evidências podem ser enviadas em ON_SITE, WORK_STARTED e IN_PROGRESS. A visualização verifica RLS e gera uma URL assinada de 60 segundos, sem cache da resposta. Reatribuição revoga novas consultas, mas um link já emitido continua válido até expirar.

Se a gravação de metadados falhar, o servidor tenta remover somente o objeto recém-enviado. Falhas de limpeza são registradas no log. Queda do processo entre upload e registro ainda pode deixar objeto órfão: reconciliação automática e fila de retry serão implementadas posteriormente.

Configuração necessária: aplicar a migration 20261001120000_materials_evidence.sql e configurar SUPABASE_SERVICE_ROLE_KEY somente no servidor. As políticas, o upload e os procedimentos ainda precisam de testes reais no Supabase dev. Não foram criadas credenciais nem aplicado deploy remoto.

## Fila de materiais — 05/10/2026

O portal Campo agora pode guardar uma unidade de consumo pendente por conta/OS/material no IndexedDB. A fila mantém chave UUID estável, versão da OS, quantidade e horário de captura. Após conexão, uma rota autenticada usa o procedimento `sync_ticket_material`; recibo, consumo e auditoria ficam na mesma transação. Repetição com mesma chave/conteúdo retorna o mesmo consumo; reaproveitar a chave com dados diferentes, versão/etapa/atribuição inválida ou catálogo alterado gera conflito explícito. Não há reenvio automático de conflitos.

A fila é texto claro no armazenamento local, como a fila de check-ins: use dispositivo protegido e não limpe os dados do navegador antes da confirmação. A fila não aceita duplicar o mesmo material pendente na mesma OS, mas permite novo lançamento depois da confirmação. Fotos não entram nela — upload retomável, armazenamento local de binários, quota e revisão de segurança seguem pendentes. A migration `20261001190000_material_sync.sql` ainda não foi aplicada ou validada em Supabase.

Pendências: cadastro administrativo do catálogo, correções/estornos auditáveis de consumo, compressão/decodificação de imagens, políticas contratuais de evidências, uploads retomáveis/offline e validação de conclusão técnica.
