# Smart Import Multimodal Research Brief

Fecha: 2026-05-06

## Goal

Definir la arquitectura inicial para extender Smart Import de Collecta desde
CSV/XLSX hacia documentos multimodales: PDF textual, PDF escaneado, DOCX,
imagenes, JSON y XML.

La meta de esta investigacion no es instalar librerias todavia. La meta es
elegir una ruta incremental que preserve el flujo actual, mantenga privacidad
por defecto, evite bloqueo del navegador y deje adapters reemplazables para
capacidades pesadas.

## Current Collecta Constraints

- Collecta es un SaaS de cobranza inteligente para despachos contables.
- Smart Import es el diferenciador central del producto.
- El flujo debe ser web-first, deterministic-first y provider-agnostic.
- La implementacion actual ya parsea CSV/XLSX en navegador y usa el motor
  determinista de `frontend/src/features/smart-import/domain/`.
- El challenge obligatorio ya existe en `challenge.ts` y se ejecuta desde
  `runSmartImportEscalation()`.
- El backend ya tiene `/api/import/analyze` y `/api/import/commit`, pero en esta
  fase no debe recibir binarios si el parsing puede hacerse localmente.
- No se debe tocar `schema.prisma` para esta fase.
- No se deben enviar archivos reales a servicios cloud por defecto.
- Cualquier provider externo o local debe vivir detras de una interfaz.
- El usuario debe revisar preview editable antes de commit.

Baseline verificado antes del brief:

```powershell
cd frontend
npm test -- src/features/smart-import
# PASS: 12 suites / 27 tests

cd backend
npm test -- smartImport
# PASS: 4 suites / 7 tests
```

## Candidate Libraries

| Format | Candidate | Runtime | Pros | Risks | Bundle/Perf Notes | Recommendation |
|---|---|---|---|---|---|---|
| CSV | PapaParse actual | Browser | Ya instalado, soporta FileReader, delimitador auto, streaming, worker y abort para archivos grandes. | El uso actual no activa worker/streaming; archivos enormes pueden consumir memoria. | Ligero y ya en bundle. Usar `worker`, `step` o `chunk` cuando haya limite real de tamano. | Mantener. Extender adapter hacia `ParsedDocument`; no reemplazar ahora. |
| XLS/XLSX/XLSM | SheetJS `xlsx` 0.20.3 desde tarball oficial | Browser | Soporta lectura desde ArrayBuffer, hojas multiples, XLS legacy y `sheet_to_json` con `header: 1`; es el cambio mas pequeno contra el parser actual. | El npm registry publico sigue en 0.18.5 y reporta vulnerabilidades sin fix en npm; instalar desde URL externa exige decidir si se vendoriza el tarball. XLSM con macros debe tratarse como datos, no ejecutar ni interpretar VBA. | Chunk grande ya existia por parsing de workbooks; evitar expandir hojas completas cuando solo se necesita preview. | Usar `xlsx@https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` para limpiar audit. Siguiente hardening: vendorizar el tarball en `vendor/` si CI no debe depender del CDN. |
| JSON | Parser nativo + validacion local | Browser | Sin dependencia, rapido, seguro si se limita tamano y profundidad. | Objetos muy anidados o arrays enormes pueden bloquear UI. | Costo bundle cero. | Implementar primero. Aplanar paths y detectar arrays de objetos como tablas. |
| XML | `fast-xml-parser` | Browser | Parser/validator usable en Node y web; bundle documentado como pequeno para parser. | XML puede causar payloads enormes, expansion de entidades o estructuras profundamente anidadas. | Parser minificado documentado alrededor de decenas de KB; aun asi correr con limites de bytes/profundidad. | Instalar despues del brief. Usar `XMLValidator` antes de parsear y bloquear archivos grandes. |
| DOCX | `mammoth` | Browser | Convierte DOCX a HTML/texto desde `arrayBuffer`; expone warnings de conversion. | Mammoth advierte que no sanitiza HTML; no debe inyectarse en DOM sin sanitizar. Tablas dependen del HTML producido. | Dependencia moderada. Cargar dinamicamente desde extractor para no penalizar CSV/XLSX. | Instalar despues de JSON/XML. Usar HTML solo como estructura para extraer tablas/texto; no renderizar crudo. |
| PDF textual | `pdfjs-dist` | Browser | Proyecto Mozilla, distribuye display layer y worker; permite texto por pagina y render a canvas para OCR posterior. | Worker/Vite requiere configuracion cuidadosa. Extraccion de tablas PDF es heuristica, no garantizada. | Dependencia pesada. Carga dinamica obligatoria. Limitar paginas/MB y extraer por pagina. | Instalar para PDF textual. Detectar texto embebido antes de OCR. |
| Imagen OCR | `tesseract.js` | Browser worker | OCR local, sin cloud, funciona en browser y Node, usa worker y WebAssembly. | No soporta PDF directamente; modelos de idioma pesan; precision OCR varia mucho. | Pesado por WASM/modelos. No incluir en ruta inicial de CSV/XLSX. | Dejar detras de adapter y worker. Implementar despues de PDF textual si el producto acepta costo. |
| PDF escaneado | `pdfjs-dist` + `tesseract.js` | Browser worker | Renderizar paginas a canvas con PDF.js y reconocer imagenes con Tesseract local. | Muy pesado para CPU/memoria; progreso/cancelacion obligatorios. | Requiere limites estrictos: paginas, DPI, tiempo, memoria. | Diferir hasta que PDF textual este estable; feature flag `enableOcr`. |
| Partitioning avanzado | Unstructured | Backend futuro | Soporta routing por tipo y particiones para muchos formatos, con estrategias PDF/imagen. | Stack Python, dependencias nativas, posible API remota si se configura mal. | No apto para bundle frontend. Mejor como servicio opcional. | Referencia de arquitectura/adaptador backend futuro; no instalar ahora. |
| Document conversion avanzado | Docling | Backend futuro | Modelo comun de conversion y soporte para PDF/DOCX/imagenes/HTML/Markdown. | Python/service boundary; mas infraestructura y pruebas. | No apto para frontend Vite. | Referencia para futuro document intelligence backend; no instalar ahora. |
| OCR/layout avanzado | PaddleOCR | Backend futuro | OCR, layout, tablas y KIE mas avanzados que Tesseract. | Stack pesado, Python/modelos, operaciones e infraestructura. | No apto para primera entrega web-first. | Mantener como opcion backend self-host futura; no dependencia inicial. |

