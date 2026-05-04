# PDF Generation Spec

## Decision

Collecta mantiene dos rutas de PDF:

- Frontend PDF con `@react-pdf/renderer` para preview, descarga y reportes desde
  la web.
- Backend PDF con `pdfkit` para endpoints server-side usados por n8n/email.

Ninguna ruta reemplaza a la otra en esta fase.

## Frontend

Componentes y servicios vigentes:

- `frontend/src/services/pdfService.tsx`
- `frontend/src/components/pdf/`
- `frontend/src/pdf-templates/`
- `frontend/src/views/ConfigView.tsx`
- `frontend/src/views/ExportView.tsx`
- `frontend/src/views/DashboardView.tsx`

Reglas:

- Usar primitivas de `@react-pdf/renderer`.
- No asumir Tailwind dentro del PDF.
- Preview y descarga deben quedar en la web.

## Backend

Endpoint vigente:

- `GET /api/cobranza/cliente/:rfc/pdf`

Archivo:

- `backend/src/routes/cobranza.ts`

Reglas:

- La ruta esta protegida por `requireAuth` desde `backend/src/index.ts`.
- n8n debe llamar con `Authorization: Bearer <API_KEY>`.

## WhatsApp

Enviar PDF por WhatsApp todavia esta pendiente. Opciones futuras:

- Evolution API `send-media` si self-host es viable.
- Email con PDF como flujo alterno.
- Fallback manual si no hay WhatsApp programatico.

No usar `wa.me` como envio automatico de adjuntos; solo sirve para abrir chat con
texto precargado.
