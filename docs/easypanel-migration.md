# Migración EvalIA → EasyPanel

Documento operativo de la migración de infraestructura. No incluye secretos ni datos personales.

**Rama:** `infra/easypanel-migration`  
**Corte de producción:** pendiente de aprobación explícita.  
**Rollback:** Vercel + Railway permanecen intactos. DNS de producción no se toca en esta fase.

## 1. Arquitectura

```
                    HTTPS
                      │
              EasyPanel proxy
                      │
                 evalia-web
         (imagen GHCR, Next.js 16 standalone)
                      │
        ┌─────────────┴──────────────┐
        │ ventana 1 (recomendada)    │  ventana 2 (independiente)
        │ Railway Postgres 18.6      │  evalia-postgres 17.11
        └────────────────────────────┘
```

Preparados para una fase posterior, **no desplegados**: `evalia-redis`, `evalia-worker`.

### Servicios EasyPanel (proyecto `evalia`)

| Servicio | Rol | Persistencia | Exposición |
|----------|-----|--------------|------------|
| `evalia-web` | App Next.js desde `ghcr.io/ralborta/evalia` | ninguna | HTTPS staging |
| `evalia-postgres` | PostgreSQL **17.11** (`postgres:17`) | volumen Docker | solo red interna |

Staging **no** usa PostgreSQL 18. El origen productivo (Railway) sí es 18.6. El restore 18 → 17 ya se validó.

Vercel (app) y Railway (app + Postgres) siguen siendo el entorno productivo actual.

## 2. Decisiones de menor riesgo

| Tema | Estado real | Decisión |
|------|-------------|----------|
| Build | EasyPanel inyectaba **todas** las env como Docker `--build-arg` (secretos en logs). | Build en GitHub Actions → GHCR. EasyPanel solo hace `pull` + runtime env. |
| Secretos en imagen | `NEXT_PUBLIC_*` se inlinéa en el bundle. | La imagen se construye **sin** URL ni secretos. `getAppBaseUrl()` usa `AUTH_URL` / `NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL` de runtime. |
| Migraciones Prisma | No hay `prisma/migrations`. | Se mantiene `db push` no destructivo. |
| Seed / bootstrap | Antes reseteaba `admin@evalia.app`. | Arranque normal: sin seed ni cambio de contraseñas. |
| Firma webhook | Sin secreto se aceptaba cualquier POST. | Fail-closed. Mismo `ELEVENLABS_WEBHOOK_SECRET` en EasyPanel, Vercel y Railway. |
| Backups | Local Disk en el VPS. Railway bucket no disponible (trial). | Disco local + **GCS S3-interop** (`evalia-backups-2026`, región `southamerica-east1`). |
| Postgres staging | Intentos con `postgres:18` no arrancaron en este VPS. | Staging queda en **17.11**. Origen Railway: 18.6. |

## 3. Variables

Inventario en `.env.example`. Ningún valor real se versiona.

### Obligatorias

- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_APP_URL`

### Obligatorias para el producto

- `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `ELEVENLABS_WEBHOOK_SECRET`
- `OPENAI_API_KEY`
- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`

### Opcionales

- `NEXTAUTH_SECRET`, `AUTH_URL`, `OPENAI_EVAL_MODEL` (`gpt-4o-mini`)
- `ALLOW_DEMO_SEED=false`, `DISABLE_DB_BOOTSTRAP=1`
- `ALLOW_UNSIGNED_ELEVENLABS_WEBHOOK` (solo local)

### Dónde está el secreto del webhook (sin valores)

| Destino | Estado | ¿Redeploy? |
|---------|--------|------------|
| EasyPanel `evalia-web` | configurado (runtime) | no hace falta para el secreto |
| Vercel `evalia` Production + Preview | configurado | **no** se disparó redeploy |
| Railway servicio `evalia` | configurado | `skipDeploys=true` (aplica en el próximo deploy) |

Producción actual en `main` solo verifica la firma **si** el secreto está presente. El secreto ya está cargado; ElevenLabs debe firmar con el **mismo** valor en el corte (no se cambia la URL del webhook ahora).

## 4. Build (GitHub Actions → GHCR)

El `Dockerfile` aborta si alguien pasa credenciales de runtime como build-arg (`AUTH_SECRET`, API keys, `DATABASE_URL` real, SMTP, etc.).

Flujo:

1. Push a `infra/easypanel-migration` (o `workflow_dispatch`).
2. `.github/workflows/publish-image.yml` construye en `ubuntu-latest`.
3. Publica `ghcr.io/ralborta/evalia:sha-<corto>`, `:staging` y `:<sha>`.
4. Si existe el secret `EASYPANEL_DEPLOY_URL`, dispara el pull en EasyPanel.

```bash
# local, sin secretos
docker build -t evalia-web .
docker run --rm -p 3000:3000 --env-file .env evalia-web
```

Healthcheck de imagen: `GET /api/health`.

## 5. Deploy

1. EasyPanel `evalia-web` usa **source = image** (`ghcr.io/ralborta/evalia:staging`).
2. Auto-deploy de GitHub en EasyPanel: **desactivado** (evita rebuild con build-args).
3. `main` no apunta a EasyPanel.
4. `zeroDowntime: true`, 1 réplica.
5. Rollback de app: pin de un digest/tag anterior en EasyPanel, sin reconstruir.

Aplicar esquema (una sola vez):

```bash
DATABASE_URL="postgresql://..." pnpm db:apply-schema
```

No ejecutar `prisma migrate reset`. No seed automático.

## 6. Base de datos

| Entorno | Motor | Notas |
|---------|-------|--------|
| Producción actual | Railway PostgreSQL **18.6** | No apagar. Destino de la ventana 1. |
| Staging EasyPanel | `evalia-postgres` **17.11** | Copia restaurada. `exposedPort=0`. |
| Destino ventana 2 | EasyPanel Postgres | Restaurar dump final; no overwrite sin backup verificado. |

Conectividad ventana 1: desde `evalia-web` el proxy Railway (`yamanote.proxy.rlwy.net:41243`) es **alcanzable por TCP**.

Conteos Railway origen (2026-09-02): User 3, Candidate 20, JobPosition 14, EvaluationProfile 4, Interview 20, Evaluation 13, EvaluationMetric 171, WebhookEvent 0.

Conteos staging al hardening (2026-09-02): User 5, Candidate 22, JobPosition 15, EvaluationProfile 4, Interview 22, Evaluation 13 (origen + usuarios/entrevistas de prueba).

## 7. Backups

### Externo (GCS, API S3)

- Proyecto GCP: `evalia-backups-2026`
- Bucket: `evalia-backups-2026` (región `southamerica-east1`)
- Acceso: HMAC de service account (S3-interop). Credenciales **fuera del repo**.
- Helper: `scripts/s3-compat-put.py`

Prueba real (2026-09-02):

1. `pg_dump -Fc` de staging (58 941 bytes, TOC 57).
2. PUT a `evalia/staging/evalia-staging-20260902T151600Z.dump`.
3. GET y `cmp` idéntico.
4. Restore en un Postgres temporal EasyPanel `evalia-pg-restore-test` (17.11).
5. Conteos idénticos: User 5, Candidate 22, JobPosition 15, EvaluationProfile 4, Interview 22, Evaluation 13, EvaluationMetric 171, WebhookEvent 1.
6. Puerto temporal cerrado. Servicio de prueba **destruido**. Staging no se sobrescribió.

EasyPanel `createS3Provider` contra GCS HMAC falló (`Could not connect`: rclone provider Other / `SignatureDoesNotMatch`). Por eso el off-site usa el helper S3, no el schedule nativo de EasyPanel.

### Local VPS (EasyPanel)

- Storage: Local Disk `/etc/easypanel/backups`
- Diario `0 3 * * *` retención 7 (`evalia/daily`)
- Semanal `0 4 * * 0` retención 4 (`evalia/weekly`)

## 8. Health checks

`GET /api/health`: `{ "status": "ok", "database": "connected" }` — 200 / 503. Sin versiones, URLs ni credenciales.

## 9. Staging vs producción

| | Staging EasyPanel | Producción actual |
|--|-------------------|-------------------|
| App | `evalia-web` (imagen GHCR) | Vercel `evalia` + Railway `evalia` |
| DB | `evalia-postgres` 17.11 | Railway Postgres 18.6 |
| URLs | `https://evalia-evalia-web.wd75db.easypanel.host` | `evalia.nivel41.com`, `evalia.gsbworld.com` |
| Webhook ElevenLabs | no se cambia | sigue en Vercel |
| Seed | `ALLOW_DEMO_SEED=false` | no tocar |
| Auto-deploy | GHA → GHCR → pull | `main` → Vercel |

## 10. Rollback

1. DNS de producción permanece en Vercel hasta aprobación.
2. Webhook ElevenLabs permanece en la URL actual.
3. Railway Postgres no se apaga.
4. Si ya ocurrió la ventana 1: revertir DNS (y `DATABASE_URL` si se cambió). Vercel/Railway siguen vivos.
5. Periodo de observación: **14 días** por ventana antes de retirar el origen.

## 11. Plan de corte revisado (dos ventanas)

No ejecutar sin aprobación. **No mezclar** el corte de app y el de base.

### Ventana 1 — solo `evalia-web` (Postgres sigue en Railway)

Objetivo: servir la app desde EasyPanel con la **misma** base productiva.

