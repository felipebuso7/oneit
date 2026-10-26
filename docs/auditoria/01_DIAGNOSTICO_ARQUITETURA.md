# Diagnóstico de arquitetura — levantamento inicial

Data: 2026-10-24. Status: auditoria em andamento; não é inventário exaustivo nem certificação de segurança.

## Fatos observados

- Aplicação Next.js 16.3.7, React 19, TypeScript, Tailwind, Supabase SSR/JS, PostgreSQL, Zod e pdf-lib; scripts e versões em `package.json` e `package-lock.json`.
- `src/app` contém páginas, rotas HTTP e ações de servidor; `src/domain` contém lógica de domínio, `src/lib` integrações e utilitários; persistência e políticas declaradas em `supabase/migrations`.
- Foram contados 500 arquivos em `src`, 149 migrations SQL e 55 arquivos em `tests`, pelo `rg --files`; contagens não são medida de cobertura.
- Há duas linhas de arquitetura: chamadas Supabase em `src/lib/supabase/server.ts` e `src/lib/auth/current-user.ts`; adaptadores PostgreSQL/OIDC específicos para modo self-hosted em `src/lib/database` e `src/lib/auth/self-hosted-*`. Não se verificou integração completa entre elas.
- Fluxos em `src/app/demo/field-service` usam `localStorage`, enquanto APIs e páginas de portal acessam banco. A presença de APIs não demonstra que a interface demonstrativa utiliza a persistência real de ponta a ponta.
- `src/app/page.tsx` direciona para `/demo`. Não se demonstrou que esse caminho esteja apropriado para implantação pública.
- O repositório tem arquivos rastreados modificados e muitos arquivos não rastreados, inclusive código e migrations; não foram limpos nem revertidos. Isso prejudica a reprodutibilidade do estado implantável, até que a equipe decida o que versionar.

## Avaliação

Um monólito modular é uma escolha plausível para o estágio do produto; não há evidência de necessidade de microsserviços. Sustentabilidade ainda requer uma fronteira clara entre demonstração e operação persistente, consolidação da identidade e testes reais dos contratos. Acoplamento circular, código morto e todos os módulos ainda não foram analisados integralmente.

## Proposta estrutural — requer aprovação antes da execução

Escolher um único perfil de identidade/persistência para a primeira produção; mapear cada tela operacional ao backend e ao responsável pela regra; desabilitar ou isolar demonstrações no ambiente público; depois padronizar serviços e contratos sem reescrever o produto. Riscos: mudança de autenticação, dados e navegação; executar incrementalmente em homologação com rollback.
