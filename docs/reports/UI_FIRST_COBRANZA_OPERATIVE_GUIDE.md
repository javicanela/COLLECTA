# UI First Cobranza Operative Guide

## Navigation Model

Collecta usa un shell operativo unico: sidebar por dominio, header global por ruta y status rail no bloqueante. Las vistas internas no deben duplicar `Topbar` cuando `MainLayout` ya provee titulo, subtitulo y estado.

## Daily Workflow

1. Iniciar sesion.
2. Revisar `Cartera` para vencidas, hoy y por vencer.
3. Ejecutar acciones cercanas a la operacion: WhatsApp, PDF, estado de cuenta, pago, excluir o archivar.
4. Importar datos desde `Importar datos`, revisar mapeo y confirmar commit.
5. Revisar agente, pagos, diagnostico y auditoria cuando existan pendientes o fallas.

## Screen Responsibilities

- `Cartera`: priorizar cobranza y ejecutar acciones diarias.
- `Importar datos`: analizar archivo, revisar mapeo, resolver bloqueos y confirmar commit.
- `Aprobaciones`: revisar acciones automatizadas antes de ejecucion.
- `Pagos por confirmar`: validar evidencia y candidatos.
- `Diagnostico`: ver readiness operativo sin exponer secretos.
- `Auditoria`: leer eventos trazables sin depender de logs crudos.

## Status Language

- `OK`: listo para operar.
- `Degradado`: la app puede trabajar con fallback.
- `Bloqueado`: requiere accion antes de continuar.
- `Sin verificar`: el estado no se ha consultado o no aplica.

## Fallback Behavior

- WhatsApp automatico no configurado: mantener fallback `wa.me`.
- Email no configurado: usar PDF o fallback manual.
- Proveedor IA no configurado: mantener flujo deterministico/local.
- Diagnostico degradado: no romper `/api/health`; usar `/api/diagnostics/e2e-readiness`.

## Manual Testing Script

Run evidence for the 2026-05-11 browser QA pass is in `docs/reports/PLAN05_LOCAL_QA_BROWSER_RUN_2026-05-11.md`.

1. `cd backend; npm run test:prepare`.
2. Levantar backend con `.env.test` sin imprimir secretos.
3. Confirmar `http://localhost:3001/api/health`.
4. `cd frontend; npm run dev -- --host localhost --port 5173 --strictPort`.
5. Abrir `http://localhost:5173/` en navegador.
6. Limpiar `localStorage.collecta-token` para verificar login.
7. Iniciar sesion con credenciales de test configuradas localmente.
8. Recorrer `/`, `/registros`, `/agente`, `/pagos/revision`, `/sistema/diagnostico` y `/logs`.
9. Confirmar que las llamadas protegidas usan Bearer token y que no hay secretos visibles en UI.

## Engineering Decision Log

- Los tests fallidos deben tratarse como senal de contrato incompleto, no como una invitacion a parchar lo minimo. La correccion debe cubrir el comportamiento de producto, accesibilidad y consistencia con el sistema.
- `ActionButton` modela acciones operativas. Si una accion esta deshabilitada, debe poder explicar la razon con `disabledReason`, exponerla por `title` y conectar texto auxiliar con `aria-describedby`.
- `SidePanel` es el patron base para inspectores y drawers operativos. Debe ser controlado por props, accesible con `aria-labelledby`, cerrar con Escape, bloquear scroll solo cuando funciona como modal y soportar acciones de footer.
- `OperationInspector` usa `SidePanel` como inspector operativo de cartera. Debe mostrar prioridad, saldo abierto del cliente, datos de contacto, fechas, canales disponibles y acciones de cobranza con razones visibles cuando un canal no puede usarse.
- La seleccion masiva de cobranza debe operar sobre la lista visible (`displayOps`), no sobre colecciones internas de otra pestana.
- Smart Import debe hacer commit con datos frescos consultados por servicio, no depender de closures stale del store. Al terminar, debe refrescar stores y reiniciar el wizard sin recargar toda la SPA.
- Wasp CLI no es viable en Windows nativo para este entorno porque el paquete actual publica Linux/macOS. La alternativa operativa es WSL Ubuntu con Node Linux `24.14.1` y el wrapper `scripts/wasp-wsl.ps1`; usar `.\scripts\wasp-wsl.ps1 version`. Las skills de Wasp quedan disponibles en `.agents/skills`, pero Collecta sigue siendo React/Express y no debe migrarse a Wasp sin una decision explicita. El historial externo se conserva en `docs/external-references/wasp/`.

## Implemented UI Blocks

- Shell operativo con sidebar, header global y status rail.
- Cartera con metricas, filtros, acciones por fila, seleccion masiva limitada a lista visible e inspector lateral.
- Smart Import conectado a commit sin reload completo y con bloqueo de filas invalidas.
- Primitivas `ActionButton` y `SidePanel` con contratos de accesibilidad reutilizables.

## Known UI Gaps

- Falta evolucionar `Cartera` a cola priorizada visual con agrupaciones por urgencia y siguiente mejor accion.
- Falta redisenar `Agente`, `Pagos`, `Diagnostico` y `Auditoria` con componentes dedicados.
- Falta QA visual completo en navegador desktop/mobile despues de cerrar builds.
- El login actual sigue usando credenciales locales; la direccion recomendada es Supabase Auth con OAuth/magic link/invitaciones y membresias por despacho.

## Next UX Iterations

- Implementar `OperationInspector` con `SidePanel`.
- Agregar eventos/logs recientes en el inspector.
- Reducir deuda de lint historica fuera de archivos tocados.
- Integrar Supabase Auth como identidad persistente externa cuando el usuario confirme plataforma y acceso.
