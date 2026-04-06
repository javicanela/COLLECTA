# Spec: Automatización de Cobranza con n8n

**Fecha:** 2026-04-01  
**Proyecto:** Collecta - Automatización de Cobranza  
**Estado:** Pendiente de implementación

---

## 1. Objetivo

Automatizar el proceso de cobranza mediante:
1. Carga de archivo Excel/CSV con operaciones a cobrar
2. Extracción inteligente de datos (RFC, monto, concepto, fecha)
3. Creación/actualización de clientes y operaciones
4. Generación de estado de cuenta PDF (últimos 3 meses)
5. Generación de mensaje personalizado para WhatsApp
6. Preview manual antes de enviar

---

## 2. Flujo Principal

```
┌─────────────┐    ┌──────────────┐    ┌────────────┐    ┌───────────┐    ┌─────────┐
│  Cargar     │───▶│ Extraer RFC │───▶│ Buscar/    │───▶│ Generar   │───▶│ Mostrar │
│  Excel/CSV  │    │ + Operaciones│   │ Crear      │    │ PDF       │    │ en UI   │
└─────────────┘    └──────────────┘    │ Cliente   │    └───────────┘    └─────────┘
                                        └────────────┘           │
                                              │                  ▼
                                        ┌──────▼──────┐    ┌───────────┐
                                        │ Generar     │◀───│ Preview   │
                                        │ Mensaje WA  │    │ (opcional)│
                                        └─────────────┘    └───────────┘
                                               │                    │
                                               ▼                    ▼
                                        ┌───────────┐       ┌──────────┐
                                        │ Abrir WA  │       │ Confirmar│
                                        │ (manual)  │       │ y Enviar │
                                        └───────────┘       └──────────┘
```

---

## 3. Frecuencia de Ejecución

- **Manual on-demand**: 2-4 veces por mes
- **Fase 2** (pendiente): Programado automáticamente

---

## 4. Datos del Archivo

### Columnas Esperadas (mapeo inteligente por IA)

| Campo | Obligatorio | Descripción |
|-------|------------|-------------|
| RFC | Sí | Identificador único del cliente |
| Nombre | No | Nombre del cliente |
| Monto | Sí | Cantidad a cobrar |
| Concepto/Tipo | Sí | Tipo de servicio (FISCAL, DECLARACIÓN, NÓMINA, etc.) |
| Fecha Vencimiento | No | Default: hoy + 30 días |
| Teléfono | No | Para WhatsApp |
| Email | No | Correo electrónico |

### Mapeo por IA

- El sistema usa IA para detectar sinónimos: "RFC", "Identificador", "Tax ID" → RFC
- "Monto", "Cantidad", "Saldo", "Importe" → Monto
- "Concepto", "Descripción", "Servicio" → Concepto

---

## 5. Estado de Cuenta PDF

### Estructura (últimos 3 meses)

```
┌─────────────────────────────────────────┐
│  [Nombre Despacho]                      │
│  Cliente: XXXXXX | RFC: XXXXXXXXXXX     │
│  Fecha: DD/MM/YYYY                      │
├─────────────────────────────────────────┤
│  CONCEPTOS PENDIENTES                  │
│  ────────────────────────────────────  │
│  1. Servicio - $X,XXX                   │
│     Vence: DD/mes/YYYY (X días)        │
│                                         │
│  TOTAL PENDIENTE: $X,XXX                │
├─────────────────────────────────────────┤
│  HISTORIAL PAGADO (últimos 3 meses)    │
│  ────────────────────────────────────  │
│  • Servicio - $X,XXX                    │
│    Pagado: DD/mes/YYYY                 │
├─────────────────────────────────────────┤
│  [Datos bancarios]                     │
└─────────────────────────────────────────┘
```

---

## 6. Mensaje WhatsApp

### Template

