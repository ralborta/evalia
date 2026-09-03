# EvalIA Talent — Fase 2 (CV upload, extracción, ranking explicable)

**Rama:** `feature/evalia-talent-cv-ranking`  
**Base:** Fase 1 (`feature/evalia-talent-foundation`)  
**Ámbito:** staging EasyPanel. Sin DNS, Vercel, Railway prod, ElevenLabs.

## Modelo

| Modelo | Rol |
|--------|-----|
| `CandidateDocument` | CV versionado por candidatura; `sha256` único por org |
| `DocumentExtraction` | Texto extraído (+ flag OCR) |
| `CvStructuredProfile` | Perfil Zod versionado (experiencia, educación, skills…) |
| `CvEvaluation` | Análisis append-only por candidatura; `overallScore` calculado en TS |
| `CvCriterionResult` | Evidencia / status por criterio |
| `CvSuggestedQuestion` | Preguntas de validación |

Estados: `UPLOADED → QUEUED → EXTRACTING → ANALYZING → COMPLETED|FAILED|NEEDS_OCR`.

## Storage

- Backend FS: `CANDIDATE_DOCS_ROOT` (default `/data/candidate-docs`)
- Clave: `org/{organizationId}/doc/{documentId}/{randomHex}`
- Descarga firmada HMAC-SHA256: `/api/documents/{id}/content?exp=&sig=` (`CANDIDATE_DOCS_SIGNING_SECRET`)
- Gancho `maybeAnonymizeForRanking()` listo para anonimización futura

## Cola

- BullMQ cola `cv-processing`, Redis `REDIS_URL`
- Job id: `doc:{documentId}:v{version}` (idempotente)
- Worker: `pnpm worker` · health `:WORKER_HEALTH_PORT/health` (8081)
- Concurrencia: `WORKER_CONCURRENCY` (default 2), 5 reintentos con backoff

## Fórmula de score (determinista)

OpenAI **no** inventa el score final. Propone status / evidencia / `partialScoreSuggestion`.

```
overallScore = sum(partialScore_i * weight_i) / 100   // solo SCORED
```

Excluyentes:

- `MEETS` → PASS
- `DOES_NOT_MEET` → FAIL (inelegible)
- `NOT_FOUND` / `NEEDS_VALIDATION` → UNKNOWN (**NOT_FOUND ≠ DOES_NOT_MEET**)

Ranking: FAIL al final → `overallScore` desc → `createdAt`. Cada fila explica por qué queda respecto al vecino superior.

## Privacidad

No se envía a OpenAI: dirección, foto/base64, edad, género, nacionalidad, docs de identidad, estado civil.  
`redactForOpenAI` limpia emails, teléfonos e IDs. Logs sin texto de CV, PII ni URLs firmadas.

## Migración (aditiva)

```bash
DATABASE_URL=... pnpm db:apply-talent-cv
```

No usa `migrate reset` ni `--accept-data-loss`. Script SQL: `scripts/talent-cv.sql`.

## Imágenes GHCR

| Tag | Target | Uso |
|-----|--------|-----|
| `:talent-cv` | `runner` (web) | Staging Fase 2 |
| `:talent-cv-worker` | `worker` | Proceso BullMQ |
| `:talent-foundation` | web Fase 1 | **Rollback** |

EasyPanel: apuntar web a `:talent-cv` y desplegar un servicio worker con `:talent-cv-worker` + `REDIS_URL` + volumen docs. Revertir web a `:talent-foundation`.

## Variables nuevas

| Env | Uso |
|-----|-----|
| `REDIS_URL` | Cola BullMQ |
| `CANDIDATE_DOCS_ROOT` | Raíz FS |
| `CANDIDATE_DOCS_SIGNING_SECRET` | HMAC de descargas |
| `CANDIDATE_DOC_MAX_BYTES` | Límite (default 8MB) |
| `WORKER_CONCURRENCY` / `WORKER_HEALTH_PORT` | Worker |
| `OCR_PROVIDER_URL` | OCR externo opcional |

## Comandos locales

```bash
pnpm install
pnpm db:apply-talent-cv
pnpm typecheck
pnpm test
pnpm worker   # terminal aparte, con REDIS_URL
```
