# Plan Definitivo Collecta

## 1. Objetivo del producto

Collecta es un SaaS de cobranza inteligente para despachos contables. Su objetivo
es centralizar clientes, operaciones pendientes, recordatorios, reportes,
automatizaciones, WhatsApp e importacion avanzada de archivos contables.

El atractivo principal de producto sera Smart Import: el usuario inicia sesion,
carga archivos Excel/CSV desordenados, revisa un preview simple y confirma datos
normalizados a Collecta con el menor trabajo manual posible.

## 2. Estado actual validado

| Area | Estado | Evidencia / archivo | Observaciones |
|---|---|---|---|
| Frontend | Existe | `frontend/src/App.tsx` | Rutas dashboard, directorio, registros, exportar, agente, config y logs. |
| Backend | Existe | `backend/src/index.ts` | Express 5 con helmet, rate limit, CORS y rutas protegidas. |
| Base de datos | Existe | `backend/prisma/schema.prisma` | PostgreSQL / Neon es la DB oficial. |
| Auth | Existe | `backend/src/middleware/auth.ts` | JWT o `Authorization: Bearer <API_KEY>`. |
| Clientes | Existe | `Client` y `backend/src/routes/clients.ts` | CRUD protegido por auth. |
| Operaciones | Existe | `Operation` y `backend/src/routes/operations.ts` | Cobranza, pago, excluir y archivar. |
| Logs | Existe | `LogEntry` y `backend/src/routes/logs.ts` | Registro de eventos de cobranza. |
| WhatsApp | Parcial | `backend/src/routes/whatsapp.ts` | Evolution API wrapper existe; uso oficial depende de self-host sin costo de servicio. |
| n8n | Parcial | `n8n/workflows/` | Workflows existen; deben usar auth Bearer para `/api/n8n/*`. |
| Agente autonomo | Parcial | `AgentExecution`, `AgentAction`, `AgentConfig` | Modelos y endpoints existen; falta ejecucion completa validada. |
| PDF | Parcial | `frontend/src/services/pdfService.tsx`, `backend/src/routes/cobranza.ts` | Frontend y backend generan PDF; envio WA requiere integracion posterior. |
| Exportaciones | Existe | `frontend/src/views/ExportView.tsx` | Export XLSX/PDF desde frontend. |
| Reporting | Parcial | Dashboard, export y n8n report | Falta monitoreo y reporting final de SaaS. |
| Deploy | Parcial | `frontend/vercel.json`, docs | Vercel/Railway son target; no tocar secrets en esta fase. |

## 3. Lo que ya existe

- Frontend React con login, dashboard, directorio, registros, exportar, agente,
  configuracion y logs.
- Backend Express con auth, clientes, operaciones, config, logs, import, cobranza,
  n8n, WhatsApp, webhooks y agente.
- Prisma con PostgreSQL como fuente de verdad.
- Workflows n8n para reporte diario, cobranza WhatsApp, deteccion de pagos y email
  con PDF.
- PDF en frontend con `@react-pdf/renderer` y endpoint backend con `pdfkit`.

## 4. Lo que esta parcial

- Smart Import avanzado: existe importacion basica y cascada de providers, pero no
  el superidentificador web-first.
- WhatsApp automatico: wrapper Evolution existe, pero requiere configuracion,
  tracking operativo y decision de self-host gratuito.
- Agente autonomo: modelos y endpoints existen, pero falta flujo completo.
- n8n: los workflows existen, pero la documentacion y headers deben alinearse con
  la autenticacion real.

## 5. Lo que falta

1. Smart Import superidentificador con preview y challenge obligatorio.
2. Estabilizar backend/auth/n8n y documentar contratos.
3. Validar Evolution API self-host y fallback manual `wa.me`.
4. Completar agente autonomo real.
5. Deteccion de pagos desde comprobantes.
6. PDF por WhatsApp/email con tracking.
7. Reporting, exportaciones finales, QA, CI/CD y monitoreo.

## 6. Decisiones tecnicas oficiales

- PostgreSQL/Neon es la DB oficial.
- Prisma schema es la fuente de verdad del modelo.
- `/api/n8n/*` requiere `Authorization: Bearer <API_KEY>` o JWT valido.
- `/api/webhooks/evolution` usa `X-Webhook-Secret` si `EVOLUTION_WEBHOOK_SECRET`
  esta configurado.
- n8n es el orquestador.
- Evolution API solo es oficial si puede self-hostearse sin costo de servicio.
- `wa.me` queda como fallback manual.
- Smart Import es provider-agnostic y debe escalar obligatoriamente al mejor motor
  disponible antes de pedir correccion manual.
