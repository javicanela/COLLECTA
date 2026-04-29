# Repo Review — Collecta

## Tipo de Proyecto

**Collecta** — Plataforma SaaS de cobranza inteligente para despachos contables en México.

## Resumen

Monorepo con frontend y backend independientes:

- **Frontend**: React 19 + TypeScript + Vite + TailwindCSS v4 + Zustand. Interfaz de gestión de clientes, operaciones de cobro, importación de Excel/CSV con IA, exportaciones PDF/Excel, y envío de recordatorios por WhatsApp.
- **Backend**: Express 5 + Prisma ORM + PostgreSQL (Neon). APIs REST para CRUD de clientes/operaciones, autenticación JWT, cascada de IA (Gemini → Groq → OpenRouter) para mapeo de columnas, e integración con Evolution API para WhatsApp.
- **Automatización**: Workflows n8n para reportes diarios, cobranza automática por WhatsApp, detección de pagos con Gemini Vision, y envío de PDFs por email.
- **Deploy**: Frontend en Vercel, Backend en Railway, DB en Neon PostgreSQL.

## Estado

Proyecto en desarrollo activo. Phase 0 (seguridad) y Phase 1 (WhatsApp/Evolution API) completadas. Siguiente: Phase 2 (scheduling mensual de cobranza).
