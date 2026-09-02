# EvalIA

MVP de entrevistas orales en inglés (motor de voz / conversación) + panel evaluador/agente + informes con IA.

## Destino actual: EasyPanel (staging)

La migración de infraestructura vive en la rama `infra/easypanel-migration`. Guía operativa:

- [`docs/easypanel-migration.md`](./docs/easypanel-migration.md)

Servicios EasyPanel:

- `evalia-web` — Next.js 16 desde imagen GHCR (`ghcr.io/ralborta/evalia`, build en GitHub Actions)
- `evalia-postgres` — PostgreSQL **17.11** con volumen persistente, sin puerto público

Vercel y Railway **siguen activos** como producción y rollback hasta el corte aprobado.

## Despliegue en **Railway** (app + Postgres) — rollback

El repo incluye [`railway.json`](./railway.json). En cada deploy Railway ejecuta **`pnpm run db:deploy`**, que ahora aplica **solo el esquema** (`prisma db push`) y **no** ejecuta seed demo ni cambia contraseñas.

El arranque de Next llama a [`instrumentation.ts`](./instrumentation.ts), que ya **no** crea usuarios demo ni resetea el admin. Seed demo: `ALLOW_DEMO_SEED=true`. Desactivar bootstrap: `DISABLE_DB_BOOTSTRAP=1`.

1. Crea **PostgreSQL** en Railway y enlaza **`DATABASE_URL`** al servicio web (EvalIA).
2. Variables obligatorias: `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL` (URL pública `https://…`, sin `/` final).
3. En producción define `ALLOW_DEMO_SEED=false` y `ELEVENLABS_WEBHOOK_SECRET`.

Opcional (Vercel): mismas variables con la URL de Vercel; `railway.json` solo afecta a Railway.

## Despliegue en **Vercel** (app) + **Railway** (solo Postgres) — rollback

El repo incluye [`vercel.json`](./vercel.json): el build ejecuta [`scripts/vercel-build.sh`](./scripts/vercel-build.sh). Genera Prisma Client y construye Next. **No** hace seed. `prisma db push` solo si `APPLY_SCHEMA_ON_BUILD=true`.

**En el proyecto de Vercel → Settings → Environment Variables:**

| Variable | Notas |
|----------|--------|
| `DATABASE_URL` | Cadena de Postgres (Railway u origen actual). Production y, si aplica, Preview. Disponible en Build para `prisma generate`. |
| `AUTH_SECRET` | Obligatorio (ej. `openssl rand -base64 48`). |
| `NEXTAUTH_URL` | URL pública exacta, sin `/` final. |
| `NEXT_PUBLIC_APP_URL` | Igual que `NEXTAUTH_URL` en producción. |
| `ELEVENLABS_WEBHOOK_SECRET` | Obligatorio para aceptar webhooks firmados. |
| `ALLOW_DEMO_SEED` | `false` en producción. |

Tras guardar variables, **Redeploy**.

## Docker / GHCR (EasyPanel / local)

El build de producción ocurre en GitHub Actions y publica `ghcr.io/ralborta/evalia`. EasyPanel **no** debe construir el `Dockerfile` (inyectaría env de runtime como build-arg).

```bash
docker build -t evalia-web .
docker run --rm -p 3000:3000 --env-file .env evalia-web
# health: GET /api/health
```

Compose de referencia (web + postgres; redis/worker comentados): `docker-compose.yml`.

## Desarrollo local

```bash
pnpm install
cp .env.example .env
# Edita .env
pnpm dev
```

Comandos útiles:

```bash
pnpm db:push           # solo esquema
pnpm db:apply-schema   # generate + db push, sin seed
pnpm db:seed           # requiere ALLOW_DEMO_SEED=true
pnpm db:deploy         # solo esquema (seguro para Railway)
pnpm db:deploy:demo    # esquema + seed demo explícito
pnpm db:init-empty     # instalación vacía + un admin (INIT_ADMIN_*)
pnpm db:reset-admin    # requiere ALLOW_ADMIN_PASSWORD_RESET=true y ADMIN_PASSWORD
```

## Más

- Plantilla original: [Next.js](https://nextjs.org).
