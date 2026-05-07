# Agent Handoff Plan 04 - Cobranza Automatizada E2E y Conectividad

## Cuando Enviar Este Archivo Al Agente

Envia este archivo al agente cuando se cumpla una de estas condiciones:

- El Plan 02 de PDF, WhatsApp Media, Email Fallback y Tracking ya termino, o el agente de Plan 02 confirmo los endpoints finales disponibles.
- El Plan 03 de Smart Import multimodal ya esta en investigacion o implementacion, pero no bloquea este plan si el flujo CSV/XLSX actual sigue funcionando.
- Necesitas validar el circuito completo de cobranza automatizada de Collecta de extremo a extremo.

No enviar antes de confirmar que el agente trabajara en el repo correcto:

```txt
C:\Users\LENOVO\Documents\New project
```

Si Plan 02 sigue en ejecucion, este agente puede iniciar solo con lectura, diseno de pruebas E2E y preparacion de scripts, pero no debe modificar endpoints de cobranza/PDF/WhatsApp hasta conocer los cambios finales de Plan 02.

Prioridad:

```txt
Muy alta. Este plan demuestra si Collecta funciona como sistema completo: importar datos, generar cobranza, enviar, registrar, detectar pago y reflejar estado en UI.
```

---

## Instruccion Operativa Obligatoria

Al terminar cada bloque implementable:

1. Guardar todos los cambios en disco.
2. Reportar archivos creados/modificados.
3. Ejecutar la verificacion correspondiente.
4. Dejar abiertos los servicios necesarios para prueba manual cuando aplique:
   - Backend API.
   - Frontend Vite.
   - Base de datos test/staging si se levanto con Docker.
   - Ventana/ruta del navegador donde se prueba la funcion.
5. No cerrar servidores de desarrollo si el usuario necesita probar inmediatamente.
6. No hacer commit ni push salvo que el usuario lo pida explicitamente.

Al final de este plan, el agente debe dejar abierto:

```txt
Frontend: http://localhost:<puerto-vite>
Backend health: http://localhost:<puerto-backend>/api/health
Vista principal Collecta: dashboard autenticado
Vista agente: /agente
Vista revision pagos: /pagos/revision
Vista logs: /logs
```

Si usa el navegador integrado de Codex o Browser Use, debe abrir la app en la ventana correspondiente y dejarla lista para pruebas manuales.

---

## ROLE

Actua como lider tecnico senior de QA, integracion y backend/full-stack para sistemas SaaS de cobranza automatizada.

Tu responsabilidad es conectar y probar Collecta como sistema completo, no solo validar funciones aisladas.

---

## CONTEXT

Repo local:

```txt
C:\Users\LENOVO\Documents\New project
```

Producto:

- Collecta es un SaaS de cobranza inteligente para despachos contables.
- El flujo de valor completo es convertir datos contables en acciones de cobranza automatizada, trazables y revisables.

Stack:

- Frontend: React 19, TypeScript, Vite.
- Backend: Express 5, TypeScript, Prisma 6.4.1.
- DB oficial: PostgreSQL/Neon.
- Automatizacion: n8n.
- WhatsApp: Evolution API self-host si no implica costo; `wa.me` como fallback manual.
- PDF/Email: implementado o en implementacion por Plan 02.
- Smart Import: determinista actual y multimodal en Plan 03.

Flujo E2E objetivo:

```txt
Importar datos
→ crear clientes/operaciones
→ detectar vencimientos
→ planear cobranza
→ aprobar/ejecutar accion
→ enviar WhatsApp/PDF/email o fallback manual
→ recibir respuesta/comprobante
→ detectar pago
→ marcar operacion pagada
→ registrar auditoria
→ mostrar estado en UI
```

---

## OBJECTIVE

Implementar y verificar el flujo completo de cobranza automatizada de Collecta con pruebas de conectividad, integracion y smoke E2E.

El resultado debe permitir responder con evidencia:

- Que servicios estan conectados.
- Que endpoints funcionan.
- Que flujos requieren configuracion externa.
- Que fallback protege al usuario cuando WhatsApp, email u OCR no estan configurados.
- Que la UI permite probar el proceso completo.