- Gemini/Groq/OpenRouter son opcionales/BYOK, no requisitos del SaaS.

## 7. Fases de implementacion

### Fase 1 - Limpieza y documentacion

Objetivo: dejar el repo entendible, sin PC1/PC2 ni agentes locales.

Archivos probables: `README.md`, `AGENTS.md`, `CLAUDE.md`, `docs/*`, `.gitignore`.

Tareas:

- Respaldar artefactos externos.
- Remover `.ai-*` y `.claude/`.
- Reescribir documentacion vigente.
- Crear reporte de limpieza.

Criterios de exito: repo sin artefactos ajenos y docs sin contradicciones.

Riesgos: borrar historico sin backup.

No tocar: logica productiva, secretos, Prisma schema.

### Fase 2 - Smart Import superidentificador

Objetivo: permitir imports Excel/CSV caoticos desde la web.

Archivos probables: nueva feature en `frontend/src/features/smart-import/`,
endpoints paralelos en `backend/src/routes/import-*`, specs y tests.

Tareas:

- Parseo local con SheetJS/PapaParse.
- Deteccion de hojas/regiones/headers.
- Mapeo determinista, challenge obligatorio y escalamiento.
- Preview editable.
- Adapter hacia `processImportBatch()`.

Criterios de exito: el usuario importa CSV/XLSX desordenado con preview y minima
correccion.

Riesgos: meter IA cloud por defecto, enviar datos sensibles sin consentimiento.

No tocar: persistencia legacy sin adapter.

### Fase 3 - Estabilizacion backend/auth/n8n

Objetivo: que automatizaciones usen contratos reales.

Tareas: headers Bearer, ejemplos curl, validacion de workflows y reporte de errores.

No tocar: secrets.

### Fase 4 - WhatsApp Evolution API completo

Objetivo: habilitar WhatsApp programatico si self-host no tiene costo de servicio.

Tareas: confirmar self-host, status, envio texto/media, webhooks, logs y fallback.

No tocar: flujo manual `wa.me` como respaldo.

### Fase 5 - Agente autonomo real

Objetivo: convertir modelos y endpoints en una operacion controlada.

Tareas: planificar ejecuciones, aprobar/cancelar acciones, registrar resultados.

No tocar: envios masivos sin rate limit.

### Fase 6 - Deteccion de pagos

Objetivo: procesar comprobantes y marcar operaciones pagadas.

Tareas: OCR/vision provider-agnostic, confirmacion, tolerancias y logs.

### Fase 7 - PDF por WhatsApp/email

Objetivo: generar y enviar estados de cuenta con tracking.

Tareas: storage temporal, URL segura, Evolution media o email.

### Fase 8 - QA, CI/CD y monitoreo

Objetivo: cerrar calidad de SaaS.

Tareas: builds, tests, smoke tests, observabilidad y deploy pipeline.

## 8. Backlog priorizado

| Prioridad | Tarea | Impacto | Dificultad | Dependencias | Estado |
|---|---|---|---|---|---|
| P0 | Limpieza repo + AGENTS.md | Alto | Baja | Backup externo | En curso |
| P0 | Spec Smart Import | Alto | Media | Research validado | En curso |
| P1 | Smart Import frontend baseline | Muy alto | Alta | Spec | Pendiente |
| P1 | Adapter commit import | Muy alto | Media | Backend actual | Pendiente |
| P1 | n8n auth alignment | Alto | Media | API_KEY/JWT | Pendiente |
| P2 | Evolution self-host validation | Alto | Media | Infra | Pendiente |
| P2 | Agente autonomo real | Alto | Alta | WhatsApp/n8n | Pendiente |
| P3 | Reporting/monitoring | Medio | Media | Datos estables | Pendiente |

## 9. Instrucciones para Codex y Claude Code

- Codex manda mediante `AGENTS.md`.
- Claude Code puede asistir desde terminal, pero no debe crear sistemas locales
  dentro del repo.
- Trabajar por ramas.
- Hacer cambios pequenos.
- No mezclar refactors con features.
- Crear reporte por PR.
- Ejecutar tests/build cuando aplique.
- No tocar secretos.
- No reintroducir PC1/PC2, `.ai-*` ni `.claude/`.

## 10. Definicion de terminado

Una fase termina cuando:

- La documentacion refleja el runtime real.
- Los cambios estan en rama.
- Los builds/tests aplicables fueron ejecutados o el bloqueo quedo documentado.
- No hay secretos tocados.
- Hay reporte de cambios, riesgos y siguiente PR.