1. Backup verificado de Railway (custom format) + copia a GCS.
2. En `evalia-web`: `DATABASE_URL` = cadena pública/proxy de Railway (no la interna de EasyPanel).
3. `NEXTAUTH_URL` / `AUTH_URL` / `NEXT_PUBLIC_APP_URL` = dominios productivos.
4. Health 200 contra Railway. Login y un listado de entrevistas.
5. Cambiar DNS de `evalia.nivel41.com` y `evalia.gsbworld.com` al proxy EasyPanel.
6. Webhook ElevenLabs **puede quedarse en Vercel** mientras Vercel y EasyPanel compartan Railway (misma DB). Cambiarlo a EasyPanel solo cuando la app productiva sea EasyPanel de forma estable.
7. Observar. Vercel queda como rollback de app (revertir DNS).

Indisponibilidad estimada: **5–15 min** (DNS + smoke). Sin restore de base.

### Ventana 2 — solo PostgreSQL (app ya en EasyPanel)

Objetivo: mover datos a `evalia-postgres` sin volver a tocar el código.

1. Backup final Railway + GCS. Freeze de escrituras (mantenimiento breve).
2. Restore a `evalia-postgres` (hoy 17.11; upgrade a 18 es opcional y aparte).
3. Conteos + `/api/health`.
4. Cambiar `DATABASE_URL` de `evalia-web` al host interno `evalia-postgres:5432/evalia`.
5. Redeploy/restart de la imagen (sin rebuild).
6. Observar 14 días. Railway Postgres no se borra.

Indisponibilidad estimada: **15–30 min**.

### Lo que no se hace en ninguna ventana sin OK

- Apagar Vercel o Railway.
- `prisma migrate reset` / seed demo.
- Sobrescribir una DB sin dump verificado.
- Cambiar DNS “de paso” mientras se restaura la base.

## 12. Operaciones habituales

- Nueva imagen staging: push a `infra/easypanel-migration` (GHA) o `workflow_dispatch`.
- Aplicar esquema: `pnpm db:apply-schema`.
- Seed demo: nunca en staging/prod.
- Backup off-site: `pg_dump -Fc` + `scripts/s3-compat-put.py put …`.
- Restore de prueba: **nunca** sobre staging/prod; usar un Postgres temporal.

## 13. Solución de problemas

| Síntoma | Qué revisar |
|---------|-------------|
| `/api/health` 503 | `DATABASE_URL` (interno o Railway según la ventana), contenedor Postgres |
| Login no redirige | `NEXTAUTH_URL` / `AUTH_SECRET` / HTTPS |
| Links con host Vercel | `AUTH_URL` / `NEXTAUTH_URL` de runtime |
| Webhook 401 | secreto cargado **y** firma ElevenLabs con el mismo valor |
| EasyPanel rebuild con secretos | source debe ser **image**, no Dockerfile |
| Build local aborta | el Dockerfile rechaza build-args de runtime; es intencional |
| `createS3Provider` Could not connect | GCS HMAC + rclone Other; usar el helper S3 |

## 14. Pruebas

| Prueba | Resultado |
|--------|-----------|
| Build sin secretos (GHA/GHCR) | Pipeline en `.github/workflows/publish-image.yml`. Dockerfile fail-closed. |
| EasyPanel ya no construye el Dockerfile | Auto-deploy GitHub desactivado; source objetivo = imagen GHCR. |
| Health 200 | Aprobado en staging. |
| Postgres 17.11 | `SHOW server_version` = `17.11 (Debian 17.11-1.pgdg13+2)`. |
| TCP EasyPanel → Railway Postgres | Aprobado (`yamanote.proxy.rlwy.net:41243`). |
| Login / roles / listados | Aprobado (usuarios de prueba solo en staging). |
| Backup GCS + restore real | Aprobado. Roundtrip `cmp` ok. Conteos idénticos en DB temporal. Staging intacto. |
| Webhook secreto en 3 plataformas | Configurado. Sin mostrar valor. Sin redeploy de producción. |
| Flujo entrevista E2E | Aprobado en staging (2026-09-02), entrevista `cmtk8wohw0003xxek5c237bsc`. Login EVALUATOR; sesión de voz 200 con `signedUrl` y variables dinámicas; `finish` → `pending_webhook`; webhook sin firma 401; webhook firmado 200; OpenAI `gpt-4o-mini` → informe COMPLETED (70, B1, 14 métricas, resumen visible, página 64 KB). No se mantuvo una llamada WebRTC larga (costo). |
| Logs de **runtime** sin secretos | Aprobado. El riesgo de build-args queda eliminado al no construir en el VPS. |

## 15. Seguridad en esta rama

- Arranque sin reset de `admin`.
- Seed demo explícito.
- Webhook fail-closed.
- Imagen construida fuera del VPS; runtime secrets solo en el panel.
- Tokens públicos: `randomBytes(24)` base64url.
- Contenedor no-root + headers (`nosniff`, referrer, SAMEORIGIN, micrófono `self`).
- Postgres staging sin puerto público (salvo ventanas de dump/restore, luego `exposedPort=0`).
- Backup off-site en GCS, independiente del disco del VPS.
