# Agent Handoff Plan 05 - UI-First Para Sistema De Cobranza Operativa

## Cuando Enviar Este Archivo Al Agente

Envia este archivo al agente cuando se cumpla una de estas condiciones:

- La auditoria confirme que Plan 03 y Plan 04 fueron implementados con exito.
- La auditoria encuentre detalles menores, pero confirme que existen rutas y contratos suficientes para disenar la UI sobre la base actual.
- El equipo necesite que la siguiente iteracion se enfoque en experiencia de usuario, flujos operativos y claridad visual antes de implementar mas logica.

No enviar antes de confirmar que el agente trabajara en el repo correcto:

```txt
C:\Users\LENOVO\Documents\New project
```

Si Plan 03 o Plan 04 siguen en auditoria, este agente puede iniciar con:

- Lectura de codigo.
- Auditoria UX.
- Inventario de rutas, componentes y estados.
- Wireframes/documentacion.

Pero no debe modificar componentes productivos hasta conocer los archivos finales cambiados por Plan 03 y Plan 04.

Prioridad:

```txt
Alta. La herramienta ya debe sentirse como un sistema operativo de cobranza: claro, accionable, trazable y facil de probar.
```

---

## Instruccion Operativa Obligatoria

Al terminar cada bloque implementable:

1. Guardar todos los cambios en disco.
2. Reportar archivos creados/modificados.
3. Ejecutar la verificacion correspondiente.
4. Dejar abiertos los servicios necesarios para prueba manual:
   - Backend API.
   - Frontend Vite.
   - DB test/staging si se levanto.
   - Navegador en las rutas relevantes.
5. No cerrar servidores de desarrollo si el usuario necesita probar inmediatamente.
6. No hacer commit ni push salvo instruccion explicita.

Al final de este plan, dejar abierto:

```txt
Frontend: http://localhost:<vite-port>
Backend health: http://localhost:<backend-port>/api/health
Operaciones: /
Smart Import/Registros: /registros
Agente: /agente
Pagos: /pagos/revision
Diagnostico: /sistema/diagnostico
Logs: /logs
```

Si se usa navegador integrado de Codex o Browser Use, abrir las rutas principales y dejarlas listas para prueba manual.

---

## ROLE

Actua como lider senior de producto, UX y frontend engineering para un SaaS B2B operativo de cobranza inteligente.

Tu trabajo es disenar primero la interfaz de usuario necesaria para gestionar el sistema de cobranza, con foco en uso diario real: priorizar cartera, revisar acciones, aprobar automatizaciones, entender fallas, confirmar pagos y auditar trazabilidad.

---

## CONTEXT

Repo local:

```txt
C:\Users\LENOVO\Documents\New project
```

Producto:

- Collecta es un SaaS de cobranza inteligente para despachos contables.
- El producto debe vender valor practico: ahorrar tiempo, reducir friccion operativa, mejorar recuperacion de cartera y convertir procesos manuales en sistemas digitales trazables.
- El usuario final probable trabaja con cartera, clientes, vencimientos, mensajes, comprobantes y seguimiento.

Stack:

- Frontend: React 19, TypeScript, Vite.
- Styling actual: CSS/Tailwind-like utility classes en app existente.
- UI libraries disponibles segun `frontend/package.json`:
  - `lucide-react`
  - `framer-motion`
  - `react-router-dom`
  - `zustand`
  - `@react-pdf/renderer`
  - `xlsx`
  - `papaparse`
- Backend: Express 5, Prisma, PostgreSQL/Neon.

Rutas actuales esperadas:

- `/` operaciones/dashboard.
- `/registros` importacion.
- `/directorio` clientes.
- `/exportar`.
- `/agente`.
- `/pagos/revision`.
- `/sistema/diagnostico`.
- `/logs`.
- `/config`.

---

## OBJECTIVE

Disenar e implementar una experiencia UI-first para gestionar Collecta como sistema operativo de cobranza.

La UI debe:

- Mostrar prioridades de cobranza con claridad.
- Hacer evidente que accion sigue.
- Separar trabajo automatico, trabajo pendiente de aprobacion y excepciones.
- Permitir revisar Smart Import y datos importados sin perder contexto.
- Permitir ejecutar o revisar envios de cobranza con PDF/WhatsApp/email/fallback.
- Mostrar deteccion y revision de pagos.
- Mostrar salud del sistema e integraciones.
- Mostrar auditoria sin obligar a leer logs crudos.
- Ser usable en desktop y responsive en mobile/tablet.

