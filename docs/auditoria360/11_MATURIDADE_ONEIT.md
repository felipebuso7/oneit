# Maturidade preliminar do OneIT

Escala: 0 inexistente, 3 parcialmente operacional, 5 validado em produção/homologação completa.

| Dimensão | Nota | Justificativa |
|---|---:|---|
| Arquitetura | 3 | base modular, mas grande superfície e separação demo/produção pendente |
| Segurança | 3 | contratos de RBAC/headers/auditoria; RLS real não homologado |
| Integração | 2 | APIs existem, mas provedor/worker/mapas não comprovados |
| Cadastros | 3 | entidades e APIs presentes; jornada de implantação não validada |
| Fluxos | 3 | estados e transações cobertos parcialmente |
| Usabilidade | 3 | Design System aplicado em áreas principais; auditoria visual completa pendente |
| Field Service | 3 | contratos fortes; E2E e dispositivo real pendentes |
| Mobile | 2 | componente e contratos existem; teste real de conectividade/toque pendente |
| Relatórios | 3 | PDF e imutabilidade cobertos por testes |
| Indicadores | 2 | dashboards existem; catálogo/fórmulas/drill-down não formalizados |
| Automação | 2 | preflight e contratos; worker financeiro não comprovado |
| Desempenho | 1 | sem benchmark de carga representativa |
| Testabilidade | 4 | 79 arquivos e 152 testes aprovados |
| Implantação | 3 | Docker, CI e preflight; VPS/backup/rollback pendentes |
| Manutenibilidade | 3 | componentes compartilhados, mas legado/demo heterogêneo |
| Produção | 2 | não há evidência suficiente para go-live seguro |

## Parecer

Produto com fundação relevante, mas ainda em maturidade de pré-homologação corporativa. O maior ganho agora virá de ambientes reais de teste e fechamento das integrações, não de adicionar novas telas.
