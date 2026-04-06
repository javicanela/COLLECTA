---
name: test-ac
description: Ejecuta validación contra los acceptance criteria del spec. Corre tests existentes y reporta cobertura de cada AC.
user-invocable: true
auto-invocable: false
tools:
  - Read
  - Grep
  - Glob
  - Bash
---

Lee /specs/import-feature.md y para cada Acceptance Criteria:

1. Identifica si existe un test automatizado que lo cubra
2. Si existe: ejecútalo y reporta resultado
3. Si no existe: intenta validar manualmente (revisar que el código implementa la lógica)
4. Si no se puede validar: reportar como NOT_TESTABLE con razón

Formato:

## Validación de Acceptance Criteria
| AC | Descripción | Test | Status | Evidencia |
|----|-------------|------|--------|-----------|
| AC-01 | Upload XLSX muestra preview | unit/importPreview.test.ts | PASS | Output del test |
| AC-02 | Column mapping automático | — | NOT_IMPLEMENTED | No existe test ni código |

Resumen: X/Y AC pasan, Z sin implementar, W sin test
