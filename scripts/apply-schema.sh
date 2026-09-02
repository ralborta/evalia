#!/usr/bin/env sh
# Aplica el esquema Prisma con db push (no destructivo, sin seed).
# Uso: DATABASE_URL="postgresql://..." sh scripts/apply-schema.sh
set -e
cd "$(dirname "$0")/.."

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL es obligatorio."
  exit 1
fi

if [ "${ALLOW_DEMO_SEED}" = "true" ]; then
  echo "ERROR: apply-schema no acepta ALLOW_DEMO_SEED=true. El seed es un paso aparte."
  exit 1
fi

echo "[apply-schema] prisma generate"
pnpm exec prisma generate

echo "[apply-schema] prisma db push (sin --accept-data-loss, sin seed)"
pnpm exec prisma db push

echo "[apply-schema] listo"
