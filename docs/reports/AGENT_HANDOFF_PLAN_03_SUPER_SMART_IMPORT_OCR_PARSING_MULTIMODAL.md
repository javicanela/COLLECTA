# Agent Handoff Plan 03 - Super Smart Import OCR y Parsing Multimodal

## Cuando Enviar Este Archivo Al Agente

Envia este archivo al agente cuando se cumpla una de estas condiciones:

- El Plan 2 de Fase 7 PDF, WhatsApp Media, Email Fallback y Tracking ya fue dirigido y esta en ejecucion.
- El Plan 1 dejo documentada o resuelta la base de pruebas/DB, de modo que este agente pueda correr al menos tests unitarios y builds.
- Necesitas iniciar en paralelo la investigacion y diseno tecnico del diferenciador central de Collecta: Smart Import avanzado.

Este plan puede iniciar en paralelo con Plan 2 porque su primera fase es investigacion y diseno de arquitectura. La implementacion que toque backend, DB o UI debe coordinarse si otro agente esta modificando archivos compartidos.

No envies este archivo antes de confirmar que el agente trabajara en el repo correcto:

```txt
C:\Users\LENOVO\Documents\New project
```

Si el agente pregunta por prioridad, indicar:

```txt
Prioridad muy alta. Smart Import es el diferenciador central de Collecta. La primera entrega obligatoria es investigacion tecnica aplicada antes de instalar librerias o escribir codigo productivo.
```

---

## ROLE

Actua como arquitecto senior de producto e ingenieria para sistemas de document intelligence, OCR, parsing multimodal y automatizacion contable.

Tu trabajo no es solo "leer archivos"; es disenar e implementar la base de una super herramienta de importacion inteligente para Collecta que pueda procesar documentos caoticos de cobranza y contabilidad, extraer datos estructurados, explicar su razonamiento, pedir confirmacion humana y aprender mediante mejoras deterministas.

---

## CONTEXT

Repo local:

```txt
C:\Users\LENOVO\Documents\New project
```

Producto:

- Collecta es un SaaS de cobranza inteligente para despachos contables.
- Smart Import es el diferenciador central del producto.
- Debe permitir cargar Excel/CSV caoticos, multihoja y sin orden, detectar informacion contable y proponer un mapeo a `Client` y `Operation`.

Stack vigente:

- Frontend: React 19, TypeScript, Vite, TailwindCSS.
- Backend: Express 5, TypeScript, Prisma 6.4.1.
- DB oficial: PostgreSQL/Neon.
- Automatizacion: n8n.
- Smart Import: web-first, deterministic-first y provider-agnostic.

Estado actual conocido:

- Ya existe Smart Import determinista para CSV/XLSX:
  - `frontend/src/features/smart-import/domain/*`
  - `frontend/src/features/smart-import/utils/parse-csv.ts`
  - `frontend/src/features/smart-import/utils/parse-workbook.ts`
  - `frontend/src/features/smart-import/components/ImportWizard.tsx`
  - `backend/src/services/smartImport/*`
  - `backend/src/__tests__/smartImportRoutes.test.ts`
- Ya existen detectores, normalizacion, perfiles semanticos, challenge y provider registry base.
- Faltan formatos avanzados: PDF, Word, imagenes, JSON, XML y PDF escaneado con OCR.
- Falta una investigacion seria para elegir arquitectura, librerias, limites de privacidad, rendimiento y escalamiento.

---

## OBJECTIVE

Crear el plan e implementacion inicial de una herramienta avanzada de Smart Import multimodal capaz de:

- Procesar CSV, Excel, PDF textual, PDF escaneado, Word `.docx`, imagenes, JSON y XML.
- Extraer texto, tablas, regiones y metadatos con trazabilidad.
- Ejecutar OCR local cuando el archivo no tenga texto embebido.
- Normalizar datos hacia `Client` y `Operation`.
- Aplicar primero heuristicas deterministas.
- Ejecutar un challenge obligatorio para intentar una interpretacion mas simple, robusta o poderosa.
- Preparar escalamiento opcional a motores externos o locales sin acoplarse a un proveedor.
- Mostrar preview editable antes de commit.
- Mantener privacidad y sanitizacion como restriccion de producto.

