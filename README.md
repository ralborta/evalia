# EvalIA

MVP de entrevistas orales en inglés (ElevenLabs) + panel evaluador/agente + informes con IA.

## Despliegue en **Railway** (app + Postgres)

El repo incluye [`railway.json`](./railway.json): en **cada deploy** Railway ejecuta **`pnpm run db:deploy`** (esquema Prisma + **seed** con usuarios demo, admin `admin@evalia.app` / `admin`, entrevistas de prueba, etc.) y luego arranca la app con **`pnpm start`**.

1. Crea **PostgreSQL** en Railway y enlaza **`DATABASE_URL`** al servicio web (EvalIA).
2. Variables obligatorias en el servicio **web**: `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL` (URL pública `https://…` de **Railway**, sin `/` final).
3. Haz **redeploy** (o push a `main`). No hace falta correr Prisma desde tu Mac.

Opcional (Vercel): mismas variables con la URL de Vercel si despliegas allí; `railway.json` solo afecta a Railway.

## Desarrollo local

```bash
pnpm install
cp .env.example .env
# Edita .env
pnpm dev
```

Comandos útiles:

```bash
pnpm db:push      # solo esquema
pnpm db:seed      # solo datos demo
pnpm db:deploy    # push + seed (lo mismo que en Railway pre-deploy)
pnpm db:reset-admin  # solo admin admin@evalia.app / admin
```

## Más

- Plantilla original: [Next.js](https://nextjs.org).
