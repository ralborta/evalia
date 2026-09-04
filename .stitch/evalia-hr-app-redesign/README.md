# Evalia HR App Redesign (Stitch)

Fuente: Stitch project `projects/1961912175727755137`  
Código bajado vía MCP HTTP (`htmlCode.downloadUrl`). **No regenerado.**

## Port en app (rama `feature/evalia-stitch-ui`)

Ya adaptado al look Stitch (tokens + shell oscuro):

- Shell evaluator (sidebar / header / nav)
- `/dashboard` (Talent Hub)
- `/jobs` + chrome de `/jobs/[id]` + ranking CV
- `/candidates`
- `/applications/[id]` (chrome; paneles CV siguen en isla clara)

Pendiente: entrevistas, perfiles, reportes, voice agents, pipeline kanban full dark.

## Pantallas Stitch → app

| Archivo HTML | Uso |
|---|---|
| `dashboard-principal-talent-hub.html` | Dashboard ✅ |
| `gestion-de-vacantes-and-busquedas-activas.html` | `/jobs` ✅ |
| `detalle-de-vacante-and-pipeline-evalia.html` | `/jobs/[id]` parcial |
| `directorio-de-candidatos-and-scores-evalia.html` | Candidatos ✅ |
| Resto | Pendiente / selectivo |

Omitidas: capturas staging, headshots, logo suelto, “Extracted text…”.
