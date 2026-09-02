# Migración EvalIA → EasyPanel

Documento operativo de la migración de infraestructura. No incluye secretos ni datos personales.

**Rama:** `infra/easypanel-migration`  
**Corte de producción:** pendiente de aprobación explícita.  
**Rollback:** Vercel + Railway permanecen intactos.

## 1. Arquitectura

```
                    HTTPS
                      │
              EasyPanel proxy
                      │
                 evalia-web
              (Next.js 16, standalone)
                      │  red interna
                 evalia-postgres
              (PostgreSQL 18, volumen)
```

Preparados para una fase posterior, **no desplegados**:

- `evalia-redis`
- `evalia-worker`

Ver `docker-compose.yml` (servicios comentados).

### Servicios EasyPanel (proyecto `evalia`)

| Servicio | Rol | Persistencia | Exposición |
|----------|-----|--------------|------------|
| `evalia-web` | App Next.js | ninguna | HTTPS (dominio staging) |
| `evalia-postgres` | PostgreSQL 18 | volumen Docker | solo red interna |

Vercel (app) y Railway (app + Postgres) siguen siendo el entorno productivo actual.

## 2. Decisiones de menor riesgo

| Tema | Estado real | Decisión |
|------|-------------|----------|
| Migraciones Prisma | No hay carpeta `prisma/migrations`. El proyecto usa `prisma db push`. | Se mantiene `db push` no destructivo. No se introduce Prisma Migrate en esta oleada. |
| Seed / bootstrap | `instrumentation` + `db:deploy` sembraban demo y **reseteaban** `admin@evalia.app` / `admin`. | Arranque normal: sin seed y sin cambio de contraseñas. Seed solo con `ALLOW_DEMO_SEED=true`. |
| Next.js `output` | Next.js 16 documenta `output: "standalone"`. | Habilitado. Compatible con App Router, sin custom server. |
| Firma webhook | Si faltaba `ELEVENLABS_WEBHOOK_SECRET`, se aceptaba cualquier POST. | Ahora se rechaza. Override local: `ALLOW_UNSIGNED_ELEVENLABS_WEBHOOK=true`. |
| Backups EasyPanel | Solo existe storage **Local Disk**. | Backup diario local + copia verificada fuera del VPS. S3/R2 pendiente de credenciales. |
| Versión Postgres origen | Railway está en **18.6**. | Staging usa `postgres:18` para poder restaurar. |

## 3. Variables

Inventario en `.env.example`. Ningún valor real se versiona.

### Obligatorias

- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_APP_URL`

### Obligatorias para el producto (voz / IA / correo)

- `ELEVENLABS_API_KEY`
- `ELEVENLABS_AGENT_ID`
- `ELEVENLABS_WEBHOOK_SECRET`
- `OPENAI_API_KEY`
- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`

### Opcionales

- `NEXTAUTH_SECRET` (fallback, mismo valor que `AUTH_SECRET`)
- `AUTH_URL` (alias de URL pública)
- `OPENAI_EVAL_MODEL` (default `gpt-4o-mini`)
- `ALLOW_DEMO_SEED` (producción/staging: `false`)
- `DISABLE_DB_BOOTSTRAP` (producción/staging: `1`)
- `ALLOW_UNSIGNED_ELEVENLABS_WEBHOOK` (solo local)
- `ALLOW_ADMIN_PASSWORD_RESET` + `ADMIN_PASSWORD` (manual)
- `INIT_ADMIN_EMAIL` / `INIT_ADMIN_PASSWORD` (instalación vacía)
- `APPLY_SCHEMA_ON_BUILD` (Vercel; default no)
- `PORT`, `HOSTNAME`, `NODE_ENV`

### Inconsistencias detectadas

- `AUTH_SECRET` es canónico; `NEXTAUTH_SECRET` es legado.
- `NEXT_PUBLIC_APP_URL`, `NEXTAUTH_URL` y `AUTH_URL` deben apuntar al mismo origen.
- `getAppBaseUrl()` aún infiere `VERCEL_URL` / `RAILWAY_PUBLIC_DOMAIN` como fallback de rollback.

Staging debe usar el dominio EasyPanel, no `*.vercel.app` ni `*.up.railway.app`.

## 4. Build

Imagen multi-stage (`Dockerfile`):

