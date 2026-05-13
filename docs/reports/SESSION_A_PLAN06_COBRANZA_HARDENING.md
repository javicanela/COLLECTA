# Session A - Plan 06 Cobranza Hardening Brief

## Contexto en frio

Eres una sesion paralela de Claude Code (de 3). Tu sola responsabilidad es
cerrar gaps funcionales del Plan 06 (Cobranza E2E) en backend.
NO toques UI/visual salvo el archivo de test ya enumerado.
NO toques middleware de auth: la Sesion B lo posee.
NO crees scripts en `scripts/` ni `backend/scripts/`: la Sesion C los posee.

Antes de empezar:

1. Lee `AGENTS.md` (raiz del repo).
2. Lee `docs/reports/PLAN_CIERRE_TRIPLE_PARALELO.md`.
3. Lee `docs/reports/AGENT_HANDOFF_PLAN_06_FULL_CYCLE_COBRANZA_E2E_REAL.md`.
4. Lee `docs/reports/FULL_CYCLE_COBRANZA_E2E_RESULTS.md`.

## Rama y worktree

```powershell
git worktree add ..\collecta-A-cobranza-hardening -b codex/plan06-cobranza-hardening
cd ..\collecta-A-cobranza-hardening
git status --short
```

## Archivos exclusivos (solo tu)

- `backend/src/routes/webhooks.ts`
- `backend/src/services/paymentDetection.ts`
- `backend/src/__tests__/paymentConfirmationCorrelation.test.ts`
- `backend/src/__tests__/webhookIdempotency.test.ts` (nuevo)
- `frontend/src/components/audit/AuditTimeline.test.tsx`

Cualquier otro archivo: leer si necesitas, no escribir.

## Bugs a parchar

### Bug 1 - Idempotencia de webhook por mensaje
Archivo: `backend/src/routes/webhooks.ts:81-92`

Actualmente `prisma.whatsAppMessage.create` no deduplica. Cambia a logica
"check then create":

```ts
const evolutionId = message.key?.id || null;
if (evolutionId) {
  const existing = await prisma.whatsAppMessage.findFirst({
    where: { evolutionMsgId: evolutionId, direction: 'INCOMING' },
    select: { id: true },
  });
  if (existing) {
    res.json({ received: true, processed: false, reason: 'duplicate_message' });
    return;
  }
}
```

Si el schema lo permite con `@unique` en `evolutionMsgId`, considera `upsert`,
pero NO modifiques `schema.prisma`. Si no hay constraint, la verificacion
manual basta.

Test obligatorio en `backend/src/__tests__/webhookIdempotency.test.ts`:

- POST `/api/webhooks/evolution` dos veces con el mismo `key.id`.
- Primera respuesta: `processed: true`.
- Segunda respuesta: `processed: false, reason: 'duplicate_message'`.
- Solo una fila INCOMING en `WhatsAppMessage`.
- Solo un `LogEntry` `INCOMING`.

### Bug 2 - parseAmountFromText vulnerable a fechas
Archivo: `backend/src/services/paymentDetection.ts:80-87`

Reemplaza `parseAmountFromText` para:

1. Tokenizar el texto.
2. Excluir tokens que empaten patron de fecha (`\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}`).
3. Excluir numeros aislados < 10 (probables ordinales o referencias).
4. Preferir el monto con prefijo monetario (`$`, `MXN`) si existe.
5. Si no hay prefijo, devolver el mayor monto plausible (>= 10).

Agrega cases en `paymentConfirmationCorrelation.test.ts`:

- `"08/10/2026 ya pague 1500"` -> amount = 1500.
- `"$2,300.50 transferido"` -> amount = 2300.5.
- `"ya pague"` sin numero -> amount = null, status `single_open_operation`
  cuando solo hay una operacion abierta.
- `"abone 50, faltan 1500"` -> amount = 1500 (mayor monto plausible).

### Bug 3 - Ventana temporal en previousOutbound
Archivo: `backend/src/services/paymentDetection.ts:347-354`

Agrega filtro `createdAt: { gte: cutoffDate }` con cutoff configurable:

```ts
const PREVIOUS_OUTBOUND_WINDOW_DAYS = Number(
  process.env.PAYMENT_OUTBOUND_WINDOW_DAYS || 60
);
const cutoff = new Date(Date.now() - PREVIOUS_OUTBOUND_WINDOW_DAYS * 86400000);

const previousOutbound = await prisma.whatsAppMessage.findFirst({
  where: {
    clientId: client.id,
    direction: 'OUTGOING',
    phone: { contains: phoneLast10 },
    createdAt: { gte: cutoff },
  },
  orderBy: { createdAt: 'desc' },
});
```

