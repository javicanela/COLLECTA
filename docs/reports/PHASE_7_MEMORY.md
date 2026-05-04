# Phase 7 Memory

## 2026-05-04 - Avance 1: orientacion

- Workspace revisado: `C:\Users\LENOVO\Documents\New project`.
- Git existe, pero la rama `master` no tiene commits (`git log` falla porque no hay `HEAD`).
- Estado de trabajo: solo existe `PHASE_6_MEMORY.md` sin versionar.
- No hay estructura de aplicacion disponible en disco:
  - `docs/specs/pdf-generation.md`
  - `frontend/src/services/pdfService.tsx`
  - `backend/src/routes/cobranza.ts`
  - `backend/src/services/pdfGenerator.ts`
  - modelos o entidades `WhatsAppMessage` y `LogEntry`
  - configuracion de Evolution API o email
- Decision tecnica pendiente por falta de codigo: confirmar/integrar backend PDF para automatizaciones y frontend PDF para descargas de usuario.
- Estado: bloqueado para implementacion segura. No se puede preservar comportamiento, contratos API, modelos, UX, rutas ni pruebas sin el codigo base real.
- Siguiente paso necesario: abrir/cargar el repositorio correcto o traer los directorios `backend`, `frontend` y `docs` antes de implementar Phase 7.

## Contrato de ejecucion propuesto para cuando este el codigo

- Backend:
  - Exponer generacion de PDF de estado de cuenta sin interaccion del frontend.
  - Crear servicio de envio con WhatsApp media como canal primario y email como fallback si media no esta disponible.
  - Usar URLs temporales firmadas o endpoint efimero autenticado; no guardar URLs publicas permanentes de PDFs sensibles.
  - Registrar resultado en `WhatsAppMessage` y `LogEntry`.
  - Modelar estados retryable/failure para reintentos visibles.
- Frontend:
  - Mantener generacion/descarga de PDF de usuario en `pdfService.tsx` si ya existe ese patron.
  - Agregar accion "send statement" con estado visible y posibilidad de reintento.
- Tests:
  - Endpoint de generacion PDF automatizada.
  - Flujo de envio exitoso por WhatsApp.
  - Fallback por email.
  - Error visible y reintento.
- n8n:
  - Actualizar workflow solo si el envio automatizado depende de una ruta nueva o cambio de payload.