1. **deps** — `pnpm@9.12.0` + `pnpm install --frozen-lockfile`
2. **builder** — `prisma generate` + `next build` (`output: "standalone"`)
3. **runtime** — usuario `nextjs` (uid 1001), `node server.js`, `HOSTNAME=0.0.0.0`, puerto 3000

No se copian `.env`, `node_modules` de desarrollo ni secretos.

```bash
docker build -t evalia-web .
```

Healthcheck de imagen: `GET /api/health`.

## 5. Deploy

1. Push a `infra/easypanel-migration`.
2. EasyPanel `evalia-web` construye desde GitHub (`ralborta/evalia`, Dockerfile).
3. Auto-deploy **solo** desde esa rama mientras se valida.
4. `main` no apunta al nuevo entorno.
5. Un build fallido no sustituye la revisión saludable (`zeroDowntime: true`, 1 réplica).
6. Rollback: redeploy del commit anterior o cambio de `ref`.

Aplicar esquema (una sola vez, no desde varias réplicas):

```bash
DATABASE_URL="postgresql://..." pnpm db:apply-schema
```

No ejecutar `prisma migrate reset`. No seed automático.

Instalación vacía (no usar en esta migración; la base se restaura):

```bash
INIT_ADMIN_EMAIL="..." INIT_ADMIN_PASSWORD="..." pnpm db:init-empty
```

## 6. Migración de base

Origen: Railway Postgres 18.6 (`yamanote.proxy.rlwy.net`, base `railway`).  
Destino: EasyPanel `evalia-postgres` (imagen `postgres:18`, DB `evalia`, `exposedPort=0`).

Procedimiento:

1. `pg_dump --no-owner --no-acl -Fc` desde el origen (cliente ≥ 18).
2. Verificar tamaño > 0 y `pg_restore -l`.
3. Restaurar en staging.
4. Comparar conteos (sin PII).
5. Quitar cualquier puerto público temporal.

Conteos de origen (2026-09-02, Railway):

| Entidad | Conteo |
|---------|--------|
| User | 3 |
| Candidate | 20 |
| JobPosition | 14 |
| EvaluationProfile | 4 |
| Interview | 20 |
| Evaluation | 13 |
| EvaluationMetric | 171 |
| WebhookEvent | 0 |

## 7. Backups

### Copia verificada fuera del VPS

El dump de origen se guarda en `backups/` (gitignored) en la estación de trabajo. Esa copia **no** vive en el VPS de EasyPanel.

### EasyPanel

- Storage conectado hoy: **Local Disk** (`/etc/easypanel/backups`).
- Programar backup diario de `evalia` con retención ≥ 7.
- Semanal adicional cuando el schedule esté activo.
- **Pendiente:** proveedor S3/R2/B2. Sin credenciales en este entorno no se puede crear `createS3Provider`.

### Restauración

```bash
# custom format
pg_restore --no-owner --no-acl --dbname="$DATABASE_URL" evalia.dump
```

En EasyPanel: `restoreDatabaseBackup` (storage provider + path).

Una restauración no es válida hasta que los conteos coincidan y `GET /api/health` sea 200.

## 8. Health checks

`GET /api/health` (sin autenticación):

```json
{ "status": "ok", "database": "connected" }
```

- 200 si `SELECT 1` responde.
- 503 si la base no está disponible.
- No revela versiones, URLs ni credenciales.

El `Dockerfile` declara `HEALTHCHECK` contra ese endpoint. EasyPanel no expone un campo de health HTTP aparte en `updateAppDeploy`; se usa el healthcheck de la imagen.

## 9. Logs y observabilidad

- Logs de app y deploy: panel EasyPanel → `evalia-web`.
- Reinicio automático: política del servicio (`restart` / enable).
- Límites recomendados (VPS 2 CPU / 8 GB, compartido):
  - `evalia-web`: 1 CPU / 1024 MB
  - `evalia-postgres`: 0.5 CPU / 768 MB
- Alertas nativas de EasyPanel: disco, servicio caído, backup (si el schedule está activo).
- **Sentry:** no está en el repo. Incorporarlo después del corte; no bloquea la migración.

## 10. Staging vs producción

