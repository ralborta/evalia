# EvalIA

MVP de entrevistas orales en inglés (motor de voz / conversación) + panel evaluador/agente + informes con IA.

## Despliegue en **Railway** (app + Postgres)

El repo incluye [`railway.json`](./railway.json): en **cada deploy** Railway ejecuta **`pnpm run db:deploy`** (esquema Prisma + **seed** con usuarios demo, admin `admin@evalia.app` / `admin`, entrevistas de prueba, etc.) y luego arranca la app con **`pnpm start`**.

Además, al **arrancar** el servidor Next se ejecuta [`instrumentation.ts`](./instrumentation.ts): si la base **no tiene usuarios**, aplica el seed completo; si ya hay datos, **asegura** la contraseña del admin. Desactivar: `DISABLE_DB_BOOTSTRAP=1`.

1. Crea **PostgreSQL** en Railway y enlaza **`DATABASE_URL`** al servicio web (EvalIA).
2. Variables obligatorias en el servicio **web**: `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL` (URL pública `https://…` de **Railway**, sin `/` final).
3. Haz **redeploy** (o push a `main`). No hace falta correr Prisma desde tu Mac.

Opcional (Vercel): mismas variables con la URL de Vercel si despliegas allí; `railway.json` solo afecta a Railway.

## Despliegue en **Vercel** (app) + **Railway** (solo Postgres)

El repo incluye [`vercel.json`](./vercel.json): el **build** ejecuta [`scripts/vercel-build.sh`](./scripts/vercel-build.sh) vía `pnpm run build:vercel`. Si **`DATABASE_URL` está definida** en el entorno de build: `prisma generate` + **`db push`** + **`db seed`** + `next build`. Si **falta** (error típico P1012), el script usa un placeholder solo para `prisma generate` y **omite** push/seed para que el build no falle; en ese caso debes añadir la variable y redeployar, o ejecutar seed / `db:reset-admin` contra tu Postgres.

**En el proyecto de Vercel → Settings → Environment Variables:**

| Variable | Notas |
|----------|--------|
| `DATABASE_URL` | La misma cadena del Postgres en Railway. Marca **Production** y, si quieres preview builds, **Preview** también. En cada variable, activa **“Available at Build Time”** (o el equivalente en tu UI) para que exista durante `pnpm run build:vercel`, no solo en runtime. |
| `AUTH_SECRET` | Obligatorio (ej. `openssl rand -base64 48`). |
| `NEXTAUTH_URL` | URL pública exacta, ej. `https://tu-app.vercel.app` (sin `/` final). En previews cada URL es distinta: puede fallar auth si no coincide. |
| `NEXT_PUBLIC_APP_URL` | Igual que `NEXTAUTH_URL` en producción. |

Tras guardar variables, **Redeploy** (Deployments → … → Redeploy).

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
