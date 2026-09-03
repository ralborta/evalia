# QA Fase 2 — CV ranking (staging EasyPanel)

Fecha: 2026-09-03. Host: `https://evalia-evalia-web.wd75db.easypanel.host`.

## Resultado

- Script: `scripts/qa-talent-phase2.py`
- Evidencia: `docs/qa-phase2/evidence.json`
- **14/14** pruebas Fase 2 OK (PDF COMPLETED score 54.5, DOCX COMPLETED, escaneado NEEDS_OCR, inválido, duplicado, ranking, VIEWER, aislamiento org, UI).
- Regresión Fase 1: **21/21** OK (`scripts/qa-talent-phase1.py`).

## Imágenes

- Web: `ghcr.io/ralborta/evalia:talent-cv-773a5b9bd7a00b8dd8cb491e76d5815de4196e0a` (tag móvil `talent-cv`)
- Worker: `ghcr.io/ralborta/evalia:talent-cv-worker-773a5b9bd7a00b8dd8cb491e76d5815de4196e0a` (tag móvil `talent-cv-worker`)
- Rollback: `ghcr.io/ralborta/evalia:talent-foundation`

## Notas

- Storage: FS por servicio + espejo Redis `cvdoc:blob:*` (EasyPanel no comparte volúmenes homónimos).
- OCR externo no configurado; escaneados quedan en `NEEDS_OCR`.
- OpenAI: `gpt-4o-mini` para perfil y comparación; score final determinista en código.