---

## FILES TO READ FIRST

Leer primero:

- `AGENTS.md`
- `README.md`
- `backend/package.json`
- `frontend/package.json`
- `backend/prisma/schema.prisma`
- `backend/src/index.ts`
- `backend/src/middleware/auth.ts`
- `backend/src/routes/auth.ts`
- `backend/src/routes/clients.ts`
- `backend/src/routes/operations.ts`
- `backend/src/routes/import.ts`
- `backend/src/routes/n8n.ts`
- `backend/src/routes/agent.ts`
- `backend/src/routes/whatsapp.ts`
- `backend/src/routes/webhooks.ts`
- `backend/src/routes/cobranza.ts`
- `backend/src/services/agentPlanner.ts`
- `backend/src/services/paymentDetection.ts`
- `backend/src/services/evolutionApi.ts`
- `backend/src/__tests__/phase8.smoke.test.ts`
- `backend/src/__tests__/n8n.test.ts`
- `backend/src/__tests__/paymentDetection.test.ts`
- `backend/src/__tests__/agentPlanner.test.ts`
- `backend/src/__tests__/whatsapp.test.ts`
- `frontend/src/App.tsx`
- `frontend/src/views/DashboardView.tsx`
- `frontend/src/views/AgentView.tsx`
- `frontend/src/views/PaymentReviewView.tsx`
- `frontend/src/views/LogView.tsx`
- `frontend/src/components/MainLayout.tsx`
- `n8n/README.md`
- `n8n/workflows/01_reporte_diario_cartera.json`
- `n8n/workflows/02_cobranza_automatica_whatsapp.json`
- `n8n/workflows/03_deteccion_pagos_gemini_vision.json`
- `n8n/workflows/04_cobranza_email_pdf.json`
- `docs/reports/DIAGNOSTICO_FASES_2026-05-06.md`
- `docs/reports/AGENT_HANDOFF_PLAN_02_FASE_7_PDF_WHATSAPP_EMAIL_TRACKING.md`
- `docs/reports/AGENT_HANDOFF_PLAN_03_SUPER_SMART_IMPORT_OCR_PARSING_MULTIMODAL.md`

---

## CONSTRAINTS

- No tocar `.env`, secretos ni credenciales reales.
- No cambiar `schema.prisma` salvo que sea estrictamente necesario y justificado.
- No eliminar fallback manual `wa.me`.
- No enviar mensajes reales de WhatsApp/email durante tests automatizados.
- No depender de servicios cloud pagados.
- No romper endpoints existentes.
- No hacer commit/push sin instruccion explicita.
- No mezclar rediseño UI completo en este plan.
- No mandar documentos o datos sensibles a providers externos.
- Mantener cambios enfocados en conectividad, flujo E2E, pruebas y pequeños enlaces faltantes.

---

## NON-GOALS

- No implementar OCR multimodal profundo; eso pertenece a Plan 03.
- No implementar Fase 7 desde cero si Plan 02 ya lo hizo; solo integrar/verificar.
- No rediseñar UI completa; eso pertenece al plan posterior de UI-first.
- No configurar cuentas reales de Evolution, SMTP, Resend, Vercel, Railway o Neon.
- No abrir PR ni deploy productivo.

---

## TASK 1: Mapear Contratos E2E Actuales

Crear:

```txt
docs/reports/COBRANZA_E2E_CONTRACT_MAP.md
```

Debe incluir:

```md
# Cobranza E2E Contract Map

## Actors

## Data Objects

## Backend Routes

| Step | Route | Method | Auth | Input | Output | Status |
|---|---|---|---|---|---|---|

## n8n Workflows

## Frontend Views

## External Services

## Known Gaps

## Test Data Requirements
```

Mapear como minimo:

- Auth/login.
- Clientes.
- Operaciones.
- Import analyze/commit.
- Pending collections.
- Agent execution lifecycle.
- WhatsApp status/send/send-media.
- PDF send-statement si Plan 02 ya existe.
- Payment detections.
- Payment review confirm.
- Logs.

