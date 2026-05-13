# Full Cycle Cobranza E2E Runbook

Fecha: 2026-05-13
Producto: Collecta

## Objetivo

Repetir el ciclo operativo critico de cobranza:

1. Importar cartera caotica.
2. Revisar mapeo Smart Import.
3. Confirmar clientes y operaciones.
4. Enviar cobranza o estado de cuenta.
5. Recibir confirmacion WhatsApp.
6. Correlacionar la respuesta con una cobranza saliente previa.
7. Marcar pago automaticamente solo si es seguro.
8. Revisar auditoria y pagos ambiguos.

## Setup Local

Backend:

```powershell
cd backend
npm run test:prepare
npm run dev
```

Frontend:

```powershell
cd frontend
npm run dev
```

Rutas esperadas:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001/api`

La autenticacion local usa la configuracion existente del entorno. No registrar ni compartir secretos en reportes.

## Fixture Caotico

Fixture automatizado:

- `frontend/src/features/smart-import/__fixtures__/chaotic-10-client-workbook.ts`

Propiedades:

- 10 clientes y 10 operaciones.
- Filas de titulo antes de la tabla.
- Una fila en blanco antes de headers.
- Headers en orden no canonico: cliente, RFC, celular, adeudo, limite, servicio, correo, asesor, detalle.
- Montos con formato de moneda.
- Fechas en multiples formatos.
- Un cliente sin telefono.
- Un cliente sin email.
- Un cliente con nombre parecido a otro para evitar confianza falsa por nombre.

Prueba:

```powershell
cd frontend
npm test -- src/features/smart-import/domain/full-cycle-import-fixture.test.ts
```

## Browser Steps

1. Abrir `http://localhost:5173/registros`.
2. Confirmar que aparece `Smart Import`.
3. Cargar un archivo equivalente al fixture caotico.
4. Verificar hoja/region detectada.
5. Revisar tabla de mapeo.
6. Confirmar preview editable.
7. Confirmar commit solo tras accion del operador.
8. Abrir `/`.
9. Verificar operaciones en cartera.
10. Seleccionar una operacion y revisar acciones.

Nota: en esta sesion el navegador embebido permitio validar rutas, pero no expuso una accion segura de seleccion de archivo. El fixture queda cubierto por prueba automatizada.

## Correlacion WhatsApp

Reglas para aceptar automaticamente:

- El mensaje entrante viene de un telefono asociado a un cliente.
- Existe un WhatsApp saliente previo o intento de estado de cuenta para ese mismo cliente/telefono.
- Si no hay monto en el texto, existe exactamente una operacion abierta.
- Si hay monto, coincide exactamente o dentro de tolerancia con una sola operacion abierta.
- La operacion no esta pagada, archivada ni excluida.
- Se crea log `PAYMENT_DETECTION` con motivos.

Ambiguo o inseguro:

- Multiples operaciones abiertas sin monto.
- No hay mensaje saliente previo.
- Lenguaje de pago futuro o pregunta, por ejemplo `pago manana` o `cuanto debo`.
- Cliente no encontrado.
- Monto sin coincidencia unica.

Prueba:

```powershell
cd backend
node --env-file-if-exists=.env.test ./node_modules/vitest/vitest.mjs run --config vitest.config.ts src/__tests__/paymentConfirmationCorrelation.test.ts
```

## Logs Esperados

En `/logs` deben verse:

- `INCOMING` para mensajes recibidos.
- `WHATSAPP` para intentos salientes.
- `PAYMENT_DETECTION` con resultado `ACCEPTED`, `REVIEW_REQUIRED` o `DUPLICATE`.
- Telefonos enmascarados en UI.
- Evidencia de correlacion como campos legibles: operacion, monto, motivos, confianza y muestra.

## Real WhatsApp Test

No ejecutar sin confirmacion explicita del usuario.

Secuencia:

1. Pedir numero de prueba.
2. Confirmar permiso inmediatamente antes de enviar.
3. Enviar un mensaje controlado de cobranza o estado de cuenta.
4. Pedir respuesta desde el mismo numero con texto acordado.
5. Verificar webhook Evolution.
6. Confirmar pago automatico o revision requerida.
7. Redactar telefono en resultados salvo ultimos 4 digitos.

## Failure Triage

- Si `/api/webhooks/evolution` responde 403, revisar `EVOLUTION_WEBHOOK_SECRET`.
- Si el pago no se marca, verificar que exista WhatsApp saliente previo al mismo telefono.
- Si hay varias operaciones abiertas, incluir monto en el texto de confirmacion.
- Si `/logs` muestra JSON crudo, revisar normalizacion de auditoria frontend.
- Si Smart Import no detecta 10 filas, revisar headers, fila en blanco y region seleccionada.

## Metodo Free Production

- Evolution API solo self-host si no implica costo de servicio.
- `wa.me` queda como fallback manual.
- Smart Import se mantiene local-first y deterministico-first.
- Escalamiento a proveedores externos requiere configuracion explicita y no debe enviar datos reales sin aprobacion.