```
*{NOMBRE_DESPACHO}* - Recordatorio de Pago

Estimado *{CLIENTE}*, le informamos que tiene los siguientes conceptos pendientes:

{CONCEPTOS_LISTADO}

*TOTAL PENDIENTE: {TOTAL}*

Para realizar su pago, puede usar los siguientes datos:
- Beneficiario: {BENEFICIARIO}
- Banco: {BANCO}
- CLABE: {CLABE}

Últimos 3 meses ha realizado pagos por $XXX.XX

Gracias por su atención.
{NOMBRE_DEPTO} | {TEL}
```

### Variables

| Variable | Descripción |
|----------|-------------|
| {NOMBRE_DESPACHO} | Nombre del despacho desde Config |
| {CLIENTE} | Nombre del cliente |
| {CONCEPTOS_LISTADO} | Lista de conceptos pendientes |
| {TOTAL} | Total pendiente formateado |
| {BENEFICIARIO} | Beneficiario desde Config |
| {BANCO} | Banco desde Config |
| {CLABE} | CLABE desde Config |
| {DEPTO} | Departamento desde Config |
| {TEL} | Teléfono desde Config |

---

## 7. API Collecta - Endpoints Necesarios

### Existentes a usar

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /api/clients | Listar clientes |
| GET | /api/clients/:id | Cliente por ID |
| POST | /api/clients | Crear cliente |
| PUT | /api/clients/:id | Actualizar cliente |
| POST | /api/operations | Crear operación |
| GET | /api/operations | Listar operaciones |
| GET | /api/config | Obtener configuración |

### Nuevos a crear

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | /api/import/batch | Recibe headers+rows, procesa en lote |
| GET | /api/operations/cliente/:rfc/historial | Historial 3 meses de un cliente |
| GET | /api/clients/by-rfc/:rfc | Busca cliente por RFC |

---

## 8. Integración n8n

### Workflow n8n

```
[Trigger: Manual/Webhook]
    ↓
[Read Binary File] - procesar Excel/CSV
    ↓
[Spreadsheet File] - Parse Excel a JSON
    ↓
[Code] - Mapear columnas con IA o regex
    ↓
[HTTP Request] - POST /api/import/batch
    ↓
[Loop over Items] - Para cada cliente:
    ├─ [HTTP Request] - GET historial
    ├─ [Function] - Generar PDF
    ├─ [Function] - Generar mensaje WA
    ├─ [Telegram/WhatsApp] - Preview
    └─ [Wait for Confirmation] - (Fase 1)
    ↓
[End]
```

### Credenciales n8n

- **Basic Auth** para连接到 Collecta API
- **WhatsApp Business API** o integración con WhatsApp Web

---

## 9. Modo Manual vs Automático

### Fase 1: Manual (usuario confirma)

1. Usuario carga archivo → n8n procesa
2. Sistema muestra lista de clientes procesados
3. Usuario revisa cada cliente:
   - Ver mensaje WA generado
   - Ver PDF estado de cuenta
4. Usuario hace click → abre WhatsApp Web con mensaje + PDF
5. Usuario revisa y envía manualmente

### Fase 2: Automático (pendiente)

- Envío directo sin confirmación
- Programación (cron)
- Reintentos automáticos
- Bitácora de envíos

---

## 10. Casos Edge

| Caso | Manejo |
|------|--------|
| RFC no existe en archivo | Crear cliente nuevo con datos disponibles |
| RFC ya existe | Actualizar datos si hay cambios |
| Cliente sin teléfono | Omitir de envío WA, marcar para revisión |
| Monto inválido | Omitir fila, reportar en log |
| Duplicado (mismo RFC+monto+fecha) | Omitir, reportar |
| Archivo vacío | Error con mensaje claro |

---

## 11. Pendiente/Futuro

- [ ] Modo automático (Fase 2)
- [ ] Programación cron (2-4 veces/mes)
- [ ] Reintentos de envío
- [ ] Bitácora completa de envíos
- [ ] Estadísticas de cobranza

---

## 12. Referencias

- Archivo: `docs/n8n-cobranza-flow.md`
- AI Cascade: `backend/src/services/aiCascade.ts`
- Extract API: `backend/src/routes/extract.ts`
- Config keys: `nombre_despacho`, `banco`, `clabe`, `beneficiario`, `depto`, `tel`
