# Phase 3 Backend/Auth/n8n Stabilization Memory

## 2026-05-04 - Avance 1: orientacion y contrato real

- El workspace inicial `C:\Users\LENOVO\Documents\New project` solo contiene `.git` sin `HEAD`.
- El repo operativo de Collecta fue localizado en `C:\Users\LENOVO\Documents\COLLECTA`.
- Backend confirmado:
  - `/api/n8n/*`, `/api/logs` y `/api/cobranza/*` usan `requireAuth`.
  - `/api/webhooks/*` usa auth propia; Evolution se documenta con `X-Webhook-Secret`.
- Brecha encontrada: los workflows n8n llamaban rutas protegidas sin header `Authorization`.

## 2026-05-04 - Avance 2: pruebas y workflows

- Se agrego `backend/src/__tests__/n8n.test.ts` para confirmar que
  `/api/n8n/daily-report` rechaza auth faltante y acepta `API_KEY`.
- Se monto `n8nRoutes` en `backend/src/__tests__/test-app.ts` detras de
  `requireAuth`.
- Se ajusto `backend/src/middleware/auth.ts` para leer `API_KEY` y `JWT_SECRET`
  durante cada request, evitando que tests o bootstraps que configuran env antes
  de montar rutas queden con auth stale.
- Se actualizaron los workflows:
  - `01_reporte_diario_cartera.json`
  - `02_cobranza_automatica_whatsapp.json`
  - `03_deteccion_pagos_gemini_vision.json`
  - `04_cobranza_email_pdf.json`
- Todos los nodos HTTP que llaman `/api/n8n/*`, `/api/logs` o
  `/api/cobranza/*` envian `Authorization: =Bearer {{$env.API_KEY}}`.

## 2026-05-04 - Avance 3: docs y verificacion

- `n8n/README.md` ahora incluye runbook de variables, notas de validacion,
  curl para endpoints backend usados por n8n y contrato `X-Webhook-Secret`.
- `n8n/.env.example` incluye placeholders para `API_KEY` y
  `EVOLUTION_WEBHOOK_SECRET`.
- Verificacion ejecutada:
  - JSON parse de workflows: OK.
  - Validacion automatica de headers protegidos: OK.
  - `npm test -- src/__tests__/n8n.test.ts`: OK.
  - `npm run build`: OK.
  - Busqueda basica de secretos en archivos tocados: OK, solo placeholders/env refs.
- Bloqueos ajenos a Phase 3:
  - `npm test` completo falla sin `DATABASE_URL`; las pruebas de clientes,
    operaciones, payment detection y smoke QA hacen queries reales a Prisma.