---

## FILES TO READ FIRST

Leer primero:

- `AGENTS.md`
- `backend/package.json`
- `frontend/package.json`
- `backend/prisma/schema.prisma`
- `backend/src/index.ts`
- `backend/src/services/smartImport/analyze.ts`
- `backend/src/services/smartImport/commit.ts`
- `backend/src/services/smartImport/schemas.ts`
- `backend/src/services/smartImport/types.ts`
- `backend/src/__tests__/smartImportRoutes.test.ts`
- `frontend/src/features/smart-import/domain/types.ts`
- `frontend/src/features/smart-import/domain/super-identifier.ts`
- `frontend/src/features/smart-import/domain/challenge.ts`
- `frontend/src/features/smart-import/domain/provider-registry.ts`
- `frontend/src/features/smart-import/domain/sanitize-samples.ts`
- `frontend/src/features/smart-import/utils/parse-csv.ts`
- `frontend/src/features/smart-import/utils/parse-workbook.ts`
- `frontend/src/features/smart-import/components/ImportWizard.tsx`
- `frontend/src/features/smart-import/components/PreviewGrid.tsx`
- `frontend/src/features/smart-import/components/MappingReviewTable.tsx`
- `docs/reports/SMART_IMPORT_PHASE_2_MEMORY.md`
- `docs/reports/smart-import-super-identifier.md`
- `docs/PLAN_DEFINITIVO_COLLECTA.md`

---

## CONSTRAINTS

- No tocar `.env`, secretos ni credenciales reales.
- No cambiar `schema.prisma` salvo que sea estrictamente necesario y este justificado.
- No mandar documentos reales a servicios cloud por defecto.
- No acoplar Smart Import a Gemini, Groq, OpenRouter, OpenAI, PaddleOCR cloud o cualquier proveedor especifico.
- Cualquier proveedor debe ser reemplazable mediante interfaz.
- Web-first: priorizar parsing local en navegador cuando sea razonable.
- Deterministic-first: extraer y mapear con reglas locales antes de usar IA.
- Provider-agnostic: si se prepara escalamiento, debe ser por contrato/interfaz.
- Cada analisis debe intentar mejorar o sustituir la interpretacion inicial por una alternativa mas simple, robusta o poderosa antes de pedir accion al usuario.
- No romper importacion CSV/XLSX existente.
- No redisenar toda la UI en esta fase.
- No introducir librerias pesadas sin documentar impacto de bundle/performance.
- No bloquear el hilo principal del navegador con OCR pesado; usar Web Worker o cola asincrona si aplica.

---

## NON-GOALS

- No implementar entrenamiento de modelos propios.
- No implementar OCR cloud obligatorio.
- No construir dashboards de monitoreo en esta fase.
- No hacer commit automatico sin preview editable y confirmacion.
- No reemplazar todo el flujo Smart Import existente.
- No resolver facturacion, pagos ni cobranza automatizada en este plan.

---

## RESEARCH SOURCES TO REVIEW

El agente debe investigar fuentes primarias/oficiales antes de decidir librerias. Usar estas como punto de partida y agregar hallazgos relevantes:

- SheetJS docs para Excel/XLSX parsing:
  - `https://docs.sheetjs.com/docs/api/`
  - `https://docs.sheetjs.com/docs/api/parse-options`
- PapaParse docs para CSV, si se requiere contrastar con parser actual:
  - `https://www.papaparse.com/docs`
- Mozilla PDF.js para PDF en navegador:
  - `https://mozilla.github.io/pdf.js/getting_started/`
  - `https://github.com/mozilla/pdf.js`
- Tesseract.js para OCR local browser/Node:
  - `https://github.com/naptha/tesseract.js`
- Mammoth para `.docx`:
  - `https://www.npmjs.com/package/mammoth`
- fast-xml-parser para XML:
  - `https://www.npmjs.com/package/fast-xml-parser`