---

## TASK 2: Crear Dataset De Prueba E2E

Crear:

```txt
backend/src/__tests__/fixtures/e2eCollectionsFixture.ts
```

Debe exportar datos sinteticos:

```ts
export const e2eClients = [
  {
    rfc: 'E2EA010101AA1',
    nombre: 'Cliente E2E Vencido',
    telefono: '6641234567',
    email: 'vencido@example.test',
  },
  {
    rfc: 'E2EB010101BB2',
    nombre: 'Cliente E2E Hoy',
    telefono: '6647654321',
    email: 'hoy@example.test',
  },
  {
    rfc: 'E2EC010101CC3',
    nombre: 'Cliente E2E Sin Contacto',
    telefono: null,
    email: null,
  },
];
```

Debe incluir operaciones:

- Una vencida.
- Una que vence hoy.
- Una por vencer.
- Una excluida.
- Una pagada.
- Una archivada.

Crear helper:

```ts
export async function seedE2eCollectionsFixture(prisma: PrismaClient): Promise<{
  clients: Record<string, Client>;
  operations: Record<string, Operation>;
}>;
```

Reglas:

- El seed debe ser idempotente.
- Debe limpiar solo datos E2E con prefijo `E2E`, no datos reales.
- No debe correr contra DB productiva.

---

## TASK 3: Crear Smoke E2E Backend

Crear:

```txt
backend/src/__tests__/cobranzaE2E.test.ts
```

Cubrir flujo:

1. Login/API auth funciona.
2. Seed de clientes/operaciones E2E.
3. `GET /api/n8n/pending-collections` devuelve vencidas/hoy/por vencer y excluye pagadas/archivadas/excluidas.
4. `POST /api/agent/start` o endpoint equivalente crea ejecucion.
5. Agent planner genera acciones esperadas sin enviar automaticamente cuando requiere aprobacion.
6. Aprobar una accion cambia estado correctamente.
7. Enviar WhatsApp mockeado registra `WhatsAppMessage` y `LogEntry`.
8. Si Evolution no configurado, devuelve fallback controlado.
9. Si endpoint de Plan 02 existe, enviar estado de cuenta devuelve `WHATSAPP`, `EMAIL` o `MANUAL_FALLBACK`.
10. Simular comprobante/pago via `/api/n8n/payment-detections`.
11. La operacion queda `PAGADO` con `fechaPago`.
12. `GET /api/n8n/payment-review` muestra pendientes cuando match no es seguro.
13. `POST /api/n8n/payment-review/confirm` confirma manualmente.
14. Logs contienen eventos de cobranza, WhatsApp y deteccion de pago.

Notas:

- Mockear Evolution API y email.
- No mandar mensajes reales.
- Si una ruta de Plan 02 no existe todavia, marcar test como pendiente temporal con comentario y documentar en `Known Gaps`.
- Preferir tests reales contra Express app y Prisma test DB.

---

## TASK 4: Crear Healthcheck De Conectividad Backend

Modificar:

```txt
backend/src/index.ts
```

O crear route si el patron local lo sugiere:

```txt
backend/src/routes/health.ts
```

Endpoint:

```txt
GET /api/health
```

Debe responder:

```json
{
  "status": "ok",
  "timestamp": "2026-05-06T00:00:00.000Z",
  "services": {
    "database": "ok",
    "evolution": "configured|not_configured|error",
    "email": "configured|not_configured",
    "n8n": "configured|not_configured",
    "storage": "configured|local|not_configured"
  }
}
```

Reglas:

- No filtrar secrets.
- DB debe hacer query liviano, por ejemplo `SELECT 1`.
- Evolution debe usar status seguro sin lanzar error al cliente.
- Email solo debe reportar configuracion, no enviar email.

Tests:

```txt
backend/src/__tests__/health.test.ts
```

Cubrir:

- Health responde 200.
- No contiene secrets.
- Reporta DB.
- Reporta servicios no configurados sin fallar.

---

## TASK 5: Crear Endpoint De Diagnostico E2E Protegido

Crear:

```txt
backend/src/routes/diagnostics.ts
```

