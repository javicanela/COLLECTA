# AGENTS.md

## Fuente operativa

Este archivo es la guia principal para Codex. Si hay conflicto, usa este orden:

1. `AGENTS.md`
2. `docs/specs/*`
3. `docs/PLAN_DEFINITIVO_COLLECTA.md`
4. `README.md`
5. comentarios legacy en codigo

Antes de cambiar comportamiento, valida contra:

- `backend/prisma/schema.prisma`
- `backend/src/index.ts`
- `backend/src/middleware/auth.ts`
- `frontend/src/App.tsx`
- `n8n/README.md`

## Identidad del producto

- El producto es Collecta.
- Collecta es un SaaS de cobranza inteligente para despachos contables.
- No hardcodear nombres de clientes como marca visible del sistema.
- Los clientes especificos pueden aparecer como datos historicos, no como marca
  del producto.

## Stack vigente

- Frontend: React 19, TypeScript, Vite, TailwindCSS.
- Backend: Express 5, TypeScript, Prisma.
- DB oficial: PostgreSQL / Neon.
- Deploy objetivo: Vercel para frontend, Railway para backend.
- Automatizacion: n8n.
- WhatsApp: Evolution API self-host solo si no implica costo de servicio; `wa.me`
  queda como fallback manual.
- Smart Import: web-first, deterministic-first y provider-agnostic.

## Guardrails

- No tocar `.env`, secretos ni credenciales.
- No cambiar `schema.prisma` en tareas de limpieza/documentacion.
- No modificar logica productiva si la tarea es documental.
- No reintroducir `.ai-*`, `.claude/`, PC1, PC2, runners, heartbeat ni dashboards
  locales de agentes.
- Trabajar por ramas y con cambios pequenos.
- No mezclar refactors con features.
- Ejecutar build/test cuando aplique y documentar bloqueos reales.

## Smart Import

Smart Import es el diferenciador central de Collecta. Debe permitir cargar
Excel/CSV caoticos, multihoja y sin orden, detectar informacion contable y
proponer un mapeo a `Client` y `Operation`.

Regla obligatoria: cada analisis debe intentar mejorar o sustituir la
interpretacion inicial por una alternativa mas simple, robusta o poderosa antes
de pedir accion al usuario.

Cadena futura:

1. Parseo local en navegador.
2. Deteccion de hojas, regiones, headers y datos.
3. Mapeo determinista inicial.
4. Challenge obligatorio.
5. Escalamiento al mejor motor disponible.
6. Preview editable.
7. Commit solo tras confirmacion.

Gemini, Groq y OpenRouter son providers reemplazables, no stack obligatorio.
