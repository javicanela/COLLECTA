# Agent Handoff Plan 02 - Fase 7 PDF, WhatsApp Media, Email Fallback y Tracking

## Cuando Enviar Este Archivo Al Agente

Envia este archivo al siguiente agente cuando se cumpla una de estas condiciones:

- El Plan 1 de base tecnica de pruebas, DB y conectividad ya fue dirigido y esta en ejecucion.
- El agente del Plan 1 confirme que la base local/CI esta lista o que el bloqueo real quedo documentado.
- Necesites que otro agente implemente la Fase 7 sin esperar mas definicion funcional.

No envies este archivo antes de que el agente tenga acceso al repo correcto:

```txt
C:\Users\LENOVO\Documents\New project
```

Si el agente pregunta por prioridad, indicar:

```txt
Prioridad alta. Esta es la unica fase critica del diagnostico que sigue sin implementacion integral.
```

---

## ROLE

Actua como desarrollador backend senior full-stack para Collecta, con foco en flujos de cobranza automatizada, generacion documental y trazabilidad operativa.

---

## CONTEXT

Repo local:

```txt
C:\Users\LENOVO\Documents\New project
```

Collecta es un SaaS de cobranza inteligente para despachos contables.

Stack vigente:

- Backend: Express 5, TypeScript, Prisma 6.4.1, PostgreSQL/Neon.
- Frontend: React 19, TypeScript, Vite.
- PDF backend existente: `backend/src/services/pdfGenerator.ts`.
- PDF route existente: `backend/src/routes/cobranza.ts`.
- WhatsApp media existente: `backend/src/routes/whatsapp.ts`.
- Evolution API service existente: `backend/src/services/evolutionApi.ts`.
- Modelos existentes: `WhatsAppMessage`, `LogEntry`, `Client`, `Operation`.

Hallazgo actual:

- Fase 7 no esta completa.
- Si existe PDF base en backend.
- Si existe endpoint generico de WhatsApp media.
- Falta el flujo integrado: generar PDF, almacenarlo temporalmente, obtener URL accesible, enviar por WhatsApp media, hacer fallback email, registrar tracking, manejar errores y permitir reintentos.

---

## OBJECTIVE

Implementar la Fase 7 completa: generacion automatizada de PDF de estado de cuenta, almacenamiento temporal con URL accesible, envio por WhatsApp media, fallback por email cuando WhatsApp no este disponible, tracking de intentos, errores y reintentos.

---

## FILES TO READ FIRST

Leer primero estos archivos antes de cambiar codigo:

- `AGENTS.md`
- `backend/package.json`
- `backend/prisma/schema.prisma`
- `backend/src/index.ts`
- `backend/src/routes/cobranza.ts`
- `backend/src/routes/whatsapp.ts`
- `backend/src/services/pdfGenerator.ts`
- `backend/src/services/evolutionApi.ts`
- `backend/src/routes/n8n.ts`
- `backend/src/__tests__/whatsapp.test.ts`
- `docs/reports/PHASE_7_MEMORY.md`
- `docs/reports/pdf-generation.md`
- `n8n/workflows/04_cobranza_email_pdf.json`
- `n8n/README.md`

---

## CONSTRAINTS

- No tocar `.env`, secretos ni credenciales reales.
- No romper el endpoint actual `GET /api/cobranza/cliente/:rfc/pdf`.
- No eliminar fallback manual `wa.me`.
- No cambiar branding visible a nombres de clientes.
- No modificar `schema.prisma` salvo que sea necesario para tracking formal.
- Si se modifica Prisma, crear migracion y actualizar tests.
- No integrar proveedores pagados obligatorios.
- Email debe quedar provider-agnostic o SMTP/Resend configurable por variables de entorno.
- Mantener PostgreSQL/Neon como DB oficial.
- No mezclar refactors con features.
- Preservar contratos existentes de API y UI salvo que esta fase requiera ampliarlos.

---

## NON-GOALS

- No implementar OCR.
- No redisenar UI completa.
- No activar proveedor email real con credenciales.
- No subir archivos a nube productiva todavia.
- No cambiar modelo de negocio ni reglas de cobranza.
- No reemplazar Evolution API ni eliminar fallback `wa.me`.

---

## TASK 1: Crear Servicio De Generacion PDF En Buffer

Crear:

```txt
backend/src/services/pdfStatementService.ts
```

Debe exportar:

```ts
generateClientStatementPdfBuffer(clientRfc: string): Promise<{
  buffer: Buffer;
  fileName: string;
  client: Client;
  operations: Operation[];
}>
```

Debe:

- Buscar cliente por RFC.
- Normalizar RFC a mayusculas.
- Incluir operaciones pendientes/no archivadas.
- Reutilizar logica visual/estructural existente de `pdfGenerator.ts` o extraer helper comun si conviene.
- Retornar buffer PDF sin escribir archivo permanente.
- Fallar con error controlado si el cliente no existe.
- Generar un `fileName` estable con RFC y fecha.

