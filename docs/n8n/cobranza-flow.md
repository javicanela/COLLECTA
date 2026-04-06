# n8n Templates para Flujo de Cobranza

 Colección de templates de [awesome-n8n-templates](https://github.com/enescingoz/awesome-n8n-templates) para construir el flujo de cobranza automatizada.

---

## 1. Templates Recomendados

### 📊 Extracción y Procesamiento de Excel/Datos

| Template | URL | Uso |
|----------|-----|-----|
| Chat with a Google Sheet using AI | [Descargar](https://raw.githubusercontent.com/enescingoz/awesome-n8n-templates/main/Google_Drive_and_Google_Sheets/Chat%20with%20a%20Google%20Sheet%20using%20AI.json) | Consultar datos de Excel con AI |
| Qualify new leads in Google Sheets via OpenAI | [Descargar](https://raw.githubusercontent.com/enescingoz/awesome-n8n-templates/main/Google_Drive_and_Google_Sheets/Qualify%20new%20leads%20in%20Google%20Sheets%20via%20OpenAI_s%20GPT-4.json) | Procesamiento de datos con GPT-4 |
| AI Data Extraction with Dynamic Prompts and Airtable | [Descargar](https://raw.githubusercontent.com/enescingoz/awesome-n8n-templates/main/OpenAI_and_LLMs/AI%20Data%20Extraction%20with%20Dynamic%20Prompts%20and%20Airtable.json) | **Extracción de datos con prompts dinámicos** |

### 📄 Generación de PDF

| Template | URL | Uso |
|----------|-----|-----|
| Extract data from resume and create PDF with Gotenberg | [Descargar](https://raw.githubusercontent.com/enescingoz/awesome-n8n-templates/main/PDF_and_Document_Processing/Extract%20data%20from%20resume%20and%20create%20PDF%20with%20Gotenberg.json) | **Generar PDF con datos dinámicos** |
| Extract text from PDF and image using Vertex AI (Gemini) into CSV | [Descargar](https://raw.githubusercontent.com/enescingoz/awesome-n8n-templates/main/PDF_and_Document_Processing/Extract%20text%20from%20PDF%20and%20image%20using%20Vertex%20AI%20(Gemini)%20into%20CSV.json) | Extracción de PDF a datos |
| Invoice data extraction with LlamaParse and OpenAI | [Descargar](https://raw.githubusercontent.com/enescingoz/awesome-n8n-templates/main/PDF_and_Document_Processing/Invoice%20data%20extraction%20with%20LlamaParse%20and%20OpenAI.json) | Parsing de documentos |

### 💬 WhatsApp

| Template | URL | Uso |
|----------|-----|-----|
| Automate Sales Meeting Prep with AI & APIFY Sent To WhatsApp | [Descargar](https://raw.githubusercontent.com/enescingoz/awesome-n8n-templates/main/WhatsApp/Automate%20Sales%20Meeting%20Prep%20with%20AI%20%26%20APIFY%20Sent%20To%20WhatsApp.json) | **Envío de archivos por WhatsApp** |
| Building Your First WhatsApp Chatbot | [Descargar](https://raw.githubusercontent.com/enescingoz/awesome-n8n-templates/main/WhatsApp/Building%20Your%20First%20WhatsApp%20Chatbot.json) | Configuración básica WA |
| Complete business WhatsApp AI-Powered RAG Chatbot using OpenAI | [Descargar](https://raw.githubusercontent.com/enescingoz/awesome-n8n-templates/main/WhatsApp/Complete%20business%20WhatsApp%20AI-Powered%20RAG%20Chatbot%20using%20OpenAI.json) | Chatbot IA con contexto |

---

## 2. Flujo Completo de Cobranza

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FLUJO DE COBRANZA n8n                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. UPLOAD EXCEL                                                   │
│     └─► Manual Trigger → Read Binary File → Parse Excel            │
│                                                                     │
│  2. PROCESAR DATOS (AI)                                            │
│     └─► OpenAI/Gemini: Extraer operaciones                        │
│         └─► Filtrar últimos 3 meses                                 │
│         └─► Calcular pendiente vs pagado                            │
│                                                                     │
│  3. GENERAR MENSAJE                                                 │
│     └─► Template con variables: {NOMBRE}, {MONTO}, {FECHA}          │
│         └─► Preview para aprobación manual                         │
│                                                                     │
│  4. GENERAR PDF (Estado de Cuenta)                                 │
│     └─► Gotenberg o @react-pdf/renderer                            │
│         └─► Header: Datos del despacho                             │
│         └─► Tabla: Saldos pendientes (últimos 3 meses)             │
│         └─► Tabla: Historial de pagos                              │
│         └─► Footer: Datos bancarios                                │
│                                                                     │
│  5. ENVIAR WHATSAPP                                                │
│     └─► WhatsApp Business API                                       │
│         └─► 1° Mensaje de texto                                     │
│         └─► 2° Documento PDF                                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Prompt de Extracción de Operaciones

Usa este prompt en el paso de AI para extraer operaciones del Excel:

```
Eres un asistente de cobranza. Del siguiente Excel extrae las operaciones
de un cliente y organízalas en formato JSON.

INSTRUCCIONES:
1. Identifica las columnas: cliente, RFC, tipo de operación, descripción, monto, fecha vencimiento, fecha pago
2. Solo incluye operaciones de los ÚLTIMOS 3 MESES
3. Calcula el total pendiente y el total pagado
4. Clasifica cada operación: PENDIENTE, VENCIDO, PAGADO

RESPONSE FORMAT (JSON):
{
  "cliente": { "nombre": "", "rfc": "", "telefono": "" },
  "operaciones": [
    {
      "tipo": "",
      "descripcion": "",
      "monto": 0,
      "fechaVence": "YYYY-MM-DD",
      "fechaPago": "YYYY-MM-DD | null",
      "estatus": "PENDIENTE | VENCIDO | PAGADO"
    }
  ],
  "resumen": {
    "totalPendiente": 0,
    "totalPagado": 0,
    "operacionesVencidas": 0
  }
}
```

---

## 4. Template de Mensaje de Cobranza

### Mensaje Vencido
```
*{NOMBRE_DESPACHO}* - Recordatorio de Pago Vencido

Estimado *{CLIENTE}*, Su cuenta presenta un saldo vencido de *{MONTO}*
correspondiente a: {CONCEPTO}

Fecha de vencimiento: {FECHA} (*{DIAS} dias de retraso*)

Datos para Transferencia:
Beneficiario: {BENEFICIARIO}
Banco: {BANCO}
CLABE: {CLABE}

{DEPTO} | {TEL_DESPACHO} | {EMAIL_DESPACHO}
```

### Mensaje Hoy Vence
```
*{NOMBRE_DESPACHO}* - Vencimiento Hoy

Estimado *{CLIENTE}*, Hoy *{FECHA}* es la fecha limite para realizar su pago.

Saldo pendiente: *{MONTO}*
Concepto: {CONCEPTO}

Datos: Beneficiario: {BENEFICIARIO} | Banco: {BANCO} | CLABE: {CLABE}

{DEPTO} | {TEL_DESPACHO}
```

### Mensaje Recordatorio
```
*{NOMBRE_DESPACHO}* - Proximo Vencimiento

Estimado *{CLIENTE}*, Le recordamos que el proximo *{FECHA}* vence su pago.

Saldo pendiente: *{MONTO}*
Concepto: {CONCEPTO} ({DIAS} dias restantes)

Datos: Beneficiario: {BENEFICIARIO} | Banco: {BANCO} | CLABE: {CLABE}

{DEPTO} | {TEL_DESPACHO}
```

---

## 5. Estructura del PDF de Estado de Cuenta

```
┌─────────────────────────────────────────────┐
│  [HEADER - Navy #0c2340]                    │
│  {NOMBRE_DESPACHO}                          │
│  {DEPTO} | {TEL} | {EMAIL}                  │
│  ESTADO DE CUENTA           Fecha: {FECHA} │
├─────────────────────────────────────────────┤
│  [DATOS CLIENTE]                            │
│  Cliente: {NOMBRE}      RFC: {RFC}          │
│  Régimen: {REGIMEN}    Asesor: {ASESOR}    │
├─────────────────────────────────────────────┤
│  [SALDOS PENDIENTES]                        │
│  ┌──────────┬──────────────┬────────┬─────┐ │
│  │ Tipo     │ Descripción  │ Monto  │Days │ │
│  ├──────────┼──────────────┼────────┼─────┤ │
│  │ VENCIDO  │ Declarac...  │ $2,100 │ 15  │ │
│  │ HOY VENCE│ Nomina...    │ $3,500 │ 0   │ │
│  └──────────┴──────────────┴────────┴─────┘ │
│                                     TOTAL: $ │ │
├─────────────────────────────────────────────┤
│  [HISTORIAL DE PAGOS]                       │
│  ┌──────────┬──────────────┬────────┬─────┐ │
│  │ Tipo     │ Descripción  │ Monto  │Fecha│ │
│  ├──────────┼──────────────┼────────┼─────┤ │
│  │ PAGADO   │ Declarac...  │ $2,100 │15/01│ │
│  └──────────┴──────────────┴────────┴─────┘ │
│                                     TOTAL: $ │ │
├─────────────────────────────────────────────┤
│  [DATOS BANCARIOS - Navy]                   │
│  Beneficiario: {BENEFICIARIO}               │
│  Banco: {BANCO}                             │
│  CLABE: {CLABE}                             │
└─────────────────────────────────────────────┘
```

---

## 6. Variables Disponibles

| Variable | Descripción |
|----------|-------------|
| `{NOMBRE_DESPACHO}` | Nombre del despacho |
| `{CLIENTE}` | Nombre del cliente |
| `{RFC}` | RFC del cliente |
| `{MONTO}` | Monto pendiente (formato MXN) |
| `{CONCEPTO}` | Descripción de la operación |
| `{FECHA}` | Fecha de vencimiento |
| `{DIAS}` | Días restantes o de retraso |
| `{BENEFICIARIO}` | Nombre del beneficiario |
| `{BANCO}` | Nombre del banco |
| `{CLABE}` | CLABE interbancaria |
| `{DEPTO}` | Departamento |
| `{TEL_DESPACHO}` | Teléfono del despacho |
| `{EMAIL_DESPACHO}` | Email del despacho |

---

## 7. Configuración de APIs Requeridas

| Servicio | API Key Requerida |
|----------|-------------------|
| OpenAI | `OPENAI_API_KEY` |
| Google Gemini | `GEMINI_API_KEY` |
| WhatsApp Business | Meta Developer Portal |
| Gotenberg (PDF) | Self-hosted o cloud |

---

## 8. Referencias

- Repo original: https://github.com/enescingoz/awesome-n8n-templates
- n8n Official: https://n8n.io
- Documentación WhatsApp API: https://developers.facebook.com/docs/whatsapp
