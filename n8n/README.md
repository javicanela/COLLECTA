# 🚀 Collecta n8n Workflows — Guía de Configuración

## Requisitos previos

1. **n8n instalado** — Docker recomendado en tu VPS
2. **Backend Collecta corriendo** — con los nuevos endpoints `/api/n8n/*`
3. **Telegram Bot** — para recibir notificaciones
4. **Evolution API** — para envío automático de WhatsApp (workflow #2)
5. **Gemini API Key** — para detección de pagos (workflow #3)
6. **Gmail OAuth2** — para cobranza por email (workflow #4)

---

## Estructura de archivos

```
n8n/
├── workflows/
│   ├── 01_reporte_diario_cartera.json       ← Reporte diario 8:00 AM
│   ├── 02_cobranza_automatica_whatsapp.json  ← WhatsApp automático 9:30 AM
│   ├── 03_deteccion_pagos_gemini_vision.json ← Webhook para comprobantes
│   └── 04_cobranza_email_pdf.json            ← Email con PDF 10:00 AM
├── .env.example                              ← Variables de entorno
└── README.md                                 ← Este archivo
```

---

## Paso 1: Configurar variables de entorno en n8n

Copia las variables de `.env.example` a tu instancia n8n:

```bash
# Si usas Docker, agrégalas al docker-compose.yml:
environment:
  - COLLECTA_API_URL=http://host.docker.internal:3001
  - TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
  - TELEGRAM_CHAT_ID=123456789
  - EVOLUTION_API_URL=http://localhost:8080
  - EVOLUTION_INSTANCE=collecta
  - EVOLUTION_API_KEY=tu_api_key
  - GEMINI_API_KEY=tu_gemini_key
```

> ⚠️ Si n8n corre en Docker y Collecta en el host, usa `host.docker.internal` en lugar de `localhost`.

---

## Paso 2: Importar los workflows

1. Abre n8n → **Workflows** → **Import from file**
2. Importa los 4 JSON en orden:
   - `01_reporte_diario_cartera.json`
   - `02_cobranza_automatica_whatsapp.json`
   - `03_deteccion_pagos_gemini_vision.json`
   - `04_cobranza_email_pdf.json`
3. **Activa** cada workflow (toggle en la esquina superior derecha)

---

## Paso 3: Configurar Telegram Bot

1. Abre Telegram y busca `@BotFather`
2. Envía `/newbot` y sigue las instrucciones
3. Copia el **token** que te da BotFather
4. Para obtener tu `chat_id`:
   - Envía un mensaje a tu bot
   - Visita: `https://api.telegram.org/bot<TU_TOKEN>/getUpdates`
   - Busca `"chat":{"id": XXXXXXX}` → ese es tu `TELEGRAM_CHAT_ID`

---

## Paso 4: Configurar Evolution API (WhatsApp)

> Solo necesario para el workflow #2

1. Instala Evolution API en tu VPS: https://doc.evolution-api.com/
2. Crea una instancia y conecta tu WhatsApp escaneando el QR
3. Copia la API key y configura las variables de entorno

---

## Paso 5: Configurar Gmail OAuth2 (Email)

> Solo necesario para el workflow #4

1. En n8n → **Settings** → **Credentials**
2. **Add Credential** → **Gmail OAuth2**
3. Sigue la guía de n8n para configurar OAuth2 con tu cuenta Gmail
4. Edita el workflow #4 y selecciona tu credencial Gmail en el nodo "📧 Enviar Email + PDF"

---

## Endpoints del backend que usan estos workflows

Todos están bajo `/api/n8n/`:

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/n8n/daily-report` | GET | Reporte enriquecido con stats, top deudores, desglose por asesor |
| `/api/n8n/pending-collections` | GET | Operaciones pendientes con mensajes WA pre-formateados |
| `/api/n8n/webhook/payment-confirmed` | POST | Webhook para confirmar pagos detectados automáticamente |

Estos endpoints NO requieren autenticación para permitir acceso desde n8n.

---

## Horarios de ejecución

| Hora | Workflow | Acción |
|------|----------|--------|
| 8:00 AM | #1 Reporte diario | Envía resumen de cartera por Telegram |
| 9:30 AM | #2 Cobranza WA | Envía mensajes de cobro por WhatsApp |
| 10:00 AM | #4 Cobranza Email | Envía emails con PDF adjunto |
| *Siempre activo* | #3 Detección pagos | Webhook esperando comprobantes |

---

## Testing

### Probar reporte diario:
```bash
curl http://localhost:3001/api/n8n/daily-report | jq .
```

### Probar pendientes de cobro:
```bash
curl http://localhost:3001/api/n8n/pending-collections | jq .
```

### Probar webhook de pago:
```bash
curl -X POST http://localhost:3001/api/n8n/webhook/payment-confirmed \
  -H "Content-Type: application/json" \
  -d '{"rfc":"XAXX010101000","monto":2100,"referencia":"REF123"}'
```

---

## Solución de problemas

| Problema | Solución |
|----------|----------|
| n8n no puede conectar a Collecta API | Verifica `COLLECTA_API_URL`. Si Docker, usa `host.docker.internal` |
| Telegram no envía mensajes | Verifica bot token y chat_id. Envía un mensaje al bot primero |
| Evolution API error | Verifica que la instancia WA esté conectada (QR escaneado) |
| Gmail no envía | Re-autoriza OAuth2 en n8n Credentials |
| Gemini Vision no analiza imagen | Verifica que la imagen esté en base64. Tamaño máximo: 4MB |