Registrar en `backend/src/index.ts` bajo auth.

Endpoint:

```txt
GET /api/diagnostics/e2e-readiness
```

Debe devolver checklist:

```json
{
  "ready": false,
  "checks": [
    {
      "id": "database",
      "status": "pass",
      "message": "Database reachable"
    },
    {
      "id": "evolution",
      "status": "warn",
      "message": "Evolution API not configured; wa.me fallback available"
    }
  ]
}
```

Checks minimos:

- Database reachable.
- Auth API key/JWT working.
- Pending collections endpoint available.
- WhatsApp status available.
- PDF send-statement endpoint available si Plan 02 existe.
- Payment detection endpoint available.
- n8n workflows present and JSON valid.
- Frontend routes expected.

Tests:

- Requiere auth.
- No filtra secrets.
- Devuelve warnings para integraciones faltantes.

---

## TASK 6: Validar Workflows n8n

Crear:

```txt
backend/src/__tests__/n8nWorkflowsIntegrity.test.ts
```

Debe:

- Parsear los 4 JSON en `n8n/workflows`.
- Verificar que endpoints apunten a rutas existentes o documentadas.
- Verificar que usen `Authorization: Bearer {{$env.API_KEY}}` donde corresponde.
- Verificar que no haya secretos hardcodeados.
- Verificar que workflow 04 use endpoint de Plan 02 si ya existe.

Tambien crear:

```txt
docs/reports/N8N_E2E_CONNECTIVITY_CHECKLIST.md
```

Con:

- Variables requeridas.
- Como probar cada workflow manualmente.
- Comandos curl de backend equivalentes.
- Resultado esperado.

---

## TASK 7: Integrar Estado E2E En UI Sin Rediseñar

Modificar:

```txt
frontend/src/services/api.ts
frontend/src/types/index.ts
frontend/src/views/AgentView.tsx
frontend/src/views/LogView.tsx
frontend/src/components/MainLayout.tsx
```

Crear si conviene:

```txt
frontend/src/services/diagnosticsService.ts
frontend/src/views/SystemReadinessView.tsx
```

Ruta sugerida:

```txt
/sistema/diagnostico
```

Objetivo:

- Mostrar readiness E2E:
  - DB.
  - WhatsApp.
  - Email.
  - PDF storage.
  - n8n.
  - Payment detection.
- Mostrar warnings accionables.
- Boton para refrescar.
- No mostrar secrets.
- No redisenar la app completa.

Si se crea nueva ruta:

- Agregar al sidebar solo si no ensucia demasiado la UI.
- Usar componentes existentes.

Tests/build:

```powershell
cd frontend
npm run build
npm test
```

---

## TASK 8: Crear Scripts De Prueba Manual E2E

Crear:

```txt
docs/reports/COBRANZA_E2E_MANUAL_TEST_SCRIPT.md
```

Debe guiar al usuario paso a paso:

1. Levantar DB test.
2. Levantar backend.
3. Levantar frontend.
4. Login.
5. Importar dataset.
6. Revisar dashboard.
7. Abrir agente.
8. Generar/aprobar accion.
9. Probar envio con Evolution no configurado y validar fallback.
10. Probar envio PDF/email si Plan 02 esta listo.
11. Simular pago.
12. Confirmar cambio a pagado.
13. Revisar logs.
14. Revisar diagnostico de sistema.

Incluir comandos curl:

```powershell
$env:API_KEY='test-api-key'
curl http://localhost:3001/api/health
curl http://localhost:3001/api/n8n/pending-collections -H "Authorization: Bearer $env:API_KEY"
```

No incluir secrets reales.

---

## TASK 9: Abrir Ventanas Para Prueba

Al terminar implementacion y verificacion, iniciar servicios.

Backend:

```powershell
cd backend
npm run dev
```

Frontend:

```powershell
cd frontend
npm run dev
```

Si se usa DB local con Docker:

```powershell
docker compose -f docker-compose.test.yml up -d
```

Dejar abiertas estas rutas en navegador:

```txt
http://localhost:<vite-port>/
http://localhost:<vite-port>/agente
http://localhost:<vite-port>/pagos/revision
http://localhost:<vite-port>/logs
http://localhost:<vite-port>/sistema/diagnostico
http://localhost:<backend-port>/api/health
```

Si la app requiere login, dejarla en pantalla de login o autenticada con credenciales de test documentadas, sin exponer secretos reales.

El reporte final debe indicar:

- Puertos usados.
- Procesos que quedaron corriendo.
- URLs abiertas/listas.
- Cualquier ruta que no exista y por que.

---

## TASK 10: Reporte Final De Conectividad

Crear:

```txt
docs/reports/COBRANZA_E2E_CONNECTIVITY_REPORT.md
```

Debe incluir:

```md
# Cobranza E2E Connectivity Report

## Date

## Environment

## Services

| Service | Status | Evidence | Notes |
|---|---|---|---|

## Automated Tests

## Manual Test Results

## Open Windows / URLs For User Testing

## Known Gaps

## Risks

## Next Actions
```

---

## VERIFICATION REQUIRED

Backend:

```powershell
cd backend
npm run build
npx vitest run src/__tests__/health.test.ts
npx vitest run src/__tests__/n8nWorkflowsIntegrity.test.ts
npx vitest run src/__tests__/cobranzaE2E.test.ts
npx vitest run src/__tests__/paymentDetection.test.ts
npx vitest run src/__tests__/agentPlanner.test.ts
npx vitest run src/__tests__/whatsapp.test.ts
```

Frontend:

```powershell
cd frontend
npm run build
npm test
```

Si Plan 1 dejo DB disponible:

```powershell
cd backend
npm run test:full
```

Manual:

- Abrir frontend.
- Login.
- Revisar dashboard.
- Revisar `/agente`.
- Revisar `/pagos/revision`.
- Revisar `/logs`.
- Revisar `/sistema/diagnostico` si se creo.
- Abrir `/api/health`.

---

## SUCCESS CRITERIA

- Existe mapa de contratos E2E.
- Existe dataset E2E sintetico.
- Existe test backend E2E de cobranza.
- Existe healthcheck `/api/health`.
- Existe diagnostico protegido de readiness o alternativa documentada.
- Workflows n8n validan JSON, auth y ausencia de secretos.
- UI muestra estado minimo de readiness o queda documentada la razon si se difiere.
- Fallbacks se prueban sin mandar mensajes reales.
- Payment detection puede marcar una operacion como pagada.
- Logs registran eventos relevantes.
- Builds backend/frontend pasan.
- Se dejan abiertos los servicios y ventanas/rutas para prueba manual.
- No se tocaron secretos reales.
- No se hicieron commits/push no solicitados.

---

## EXPECTED OUTPUT FROM AGENT

El agente debe entregar:

```md
## Files Changed
- ...

## Implementation Summary
- ...

## Verification
- `cd backend && npm run build`: pass/fail
- `cd backend && npx vitest run src/__tests__/cobranzaE2E.test.ts`: pass/fail
- `cd frontend && npm run build`: pass/fail
- ...

## Manual Testing Setup Left Open
- Backend URL:
- Frontend URL:
- Browser routes opened:
- Processes left running:

## Connectivity Status
- Database:
- Backend:
- Frontend:
- n8n workflows:
- WhatsApp/Evolution:
- PDF/Email:
- Payment detection:

## Blockers
- ...

## Residual Risks
- ...

## Secret Safety
- No real secrets or .env files were modified.

## Git Safety
- No commit or push was performed unless explicitly requested.
```

---

## NOTES FOR THE AGENT

Este plan no termina cuando los tests pasan. Termina cuando el usuario puede abrir la app y probar el flujo.

La prioridad tecnica es trazabilidad:

- Que accion se planeo.
- Quien la aprobo.
- Que canal se intento.
- Que fallo o funciono.
- Que fallback se ofrecio.
- Como se detecto el pago.
- Como quedo registrada la auditoria.

Si un servicio externo no esta configurado, eso no es fallo del producto siempre que exista fallback claro, log y diagnostico visible.

