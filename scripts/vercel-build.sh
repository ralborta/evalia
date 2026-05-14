#!/usr/bin/env sh
# Build en Vercel: Prisma exige que DATABASE_URL exista al parsear schema.prisma.
# Si no está en "Environment Variables" para Build, usamos un placeholder solo
# para `prisma generate` y omitimos push/seed (debes seedear la BD aparte o añadir la var).
set -e
cd "$(dirname "$0")/.."

if [ -z "$DATABASE_URL" ]; then
  echo ""
  echo ">>> AVISO: DATABASE_URL no está definida en este build."
  echo ">>> Prisma generate usa un placeholder; se omiten db push y db seed."
  echo ">>> En Vercel: Settings → Environment Variables → DATABASE_URL"
  echo ">>> Marca Production/Preview y activa la opción para que esté disponible en Build."
  echo ""
  export DATABASE_URL="postgresql://vercel_build_placeholder:vercel_build_placeholder@127.0.0.1:5432/vercel_build_placeholder?schema=public"
  pnpm exec prisma generate
  pnpm exec next build
else
  pnpm exec prisma generate
  pnpm exec prisma db push
  pnpm exec prisma db seed
  pnpm exec next build
fi
