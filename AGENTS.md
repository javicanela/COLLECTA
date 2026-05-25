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
- La unica version de producto en construccion es la version final SaaS web
  publica, multi-tenant, usable en desktop y movil.
- Los flujos locales existen solo como entorno tecnico interno para construir,
  probar y depurar esa misma version final; no son una version paralela ni una
  opcion distribuible para clientes.
- Primero debe existir una version operable real. Despues de eso, cada mejora se
  trabaja como una actualizacion de la version final y se valida en un respaldo
  o entorno staging antes de afectar la instancia que usa el usuario.
- No hardcodear nombres de clientes como marca visible del sistema.
- Los clientes especificos pueden aparecer como datos historicos, no como marca
  del producto.
- Autenticacion de producto vigente: el flujo real es SaaS multi-tenant con
  organizaciones y usuarios persistidos en DB con password hasheado. Cualquier
  login local por `ADMIN_USER`/`ADMIN_PASS` pertenece a una version anterior y
  solo puede quedar como compatibilidad tecnica temporal; no gobierna producto,
  UX, criterios de exito ni nuevas pruebas funcionales.

## Stack vigente

- Frontend: React 19, TypeScript, Vite, TailwindCSS.
- Backend: Express 5, TypeScript, Prisma.
- DB oficial: PostgreSQL / Supabase.
- Storage oficial para adjuntos/PDFs remotos: Supabase Storage privado.
- Deploy objetivo: Vercel para frontend y backend Node dedicado compatible
  con Express. Railway queda como fallback solo si se reactiva; el camino
  vigente usa Render como puente operativo mientras se valida Vercel Functions
  sin sacrificar funcionalidad.
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

## Flujo permanente de ramas

Antes de iniciar nuevos cambios funcionales, Codex debe consolidar el progreso
mas reciente:

- Revisar `git status`, ramas locales/remotas y worktrees activos.
- Identificar la punta mas nueva que ya contiene el historial principal.
- Integrar ramas pendientes relevantes con merges normales, sin reescribir
  historia ni descartar cambios del usuario.
- Resolver conflictos preservando comportamiento existente.
- Ejecutar la verificacion aplicable antes de afirmar que el estado esta listo.
- Crear commit con el estado consolidado y hacer push de la rama vigente.
- Solo despues continuar con la siguiente fase de implementacion.

## Orquestacion paralela de CLIs

Los bloques de desarrollo no triviales deben trabajarse con CLIs/agentes
paralelos cuando esten disponibles, usando scopes limpios para acelerar sin
pisar cambios:

- El coordinador primero revisa rama, worktree, estado Git y objetivo del
  bloque.
- Cada CLI recibe un contrato con ownership disjunto de archivos o subsistema,
  criterios de exito, comandos de verificacion y prohibicion de `git add`,
  `commit` o `push`.
- Los cambios utiles se integran en la rama final solo si se alinean con la
  version SaaS real de Collecta y pasan verificacion fresca.
- OpenCode u otro CLI inestable se trata como reemplazable; si falla por
  autenticacion, permisos o tooling, se instala o usa un suplente sin bloquear
  el avance.
- Codex conserva la responsabilidad de revisar diffs, resolver conflictos,
  ejecutar pruebas completas aplicables y hacer el commit/push final.

## Flujo permanente de actualizaciones

- La prioridad actual es construir la primera version operable publica.
- Cuando esa version exista, no se trabaja sobre variantes paralelas del producto:
  se preparan actualizaciones de la misma version final.
- Cada actualizacion debe probarse primero contra un respaldo o entorno staging
  con datos seguros antes de tocar produccion.
- Si una actualizacion falla en staging, se corrige ahi; no se promueve a la
  version usada por el usuario.
- Produccion debe conservar una ruta clara de rollback o restauracion antes de
  aplicar cambios de riesgo.

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
