# EvalIA Talent — Fase 1 (cimientos)

**Rama:** `feature/evalia-talent-foundation`  
**Base:** `infra/easypanel-migration` (PR #1)  
**Ámbito:** solo EasyPanel staging. Sin DNS, Vercel, Railway productivo, dominios ni ElevenLabs.

## Modelo

`JobPosition` (entrevistas de idioma) se conserva. Talent añade:

| Modelo | Rol |
|--------|-----|
| `Organization` | Empresa cliente |
| `OrganizationMember` | Usuario ↔ org ↔ rol (`OWNER`, `ADMIN`, `RECRUITER`, `VIEWER`) |
| `Job` | Vacante |
| `Scorecard` + `ScorecardCriterion` | Definición versionada (`familyId` + `version`) |
| `PipelineStage` | Etapas por vacante |
| `Application` | Candidato + vacante. Snapshot de `scorecardId` |
| `ApplicationStageHistory` | Historial append-only |
| `AuditLog` | Actor, acción, entidad, fecha. Sin secretos |

Los registros actuales de entrevistas (`Candidate`, `JobPosition`, `EvaluationProfile`, `Interview`) reciben `organizationId` y se asignan a la org inicial `evalia`.

## Migración (sin reset)

Hoy el proyecto usa `prisma db push`. No hay `prisma/migrations`.

1. Backup verificado de staging (`pg_dump` + `pg_restore -l`).
2. `pnpm db:apply-talent` añade columnas nullable, rellena la org inicial y luego hace `db push` no destructivo.
3. No usar `prisma migrate reset`, `--force-reset` ni `--accept-data-loss`.
4. Transición futura a `migrate`: baseline del schema actual con `prisma migrate diff --from-empty --to-schema-datamodel` y `migrate resolve --applied`. Documentado en `docs/prisma-db-push-to-migrate.md`.

El seed demo **no** se reactiva. Fixtures Talent: `ALLOW_TALENT_STAGING_SEED=true pnpm db:seed-talent-staging`.

## Imagen y rollback

| Tag GHCR | Rama | Uso |
|----------|------|-----|
| `ghcr.io/ralborta/evalia:staging` | `infra/easypanel-migration` | Rollback de infra |
| `ghcr.io/ralborta/evalia:talent-foundation` | esta rama | Staging Talent |
| `ghcr.io/ralborta/evalia:sha-<corto>` | ambas | Pin exacto |

EasyPanel `evalia-web` apunta a `:talent-foundation`. Revertir: volver a `:staging` y redeploy. No se fusiona a `main`.
