# EvalIA — imagen de producción para Next.js 16 (pnpm + Prisma + standalone)
#
# El build DEBE ocurrir en GitHub Actions (GHCR), no en EasyPanel.
# EasyPanel inyecta todas las env del servicio como Docker --build-arg y las
# imprime en logs. Por eso este Dockerfile:
#   1) no acepta credenciales de runtime como ARG
#   2) aborta si alguien las pasa
#   3) usa un DATABASE_URL placeholder solo para `prisma generate`
#
#   docker build -t evalia-web .
#   docker run --rm -p 3000:3000 --env-file .env evalia-web

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

FROM base AS deps
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
# Placeholder local al stage. No es una credencial real.
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build?schema=public"
RUN pnpm install --frozen-lockfile

FROM base AS builder
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Si un orquestador inyecta secretos como build-arg, el build debe fallar
# en vez de incrustarlos en capas o logs útiles.
ARG DATABASE_URL=""
ARG AUTH_SECRET=""
ARG NEXTAUTH_SECRET=""
ARG ELEVENLABS_API_KEY=""
ARG ELEVENLABS_WEBHOOK_SECRET=""
ARG OPENAI_API_KEY=""
ARG SMTP_PASS=""
ARG SMTP_USER=""
RUN if [ -n "$AUTH_SECRET$NEXTAUTH_SECRET$ELEVENLABS_API_KEY$ELEVENLABS_WEBHOOK_SECRET$OPENAI_API_KEY$SMTP_PASS$SMTP_USER" ]; then \
      echo "Refusing Docker build: runtime secrets were passed as build-args. Build in GitHub Actions and deploy the GHCR image." >&2; \
      exit 1; \
    fi \
 && case "$DATABASE_URL" in \
      ""|postgresql://build:build@*) ;; \
      *) echo "Refusing Docker build: runtime DATABASE_URL was passed as a build-arg." >&2; exit 1 ;; \
    esac

ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build?schema=public"
# URL pública opcional. Vacía a propósito: getAppBaseUrl() usa AUTH_URL /
# NEXTAUTH_URL / NEXT_PUBLIC_APP_URL de runtime. Así la misma imagen sirve
# para staging y para la ventana 1 (app EasyPanel + Postgres Railway).
ARG NEXT_PUBLIC_APP_URL=""
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

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

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]

# --- Worker de procesamiento CV (BullMQ) ---
FROM base AS worker
ENV NODE_ENV=production
ENV WORKER_HEALTH_PORT=8081
ENV ALLOW_DEMO_SEED=false

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate \
  && apk add --no-cache wget \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs worker

COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/worker ./worker
COPY --from=builder /app/tsconfig.json ./

# Placeholder solo para prisma generate en runtime si hiciera falta regenerar
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build?schema=public"

USER worker
EXPOSE 8081
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8081/health || exit 1

CMD ["pnpm", "exec", "tsx", "worker/index.ts"]

