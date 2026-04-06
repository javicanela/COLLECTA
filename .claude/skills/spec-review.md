---
name: spec-review
description: Revisa specs contra CLAUDE.md y valida completitud de acceptance criteria, column order, y files inventory. Usar después de generar cualquier spec.
user-invocable: true
auto-invocable: false
tools:
  - Read
  - Grep
  - Glob
---

Revisa el spec más reciente en /specs/ y valida:

1. **Acceptance Criteria**: Cada AC debe ser verificable, medible, y tener un verbo de acción ("Cuando el usuario...", "El sistema debe...", "La respuesta incluye...")
2. **Column Order**: Compara EXACTAMENTE contra la sección de column order en CLAUDE.md. Cualquier diferencia es CRÍTICO.
3. **Files Inventory**: Para cada archivo listado, verifica que realmente exista en el repo (o que esté marcado como CREAR si es nuevo).
4. **Dependencies**: Valida que cada dependencia nueva tenga justificación. Si no se necesita, marcar como WARN.
5. **Tasks linkage**: Si existe /specs/tasks/TASKS.md, verifica que cada AC tenga al menos una task vinculada.

Formato de reporte:

## Resultado de Revisión de Spec
| Check | Status | Detalle |
|-------|--------|---------|
| AC completitud | PASS/FAIL | ... |
| Column order | PASS/FAIL | ... |
| Files existen | PASS/FAIL | ... |
| Deps justificadas | PASS/FAIL | ... |

Clasificación: CRÍTICO (bloquea avance) / WARN (revisar) / INFO (nota)
