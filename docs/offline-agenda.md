# Agenda local e reabertura offline — 01/10/2026

Evolução: [offline-execution-drafts.md](offline-execution-drafts.md) registra inclusão do checklist e rascunhos criptografados separados. Os limites abaixo descrevem o incremento inicial da agenda.

Em 05/10/2026, [offline-execution-sync.md](offline-execution-sync.md) adiciona envio manual dos rascunhos salvos; o cache público do worker passa a v5.

## Implementado no código

Campo oferece preparação explícita de uma cópia local com até 50 OS atribuídas ao técnico. Apenas UUID, número, título, agendamento, etapa e versão são incluídos, com conta de origem e horário da consulta. Não inclui contatos, endereços, diagnóstico, checklist, fotos, tokens ou senha de login.

Uma cópia por dispositivo/origem: salvar exige confirmação de substituição de qualquer cópia anterior. Uma senha local de 12–200 caracteres é confirmada duas vezes e nunca persistida. A agenda é cifrada por AES-GCM 256 com IV aleatório de 12 bytes; chave derivada via PBKDF2 SHA-256, salt aleatório de 16 bytes e 600.000 iterações. O UUID da conta permanece no cabeçalho técnico para invalidar apenas a cópia correspondente; é vinculado ao ciphertext por additionalData. Senha forte e dispositivo protegido continuam necessários; criptografia não protege contra XSS, senha fraca, usuário com a tela desbloqueada ou acesso à origem enquanto os dados estão abertos. Revisão de segurança antes de produção é obrigatória.

A cópia tem validade de 8 horas desde a consulta online. Relógio do cliente não é uma fronteira de autorização: pode ser alterado. A validade reduz uso acidental de cópias antigas, mas não garante permissão atual. Troca de atribuição, papel ou estado só é comprovada pelo servidor no reenvio. Desbloqueio por senha local não é login no servidor nem prova identidade atual.

## Tela independente

offline.html e offline-app.js são públicos, sem payload de usuário. O bundle é produzido em predev/prebuild com esbuild a partir dos mesmos módulos de armazenamento, validação e sincronização; não mantém uma segunda implementação de check-in. Service worker v3 pré-carrega esses dois arquivos, sem HTML autenticado ou cache generalizado de JS/RSC. É necessário carregar a aplicação conectada, concluir a instalação do worker e testar a agenda local antes de ficar offline. Atualização do worker aguarda saída das abas antigas. Mudanças futuras no bundle exigem nova versão do cache.

A tela exige senha toda vez que reabre; bloqueia ao ficar oculta e após 5 minutos sem interação. Não oferece seletor com dados de outras contas. O desbloqueio expõe somente a agenda cifrada e a fila da conta dela. A fila de check-ins do incremento anterior ainda está em texto claro no IndexedDB; a criptografia deste incremento protege a agenda, não a fila.

Permite consultar a cópia e capturar um check-in por OS pendente (GPS ou justificativa + autorização explícita), inclusive após reabrir offline. Não avança estado otimisticamente e não encadeia deslocamento, chegada e início desconectados. Demais registros exigem Campo online. Sincronização nesta tela é manual e usa a rota idempotente existente; sessão expirada pede novo login online na mesma conta. Não altera dados do servidor com base apenas na senha local.

Depois de confirmação de qualquer check-in, invalida a cópia da agenda daquela conta (online e na tela independente), pois suas versões ficaram desatualizadas. Não remove outros eventos pendentes. Atualizar Campo e preparar nova cópia antes da próxima etapa. Remover cópia é ação explicitamente confirmada e não apaga fila nem histórico do servidor. Senha esquecida não pode ser recuperada; preparar uma nova cópia online.

## Aceite e limites

Testes de IndexedDB e Web Crypto em Node cobrem criptografia, senha errada, adulteração, prazo, substituição e preservação da fila. Não substituem teste móvel real. Homologar rede cortada e reabertura, bloqueio por aba oculta, atualização do worker, armazenamento cheio/evicto, troca de conta, relógio divergente, perda de confirmação e mudança de gestão. Migrations da sincronização continuam pendentes no Supabase.

Não concluir Sprint 8/9: agenda local ainda não inclui contatos/checklist/catálogo; não há materiais, evidências ou execução completa offline. Política definitiva de logout/retenção e revisão de segurança do armazenamento precisam de validação antes de piloto.

Referências técnicas: [Web Crypto deriveKey](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey) e [esbuild API](https://esbuild.github.io/api/).

## Validação deste incremento

71 testes passaram. Typecheck e build concluídos, com geração do bundle estático. O teste HTTP confirmou HTML/bundle públicos, recursos PWA e rejeições básicas da API. A tela bloqueada foi inspecionada no navegador integrado, com formulário acessível e sem erros/warnings no console. Essa inspeção não validou desbloqueio com dados reais, reabertura após queda de rede, worker ativo ou fluxo autenticado. A homologação móvel/Supabase permanece necessária.
