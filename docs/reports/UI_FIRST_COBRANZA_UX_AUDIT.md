# UI First Cobranza UX Audit

## Current Routes

- `/`: cartera y operaciones.
- `/registros`: Smart Import / importacion.
- `/directorio`: clientes.
- `/exportar`: exportaciones.
- `/agente`: control de agente automatizado.
- `/pagos/revision`: pagos ambiguos por confirmar.
- `/sistema/diagnostico`: readiness e integraciones.
- `/logs`: auditoria/eventos.
- `/config`: configuracion.

## Primary User Jobs

1. Ver cartera priorizada.
2. Importar datos y revisar mapeo.
3. Revisar clientes y operaciones.
4. Ejecutar o aprobar cobranza automatizada.
5. Enviar estado de cuenta.
6. Revisar pagos detectados.
7. Confirmar pagos ambiguos.
8. Diagnosticar conectividad.
9. Auditar eventos.

## Current Friction

- Varias vistas legacy todavia duplican `Topbar` aunque `MainLayout` ya provee header global.
- La cartera ya tiene inspector lateral, pero aun falta cola priorizada visual por urgencia.
- `Agente`, `Pagos`, `Diagnostico` y `Auditoria` todavia mezclan mucha logica de vista con UI especifica.
- El login sigue siendo local; falta identidad persistente externa.
- Hay mojibake en algunos textos legacy, especialmente donde el codigo fue escrito con encoding inconsistente.

## Missing States

- Empty/error/loading consistentes en Agente, Pagos, Diagnostico y Logs.
- Estado de accion bloqueada con razon explicita fuera de los componentes ya migrados.
- Estados mobile revisados visualmente en todas las rutas principales.
- Estado de integracion externa no configurada con fallback recomendado por pantalla.

## Navigation Issues

- El shell operativo ya organiza dominios por Cobranza, Datos, Trabajo Pendiente y Sistema.
- Falta terminar la limpieza de headers internos en vistas legacy.
- La navegacion debe mantener foco en tareas diarias, no en areas tecnicas internas.

## Data Visibility Issues

- Cartera ya muestra metricas, saldo e inspector.
- Agente necesita separar estado de ejecucion, aprobaciones, politicas y timeline.
- Pagos necesita mostrar evidencia extraida y candidatos con confianza.
- Diagnostico debe traducir checks tecnicos a acciones operativas.
- Logs debe leerse como auditoria, no como tabla cruda.

## Action Placement Issues

- En cartera las acciones ya viven junto a cada operacion y dentro del inspector.
- En Agente falta hacer mas claras las acciones destructivas: pausar, detener, cancelar y aprobar.
- En Pagos falta que confirmar pago este junto al candidato y no escondido en estructura de tabla.
- En Logs falta drawer de detalle por evento.

## Proposed Information Architecture

- Cartera: prioridad, filtros, tabla/lista e inspector.
- Importar datos: wizard de revision, warnings y commit.
- Agente: centro de control con ejecucion, aprobaciones, politicas y timeline.
- Pagos: cola de revision, evidencia, candidatos y confirmacion.
- Diagnostico: checklist accionable e integraciones.
- Auditoria: timeline filtrable y detalle.

## Screens To Redesign

- Next: `/agente`.
- Then: `/pagos/revision`.
- Then: `/sistema/diagnostico`.
- Then: `/logs`.
- Later: `/directorio`, `/exportar`, `/config` cleanup.

## Non-Goals

- No cambiar reglas de negocio.
- No migrar a Wasp.
- No configurar proveedores externos.
- No tocar secretos ni `.env`.
- No introducir librerias nuevas sin justificacion.

