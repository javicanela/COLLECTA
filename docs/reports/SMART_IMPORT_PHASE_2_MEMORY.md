# Smart Import Phase 2 Memory

## Avance 1 - Orientacion y alcance

Fecha: 2026-05-04

Resumen:
- El `cwd` inicial `C:\Users\LENOVO\Documents\New project` no contenia el codigo del producto.
- El repo operativo encontrado es `C:\Users\LENOVO\Documents\COLLECTA`.
- Se validaron `AGENTS.md`, `docs/specs/smart-import-super-identifier.md`, `docs/PLAN_DEFINITIVO_COLLECTA.md`, scripts de frontend/backend y la importacion legacy.
- El primer avance de implementacion queda acotado a Phase 2A: contratos, fixtures y motor determinista frontend.

Decisiones:
- Mantener Phase 2A sin persistencia backend, sin tocar `schema.prisma` y sin reemplazar `/api/import/batch`.
- Crear el dominio en `frontend/src/features/smart-import/domain/`.
- Agregar un runner de pruebas frontend si es necesario, porque el frontend no tiene script de test vigente.

Riesgos:
- El frontend actual no tiene Vitest configurado; las pruebas de Phase 2A requieren habilitarlo de forma acotada.
- Hay texto legacy con mojibake en varios archivos existentes; Phase 2A evitara refactors de encoding no relacionados.

## Avance 2 - Phase 2A deterministic engine

Fecha: 2026-05-04

Resumen:
- Se creo el dominio `frontend/src/features/smart-import/domain/`.
- Se definieron contratos canonicos para fuentes, hojas, regiones detectadas, perfiles de columna, candidatos de mapeo, analisis, challenge y filas canonicas.
- Se agregaron fixtures caoticos en `frontend/src/features/smart-import/__fixtures__/sample-workbooks.ts`.
- Se implementaron helpers deterministas para normalizacion, detectores RFC/email/telefono/monto/fecha/SAT, deteccion de headers y regiones, colapso de headers multinivel, perfiles semanticos, scoring de mapeos, challenge obligatorio y analisis determinista.
- Se habilito Vitest en frontend con `npm test`.

Verificacion:
- `npm test -- src/features/smart-import/domain`: pasa, 7 suites / 19 tests.
- `npx eslint src/features/smart-import`: pasa.
- `npm run build`: pasa. Vite conserva warning de chunks grandes.
- `npm run lint`: falla por deuda previa fuera de Smart Import, principalmente reglas React Compiler/no-explicit-any en componentes, servicios y vistas existentes.

Decisiones:
- `CanonicalField` usa targets con prefijo `client.*` y `operation.*` para alinear UI futura, backend adapter y spec.
- El challenge siempre se ejecuta y puede confirmar, cambiar region o degradar por conflicto `tipo` vs `descripcion`.
- Phase 2A no toca rutas backend, Prisma ni persistencia legacy.

Riesgos:
- El lint global requiere una fase corta de limpieza tecnica antes de usarlo como gate estricto de CI.
- La UI actual de importacion sigue usando el flujo legacy; el motor nuevo queda listo para integrarse en Phase 2B.

## Avance 3 - Phase 2B parser y preview UI

Fecha: 2026-05-04

Resumen:
- Se agregaron utilidades de parseo local:
  - `frontend/src/features/smart-import/utils/parse-csv.ts`
  - `frontend/src/features/smart-import/utils/parse-workbook.ts`
- Se agrego UI de Smart Import en `/registros` mediante:
  - `ImportWizard.tsx`
  - `SheetSelector.tsx`
  - `MappingReviewTable.tsx`
  - `PreviewGrid.tsx`
  - `ConfidenceBadge.tsx`
  - `ImportSummary.tsx`
- El usuario puede cargar CSV/XLSX, seleccionar hoja/region, revisar challenge, editar destino por columna y ver filas canonicas sin llamar al backend.
- El flujo legacy de importacion queda intacto debajo del nuevo wizard.