Test: outbound de hace 90 dias + incoming hoy con texto valido =>
`status: REVIEW_REQUIRED, reasons: ['no_previous_outbound_whatsapp']`.

### Bug 4 - Actualizar mensaje entrante con resultado de correlacion
Archivo: `backend/src/routes/webhooks.ts` (despues del bloque de correlacion).

Despues de `correlateIncomingWhatsAppPaymentConfirmation`, si hay resultado
y obtuvimos un `WhatsAppMessage.id` recien creado, actualiza:

```ts
if (incomingMessageRow && paymentCorrelation) {
  await prisma.whatsAppMessage.update({
    where: { id: incomingMessageRow.id },
    data: {
      status: paymentCorrelation.status === 'ACCEPTED'
        ? 'PAYMENT_MATCHED'
        : paymentCorrelation.status === 'DUPLICATE'
        ? 'DUPLICATE'
        : 'REVIEW_REQUIRED',
    },
  });
}
```

Si `WhatsAppMessage.status` es enum estricto en Prisma y los valores no
existen, NO modifiques el schema. En su lugar usa los valores actuales mas
proximos (`RECEIVED`/`PROCESSED`) y agrega un campo derivado `metadata`
solo si existe. Si no existe, deja un comentario `// TODO: extender enum
en proximo schema bump` y omite la mutacion.

### Bug 5 - Warning cuando WEBHOOK_SECRET esta vacio en produccion
Archivo: `backend/src/routes/webhooks.ts:13-24`

```ts
let warnedEmptySecret = false;
function verifyWebhookSecret(req, res, next) {
  if (!WEBHOOK_SECRET) {
    if (!warnedEmptySecret && process.env.NODE_ENV === 'production') {
      warnedEmptySecret = true;
      console.warn('[webhooks] WARNING: WEBHOOK_SECRET vacio en produccion');
    }
    next();
    return;
  }
  // ...resto igual
}
```

NodeBestPractices `~/skills/nodebestpractices/sections/security/` documenta
por que esto debe ser ruidoso una sola vez.

### Bug 6 - AuditTimeline.test.tsx superficial
Archivo: `frontend/src/components/audit/AuditTimeline.test.tsx`

Commit `781d36f` lo relleno solo para desbloquear CI. Reemplaza las
aserciones por tests reales:

- Renderiza un timeline con 3 entradas: outbound WhatsApp, incoming WhatsApp,
  payment_detection ACCEPTED.
- Verifica que el item ACCEPTED muestra `operationId` redactado.
- Verifica que el orden cronologico es descendente.
- Verifica accesibilidad: cada item es un `<li>` con `aria-label` legible.

NO refactorices el componente; si la API actual no expone lo necesario,
documenta el gap en el cuerpo del test con `it.skip` y razon.

## Verificacion

```powershell
cd backend
npm run build
npm run test:full

cd ..\frontend
npm run build
npm test
```

Esperado: PASS en los 4 comandos.

Verificacion adicional manual (sin browser):

```powershell
# Backend up
cd backend
npm run dev
# En otra terminal
curl -X POST http://localhost:3001/api/webhooks/evolution -H "Content-Type: application/json" -d '{\"event\":\"messages.upsert\",\"data\":{\"key\":{\"id\":\"abc-123\",\"remoteJid\":\"5215555555555@s.whatsapp.net\"},\"message\":{\"conversation\":\"ya pague\"}}}'
# Repetir misma curl. Esperado: segunda respuesta processed:false reason:duplicate_message
```

## Entregable

Crear `docs/reports/SESSION_A_COBRANZA_HARDENING_RESULTS.md` con:

- Lista de bugs cerrados (con check) y cualquiera diferido (con razon).
- Comandos ejecutados y resultado.
- Diff resumido por archivo.
- Riesgos residuales.

## Reglas

- No tocar `.env` ni secretos.
- No commit ni push sin peticion explicita.
- No tocar `schema.prisma`.
- No tocar archivos fuera de la lista exclusiva.
- Si necesitas algo de Sesion B (auth) o Sesion C (scripts), documenta el
  bloqueo y continua con lo independiente.
