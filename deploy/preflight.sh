#!/usr/bin/env sh
set -eu

node scripts/check-release-tree.mjs

if [ ! -f .env.production ]; then
  echo "Arquivo .env.production não encontrado." >&2
  exit 1
fi

node --env-file=.env.production scripts/check-production-env.mjs
echo "Preflight aprovado. Agora é possível executar: docker compose --env-file .env.production -f compose.vps.yml up -d --build"