- Unstructured open-source partitioning para referencia de arquitectura de document partitioning:
  - `https://docs.unstructured.io/open-source/core-functionality/partitioning`
- Docling como referencia moderna de document conversion/layout/table understanding:
  - `https://docling-project.github.io/docling/`
  - `https://docling-project.github.io/docling/reference/document_converter/`
  - `https://arxiv.org/abs/2408.09869`
- PaddleOCR como referencia para OCR/document parsing avanzado, no como dependencia obligatoria:
  - `https://www.paddleocr.ai/main/en/index/index.html`
  - `https://www.paddleocr.ai/main/en/version3.x/pipeline_usage/OCR.html`
  - `https://arxiv.org/abs/2507.05595`

La investigacion debe responder:

1. Que debe correr en navegador y que debe correr en backend.
2. Que librerias son maduras, mantenidas y compatibles con Vite/React/TypeScript.
3. Como detectar si un PDF tiene texto embebido o necesita OCR.
4. Como extraer tablas o regiones de forma robusta.
5. Como representar salida comun para todos los formatos.
6. Como medir confianza y trazabilidad por campo.
7. Como evitar fuga de datos sensibles.
8. Como manejar archivos grandes sin congelar UI.
9. Que dependencias instalar ahora y cuales dejar como adaptadores futuros.
10. Como probar con fixtures sinteticos y archivos reales anonimizados.

---

## TASK 0: Investigacion Tecnica Obligatoria

Crear:

```txt
docs/reports/SMART_IMPORT_MULTIMODAL_RESEARCH_BRIEF.md
```

El documento debe incluir:

```md
# Smart Import Multimodal Research Brief

## Goal

## Current Collecta Constraints

## Candidate Libraries

| Format | Candidate | Runtime | Pros | Risks | Bundle/Perf Notes | Recommendation |
|---|---|---|---|---|---|---|

## Recommended Architecture

## Browser vs Backend Split

## Privacy And Sanitization Rules

## Performance Strategy

## Testing Strategy

## Initial Implementation Scope

## Deferred Capabilities

## Sources
```

Decision esperada:

- Mantener CSV/XLSX con implementacion actual y extenderla.
- Agregar PDF textual con `pdfjs-dist` o justificar alternativa.
- Agregar OCR local con `tesseract.js` detras de adapter y worker.
- Agregar `.docx` con `mammoth`.
- Agregar XML con `fast-xml-parser`.
- Agregar JSON con parser nativo y validacion `zod`.
- Dejar Docling/PaddleOCR/Unstructured como referencias o adaptadores backend futuros, no dependencia obligatoria inicial, salvo justificacion fuerte.

Prohibido:

- Instalar librerias antes de terminar este brief.
- Implementar OCR cloud obligatorio.
- Copiar texto largo de fuentes.

---

## TASK 1: Definir Modelo Comun De Documento Parseado

Crear:

```txt
frontend/src/features/smart-import/domain/parsed-document.ts
```

Debe definir:

```ts
export type SourceFileKind =
  | 'csv'
  | 'xlsx'
  | 'xls'
  | 'pdf_text'
  | 'pdf_ocr'
  | 'docx'
  | 'image_ocr'
  | 'json'
  | 'xml'
  | 'unknown';

export type ParsedCell = {
  value: string;
  rawValue?: unknown;
  rowIndex: number;
  columnIndex: number;
  confidence: number;
  source: {
    fileName: string;
    sheetName?: string;
    pageNumber?: number;
    regionId?: string;
    extractor: string;
  };
};

export type ParsedTable = {
  id: string;
  label?: string;
  rows: ParsedCell[][];
  confidence: number;
  source: ParsedCell['source'];
};

export type ParsedTextBlock = {
  id: string;
  text: string;
  confidence: number;
  source: ParsedCell['source'];
};

export type ParsedDocument = {
  id: string;
  fileName: string;
  kind: SourceFileKind;
  mimeType?: string;
  sizeBytes: number;
  tables: ParsedTable[];
  textBlocks: ParsedTextBlock[];
  warnings: string[];
  metrics: {
    parseMs: number;
    pages?: number;
    sheets?: number;
    ocrMs?: number;
  };
};
```