Verificacion:
- `npm test -- src/features/smart-import`: pasa, 9 suites / 22 tests.
- `npx eslint src/features/smart-import`: pasa.
- `npm run build`: pasa. Vite conserva warning de chunks grandes.
- Dev server activo en `http://127.0.0.1:5174/registros`; `Invoke-WebRequest` devuelve 200.

Decisiones:
- No se agrego web worker todavia; el parseo se mantiene asincrono por archivo y queda listo para mover a worker si archivos reales muestran bloqueo perceptible.
- No existe boton de commit en esta fase para respetar la regla de no persistir sin Phase 2C.
- Las correcciones manuales viven en estado local del wizard y recalculan el preview canonico.

Riesgos:
- La ruta `/registros` puede requerir login para inspeccion visual completa.
- La UI nueva convive con el importador legacy; Phase 2C debe decidir como se presenta el commit confirmado sin duplicar caminos.

## Avance 4 - Phase 2C backend analyze/commit

Fecha: 2026-05-04

Resumen:
- Se creo `backend/src/services/smartImport/` con tipos, schemas Zod, analyze, commit y adapter legacy.
- Se agregaron endpoints protegidos bajo la ruta existente:
  - `POST /api/import/analyze`
  - `POST /api/import/commit`
- `/api/import/batch` queda intacto.
- `analyze` acepta muestras normalizadas y devuelve `analysisId`, region, mapeos, challenge, provider deterministico, preview canonico y filas adaptadas al contrato legacy.
- `commit` recibe filas canonicas confirmadas, las adapta y delega en `processImportBatch()`.

Verificacion:
- `npm test -- smartImport` en backend: pasa, 4 suites / 7 tests.
- `npm test -- import` en backend: pasa, 4 suites / 7 tests.
- `npm run build` en backend: pasa.

Decisiones:
- El backend implementa un determinista liviano propio para muestras, sin depender de codigo frontend.
- El servicio de commit acepta processor inyectable para probar que llama el contrato legacy sin requerir DB en unit tests.
- Payloads invalidos responden 400 con `{ error: "Validation failed", details: [...] }`.

Riesgos:
- El analyze backend no reemplaza el motor frontend avanzado; por ahora sirve como contrato protegido y respaldo determinista sobre muestras.
- Phase 2D debe unificar evidencia de providers y privacidad para que frontend/backend reporten la misma historia de escalamiento.

## Avance 5 - Phase 2D escalation providers

Fecha: 2026-05-04

Resumen:
- Se agrego arquitectura frontend de escalamiento:
  - `provider-types.ts`
  - `detect-capabilities.ts`
  - `sanitize-samples.ts`
  - `provider-registry.ts`
- El flujo de analisis ahora pasa por `runSmartImportEscalation()`.
- El determinista siempre corre primero y conserva challenge obligatorio.
- La seleccion de motor avanzado evalua, en orden de fuerza configurada: BYOK cloud, Ollama, WebLLM, Transformers.js.
- Los providers avanzados quedan como boundaries/placeholders sin llamadas remotas ni secretos client-side.
- Las muestras se sanitizan antes de cualquier boundary que pudiera salir del navegador.

Verificacion:
- `npm test -- src/features/smart-import` en frontend: pasa, 12 suites / 27 tests.
- `npx eslint src/features/smart-import`: pasa.
- `npm run build` en frontend: pasa. Vite conserva warning de chunks grandes.

Decisiones:
- No se configura ningun proveedor pago por defecto.
- Si no hay motor avanzado disponible, el resultado queda exitoso con `providerUsed: "deterministic"`, `providersAttempted: ["deterministic"]` y warning de fallback.
- Si hay provider avanzado configurado, se registra como intentado, pero por ahora no se ejecuta inferencia externa hasta que exista flujo explicito BYOK/Ollama/WebLLM.

Riesgos:
- La integracion real con WebLLM/Transformers/Ollama/BYOK queda para una fase de providers concretos.
- La sanitizacion es conservadora para muestras; debe revisarse con archivos reales antes de habilitar salida cloud.
