# Smart Import Super Identifier Spec

## Objetivo

Smart Import debe permitir que un usuario logueado cargue un Excel/CSV caotico,
con varias hojas y datos sin orden, y aun asi obtenga un mapeo confiable a
Collecta con preview editable antes de guardar.

Esta spec documenta la PR futura. La limpieza actual no implementa la feature.

## Principio central

El escalamiento no es opcional. Cada instruccion de importacion debe intentar
encontrar una alternativa mas simple, robusta o poderosa para sustituir o mejorar
la interpretacion inicial antes de pedir correccion al usuario.

## Flujo obligatorio

1. Parseo local en navegador.
2. Deteccion de hojas, regiones, headers y datos.
3. Mapeo determinista inicial.
4. Challenge obligatorio contra el resultado inicial.
5. Escalamiento al mejor motor disponible:
   - WebLLM o Transformers.js si el navegador soporta WebGPU.
   - Ollama self-host/local si esta configurado.
   - BYOK cloud si el cliente configuro llaves.
   - Fallback determinista si nada superior esta disponible, dejando evidencia.
6. Preview editable.
7. Commit solo tras confirmacion.

## Baseline tecnico

- Excel: SheetJS en navegador.
- CSV: PapaParse en navegador, idealmente worker.
- Validacion: Zod y JSON Schema para contratos.
- Persistencia final: adapter hacia `processImportBatch()` para no romper la ruta
  legacy.

## Salida canonica

Targets principales:

- `client.rfc`
- `client.nombre`
- `client.telefono`
- `client.email`
- `client.regimen`
- `client.categoria`
- `client.asesor`
- `operation.tipo`
- `operation.descripcion`
- `operation.monto`
- `operation.fechaVence`
- `operation.fechaPago`
- `operation.estatus`
- `operation.asesor`
- `operation.excluir`
- `operation.archived`

## Interfaces futuras

### `POST /api/import/analyze`

Recibe muestras normalizadas, no el workbook completo. Debe devolver:

- `analysisId`
- `selectedSheet`
- `selectedRegion`
- `providerUsed`
- `challengeResult`
- confianza global y por campo
- warnings
- razones del mapeo
- preview canonico
- filas adaptadas al contrato legacy

### `POST /api/import/commit`

Recibe filas confirmadas por el usuario y usa adapter hacia `processImportBatch()`.

## Seguridad y privacidad

- No enviar archivos completos a proveedores remotos por defecto.
- BYOK cloud requiere consentimiento/configuracion.
- Saneamiento obligatorio de muestras antes de salir del navegador:
  - RFC parcial.
  - email anonimizado.
  - telefono parcial.
  - nombres truncados o sustituidos.
  - montos y fechas pueden conservarse si son necesarios para inferencia.

## Reglas de UX

- El usuario debe poder arrastrar archivo, ver preview, corregir solo lo incierto
  y confirmar.
- Mostrar defaults que aplicara el backend.
- Nunca hacer commit automatico sin confirmacion.
- Explicar por que una columna fue mapeada.

## No objetivos de esta limpieza

- No crear endpoints nuevos.
- No agregar dependencias nuevas.
- No tocar `schema.prisma`.
- No reemplazar `/api/import/batch`.
