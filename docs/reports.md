# Relatório PDF versionado — 01/10/2026

Geração server-side via pdf-lib, após aprovação gerencial. O banco prepara o snapshot da conclusão aprovada; o servidor gera e armazena PDF em bucket privado e registra hash SHA-256, versão, autor e snapshot. A confirmação valida novamente versão da OS e dados aprovados sob lock. A geração de nova versão preserva os arquivos anteriores.

O relatório inclui referências externas, organização, cliente, localidade, técnico, diagnóstico, solução, checklist, consumo, inventário das evidências, check-ins, conclusão e aprovação. Datas exibidas no fuso America/Sao_Paulo. A geração demonstrativa e server-side embute até oito evidências PNG/JPEG por seção no apêndice fotográfico. No servidor, cada arquivo é limitado a 10 MB para proteger memória e tempo de geração; arquivos ausentes, inválidos ou acima do limite permanecem listados no inventário, mas não são incorporados ao apêndice. Política de fuso por contrato permanece pendente.

A4 com paginação, cabeçalho e rodapé. Fonte Helvetica suporta acentos portugueses; caracteres fora de WinAnsi são substituídos por '?' no PDF, preservados no snapshot. Aprovação no sistema não é assinatura digital certificada.

O bucket ticket-reports exige service_role apenas no servidor para upload. Leitura usa RLS e links assinados de 60 segundos. Falhas de registro tentam compensar o upload; queda do processo pode deixar objeto órfão e requer reconciliação futura.

Migrations: 20261001140000_reports.sql e 20261024120500_report_evidence_paths.sql. Antes da publicação, homologar as migrations, RPCs, bucket privado, leitura das evidências, geração do PDF, download por link autorizado e limpeza de upload órfão no Supabase dev. Geração local usa somente dados fictícios. Aprovação e PDF não acionam envio de e-mail, integração ou encerramento automático.