## Recommended Architecture

Crear una capa comun de documento parseado antes de tocar el wizard:

```text
File
  -> detect-file-kind
  -> extractor adapter
  -> ParsedDocument
  -> parsed-document-to-workbook
  -> runSmartImportEscalation()
  -> challenge obligatorio
  -> preview editable
  -> commit confirmado
```

El modelo `ParsedDocument` debe representar tablas, bloques de texto, warnings,
metricas y trazabilidad por celda/bloque. La salida no debe comprometerse con
una libreria concreta. PDF.js, Mammoth, Tesseract y fast-xml-parser deben quedar
detras de extractores intercambiables.

Para reutilizar el motor existente, los extractores de tabla deben convertirse a
`WorkbookSheetSummary[]`. Los documentos sin tabla clara deben generar una tabla
candidata sintetica solo si hay patrones contables suficientes: RFC, monto,
fecha, email, telefono, concepto o estatus.

## Browser vs Backend Split

Browser por defecto:

- CSV con PapaParse.
- XLS/XLSX con SheetJS.
- JSON con parser nativo.
- XML con fast-xml-parser si el tamano esta dentro del limite.
- DOCX con Mammoth mediante `arrayBuffer`.
- PDF textual con PDF.js mediante import dinamico.
- OCR local con Tesseract.js solo si `enableOcr=true`.
- Sanitizacion de muestras antes de cualquier provider.
- Preview editable y confirmacion humana.

Backend solo cuando sea necesario:

- Validar/commitear filas canonicas confirmadas.
- Recibir metadata enriquecida `source` si se requiere trazabilidad en API.
- Ejecutar adapters futuros para Docling, Unstructured o PaddleOCR si un cliente
  necesita archivos muy pesados o layout/table understanding avanzado.
- Nunca recibir binarios por defecto en esta fase.

No recomendado en esta fase:

- OCR cloud obligatorio.
- Enviar PDFs completos a providers.
- Mover todo el parsing al backend antes de validar UX y limites locales.

## Privacy And Sanitization Rules

- Los archivos importados no deben salir del navegador por defecto.
- No persistir archivos originales en localStorage, backend ni logs.
- Sanitizar antes de cualquier provider externo o self-host no local:
  - RFC parcial.
  - email anonimizado.
  - telefono parcial.
  - nombres reemplazados/truncados.
  - conservar montos/fechas solo cuando sean necesarios para inferencia.
- No registrar texto OCR completo en consola ni backend logs.
- DOCX: no renderizar HTML crudo de Mammoth; usarlo como estructura interna y
  extraer texto/tablas.
- XML: validar antes de parsear, imponer limite de tamano, profundidad y numero
  de nodos; rechazar payloads anormalmente grandes.
- PDF: rechazar o advertir cuando exceda paginas/MB; no extraer imagenes
  incrustadas salvo OCR explicitamente habilitado.
- Providers futuros deben recibir `sanitizedSamples`, no archivos completos.

## Performance Strategy

- Mantener ruta CSV/XLSX actual sin importar librerias pesadas en el bundle
  inicial.
