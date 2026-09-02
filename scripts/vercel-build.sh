#!/usr/bin/env sh
# Build en Vercel. No aplica seed ni reemplaza contraseñas.
# Schema: solo si APPLY_SCHEMA_ON_BUILD=true (evitar db push concurrente en previews).
set -e
cd "$(dirname "$0")/.."

if [ -z "$DATABASE_URL" ]; then
  echo ">>> AVISO: DATABASE_URL no está definida en este build."
  echo ">>> Prisma generate usa un placeholder; se omite db push."
  export DATABASE_URL="postgresql://vercel_build_placeholder:vercel_build_placeholder@127.0.0.1:5432/vercel_build_placeholder?schema=public"
  pnpm exec prisma generate
  pnpm exec next build
  exit 0
fi

pnpm exec prisma generate

if [ "$APPLY_SCHEMA_ON_BUILD" = "true" ]; then
  echo ">>> APPLY_SCHEMA_ON_BUILD=true — prisma db push (sin seed)"
  pnpm exec prisma db push
fi

if [ "$ALLOW_DEMO_SEED" = "true" ]; then
  echo ">>> ALLOW_DEMO_SEED=true — ejecutando seed demo"
  pnpm exec tsx prisma/seed-cli.ts
fi

pnpm exec next build