Agregar tests:

```txt
frontend/src/features/smart-import/domain/parsed-document.test.ts
```

Cubrir:

- Tipos permiten tabla con trazabilidad.
- Documento sin tablas pero con texto es valido.
- Warnings se preservan.

---

## TASK 2: Crear Router De Extractores Por Tipo De Archivo

Crear:

```txt
frontend/src/features/smart-import/extractors/types.ts
frontend/src/features/smart-import/extractors/detect-file-kind.ts
frontend/src/features/smart-import/extractors/extract-document.ts
```

Contrato:

```ts
import type { ParsedDocument, SourceFileKind } from '../domain/parsed-document';

export type ExtractorContext = {
  maxRowsPreview?: number;
  enableOcr?: boolean;
  signal?: AbortSignal;
};

export type DocumentExtractor = {
  kind: SourceFileKind;
  canHandle(file: File): boolean;
  extract(file: File, context: ExtractorContext): Promise<ParsedDocument>;
};

export async function extractDocument(
  file: File,
  context?: ExtractorContext,
): Promise<ParsedDocument>;
```

Reglas:

- Detectar por extension y MIME.
- Rechazar tipos desconocidos con error claro.
- Permitir cancelar con `AbortSignal` si el extractor lo soporta.
- Medir `parseMs`.

Tests:

- `.csv` enruta a CSV.
- `.xlsx` enruta a workbook.
- `.pdf` enruta a PDF.
- `.docx` enruta a DOCX.
- `.json` enruta a JSON.
- `.xml` enruta a XML.
- `.png/.jpg` enruta a OCR imagen.
- Tipo desconocido devuelve error controlado.

---

## TASK 3: Adaptar CSV/XLSX Existente Al Modelo Comun

Modificar:

```txt
frontend/src/features/smart-import/utils/parse-csv.ts
frontend/src/features/smart-import/utils/parse-workbook.ts
```

Crear extractores:

```txt
frontend/src/features/smart-import/extractors/csv-extractor.ts
frontend/src/features/smart-import/extractors/workbook-extractor.ts
```

Debe:

- Reutilizar parsing actual.
- Convertir filas a `ParsedTable`.
- Preservar `sheetName` en XLSX/XLS/XLSM cuando aplique.
- No romper tests actuales.

Tests:

- CSV fixture actual produce `ParsedDocument.kind = 'csv'`.
- XLSX multihoja produce varias tablas o tablas con `sheetName`.
- Celdas vacias no destruyen indices.

---

## TASK 4: Implementar JSON y XML Extractors

Crear:

```txt
frontend/src/features/smart-import/extractors/json-extractor.ts
frontend/src/features/smart-import/extractors/xml-extractor.ts
```

Dependencia propuesta:

```txt
fast-xml-parser
```

Instalar solo si Task 0 la recomienda:

```powershell
cd frontend
npm install fast-xml-parser
```

JSON:

- Usar parser nativo.
- Aplanar arrays de objetos en tablas.
- Convertir objetos anidados a paths tipo `cliente.rfc`, `operaciones.0.monto`.
- Si JSON es array de objetos, tratarlo como tabla principal.

XML:

- Parsear a objeto.
- Detectar colecciones repetidas.
- Convertir repetidos a tabla.
- Preservar texto completo como `textBlocks` si no hay tabla clara.

Tests:

- JSON array de clientes genera tabla.
- JSON anidado genera columnas por path.
- XML con nodos repetidos genera tabla.
- XML invalido devuelve error controlado.

---

## TASK 5: Implementar DOCX Extractor

Crear:

```txt
frontend/src/features/smart-import/extractors/docx-extractor.ts
```

Dependencia propuesta:

```txt
mammoth
```

Instalar solo si Task 0 la recomienda:

```powershell
cd frontend
npm install mammoth
```

Debe:

- Extraer texto de `.docx`.
- Extraer tablas si Mammoth las conserva como HTML.
- Convertir HTML/table rows a `ParsedTable`.
- Convertir parrafos a `ParsedTextBlock`.
- Agregar warning si el DOCX contiene contenido no convertible.

Tests:

- DOCX simple produce texto.
- DOCX con tabla produce `ParsedTable`.
- DOCX invalido devuelve error controlado.

Si crear fixture `.docx` real es costoso, generar fixture en test con un archivo minimo o documentar fixture manual en `frontend/src/features/smart-import/__fixtures__`.

---

## TASK 6: Implementar PDF Text Extractor

Crear:

```txt
frontend/src/features/smart-import/extractors/pdf-text-extractor.ts
```

Dependencia propuesta:

```txt
pdfjs-dist
```

Instalar solo si Task 0 la recomienda:

```powershell
cd frontend
npm install pdfjs-dist
```

Debe:

- Leer PDF en navegador.
- Extraer texto por pagina.
- Detectar si el texto embebido es suficiente.
- Producir `ParsedTextBlock` por pagina.
- Intentar agrupacion simple de lineas con montos/RFC/fechas en tablas candidatas cuando sea razonable.
- Si el PDF no tiene texto suficiente, devolver warning `PDF_REQUIRES_OCR` y permitir fallback a OCR si `enableOcr=true`.

Tests:

- PDF textual genera bloques por pagina.
- PDF sin texto devuelve warning.
- PDF corrupto devuelve error controlado.

Notas:

- Verificar compatibilidad Vite worker de `pdfjs-dist`.
- Evitar cargar PDFs enormes completos en memoria si se puede paginar.

---

## TASK 7: Implementar OCR Local Para Imagenes y PDF Escaneado

Crear:

```txt
frontend/src/features/smart-import/extractors/ocr-extractor.ts
frontend/src/features/smart-import/workers/ocr.worker.ts
```

Dependencia propuesta:

```txt
tesseract.js
```

Instalar solo si Task 0 la recomienda:

```powershell
cd frontend
npm install tesseract.js
```

Debe:

- Ejecutar OCR local.
- Soportar imagenes `.png`, `.jpg`, `.jpeg`, `.webp`.
- Soportar paginas PDF renderizadas a imagen mediante PDF.js si `enableOcr=true`.
- Ejecutarse en worker o proceso asincrono que no congele UI.
- Reportar progreso al wizard si es viable.
- Usar idiomas iniciales `spa+eng` si el peso/performance lo permite; si no, documentar decision.
- Devolver texto OCR como `ParsedTextBlock`.
- Incluir confianza OCR cuando la libreria la entregue.

Tests:

- Imagen fixture con RFC/monto produce texto.
- OCR disabled devuelve warning controlado.
- Cancelacion con `AbortSignal` no deja promesas colgadas.

Notas:

- No descargar modelos remotos sin documentarlo.
- No mandar imagenes a cloud.
- Documentar costo de bundle/modelos.

---

## TASK 8: Crear Normalizador Multimodal Hacia Smart Import Existente

Crear:

```txt
frontend/src/features/smart-import/domain/parsed-document-to-workbook.ts
frontend/src/features/smart-import/domain/multimodal-analyze.ts
```

Debe:

- Convertir `ParsedDocument` a estructura compatible con `super-identifier.ts`.
- Reutilizar:
  - `semantic-profiles.ts`
  - `table-detection.ts`
  - `header-collapse.ts`
  - `super-identifier.ts`
  - `challenge.ts`
  - `sanitize-samples.ts`
- Mantener el challenge obligatorio.
- Producir candidatos `Client` y `Operation`.
- Adjuntar `source` por campo para explicar de donde salio.

Resultado esperado:

```ts
export type MultimodalImportAnalysis = {
  document: ParsedDocument;
  selectedTableId?: string;
  rows: unknown[];
  mappings: unknown[];
  confidence: number;
  challenge: {
    originalStrategy: string;
    alternativeStrategy: string;
    selectedStrategy: string;
    reasons: string[];
  };
  warnings: string[];
};
```

