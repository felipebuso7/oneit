# Design System OneIT

## Princípios

- Interface corporativa limpa, densa e previsível.
- Azul-petróleo para estrutura e navegação; ciano para foco/seleção; cores de risco apenas
  quando houver significado operacional.
- Espaçamento baseado em múltiplos de 4px.
- Cabeçalhos, filtros, tabelas e estados reutilizáveis.
- Ações primárias visíveis e ações destrutivas confirmadas.

## Componentes

Importar pelo ponto único:

```tsx
import { OneitButton, OneitDataTable, OneitPageHeader } from "@/components/oneit";
```

Componentes disponíveis:

- `OneitPageHeader`: título, descrição, breadcrumb e ações.
- `OneitSection`: seção com cabeçalho e conteúdo.
- `OneitFilterBar`: busca, filtros e ações.
- `OneitKpiGrid`: indicadores semânticos.
- `OneitDataTable`: tabela com cabeçalho acessível e rolagem controlada.
- `OneitStatusBadge`: estados neutro, informação, sucesso, atenção e risco.
- `OneitButton`: ações primária, secundária, ação e perigo, com loading.
- `OneitConfirmation`: confirmação modal para ações críticas.
- `OneitEmptyState`, `OneitLoadingState`, `OneitErrorState`: estados previsíveis.
- `OneitNavIcon`: ícones SVG internos da navegação.

## Regras de adoção

1. Migrar uma tela por vez.
2. Preservar contratos de API e regras de negócio.
3. Validar TypeScript, lint direcionado e teste funcional após cada migração.
4. Não criar uma variação local quando um componente existente atender ao caso.
5. Registrar exceções de layout no inventário de UI/UX.