---

## FILES TO READ FIRST

Leer primero:

- `AGENTS.md`
- `frontend/package.json`
- `frontend/src/App.tsx`
- `frontend/src/App.css`
- `frontend/src/index.css`
- `frontend/src/components/MainLayout.tsx`
- `frontend/src/components/ui/Button.tsx`
- `frontend/src/components/ui/Card.tsx`
- `frontend/src/components/ui/Badge.tsx`
- `frontend/src/components/ui/Table.tsx`
- `frontend/src/components/ui/Modal.tsx`
- `frontend/src/components/ui/EmptyState.tsx`
- `frontend/src/views/DashboardView.tsx`
- `frontend/src/views/RegistersView.tsx`
- `frontend/src/views/DirectoryView.tsx`
- `frontend/src/views/AgentView.tsx`
- `frontend/src/views/PaymentReviewView.tsx`
- `frontend/src/views/SystemReadinessView.tsx`
- `frontend/src/views/LogView.tsx`
- `frontend/src/views/ConfigView.tsx`
- `frontend/src/services/api.ts`
- `frontend/src/services/operationService.ts`
- `frontend/src/services/paymentDetectionService.ts`
- `frontend/src/services/diagnosticsService.ts`
- `frontend/src/stores/useOperationStore.ts`
- `frontend/src/stores/useClientStore.ts`
- `frontend/src/types/index.ts`
- `backend/src/routes/diagnostics.ts`
- `backend/src/routes/n8n.ts`
- `backend/src/routes/agent.ts`
- `backend/src/routes/cobranza.ts`
- `docs/reports/COBRANZA_E2E_CONTRACT_MAP.md`
- `docs/reports/COBRANZA_E2E_CONNECTIVITY_REPORT.md`
- `docs/reports/SMART_IMPORT_MULTIMODAL_RESEARCH_BRIEF.md`

Si algun archivo no existe porque Plan 03/04 aun esta en auditoria, documentarlo y continuar con fallback basado en rutas actuales.

---

## DESIGN PRINCIPLES

La interfaz debe sentirse como una herramienta B2B seria, no una landing page.

Principios:

- Prioridad sobre decoracion.
- Informacion densa pero escaneable.
- Estados claros: listo, pendiente, bloqueado, fallido, requiere aprobacion, enviado, pagado.
- Acciones visibles cerca del dato que las motiva.
- Trazabilidad siempre accesible.
- Sin hype, sin textos largos de marketing dentro de la app.
- Sin hero sections.
- Sin tarjetas anidadas.
- Sin paleta dominada por morado/azul-purpura.
- Sin gradientes decorativos excesivos.
- Usar iconos `lucide-react` para acciones.
- Mantener radios moderados: 8px o menos salvo componentes existentes que ya lo requieran.
- Usar tablas, listas, side panels, drawers y barras de estado para trabajo operativo.
- Los numeros deben ser faciles de comparar.
- Loading, empty y error states son obligatorios.

Visual direction sugerida:

- Base neutra clara: zinc/slate.
- Un acento principal sobrio: teal/emerald o blue profesional no neon.
- Estados:
  - Vencido: red/rose controlado.
  - Por vencer: amber.
  - Pagado: emerald.
  - Pendiente aprobacion: blue/indigo sobrio.
  - Bloqueado/error: red.
  - No configurado: slate/amber.

---

## NON-GOALS

- No redisenar branding completo.
- No cambiar reglas de negocio.
- No implementar OCR ni parsing nuevo; eso pertenece a Plan 03.
- No cambiar backend salvo endpoints pequenos de soporte UX si son estrictamente necesarios.
- No implementar pagos reales.
- No configurar proveedores externos.
- No crear landing page.
- No eliminar funcionalidades existentes.

---

## TASK 0: Enlazar Plataformas, Tecnologias y Herramientas De Diseño/Testing

Antes de redisenar o implementar UI, el agente debe identificar y enlazar las plataformas y tecnologias necesarias para trabajar de forma mas efectiva.

Crear:

```txt
docs/reports/UI_FIRST_TOOLING_AND_PLATFORM_LINKS.md
```

Debe incluir:

```md
# UI First Tooling And Platform Links

## Available Local Tooling

## Design And Asset Tools

## Image Generation / Editing

## 3D / Motion / Animation Tools

## Browser Testing Tools

## Screenshot And Visual QA Workflow

## Required Accounts Or External Platforms

## Tools Not Available In This Environment

## Recommended Tooling For This Iteration

## Deferred Tooling
```

El agente debe revisar y decidir si necesita usar o solicitar:

- Browser/in-app browser para abrir la app local y probar interacciones.
- Playwright, Browser Use, agent-browser o herramienta equivalente para screenshots y pruebas visuales.
- Generacion o edicion de imagenes si se requieren assets visuales para pantallas, empty states, ilustraciones sobrias o previews.
- Herramientas de diseño como Figma o Canva si el usuario/proyecto las tiene disponibles y si aportan a handoff visual.
- Librerias de animacion ya instaladas, especialmente `framer-motion`.
- Iconografia ya instalada, especialmente `lucide-react`.
- Three.js o herramientas 3D solo si hay una necesidad real de producto; no introducir 3D decorativo en dashboards operativos.
- Herramientas de captura visual para comparar desktop/mobile.
- Generadores de mockups o diagramas si ayudan a explicar flujos.

Reglas:

- No instalar librerias nuevas sin revisar `frontend/package.json` y justificar necesidad.
- No crear modelos 3D o animaciones complejas si no mejoran una tarea operativa concreta.
- No agregar imagenes pesadas sin optimizacion.
- No depender de Figma/Canva/servicios externos si el acceso no esta disponible.
- No usar assets con licencias dudosas.
- No usar herramientas externas para datos sensibles o documentos reales.
- Si se necesita una plataforma externa, reportar primero:
  - Para que se necesita.
  - Que cuenta/acceso requiere.
  - Que datos se compartirian.
  - Riesgo y alternativa local.

Resultado esperado:

- Lista clara de herramientas disponibles.
- Decision de que se usara en esta iteracion.
- Decision de que queda diferido.
- Flujo de QA visual definido antes de tocar UI.

---

## TASK 1: Auditoria UX y Mapa De Navegacion

Crear:

```txt
docs/reports/UI_FIRST_COBRANZA_UX_AUDIT.md
```

Debe incluir:

```md
# UI First Cobranza UX Audit

## Current Routes

## Primary User Jobs

## Current Friction

## Missing States

## Navigation Issues

## Data Visibility Issues

## Action Placement Issues

## Proposed Information Architecture

## Screens To Redesign

## Non-Goals
```

Jobs principales a cubrir:

1. Ver cartera priorizada.
2. Importar datos y revisar mapeo.
3. Revisar clientes y operaciones.
4. Ejecutar o aprobar cobranza automatizada.
5. Enviar estado de cuenta.
6. Revisar pagos detectados.
7. Confirmar pagos ambiguos.
8. Diagnosticar conectividad.
9. Auditar eventos.

---

## TASK 2: Crear Sistema De Layout Operativo

Modificar:

```txt
frontend/src/components/MainLayout.tsx
frontend/src/App.css
frontend/src/index.css
```

Crear si conviene:

```txt
frontend/src/components/layout/AppShell.tsx
frontend/src/components/layout/PageHeader.tsx
frontend/src/components/layout/CommandBar.tsx
frontend/src/components/layout/StatusRail.tsx
```

Requisitos:

- Sidebar claro, compacto y estable.
- Top/page header con titulo, subtitulo y acciones primarias.
- Barra de estado global con:
  - Modo `PRUEBA/PRODUCCION`.
  - WhatsApp.
  - Email/PDF si disponible.
  - DB/diagnostico si disponible.
- Mobile: sidebar drawer funcional, sin solapamientos.
- Desktop: maximizar area util para tablas y listas.
- Evitar fondos con gradientes decorativos fuertes.
- No romper rutas existentes.

Estados:

- Loading de config/status.
- Error de status no bloqueante.
- Modo sin integraciones configuradas.

---

## TASK 3: Redisenar Vista Principal De Operaciones Como Workbench

Modificar:

```txt
frontend/src/views/DashboardView.tsx
```

Crear componentes:

```txt
frontend/src/components/cobranza/CobranzaWorkbench.tsx
frontend/src/components/cobranza/PriorityQueue.tsx
frontend/src/components/cobranza/OperationInspector.tsx
frontend/src/components/cobranza/CollectionActionBar.tsx
frontend/src/components/cobranza/PortfolioMetricsStrip.tsx
frontend/src/components/cobranza/OperationStatusBadge.tsx
```

Layout recomendado:

```txt
┌────────────────────────────────────────────────────────────┐
│ Header: Operaciones + acciones principales                 │
├────────────────────────────────────────────────────────────┤
│ Metrics strip: vencidas, hoy, por vencer, pagadas, monto   │
├───────────────────────┬────────────────────────────────────┤
│ Priority Queue/List   │ Inspector de operacion seleccionada│
│ filtros + tabla       │ acciones + timeline + contacto     │
└───────────────────────┴────────────────────────────────────┘
```

Requisitos:

- La lista debe priorizar vencidas, hoy, por vencer.
- Acciones cerca de cada operacion:
  - Enviar WhatsApp.
  - Enviar estado de cuenta PDF.
  - Marcar pagada.
  - Excluir.
  - Archivar.
  - Ver cliente.
- Inspector lateral debe mostrar:
  - Cliente.
  - RFC.
  - Telefono/email.
  - Monto.
  - Fecha vencimiento.
  - Dias vencido.
  - Estado.
  - Ultimos logs/eventos si existen.
  - Fallback manual si no hay canal automatico.
- Filtros:
  - Vencidas.
  - Vencen hoy.
  - Por vencer.
  - Sin contacto.
  - Excluidas.
  - Pagadas.
- Loading skeleton.
- Empty state cuando no hay operaciones.
- Error state con retry.

No usar tarjetas anidadas. Usar tabla/lista + inspector.

---

## TASK 4: Redisenar Smart Import Como Flujo De Revision

Modificar:

```txt
frontend/src/views/RegistersView.tsx
frontend/src/features/smart-import/components/ImportWizard.tsx
frontend/src/features/smart-import/components/SheetSelector.tsx
frontend/src/features/smart-import/components/PreviewGrid.tsx
frontend/src/features/smart-import/components/MappingReviewTable.tsx
frontend/src/features/smart-import/components/ImportSummary.tsx
```

Crear si conviene:

```txt
frontend/src/features/smart-import/components/ImportStepper.tsx
frontend/src/features/smart-import/components/SourceTracePanel.tsx
frontend/src/features/smart-import/components/ImportWarningsPanel.tsx
frontend/src/features/smart-import/components/MappingConfidencePanel.tsx
```

Flujo UI:

```txt
1. Seleccionar archivo
2. Extraer/analizar
3. Revisar mapeo
4. Resolver warnings
5. Preview editable
6. Confirmar commit
```

Requisitos:

- Mostrar formato detectado.
- Mostrar hoja/pagina/origen.
- Mostrar confianza por columna/campo.
- Mostrar warnings sin asustar.
- Mostrar challenge/alternativa si Plan 03 lo expone.
- Preview editable antes de commit.
- Boton de confirmar deshabilitado si hay errores bloqueantes.
- Estado de OCR/parsing largo con progreso si existe.
- Cancelacion visible si existe.

---

## TASK 5: Redisenar Vista Del Agente Como Centro De Control

Modificar:

```txt
frontend/src/views/AgentView.tsx
```

Crear:

```txt
frontend/src/components/agent/AgentControlCenter.tsx
frontend/src/components/agent/ApprovalQueue.tsx
frontend/src/components/agent/AgentRunTimeline.tsx
frontend/src/components/agent/ActionPolicyMatrix.tsx
frontend/src/components/agent/AgentExecutionSummary.tsx
```

Requisitos:

- Mostrar estado de ejecucion actual:
  - PENDING.
  - RUNNING.
  - PAUSED.
  - COMPLETED.
  - STOPPED.
  - FAILED.
- Cola de aprobaciones con acciones claras:
  - Aprobar.
  - Rechazar/cancelar.
  - Ver detalle.
