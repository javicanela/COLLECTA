# Session A - Cobranza Hardening Results
Fecha: 2026-05-13 | Branch: codex/plan06-cobranza-hardening

## Bugs Cerrados (6/6)
- Bug 1: Idempotencia webhook (check-then-create por evolutionMsgId)
- Bug 2: parseAmountFromText resistente a fechas, prefiere prefijo monetario
- Bug 3: Ventana temporal previousOutbound (PAYMENT_OUTBOUND_WINDOW_DAYS=60)
- Bug 4: Update WhatsAppMessage.status post-correlacion
- Bug 5: Warning si WEBHOOK_SECRET vacio en production
- Bug 6: AuditTimeline.test.tsx con tests reales + 2 it.skip

## Verificacion
Backend: build PASS | 28 files / 136 tests PASS
Frontend: build PASS | 47 files / 148 PASS / 2 skip

## Archivos tocados
- backend/src/routes/webhooks.ts (Bugs 1,4,5)
- backend/src/services/paymentDetection.ts (Bugs 2,3)
- backend/src/__tests__/webhookIdempotency.test.ts (nuevo)
- backend/src/__tests__/paymentConfirmationCorrelation.test.ts (tests)
- backend/src/__tests__/whatsapp.test.ts (mock + assertion)
- frontend/src/components/audit/AuditTimeline.test.tsx (Bug 6)

## Riesgos
- evolutionMsgId sin @unique en schema
- Orden cronologico y <li> en it.skip
- No se toco schema.prisma ni .env

