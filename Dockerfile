# EvalIA — imagen de producción para Next.js 16 (pnpm + Prisma + standalone)
# Build: docker build -t evalia-web .
# Run:   docker run --rm -p 3000:3000 --env-file .env evalia-web

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

FROM base AS deps
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
# DATABASE_URL solo para que `prisma generate` (postinstall) parsee el schema.
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build?schema=public"
RUN pnpm install --frozen-lockfile

FROM base AS builder
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build?schema=public"
ENV NEXT_PUBLIC_APP_URL="http://localhost:3000"
RUN pnpm exec prisma generate
RUN pnpm exec next build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV ALLOW_DEMO_SEED=false
ENV DISABLE_DB_BOOTSTRAP=1

RUN apk add --no-cache wget \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
# Con pnpm el client queda en node_modules/.pnpm; Next standalone ya lo traza.
# No copiar node_modules/.prisma (esa ruta no existe con pnpm).

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