- Mostrar por que una accion requiere aprobacion.
- Mostrar limites diarios y rate limit si backend lo devuelve.
- Timeline de ejecucion.
- Acciones destructivas con confirm modal.
- Estados vacios:
  - No hay ejecuciones.
  - No hay aprobaciones.
  - Agente pausado.

---

## TASK 6: Redisenar Revision De Pagos

Modificar:

```txt
frontend/src/views/PaymentReviewView.tsx
frontend/src/services/paymentDetectionService.ts
frontend/src/types/index.ts
```

Crear:

```txt
frontend/src/components/payments/PaymentReviewQueue.tsx
frontend/src/components/payments/PaymentEvidencePanel.tsx
frontend/src/components/payments/PaymentCandidateList.tsx
frontend/src/components/payments/PaymentConfidenceBadge.tsx
```

Layout:

```txt
Lista de comprobantes ambiguos -> Panel evidencia -> Candidatos -> Confirmar
```

Requisitos:

- Mostrar evidencia extraida:
  - RFC.
  - Monto.
  - Fecha.
  - Referencia.
  - Fuente.
  - Confidence/reasons si existe.
- Mostrar operaciones candidatas.
- Confirmar pago requiere accion explicita.
- Mostrar duplicado si existe.
- Mostrar historial/log asociado.
- Empty state: sin pagos pendientes de revision.
- Error state: no se pudo cargar reporte.

---

## TASK 7: Redisenar Diagnostico Del Sistema

Modificar:

```txt
frontend/src/views/SystemReadinessView.tsx
frontend/src/services/diagnosticsService.ts
```

Crear:

```txt
frontend/src/components/system/ReadinessChecklist.tsx
frontend/src/components/system/IntegrationStatusGrid.tsx
frontend/src/components/system/ConnectivityTestPanel.tsx
```

Requisitos:

- Mostrar checks en lenguaje operativo:
  - Base de datos.
  - Backend.
  - WhatsApp Evolution.
  - Email.
  - PDF/storage.
  - n8n.
  - Deteccion de pagos.
  - Smart Import.
- Estados:
  - OK.
  - Warning.
  - Error.
  - No configurado.
- No mostrar secrets.
- Boton refrescar.
- Mostrar siguiente accion recomendada por check.
- Si una integracion no esta configurada, explicar fallback disponible.

---

## TASK 8: Redisenar Logs Como Auditoria Legible

Modificar:

```txt
frontend/src/views/LogView.tsx
frontend/src/services/logService.ts
```

Crear:

```txt
frontend/src/components/audit/AuditTimeline.tsx
frontend/src/components/audit/AuditFilters.tsx
frontend/src/components/audit/AuditEventDrawer.tsx
```

Requisitos:

- No mostrar solo tabla cruda.
- Agrupar por tipo:
  - WHATSAPP.
  - EMAIL.
  - PAYMENT_DETECTION.
  - AGENT.
  - IMPORT.
  - ERROR.
- Filtros por fecha, cliente, resultado, tipo.
- Evento expandible con detalle.
- Mostrar telefono/canal sin exponer datos innecesarios.
- Empty/error/loading states.

---

## TASK 9: Unificar Componentes UI Criticos

Modificar o crear:

```txt
frontend/src/components/ui/StatusBadge.tsx
frontend/src/components/ui/Metric.tsx
frontend/src/components/ui/InlineAlert.tsx
frontend/src/components/ui/ActionButton.tsx
frontend/src/components/ui/SidePanel.tsx
frontend/src/components/ui/StateBlock.tsx
frontend/src/components/ui/SegmentedControl.tsx
frontend/src/components/ui/Toolbar.tsx
```

Requisitos:

- Reusar en vistas principales.
- Tipos TypeScript claros.
- Accesibilidad basica:
  - `aria-label` en icon buttons.
  - focus states visibles.
  - botones deshabilitados con razon.
- No crear libreria UI gigante.
- Mantener API simple.

---

## TASK 10: Microinteracciones y Responsividad

Aplicar en vistas principales:

- Transiciones con `framer-motion` solo donde ayuden a entender cambios de estado.
- No animar width/height/top/left.
- Usar transform/opacity.
- Respetar `prefers-reduced-motion`.
- Evitar loops perpetuos innecesarios en dashboards operativos.
- Mobile:
  - Listas en una columna.
  - Inspector como drawer.
  - Acciones primarias accesibles.
  - Tablas con layout adaptado.

