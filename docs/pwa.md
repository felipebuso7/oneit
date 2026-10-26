# Base PWA — 01/10/2026

Nota de evolução: este documento registra o primeiro incremento. A fila parcial de check-ins foi adicionada depois; consultar [offline-checkins.md](offline-checkins.md) para escopo atual e limites. A agenda completa offline continua pendente.

## Implementado

Manifest nativo do Next.js, início em /portal/field, ícones PNG de 192/512 pixels gerados pelo próprio app e ícone Apple de 180 pixels. Metadados em português, viewport móvel sem bloquear zoom, orientação de instalação e botão quando o navegador oferece beforeinstallprompt.

Service worker registrado apenas no build de produção em contexto seguro (HTTPS ou localhost). Cache versionado contém somente /offline.html, página pública autônoma sem dependência de scripts, login ou dados de clientes. Navegações GET são network-first; somente falhas de rede usam a página alternativa. Respostas HTTP de erro não são mascaradas. POST, Server Actions, requisições RSC e requests cross-origin não são interceptados nem reenviados. Nenhuma resposta autenticada é persistida pelo service worker.

Ativação remove somente caches antigos do prefixo deste worker. Não usamos skipWaiting automático: atualizações aguardam a saída das abas da versão anterior. O script recebe no-store e passa fora do proxy de autenticação, assim como os recursos públicos do PWA.

Indicador usa navigator.onLine: sinaliza a rede do dispositivo, não prova disponibilidade do servidor. Um listener em capture bloqueia submit de formulários quando offline, com aviso explícito de que não houve salvamento. Não é garantia contra falha de rede durante o envio nem cobre chamadas programáticas; o servidor continua responsável pela validação e confirmação.

## Ainda não implementado

- Agenda, contatos, checklist e catálogo locais em IndexedDB.
- Rascunhos persistentes, fila de ações e evidências offline.
- Idempotência transacional, retry, controle de conflitos e sincronização.
- Homologação de instalação, navegação offline e acessibilidade em dispositivos reais.

Não concluir a Sprint 8 ou 9 com base apenas neste incremento. Não apresentar a tela offline como execução offline. Não há push nem integração externa nesta etapa.

## Verificação manual em ambiente de desenvolvimento

1. Rodar build e start. Para acesso pelo celular, servir por HTTPS; HTTP em IP local não oferece contexto seguro.
2. Com Supabase de desenvolvimento configurado, autenticar um técnico e abrir Campo.
3. Conferir manifest, PNGs, registro do worker e instalação no navegador alvo.
4. No DevTools, conferir que Cache Storage tem somente offline.html no cache do Servicia; nenhum relatório, token ou payload de OS.
5. Desconectar e recarregar uma rota: deve aparecer a página pública alternativa, sem conteúdo autenticado.
6. Na tela ainda aberta, desconectar e tentar um formulário: deve informar bloqueio, sem mensagem de sucesso nem fila implícita.
7. Reconectar e abrir Campo; confirmar autenticação normal e ausência de reenvio automático.
8. Testar troca de usuário, logout, cache evicto e atualização do worker com abas abertas.

Referências: [PWA no Next.js](https://nextjs.org/docs/app/guides/progressive-web-apps) e [service workers na MDN](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers). Testes locais do worker simulam os eventos em Node; não substituem os passos no navegador.

## Resultado local deste incremento

Typecheck, lint e build de produção concluídos. 40 testes passaram (10 novos para manifest e comportamento do worker). O aviso de processo aberto no encerramento do Vitest permanece, com código de saída zero. O script scripts/pwa-smoke.mjs passou contra o servidor de produção local: verificou manifest, PNGs 180/192/512 com dimensões reais, 404 para tamanho inválido, tela pública offline e headers do worker. O servidor temporário foi encerrado após a verificação. Instalação e uso offline em navegador/dispositivo real não foram verificados.