Tests:

- Parsed CSV conserva comportamiento actual.
- Parsed PDF textual con RFC/monto/fecha propone mapping.
- Parsed JSON array propone clients/operations.
- Challenge puede sustituir interpretacion inicial.

---

## TASK 9: Integrar En ImportWizard Sin Romper Flujo Actual

Modificar:

```txt
frontend/src/features/smart-import/components/ImportWizard.tsx
frontend/src/features/smart-import/components/ImportSummary.tsx
frontend/src/features/smart-import/components/PreviewGrid.tsx
frontend/src/features/smart-import/components/MappingReviewTable.tsx
```

Debe:

- Aceptar nuevos formatos en dropzone/input.
- Mostrar tipo detectado.
- Mostrar progreso para OCR/parsing pesado.
- Mostrar warnings accionables.
- Mantener preview editable.
- Mostrar trazabilidad por campo cuando exista.
- Permitir cancelar OCR/parsing si tarda.
- No convertir la UI en una landing o vista explicativa larga.

Estados UI minimos:

- `idle`
- `reading`
- `extracting_text`
- `ocr_running`
- `analyzing`
- `ready_for_review`
- `error`
- `cancelled`

Tests:

- ImportWizard acepta PDF/DOCX/JSON/XML/imagen.
- Error de formato se muestra sin crash.
- CSV/XLSX actual sigue funcionando.

---

## TASK 10: Backend Compatibility y API Contract

Modificar solo si hace falta:

```txt
backend/src/services/smartImport/schemas.ts
backend/src/services/smartImport/analyze.ts
backend/src/services/smartImport/commit.ts
backend/src/__tests__/smartImportRoutes.test.ts
```

Objetivo:

- Backend debe aceptar payload enriquecido con metadata `source`.
- Backend no debe necesitar recibir archivos binarios en esta fase si el parsing es web-first.
- Commit debe seguir requiriendo confirmacion del usuario.
- No romper `/api/import/analyze` ni `/api/import/commit`.

Tests:

- Payload legacy sigue pasando.
- Payload con `source` pasa validacion.
- Commit ignora metadata no necesaria sin fallar.

---

## TASK 11: Fixtures y Pruebas De Formatos

Crear o ampliar:

```txt
frontend/src/features/smart-import/__fixtures__/
```

Fixtures minimos:

- `sample-clients.csv`
- `sample-workbook.xlsx` o fixture generado existente.
- `sample-clients.json`
- `sample-clients.xml`
- `sample-statement.txt`
- `sample-ocr-image.png` si se puede crear sin binarios enormes.
- `sample-pdf-text.pdf` si se puede crear de forma estable.
- `sample-docx.docx` si se puede crear de forma estable.

Si no conviene versionar binarios:

- Crear generadores de fixture en tests.
- Documentar por que no se versiona el binario.

Pruebas:

```powershell
cd frontend
npm test -- src/features/smart-import
npm run build
```

Si backend se toca:

```powershell
cd backend
npm run build
npx vitest run src/__tests__/smartImportRoutes.test.ts
```

---

## TASK 12: Performance, Privacidad y Seguridad

Crear:

```txt
docs/reports/SMART_IMPORT_MULTIMODAL_SECURITY_PERFORMANCE.md
```

Debe cubrir:

- Max file size recomendado por tipo.
- Estrategia de cancelacion.
- Estrategia Web Worker/OCR.
- Datos que nunca deben salir del navegador sin confirmacion.
- Sanitizacion antes de provider externo.
- Riesgos de XML, incluyendo payloads grandes y expansion maliciosa.
- Riesgos de PDF corrupto o muy grande.
- Politica de retencion local: no persistir archivos importados sin confirmacion.
- Telemetria recomendada sin datos sensibles.

---

## TASK 13: Documentar Handoff Para Futuro Escalamiento IA

Crear:

```txt
docs/reports/SMART_IMPORT_PROVIDER_ESCALATION_PLAN.md
```

Debe:

- Definir interfaz provider-agnostic.
- Describir WebLLM/Ollama/BYOK/cloud como opciones futuras.
- Exigir sanitizacion antes de enviar muestras.
- Definir formato JSON de respuesta esperado.
- Definir fallback si provider falla.
- Prohibir dependencia obligatoria de proveedor.

Contrato sugerido:

```ts
export type SmartImportProviderInput = {
  sanitizedSamples: unknown[];
  candidateMappings: unknown[];
  documentKind: string;
  warnings: string[];
};

export type SmartImportProviderOutput = {
  mappings: unknown[];
  confidence: number;
  reasoningSummary: string;
  risks: string[];
};
```

---

## VERIFICATION REQUIRED

Antes de reportar exito, ejecutar:

```powershell
cd frontend
npm test -- src/features/smart-import
npm run build
```

Si se tocaron rutas/backend:

```powershell
cd backend
npm run build
npx vitest run src/__tests__/smartImportRoutes.test.ts
```

Si se agregaron dependencias:

```powershell
cd frontend
npm audit --omit=dev
```

Si se modificaron docs solamente en alguna subfase:

```powershell
git diff -- docs/reports/SMART_IMPORT_MULTIMODAL_RESEARCH_BRIEF.md
```

Validaciones manuales minimas:

- Cargar CSV existente y confirmar que no hubo regresion.
- Cargar XLSX existente y confirmar preview.
- Cargar JSON simple y confirmar tabla.
- Cargar XML simple y confirmar tabla.
- Cargar PDF textual y confirmar texto extraido.
- Cargar imagen OCR pequena y confirmar texto extraido o warning claro.

---

## SUCCESS CRITERIA

- Existe investigacion tecnica aplicada en `SMART_IMPORT_MULTIMODAL_RESEARCH_BRIEF.md`.
- El agente justifica librerias antes de instalarlas.
- Smart Import acepta al menos JSON y XML en la primera implementacion.
- Smart Import conserva CSV/XLSX actual sin regresion.
- Queda implementado o claramente delimitado PDF textual.
- Queda implementado o claramente delimitado OCR local.
- La salida comun `ParsedDocument` existe y tiene trazabilidad.
- El pipeline reutiliza el superidentificador existente.
- Hay challenge obligatorio antes de pedir accion al usuario.
- Preview editable sigue existiendo antes de commit.
- Tests nuevos cubren extractores y normalizacion.
- Build frontend pasa.
- Backend build pasa si se toca backend.
- No se enviaron documentos a servicios externos.
- No se tocaron secretos reales.

---

## EXPECTED OUTPUT FROM AGENT

El agente debe entregar:

```md
## Files Changed
- ...

## Research Summary
- Librerias investigadas:
- Decision browser/backend:
- Dependencias instaladas:
- Dependencias descartadas:

## Implementation Summary
- ...

## Verification
- `cd frontend && npm test -- src/features/smart-import`: pass/fail
- `cd frontend && npm run build`: pass/fail
- `cd backend && npm run build`: pass/fail, si aplica
- ...

## Manual Checks
- CSV:
- XLSX:
- JSON:
- XML:
- PDF:
- OCR/Image:

## Blockers
- ...

## Residual Risks
- ...

## Secret Safety
- No real secrets or .env files were modified.

## External Data Safety
- No user documents were sent to cloud providers.
```

---

## NOTES FOR THE AGENT

Esta fase debe cuidar mucho el balance entre ambicion y producto real. La meta no es instalar diez librerias y crear deuda tecnica; la meta es fundar una arquitectura extensible que convierta documentos caoticos en datos confiables para cobranza.

La implementacion debe avanzar por capas:

1. Investigacion.
2. Modelo comun.
3. Extractores simples y seguros.
4. Normalizacion hacia Smart Import existente.
5. UI minima.
6. OCR/PDF pesado con worker y limites.
7. Escalamiento provider-agnostic futuro.

Si algo pesado amenaza bundle, rendimiento o estabilidad, dejarlo detras de adapter y documentarlo como siguiente fase.