Pruebas visuales manuales:

- Desktop ancho.
- Laptop.
- Tablet.
- Mobile.

---

## TASK 11: Abrir Ventanas Para Prueba

Al terminar implementacion y verificacion, iniciar servicios.

Backend:

```powershell
cd backend
npm run dev
```

Frontend:

```powershell
cd frontend
npm run dev
```

Si se usa DB local:

```powershell
docker compose -f docker-compose.test.yml up -d
```

Dejar abiertas estas rutas:

```txt
http://localhost:<vite-port>/
http://localhost:<vite-port>/registros
http://localhost:<vite-port>/agente
http://localhost:<vite-port>/pagos/revision
http://localhost:<vite-port>/sistema/diagnostico
http://localhost:<vite-port>/logs
http://localhost:<backend-port>/api/health
```

El reporte final debe indicar:

- Puertos usados.
- Procesos corriendo.
- Rutas abiertas.
- Credenciales de prueba solo si ya existen en docs/test env y no son secretos reales.

---

## TASK 12: Documentar Guia UI Operativa

Crear:

```txt
docs/reports/UI_FIRST_COBRANZA_OPERATIVE_GUIDE.md
```

Debe incluir:

```md
# UI First Cobranza Operative Guide

## Navigation Model

## Daily Workflow

## Screen Responsibilities

## Status Language

## Fallback Behavior

## Manual Testing Script

## Known UI Gaps

## Next UX Iterations
```

---

## VERIFICATION REQUIRED

Frontend:

```powershell
cd frontend
npm run build
npm test
```

Backend, si se tocan contratos o se requiere validar integracion:

```powershell
cd backend
npm run build
npx vitest run src/__tests__/cobranzaE2E.test.ts
npx vitest run src/__tests__/health.test.ts
```

Manual:

- Abrir `/`.
- Revisar workbench de operaciones.
- Probar filtros.
- Seleccionar operacion y revisar inspector.
- Abrir `/registros`.
- Probar estado inicial de importacion.
- Abrir `/agente`.
- Revisar cola y estados.
- Abrir `/pagos/revision`.
- Revisar empty/loading/error states.
- Abrir `/sistema/diagnostico`.
- Refrescar checks.
- Abrir `/logs`.
- Filtrar auditoria.
- Probar mobile o viewport estrecho.

---

## SUCCESS CRITERIA

- Existe auditoria UX documentada.
- Navegacion principal es clara y orientada a trabajo.
- Dashboard/operaciones funciona como workbench de cobranza.
- Smart Import se entiende como flujo de revision, no solo uploader.
- Agente muestra aprobaciones, ejecucion y riesgos.
- Pagos ambiguos se revisan con evidencia y candidatos.
- Diagnostico muestra readiness accionable.
- Logs son auditoria legible.
- Hay estados loading, empty y error.
- UI es responsive.
- Builds pasan.
- App queda abierta para prueba manual.
- No se tocaron secretos reales.
- No se hizo commit/push sin instruccion.

---

## EXPECTED OUTPUT FROM AGENT

El agente debe entregar:

```md
## Files Changed
- ...

## UX Summary
- ...

## Implementation Summary
- ...

## Verification
- `cd frontend && npm run build`: pass/fail
- `cd frontend && npm test`: pass/fail
- `cd backend && npm run build`: pass/fail, si aplica

## Manual Testing Setup Left Open
- Backend URL:
- Frontend URL:
- Browser routes opened:
- Processes left running:

## Screens Updated
- Operaciones:
- Registros/Smart Import:
- Agente:
- Pagos:
- Diagnostico:
- Logs:

## Blockers
- ...

## Residual Risks
- ...

## Secret Safety
- No real secrets or .env files were modified.

## Git Safety
- No commit or push was performed unless explicitly requested.
```

---

## NOTES FOR THE AGENT

La UI debe hacer que Collecta se sienta como una herramienta que un despacho puede usar todos los dias.

La pregunta guia para cada pantalla es:

```txt
Que debe decidir o hacer el usuario aqui en menos de 10 segundos?
```

Si una pantalla no ayuda a decidir, priorizar o auditar, debe simplificarse.
