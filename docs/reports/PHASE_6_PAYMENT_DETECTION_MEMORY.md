# Phase 6 Payment Detection Memory

## 2026-05-04 - Avance 1: localizacion del repo real

- El workspace inicial `C:\Users\LENOVO\Documents\New project` solo contiene `.git` sin `HEAD`, commits ni archivos del backend.
- El codigo real de Collecta fue localizado en `C:\Users\LENOVO\Documents\COLLECTA`.
- Se leyo `AGENTS.md`; stack confirmado: Express 5, TypeScript, Prisma, PostgreSQL/Neon, n8n.
- Cambios previos detectados y preservados:
  - `frontend/package.json`
  - `frontend/package-lock.json`
  - `backend/src/__tests__/n8n.test.ts`
  - `docs/reports/SMART_IMPORT_PHASE_2_MEMORY.md`
- Siguiente avance: inspeccionar schema, rutas, auth, tests existentes y disenar el servicio de deteccion con pruebas primero.

## 2026-05-04 - Avance 2: pruebas rojas de matching

- Se agrego `backend/src/__tests__/paymentDetection.test.ts`.
- Casos cubiertos antes de implementar:
  - match exacto por RFC, monto y fecha;
  - match por tolerancia de monto;
  - evidencia sin match seguro;
  - comprobante duplicado.
- Verificacion RED ejecutada:
  - `npm test -- --run src/__tests__/paymentDetection.test.ts`
  - Resultado esperado: falla porque `../services/paymentDetection` aun no existe.
- Siguiente avance: crear el servicio provider-agnostic con logging en `LogEntry`.

## 2026-05-04 - Avance 3: servicio y rutas backend

- Se agrego `backend/src/services/paymentDetection.ts`.
- Reglas implementadas:
  - RFC normalizado y requerido para match automatico;
  - tolerancia de monto por defecto de `0.50`;
  - ventana de fecha contra vencimiento por defecto de `45` dias;
  - solo operaciones pendientes: sin `fechaPago`, no `PAGADO`, no `excluir`, no `archived`;
  - comprobante duplicado por `receiptId`, `reference`, `sourceMessageId` o huella derivada.
- Todo intento escribe `LogEntry` con `tipo=PAYMENT_DETECTION` y payload JSON con razones.
- `backend/src/routes/n8n.ts` ahora usa el servicio para:
  - `POST /api/n8n/webhook/payment-confirmed` (legacy seguro);
  - `POST /api/n8n/payment-detections`;
  - `GET /api/n8n/payment-review`;
  - `POST /api/n8n/payment-review/confirm`.
- `backend/src/routes/webhooks.ts` ahora puede reenviar mensajes de WhatsApp tipo texto, imagen o documento al flujo de deteccion.
- Siguiente avance: agregar reporte UI de confirmaciones pendientes.

## 2026-05-04 - Avance 4: reporte UI de revision

- Se agrego `frontend/src/services/paymentDetectionService.ts`.
- Se extendio `frontend/src/types/index.ts` con tipos de reporte y candidatos.
- Se agrego `frontend/src/views/PaymentReviewView.tsx` con:
  - conteo de pendientes;
  - evidencia extraida;
  - razones de revision;
  - candidatos pendientes;
  - accion de confirmacion manual.
- Se registro la ruta `/pagos/revision` en `frontend/src/App.tsx`.
- Se agrego el acceso "Pagos" al sidebar en `frontend/src/components/MainLayout.tsx`.
- Siguiente avance: actualizar workflow n8n de deteccion de pagos con `Authorization: Bearer <API_KEY>`.

## 2026-05-04 - Avance 5: workflow n8n

- `n8n/workflows/03_deteccion_pagos_gemini_vision.json` ahora llama a:
  - `POST /api/n8n/payment-detections`.
- El nodo HTTP de Collecta conserva:
  - `Send Headers`;
  - `Authorization: =Bearer {{$env.API_KEY}}`.
- El payload agrega `provider`, `source`, `receiptId` y `rawText` para trazabilidad.
- `n8n/README.md` actualiza el ejemplo curl de deteccion de pago al endpoint provider-agnostic.
- Siguiente avance: verificacion de build/test y documentacion de bloqueos reales.