| | Staging EasyPanel | Producción actual |
|--|-------------------|-------------------|
| App | `evalia-web` | Vercel `evalia` + Railway `evalia` |
| DB | `evalia-postgres` (copia restaurada) | Railway Postgres 18.6 |
| URLs | dominio `*.wd75db.easypanel.host` | `evalia.nivel41.com`, `evalia.gsbworld.com` |
| Webhook ElevenLabs | no se cambia | sigue apuntando a Vercel |
| Seed | `ALLOW_DEMO_SEED=false` | no tocar hasta el corte |
| Auto-deploy | rama de migración | `main` → Vercel |

## 11. Rollback

1. DNS de producción permanece en Vercel. No se modifica hasta aprobación.
2. Webhook ElevenLabs permanece en la URL actual.
3. Railway Postgres no se apaga.
4. Si el corte ya ocurrió: revertir DNS, reponer webhook, mantener Vercel/Railway.
5. Datos creados solo en EasyPanel durante el corte se concilian por `id`/`createdAt` (conteos, no PII).
6. Periodo de observación recomendado: **14 días** antes de retirar Vercel/Railway.

## 12. Plan de corte (no ejecutar sin aprobación)

1. Backup final de Railway (custom format, verificado).
2. Poner el origen en mantenimiento breve (o freeze de escrituras).
3. Restaurar copia final en `evalia-postgres`.
4. Validar conteos + `/api/health`.
5. Actualizar `NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL` al dominio productivo.
6. Cambiar DNS.
7. Cambiar webhook ElevenLabs a `https://<prod>/api/webhooks/elevenlabs/post-call`.
8. Observar. No borrar Vercel/Railway.

Tiempo estimado de indisponibilidad: **15–30 minutos** si el dump es del tamaño actual.

## 13. Operaciones habituales

- Redeploy staging: push a `infra/easypanel-migration` o Deploy en el panel.
- Aplicar esquema: `pnpm db:apply-schema` (una réplica / un operador).
- Seed demo: **nunca** en staging/prod.
- Reset admin: `ALLOW_ADMIN_PASSWORD_RESET=true ADMIN_PASSWORD=... pnpm db:reset-admin`.
- Logs: panel EasyPanel.
- Backup manual: `runDatabaseBackup` o `pg_dump` hacia un destino externo.

## 14. Solución de problemas

| Síntoma | Qué revisar |
|---------|-------------|
| `/api/health` 503 | `DATABASE_URL` interno (`evalia-postgres:5432/evalia`), contenedor Postgres up |
| Login no redirige | `NEXTAUTH_URL` / `AUTH_SECRET` / HTTPS |
| Links de entrevista con host Vercel | `NEXT_PUBLIC_APP_URL` mal configurada |
| Webhook 401 | `ELEVENLABS_WEBHOOK_SECRET` y cabecera de firma |
| Build Prisma P1012 | `DATABASE_URL` placeholder solo en build; no hace falta DB real para `generate` |
| Seed inesperado | confirmar `ALLOW_DEMO_SEED=false` y `DISABLE_DB_BOOTSTRAP=1` |
| Imagen grande / falta Prisma | el runtime copia `.prisma` y `@prisma` |

## 15. Pruebas

Tabla actualizada durante la validación de staging. Ver informe final en el PR.

| Prueba | Resultado |
|--------|-----------|
| Build Docker en EasyPanel | pendiente |
| Contenedor web iniciado | pendiente |
| Health 200 | pendiente |
| Postgres interno, sin puerto público | `exposedPort=0` (salvo restore controlado) |
| Reinicio sin pérdida de datos | pendiente |
| HTTPS staging | pendiente |
| Login / roles / listados | pendiente |
| Flujo entrevista + webhook | pendiente (sin cambiar webhook de prod) |
| Invitación SMTP con URL de staging | pendiente |
| Backup restaurado y conteos | pendiente |

## 16. Seguridad corregida en esta rama

- El arranque ya no fuerza la contraseña `admin`.
- El seed demo es explícito.
- El webhook no se acepta sin secreto.
- Tokens públicos: `randomBytes(24)` en base64url (192 bits).
- Contenedor web no-root.
- Headers: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: SAMEORIGIN`, `Permissions-Policy` (micrófono permitido en `self` por ElevenLabs).
- `/api/health` no filtra datos sensibles.
- Postgres staging sin exposición pública.
- pgweb/DbGate desactivados en `evalia-postgres`.
