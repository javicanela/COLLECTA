# Revisión Rápida de Documentos — README.md vs CLAUDE.md

**Fecha:** 2026-04-29
**Alcance:** Inconsistencias entre README.md y CLAUDE.md (fuente de verdad)
**Estado del proyecto:** No se modificó código. Solo lectura de archivos.

---

## Inconsistencias Encontradas

### 1. Base de datos del Backend — CRÍTICA
| Archivo | Dice | Realidad |
|---|---|---|
| README.md (línea 10) | `Prisma + SQLite` | PostgreSQL (Neon) |
| README.md (línea 36) | `Express + Prisma + SQLite` | Express + Prisma + PostgreSQL |
| README.md (comando `db push`) | "crear/sincronizar SQLite schema" | Sincroniza PostgreSQL |
| CLAUDE.md (sección 2, 4) | PostgreSQL (Neon) | Correcto |

**Evidencia:** `backend/prisma/schema.prisma` línea 6 → `provider = "postgresql"`.

**Impacto:** Alto. Un nuevo desarrollador podría configurar SQLite local y tener un schema incompatible con producción.

---

### 2. Deploy del Backend — IMPORTANTE
| Archivo | Dice |
|---|---|
| README.md (línea 10) | `Docker/VPS` |
| CLAUDE.md (sección 2) | `Railway (Node.js, auto-deploy desde main)` |

**Impacto:** Medio. README sugiere infraestructura propia cuando el deploy real es en Railway.

---

### 3. Deploy de n8n y Evolution API — MEDIO
| Componente | README.md | CLAUDE.md |
|---|---|---|
| n8n | Docker/VPS | self-hosted o n8n Cloud |
| WhatsApp (Evolution API) | Docker/VPS | (sin especificar, servicio externo) |

**Impacto:** Medio. Ambas fuentes son compatibles en espíritu pero README es más específico (y potencialmente desactualizado).

---

### 4. Ubicación de workflows n8n — CONFIRMACIÓN
| Archivo | Dice | Realidad |
|---|---|---|
| README.md (línea 39) | `docs/n8n/` | `n8n/` (directorio raíz) |
| CLAUDE.md (sección 6) | `n8n/workflows/` | Correcto |

**Evidencia:** Los 4 JSON de workflows existen en `n8n/workflows/`. No existe `docs/n8n/`.

**Impacto:** Bajo. Solo afecta la navegación en la estructura.

---

### 5. docker-compose.yml mencionado pero NO existe — BAJO
README.md (línea 43) lista `docker-compose.yml` como parte de la estructura del proyecto.
El archivo no existe en el repositorio (búsqueda confirmada).

**Impacto:** Bajo. Puede confundir a quien busque orquestación Docker.

---

### 6. Detalle de estructura incompleto en README — INFORMATIVO
README.md resume la estructura a 4 líneas por directorio. CLAUDE.md tiene la estructura completa con todos los subdirectorios y archivos clave. No es una inconsistencia per se, pero README omite:
- `n8n/` como directorio raíz
- `data/` con detalle de archivos
- `.claude/` (sí existe en el repo)

---

## Resumen

| # | Inconsistencia | Gravedad | Archivo origen |
|---|---|---|---|
| 1 | Base de datos (SQLite vs PostgreSQL) | Crítica | README.md |
| 2 | Deploy backend (Docker/VPS vs Railway) | Importante | README.md |
| 3 | Deploy n8n/WA (Docker/VPS vs Cloud) | Media | README.md |
| 4 | Ruta n8n workflows (`docs/n8n/` vs `n8n/`) | Baja | README.md |
| 5 | `docker-compose.yml` inexistente | Baja | README.md |
| 6 | Estructura incompleta | Informativo | README.md |

## Conclusión

CLAUDE.md es consistente con el estado real del proyecto. **README.md está desactualizado** y parece ser un documento heredado de una versión anterior del stack (cuando se usaba SQLite y Docker). Se recomienda actualizar README.md para que refleje PostgreSQL/Neon, Railway como deploy target, y la estructura real de carpetas.