- Usar imports dinamicos por extractor:
  - `import('pdfjs-dist')`
  - `import('mammoth')`
  - `import('fast-xml-parser')`
  - `import('tesseract.js')`
- Medir `parseMs` y `ocrMs` por archivo.
- Exponer `AbortSignal` en `ExtractorContext`.
- Usar worker para OCR y, si los CSV reales crecen, activar PapaParse worker o
  streaming por chunks.
- Limites iniciales recomendados:
  - CSV/XLSX: preview maximo 5,000 filas por hoja; advertir si se truncara.
  - JSON/XML: 5 MB iniciales; rechazar profundidad excesiva.
  - DOCX: 10 MB iniciales.
  - PDF textual: 25 paginas o 15 MB iniciales.
  - OCR: 3 paginas PDF o imagenes menores a 5 MB en primera entrega.
- El wizard debe tener estados cancelables: `reading`, `extracting_text`,
  `ocr_running`, `analyzing`, `ready_for_review`, `error`, `cancelled`.

## Testing Strategy

Pruebas por capa:

1. Contrato `ParsedDocument`:
   - Tabla con trazabilidad.
   - Documento sin tablas pero con texto.
   - Warnings preservados.

2. Router de extractores:
   - Detectar CSV, XLSX, XLS, PDF, DOCX, JSON, XML, PNG/JPG y desconocidos.
   - Error controlado para extension/MIME no soportado.
   - Respeto de `AbortSignal` donde aplique.

3. Extractores simples:
   - CSV/XLSX no cambian comportamiento actual.
   - JSON array de objetos genera tabla.
   - JSON anidado genera columnas por path.
   - XML con nodos repetidos genera tabla.
   - XML invalido genera error controlado.

4. Extractores documentales:
   - DOCX simple genera texto.
   - DOCX con tabla genera `ParsedTable`.
   - PDF textual genera bloques por pagina.
   - PDF sin texto suficiente genera warning `PDF_REQUIRES_OCR`.

5. OCR:
   - Imagen pequena sintetica con RFC/monto produce texto o warning claro.
   - OCR disabled no intenta worker.
   - Cancelacion no deja promesas colgadas.

6. Normalizacion:
   - `ParsedDocument` CSV conserva resultado actual.
   - Texto con RFC/monto/fecha propone mapping.
   - Challenge puede confirmar, degradar o sustituir region.

Gates:

```powershell
cd frontend
npm test -- src/features/smart-import
npm run build

cd backend
npm test -- smartImport
npm run build
```

Si se agregan dependencias:

```powershell
cd frontend
npm audit --omit=dev
```

## Initial Implementation Scope

Entrega inicial recomendada despues de este brief:

1. Crear `ParsedDocument` y tests.
2. Crear router de extractores y deteccion por tipo.
3. Adaptar CSV/XLSX existentes al modelo comun.
4. Implementar JSON sin dependencias.
5. Implementar XML con `fast-xml-parser`.
6. Crear normalizador `ParsedDocument -> WorkbookSheetSummary[]`.
7. Integrar al wizard solo para CSV/XLSX/JSON/XML.

PDF, DOCX y OCR deben venir despues de que JSON/XML y la capa comun esten
verificados. Esto reduce riesgo y evita sumar dependencias pesadas antes de que
el contrato comun este probado.

## Deferred Capabilities

- PDF textual con `pdfjs-dist`.
- DOCX con `mammoth`.
- OCR local con `tesseract.js` y worker.
- OCR de PDF escaneado mediante render PDF.js + Tesseract.
- Extraccion robusta de tablas PDF con layout avanzado.
- Servicio backend opcional para Docling, Unstructured o PaddleOCR.
- Providers IA reales para mapeo multimodal.
- Entrenamiento de modelos propios.
- Persistencia de trazabilidad por campo en DB.
- Telemetria avanzada sin datos sensibles.

## Sources

- SheetJS API: https://docs.sheetjs.com/docs/api/
- SheetJS read/parse options: https://docs.sheetjs.com/docs/api/parse-options/
- SheetJS Node installation and 0.20.3 tarball guidance: https://docs.sheetjs.com/docs/getting-started/installation/nodejs/
- PapaParse docs: https://www.papaparse.com/docs
- PDF.js getting started: https://mozilla.github.io/pdf.js/getting_started/
- Tesseract.js README: https://github.com/naptha/tesseract.js
- Mammoth.js README: https://github.com/mwilliamson/mammoth.js
- fast-xml-parser README: https://github.com/NaturalIntelligence/fast-xml-parser
- Unstructured partitioning docs: https://docs.unstructured.io/open-source/core-functionality/partitioning
- Docling DocumentConverter docs: https://docling-project.github.io/docling/reference/document_converter/
- PaddleOCR docs: https://www.paddleocr.ai/main/en/index/index.html
