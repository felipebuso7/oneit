# Build de produção

## Validação padrão

```bash
npm ci
npm run lint:stabilization
npm run typecheck
npm test -- --run
npm run build
```

## Windows local

O ambiente Windows deste projeto pode retornar `EPERM` ao criar diretórios dinâmicos dentro de `.next/server/app`, especialmente após uma execução interrompida do Next.js. Isso é uma limitação observada do filesystem/processo local; não deve ser tratado como aprovação ou reprovação funcional sem repetir em CI/Linux.

Quando não houver processo Node ativo, remova somente o lock residual:

```powershell
Remove-Item -LiteralPath '.next/lock' -Force -ErrorAction SilentlyContinue
```

Também é possível testar uma saída isolada:

```powershell
$env:ONEIT_NEXT_DIST_DIR = '.next-build-local'
npm run build
```

## Critério de aceite

O build só deve ser considerado aprovado quando terminar com código `0` e gerar `BUILD_ID` no diretório de saída. Os testes locais aprovados não substituem essa verificação.