Tests requeridos:

- Cliente inexistente devuelve error controlado.
- Cliente con operaciones genera buffer PDF no vacio.
- Nombre de archivo contiene RFC y fecha.

---

## TASK 2: Crear Almacenamiento Temporal Provider-Agnostic

Crear:

```txt
backend/src/services/tempFileStorage.ts
```

Debe exportar:

```ts
storeTemporaryPdf(params: {
  buffer: Buffer;
  fileName: string;
  contentType: string;
}): Promise<{
  url: string;
  expiresAt: Date;
  storageProvider: string;
}>
```

Primera version aceptable:

- Local temporal solo para desarrollo/test.
- Guardar en `backend/tmp/generated-pdfs`.
- Servir archivos desde endpoint controlado.
- No subir archivos a nube todavia.
- No exponer rutas absolutas del sistema.

Preparar interfaz para futuro:

- Supabase Storage.
- S3.
- Vercel Blob.
- Railway volume.

Crear endpoint:

```txt
GET /api/cobranza/media/:token
```

Debe:

- Validar token temporal.
- Devolver PDF con `Content-Type: application/pdf`.
- Expirar URLs.
- No exponer rutas absolutas del sistema.
- Responder `404` si el token no existe.
- Responder `410` si el token expiro.

---

## TASK 3: Crear Servicio De Envio De Estado De Cuenta

Crear:

```txt
backend/src/services/statementDeliveryService.ts
```

Debe exportar:

```ts
type DeliveryResult = {
  success: boolean;
  channel: 'WHATSAPP' | 'EMAIL' | 'MANUAL_FALLBACK';
  clientId: string;
  mediaUrl?: string;
  messageId?: string;
  emailMessageId?: string;
  fallbackWaUrl?: string;
  error?: string;
};

sendStatementToClient(params: {
  clientId?: string;
  rfc?: string;
  channelPreference?: 'WHATSAPP' | 'EMAIL' | 'AUTO';
  operationId?: string;
  requestedBy?: string;
}): Promise<DeliveryResult>
```

Flujo:

1. Resolver cliente por `clientId` o `rfc`.
2. Generar PDF buffer.
3. Guardar temporalmente y obtener URL.
4. Si `channelPreference` es `AUTO` o `WHATSAPP`, intentar WhatsApp media usando Evolution API.
5. Si WhatsApp no esta configurado, falla o cliente no tiene telefono, intentar Email.
6. Si Email tampoco esta disponible, devolver fallback manual con URL PDF y `wa.me`.
7. Registrar cada intento WhatsApp en `WhatsAppMessage`.
8. Registrar todo intento en `LogEntry`.

Reglas:

- Cliente `SUSPENDIDO` no debe recibir envio automatico salvo que se agregue un override explicito y testeado.
- El fallback manual puede incluir `fallbackWaUrl` si hay telefono.
- El resultado debe ser JSON estable para UI y n8n.
- Los errores no deben filtrar secretos ni rutas internas.

---

## TASK 4: Crear Servicio Email Provider-Agnostic

Crear:

```txt
backend/src/services/emailDelivery.ts
```

Primera version:

- Si no hay config por env, devolver `{ configured: false }`.
- Soportar estructura para SMTP o Resend sin obligar instalacion si no se usa.
- No mandar email real en tests.
- Mockear envio en tests.

Debe exportar:

```ts
isEmailConfigured(): boolean;

sendEmailWithAttachment(params: {
  to: string;
  subject: string;
  html: string;
  attachment: {
    fileName: string;
    contentType: string;
    buffer: Buffer;
  };
}): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}>;
```

Variables esperadas documentadas:

```txt
EMAIL_PROVIDER
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
EMAIL_FROM
RESEND_API_KEY
```

Notas:

- No escribir valores reales.
- No asumir que Resend o SMTP estan activos.
- Si se necesita instalar libreria externa, justificarlo y mantenerlo opcional.

---

## TASK 5: Crear Endpoints Backend

Modificar o crear route:

```txt
backend/src/routes/cobranza.ts
```

Agregar:

```txt
POST /api/cobranza/cliente/:rfc/send-statement
POST /api/cobranza/operation/:operationId/send-statement
```

Body:

```json
{
  "channelPreference": "AUTO"
}
```

Respuesta exitosa ejemplo:

```json
{
  "success": true,
  "channel": "WHATSAPP",
  "clientId": "client_id",
  "mediaUrl": "https://example.test/api/cobranza/media/token",
  "messageId": "evolution_message_id"
}
```

Respuesta fallback manual ejemplo:

```json
{
  "success": false,
  "channel": "MANUAL_FALLBACK",
  "clientId": "client_id",
  "mediaUrl": "http://localhost:3001/api/cobranza/media/token",
  "fallbackWaUrl": "https://wa.me/526641234567?text=..."
}
```

Errores:

- `404` cliente/operacion no encontrada.
- `409` cliente suspendido si no hay override.
- `503` sin canales configurados si se decide que fallback manual no cuenta como exito.
- `500` error inesperado controlado.

Requisitos:

- Endpoints protegidos por auth existente.
- No romper `GET /api/cobranza/cliente/:rfc/pdf`.
- Mantener nombres y rutas actuales.

---

## TASK 6: Integrar n8n Workflow 04

Modificar:

```txt
n8n/workflows/04_cobranza_email_pdf.json
n8n/README.md
```

Objetivo:

- Usar endpoint nuevo:

```txt
POST /api/cobranza/cliente/:rfc/send-statement
```

- Mantener `GET /api/cobranza/cliente/:rfc/pdf` como fallback/manual.
- Documentar header:

```txt
Authorization: Bearer {{$env.API_KEY}}
```

Restricciones:

- No hardcodear secrets.
- No romper nombres de env existentes.
- Mantener workflow compatible con ejecucion local.

---

## TASK 7: Tests Backend

Crear:

```txt
backend/src/__tests__/statementDelivery.test.ts
backend/src/__tests__/cobranzaStatementRoutes.test.ts
```

Cubrir:

1. Genera PDF buffer para cliente existente.
2. Devuelve `404` para RFC inexistente.
3. Si Evolution no configurado y email no configurado, devuelve manual fallback.
4. Si Evolution configurado mockeado, registra `WhatsAppMessage`.
5. Si WhatsApp falla y email configurado mockeado, canal `EMAIL`.
6. Registra `LogEntry` por exito, error y fallback.
7. Endpoint `POST /send-statement` requiere auth.
8. Endpoint responde JSON estable.
9. Cliente suspendido bloquea envio automatico.
10. URL temporal expirada no entrega PDF.

Notas:

- Usar patrones existentes de Vitest.
- Mockear Evolution API y email.
- No depender de credenciales reales.
- Si Plan 1 dejo PostgreSQL test disponible, correr tambien suite completa.

---

## TASK 8: UI Minima De Accion

Modificar si aplica:

```txt
frontend/src/views/DashboardView.tsx
frontend/src/services/operationService.ts
frontend/src/types/index.ts
```

Agregar accion por cliente/operacion:

- Boton o accion: `Enviar estado de cuenta`.
- Mostrar estado: enviando, enviado, fallback manual, error.
- Si respuesta trae `fallbackWaUrl`, abrir o mostrar link manual.
- Si respuesta trae `mediaUrl`, permitir abrir PDF temporal.

Restricciones:

- No redisenar toda la UI todavia.
- No crear nueva arquitectura visual.
- Mantener patrones existentes de servicios y componentes.
- La UI completa se trabajara en un plan posterior.

---

## VERIFICATION REQUIRED

Ejecutar:

```powershell
cd backend
npm run build
npx vitest run src/__tests__/statementDelivery.test.ts
npx vitest run src/__tests__/cobranzaStatementRoutes.test.ts
npx vitest run src/__tests__/whatsapp.test.ts
```

Ejecutar:

```powershell
cd frontend
npm run build
npm test
```

Si Plan 1 ya dejo DB disponible:

```powershell
cd backend
npm run test:full
```

Si se modifica Prisma:

```powershell
cd backend
npx prisma validate
npx prisma generate
```

Si se modifica workflow n8n:

- Validar que `n8n/workflows/04_cobranza_email_pdf.json` sea JSON valido.
- Confirmar que no contenga secretos reales.
- Confirmar que use `Authorization: Bearer {{$env.API_KEY}}`.

---

## SUCCESS CRITERIA

- Existe endpoint backend para enviar estado de cuenta por cliente y operacion.
- PDF se genera en backend como buffer.
- Existe URL temporal controlada para el PDF.
- WhatsApp media se intenta como canal principal.
- Email queda como fallback configurable.
- Si ningun canal automatico funciona, se devuelve fallback manual claro.
- Todo intento queda registrado en `LogEntry`.
- WhatsApp queda registrado en `WhatsAppMessage`.
- n8n usa el nuevo endpoint.
- Tests backend nuevos cubren exito, error y fallback.
- Build frontend/backend pasa.
- No se tocaron secretos reales.
- No se rompio `GET /api/cobranza/cliente/:rfc/pdf`.

---

## EXPECTED OUTPUT FROM AGENT

El agente debe entregar:

1. Lista de archivos creados/modificados.
2. Resumen corto de implementacion.
3. Resultado exacto de comandos de verificacion.
4. Bloqueos reales si existen.
5. Riesgos residuales.
6. Confirmacion explicita de que no toco `.env` ni secretos reales.

Formato esperado:

```md
## Files Changed
- ...

## Implementation Summary
- ...

## Verification
- `npm run build`: pass/fail
- ...

## Blockers
- ...

## Residual Risks
- ...

## Secret Safety
- No real secrets or .env files were modified.
```

