# QA browser script

Usa este guion despues de correr:

```powershell
.\scripts\collecta-dev.ps1
```

Abre `http://localhost:5173/`. Si aparece login, usa las credenciales locales de
test configuradas en `backend\.env.test` y no pegues secretos en reportes.

## Checks globales

- Navegacion lateral visible en escritorio.
- Navegacion movil utilizable en viewport angosto.
- No hay errores rojos permanentes en pantalla.
- Loading/empty states son legibles y no tapan acciones principales.
- El backend responde desde el frontend; si falla, revisar diagnostico/logs.

## Rutas

| Ruta | Clicks | Verificar | Empty/error/loading esperado | Movil |
|---|---|---|---|---|
| `/` | Abrir Cartera, seleccionar una operacion si existe. | Metric strip, cola de prioridad, inspector y acciones de cobranza. | Sin datos: mensaje vacio util; error API: alerta accionable. | Navegacion no debe tapar cola ni inspector. |
| `/registros` | Abrir Importar datos, elegir/cancelar archivo de prueba no sensible si aplica. | Smart Import muestra flujo de carga, preview/mapeo cuando hay archivo. | Sin archivo: estado inicial claro; archivo invalido: error visible. | Dropzone y tablas deben caber sin overflow critico. |
| `/directorio` | Abrir Clientes, buscar o seleccionar cliente si existe. | Lista de clientes, detalles y operaciones relacionadas. | Sin clientes: empty state; error API: mensaje con recuperacion. | Buscador y lista deben ser usables con una mano. |
| `/agente` | Abrir Aprobaciones, revisar matriz/politicas si existen. | Cola de aprobaciones, resumen de ejecucion y timeline. | Sin pendientes: estado vacio; loading no bloquea nav. | Tabs/paneles no deben quedar fuera de pantalla. |
| `/pagos/revision` | Abrir Pagos, seleccionar candidato si existe. | Evidencia, confianza, accion de confirmar/rechazar. | Sin candidatos: empty state; error webhook/API visible. | Lista y panel de evidencia deben apilarse bien. |
| `/sistema/diagnostico` | Ejecutar checks disponibles. | Readiness protegido, integraciones, conectividad y recomendaciones. | Checks fallidos: estado degradado, no crash. | Botones y resultados deben quedar legibles. |
| `/logs` | Abrir Auditoria, filtrar si hay controles. | Timeline/logs, filtros y detalle de evento. | Sin logs: empty state; error auth/API visible. | Filtros no deben romper layout. |
| `/config` | Abrir Configuracion, revisar secciones sin guardar secretos reales. | Modo operativo, canales, plantillas y equipo. | Campos vacios aceptables; errores no deben exponer secretos. | Formularios deben ser editables sin zoom raro. |

## Evidencia recomendada

Registrar en `docs/reports/INSTALLATION_OPERATIONS_QA_RESULTS.md`:

- Fecha y rama.
- Comandos usados para iniciar.
- Resultado por ruta.
- Screenshots solo si no contienen datos sensibles.
- Bloqueos y logs relevantes sin secretos.
