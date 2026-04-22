# COLLECTA SAAS — Playbook de Implementación del Agente Autónomo

> **Versión:** 1.0  
> **Fecha:** 2026-04-15  
> **Proyecto:** Collecta - Herramienta de Cobranza Inteligente  
> **URL:** https://collecta-azure.vercel.app/

---

## 1. VISIÓN DEL PROYECTO

Collecta es un **SaaS de cobranza inteligente** diseñado para despachos contables. El sistema incluye un **agente 100% autónomo** que ejecuta las tareas de cobranza sin intervención humana, pero con capacidad de monitoreo, control e interrupción por parte del operador.

### Arquitectura Objetivo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              COLLECTA SAAS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────┐    ┌──────────────────────┐                      │
│  │   FRONTEND (Vercel)   │    │   BACKEND (Docker)   │                      │
│  │  React + TypeScript   │◄───►│  Express + Prisma    │                      │
│  │  collecta-azure.vercel│    │  SQLite/PostgreSQL   │                      │
│  │  - Dashboard          │    │  - API REST           │                      │
│  │  - Panel Agente       │    │  - Endpoints Agente  │                      │
│  │  - Directorio         │    │  - Auth JWT           │                      │
│  │  - Configuración      │    └──────────────────────┘                      │
│  └──────────────────────┘              │                                      │
│              │                         │                                      │
│              │                         │                                      │
│              ▼                         ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                     n8n CON IA (Agente Autónomo)                        ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   ││
│  │  │  Collect    │  │  Analyze     │  │  Execute    │  │  Monitor    │   ││
│  │  │  Data       │  │  AI          │  │  Actions    │  │  & Control  │   ││
│  │  │  (READ)     │  │  (DECIDE)    │  │  (SEND)     │  │  (LOGS)     │   ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                          │                                    │
│                                          ▼                                    │
│  ┌──────────────────────┐    ┌──────────────────────┐                        │
│  │  EVOLUTION API       │    │   GOOGLE SHEETS       │                        │
│  │  (WhatsApp)          │    │   (Reportes)         │                        │
│  └──────────────────────┘    └──────────────────────┘                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. REQUISITOS CONFIRMADOS

| Requisito | Valor |
|-----------|-------|
| **SaaS** | Multi-tenant preparado (BajaTax = primer cliente) |
| **Agente** | 100% autónomo en n8n con IA |
| **Frecuencia** | Días de gracia: 1 y 15 de cada mes |
| **Canales** | Multi-canal configurable (WhatsApp principal) |
| **Acceso datos** | Solo lectura |
| **Control** | Ver, cancelar, interrumpir acciones |
| **Agente** | Global (servicio del SaaS) |
| **Pagos** | Imágenes (Gemini Vision) + Texto/Referencia |

---

## 3. ARQUITECTURA DEL AGENTE AUTÓNOMO

### 3.1 Componentes del Agente (n8n)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  AGENTE AUTÓNOMO COLLECTA (n8n)                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─ TRIGGER (Planificado + Manual) ─────────────────────────────────────┐  │
│  │  • Cron: 1 y 15 a las 9:00 AM                                        │  │
│  │  • Manual: Botón "Ejecutar" en n8n                                   │  │
│  │  • Webhook: Recepción de pagos externos                             │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                   │                                          │
│                                   ▼                                          │
│  ┌─ FASE 1: RECOLECTAR (Read Only) ─────────────────────────────────────┐  │
│  │  • GET /api/agent/operations/pending (operaciones pendientes)      │  │
│  │  • GET /api/agent/clients/active (clientes activos)                │  │
│  │  • GET /api/agent/config (configuración del despacho)              │  │
│  │  • GET /api/agent/actions/pending (acciones por ejecutar)         │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                   │                                          │
│                                   ▼                                          │
│  ┌─ FASE 2: ANALIZAR (IA) ────────────────────────────────────────────┐  │
│  │  • Clasificar operaciones por urgencia                             │  │
│  │  • Determinar mensaje óptimo por cliente                           │  │
│  │  • Detectar patrones de pago                                        │  │
│  │  • Generar estrategia de cobranza                                    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                   │                                          │
│                                   ▼                                          │
│  ┌─ FASE 3: EJECUTAR ──────────────────────────────────────────────────┐  │
│  │  • Enviar recordatorios WhatsApp (Evolution API)                   │  │
│  │  • Generar PDFs de estado de cuenta                                │  │
│  │  • Enviar PDFs por WhatsApp                                        │  │
│  │  • Procesar pagos detectados                                       │  │
│  │  • Actualizar logs en backend                                       │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                   │                                          │
│                                   ▼                                          │
│  ┌─ FASE 4: MONITOREO Y CONTROL ──────────────────────────────────────┐  │
│  │  • Guardar ejecución en logs                                        │  │
│  │  • Generar reporte de acciones realizadas                          │  │
│  │  • ENDPOINT: INTERRUMPIR/CANCELAR                                   │  │
│  │  • Dashboard visible en Collecta frontend                          │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Flujo de Decisión del Agente

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLUJO DE DECISIÓN DEL AGENTE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  START                                                                        │
│    │                                                                          │
│    ▼                                                                          │
│  ┌───────────────────────────────┐                                            │
│  │ ¿Hay operaciones pendientes? │                                            │
│  └───────────────────────────────┘                                            │
│    │                                    │                                      │
│    ▼ SÍ                                 ▼ NO                                   │
│  ┌───────────────────────────────┐    ┌───────────────────────────────┐     │
│  │ Clasificar por urgencia:      │    │ ¿Ejecución manual?            │     │
│  │ • VENCIDAS (máxima prioridad) │    └───────────────────────────────┘     │
│  │ • HOY VENCE                   │      │                                    │
│  │ • POR VENCER (5 días)          │      ▼ SÍ            ▼ NO               │
│  │ • AL CORRIENTE                │    Ejecución     Fin (no hay nada      │
│  └───────────────────────────────┘    completa       que hacer)            │
│    │                                                                          │
│    ▼                                                                          │
│  ┌───────────────────────────────┐                                           │
│  │ Para cada cliente:             │                                           │
│  │ 1. Obtener datos completos     │                                           │
│  │ 2. Seleccionar plantilla WA    │                                           │
│  │ 3. Reemplazar variables        │                                           │
│  │ 4. ¿Canal disponible?          │                                           │
│  └───────────────────────────────┘                                           │
│    │                                    │                                      │
│    ▼ SÍ                                 ▼ NO (skip)                           │
│  ┌───────────────────────────────┐                                            │
│  │ ¿Modo PRUEBA?                 │                                            │
│  └───────────────────────────────┘                                            │
│    │                                    │                                      │
│    ▼ SÍ                                 ▼ NO                                   │
│  ┌───────────────────────────────┐    ┌───────────────────────────────┐     │
│  │ Enviar a telPrueba            │    │ Enviar a cliente real         │     │
│  │ + Registrar en logs            │    │ + Registrar en logs           │     │
│  └───────────────────────────────┘    └───────────────────────────────┘     │
│    │                                                                          │
│    ▼                                                                          │
│  Rate Limit: esperar 1.5s entre envíos                                        │
│    │                                                                          │
│    ▼                                                                          │
│  ┌───────────────────────────────┐                                           │
│  │ ¿Hay acción cancelada por      │                                           │
│  │ usuario?                      │                                           │
│  └───────────────────────────────┘                                            │
│    │                                                                          │
│    ▼ SÍ                                                                         │
│  DETENER envío y registrar como CANCELADO                                    │
│    │                                                                          │
│    ▼                                                                          │
│  GENERAR reporte final                                                        │
│    │                                                                          │
│    ▼                                                                          │
│  FIN                                                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. WORKFLOWS n8n - DISEÑO COMPLETO

### 4.1 Workflow Principal: `agente_cobranza_autonomo.json`

**Trigger**: Programado (1 y 15) + Manual

**Nodos**:

| Fase | Nodo | Función | Tipo |
|------|------|---------|------|
| Trigger | `Schedule Trigger` | 1 y 15 a las 9:00 AM | Cron |
| Trigger | `Manual Trigger` | Ejecución manual | Manual |
| 1 | `HTTP - Get Pending Operations` | Leer operaciones pendientes | HTTP Request |
| 1 | `HTTP - Get Active Clients` | Leer clientes activos | HTTP Request |
| 1 | `HTTP - Get Config` | Leer configuración | HTTP Request |
| 2 | `IF - Has Pending` | ¿Hay operaciones pendientes? | IF |
| 2A | `AI - Classify Operations` | IA clasifica por urgencia | OpenAI |
| 2A | `AI - Generate Strategy` | IA genera estrategia | OpenAI |
| 3 | `Split In Batches` | Procesar cada cliente | Split In Batches |
| 3 | `IF - Has Phone` | ¿Cliente tiene teléfono? | IF |
| 3A | `HTTP - Send WhatsApp` | Enviar via Evolution API | HTTP Request |
| 3A | `Wait` | Rate limit 1.5s | Wait |
| 3A | `HTTP - Log Action` | Registrar en backend | HTTP Request |
| 4 | `Set - Execution Report` | Generar reporte final | Set |
| 4 | `HTTP - Save Report` | Guardar en backend | HTTP Request |

### 4.2 Workflow de Detección de Pagos: `agente_deteccion_pagos.json`

**Trigger**: Webhook (siempre activo)

**Nodos**:

| Fase | Nodo | Función | Tipo |
|------|------|---------|------|
| Trigger | `Webhook` | Receptor de imágenes/texto | Webhook |
| 1 | `IF - Image or Text` | Determinar tipo de entrada | IF |
| 2A | `AI - Analyze Image` | Gemini Vision (imágenes) | HTTP Request |
| 2B | `AI - Parse Text` | Parseo de texto | OpenAI |
| 3 | `HTTP - Find Operation` | Buscar operación coincidente | HTTP Request |
| 4 | `IF - Match Found` | ¿Se encontró? | IF |
| 4A | `HTTP - Mark Paid` | Marcar como pagado | HTTP Request |
| 4A | `HTTP - Send Confirmation` | Confirmar al cliente | HTTP Request |
| 4B | `HTTP - Notify Human` | Notificar al operador | HTTP Request |
| 5 | `HTTP - Log` | Registrar acción | HTTP Request |

### 4.3 Workflow de Sincronización: `agente_sincronizacion_sheets.json`

**Trigger**: Programado (diario 6:00 AM) + Manual

**Nodos**:

| Fase | Nodo | Función | Tipo |
|------|------|---------|------|
| Trigger | `Schedule Trigger` | Diario a las 6:00 AM | Cron |
| Trigger | `Manual Trigger` | Ejecución manual | Manual |
| 1 | `HTTP - Get Operations` | Leer operaciones | HTTP Request |
| 2 | `Transform - To Sheets Format` | Transformar datos | Transform |
| 3 | `Google Sheets - Append/Update` | Sincronizar | Google Sheets |
| 4 | `HTTP - Log Sync` | Registrar sincronización | HTTP Request |

---

## 5. ENDPOINTS BACKEND

### 5.1 Endpoints para el Agente (Solo Lectura)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/agent/operations/pending` | GET | Operaciones pendientes agrupadas por status |
| `/api/agent/operations/urgent` | GET | Operaciones urgentes (vencidas/hoy) |
| `/api/agent/clients/active` | GET | Clientes activos con contacto |
| `/api/agent/clients/:id/details` | GET | Detalles completos de un cliente |
| `/api/agent/config` | GET | Configuración del despacho |
| `/api/agent/templates` | GET | Plantillas WhatsApp |
| `/api/agent/evolution/instance` | GET | Estado de Evolution API |

### 5.2 Endpoints de Control del Agente

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/agent/execution/start` | POST | Iniciar ejecución del agente |
| `/api/agent/execution/stop` | POST | Detener ejecución activa |
| `/api/agent/execution/pause` | POST | Pausar ejecución |
| `/api/agent/execution/resume` | POST | Reanudar ejecución |
| `/api/agent/execution/status` | GET | Estado actual del agente |
| `/api/agent/execution/history` | GET | Historial de ejecuciones |
| `/api/agent/execution/:id` | GET | Detalles de una ejecución específica |

### 5.3 Endpoints de Acciones

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/agent/actions/pending` | GET | Acciones pendientes por ejecutar |
| `/api/agent/actions/cancel/:id` | POST | Cancelar acción específica |
| `/api/agent/actions/cancel-all` | POST | Cancelar todas las acciones pendientes |
| `/api/agent/actions/approve/:id` | POST | Aprobar acción pendiente |

### 5.4 Estructura de Respuesta del Dashboard

```typescript
// GET /api/agent/dashboard
interface AgentDashboard {
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPED';
  currentExecution: {
    id: string;
    startedAt: string;
    phase: 'COLLECT' | 'ANALYZE' | 'EXECUTE' | 'MONITOR';
    progress: number; // 0-100
    currentAction: string;
  } | null;
  nextScheduledRun: string;
  stats: {
    totalClients: number;
    totalOperations: number;
    pendingAmount: number;
    vencidas: number;
    hoyVence: number;
    porVencer: number;
    pagadasHoy: number;
  };
  pendingActions: PendingAction[];
  recentActions: ActionLog[];
}

interface PendingAction {
  id: string;
  executionId: string;
  clientId: string;
  clientName: string;
  action: 'WHATSAPP_MESSAGE' | 'WHATSAPP_PDF' | 'FOLLOWUP';
  status: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'CANCELLED';
  scheduledAt: string;
  messagePreview?: string;
}

interface ActionLog {
  id: string;
  executionId: string;
  clientId: string;
  clientName: string;
  action: string;
  status: 'SENT' | 'FAILED' | 'CANCELLED';
  sentAt: string;
  error?: string;
}
```

---

## 6. DASHBOARD EN FRONTEND (SAAS)

### 6.1 Vista Principal: Panel del Agente

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  COLLECTA - Panel del Agente                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─ ESTADO DEL AGENTE ──────────────────────────────────────────────────┐  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐         │  │
│  │  │  ACTIVO    │  │  ÚLTIMO:   │  │  ACCIONES: │  │  ESTADO:   │         │  │
│  │  │  ● verde   │  │  15/04/26  │  │   45       │  │  Ejecutando│         │  │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘         │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌─ PRÓXIMA EJECUCIÓN ─────────────────────────────────────────────────┐  │
│  │  01/Mayo/2026 a las 9:00 AM  │  [EJECUTAR AHORA]  │  [DETENER]       │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌─ ESTADÍSTICAS DE CARTERA ─────────────────────────────────────────────┐  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │  │
│  │  │VENCIDAS │ │HOY VENCE │ │POR VENCER│ │AL CORRIENTE│ │PAGADAS  │       │  │
│  │  │   12    │ │    3     │ │    8     │ │    45     │ │   23    │       │  │
│  │  │ $45,200 │ │ $12,500  │ │ $18,000  │ │ $120,000  │ │ $89,000 │       │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘       │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌─ ACCIONES PENDIENTES ──────────────────────────────────────────────┐  │
│  │  ┌──────────────────────────────────────────────────────────────┐    │  │
│  │  │ □ Enviarrecordatorio a Colegio de Anestesiólogos ($2,100)  │    │  │
│  │  │ □ Enviarrecordatorio a Empresa XYZ ($5,000)                 │    │  │
│  │  │ □ Generar PDF para Cliente ABC                             │    │  │
│  │  │ ...                                                         │    │  │
│  │  └──────────────────────────────────────────────────────────────┘    │  │
│  │                                                                       │  │
│  │  [APROBAR TODAS]  [CANCELAR SELECCIONADAS]                          │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌─ HISTORIAL DE EJECUCIONES ──────────────────────────────────────────┐  │
│  │  ┌──────────────────────────────────────────────────────────────┐     │  │
│  │  │ 15/Abr/2026 09:00  │  23 acciones │  23 ✓  │  0 ✗  │ Ver     │     │  │
│  │  │ 01/Abr/2026 09:00  │  18 acciones │  18 ✓  │  0 ✗  │ Ver     │     │  │
│  │  │ 15/Mar/2026 09:00  │  25 acciones │  24 ✓  │  1 ✗  │ Ver     │     │  │
│  │  └──────────────────────────────────────────────────────────────┘     │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Componentes de UI Requeridos

| Componente | Descripción |
|------------|-------------|
| `AgentStatusCard` | Muestra estado actual (IDLE/RUNNING/PAUSED) con indicador visual |
| `AgentNextRun` | Muestra próxima ejecución programada con botón de ejecutar manual |
| `AgentStats` | 5 tarjetas con stats de cartera |
| `PendingActionsList` | Lista de acciones pendientes con checkboxes |
| `ActionButtons` | Aprobar todas, Cancelar seleccionadas, Detener agente |
| `ExecutionHistory` | Tabla de ejecuciones históricas |
| `ExecutionDetail` | Modal con detalles de una ejecución específica |

---

## 7. ESQUEMA DE BASE DE DATOS

### 7.1 Modelos Prisma Existentes

```prisma
// Already exists - see backend/prisma/schema.prisma
model Client { ... }
model Operation { ... }
model LogEntry { ... }
model Config { ... }
model User { ... }
```

### 7.2 Nuevos Modelos para el Agente

```prisma
model AgentExecution {
  id            String   @id @default(cuid())
  status        String   @default("PENDING")  // PENDING, RUNNING, PAUSED, COMPLETED, STOPPED, FAILED
  phase         String   @default("COLLECT")   // COLLECT, ANALYZE, EXECUTE, MONITOR
  progress      Int      @default(0)
  startedAt     DateTime @default(now())
  completedAt   DateTime?
  totalActions  Int      @default(0)
  completedActions Int   @default(0)
  failedActions Int      @default(0)
  cancelledActions Int   @default(0)
  triggeredBy   String   @default("SCHEDULE")  // SCHEDULE, MANUAL, WEBHOOK
  tenantId      String   @default("default")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  actions       AgentAction[]
}

model AgentAction {
  id            String   @id @default(cuid())
  executionId   String
  execution     AgentExecution @relation(fields: [executionId], references: [id])
  clientId      String
  client        Client   @relation(fields: [clientId], references: [id])
  type          String                        // WHATSAPP_MESSAGE, WHATSAPP_PDF, FOLLOWUP
  status        String   @default("PENDING")  // PENDING, EXECUTING, COMPLETED, FAILED, CANCELLED
  message       String?
  phone         String?
  sentAt        DateTime?
  error         String?
  tenantId      String   @default("default")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model AgentConfig {
  id            String   @id @default(cuid())
  tenantId      String   @default("default")
  scheduleEnabled Boolean @default(true)
  scheduleCron   String   @default("0 9 1,15 * *")  // 1 y 15 a las 9:00 AM
  maxDailySends Int      @default(100)
  rateLimitMs   Int      @default(1500)
  sendPdfEnabled Boolean @default(true)
  notifyOnFail  Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

---

## 8. PLAN DE IMPLEMENTACIÓN POR FASES

### Fase 1: Backend y API (Semana 1)

- [ ] Crear nuevos endpoints `/api/agent/*`
- [ ] Implementar autenticación para el agente (solo lectura)
- [ ] Crear modelos `AgentExecution`, `AgentAction`, `AgentConfig` en Prisma
- [ ] Implementar lógica de scheduling (1 y 15)
- [ ] Tests de integración de endpoints
- [ ] Actualizar schema de Prisma y migrar DB

### Fase 2: Workflows n8n (Semana 2)

- [ ] Workflow principal `agente_cobranza_autonomo.json`
- [ ] Workflow detección de pagos `agente_deteccion_pagos.json`
- [ ] Workflow sincronización Sheets `agente_sincronizacion_sheets.json`
- [ ] Configuración de rate limits (1.5s entre mensajes)
- [ ] Pruebas de ejecución
- [ ] Integración con Evolution API

### Fase 3: Frontend (Semana 3)

- [ ] Vista "Panel del Agente" en React
- [ ] Componente de estado del agente (AgentStatusCard)
- [ ] Componente de acciones pendientes (PendingActionsList)
- [ ] Componente de control (ejecutar/detener/pausar/cancelar)
- [ ] Componente de historial de ejecuciones
- [ ] Integración con API del agente

### Fase 4: Integración y Testing (Semana 4)

- [ ] Conectar frontend con endpoints del agente
- [ ] Testing end-to-end completo
- [ ] Pruebas de concurrencia (múltiples ejecuciones)
- [ ] Pruebas de recuperación (detener/cancelar durante ejecución)
- [ ] Documentación para el operador
- [ ] Deploy a producción

---

## 9. TECNOLOGÍAS A UTILIZAR

| Componente | Tecnología | Notas |
|------------|------------|-------|
| **IA del Agente** | OpenAI GPT-4o | Análisis y decisiones |
| **IA de Visión** | Gemini 1.5 Flash | Detección de pagos en imágenes |
| **Automatización** | n8n con AI Nodes | Workflows visuales |
| **WhatsApp** | Evolution API | Envío de mensajes y PDFs |
| **Almacenamiento** | SQLite (dev) / PostgreSQL (prod) | Datos |
| **Reportes** | Google Sheets | Análisis del operador |
| **Frontend** | React 19 + TypeScript + Vite | SaaS |
| **Backend** | Express 5 + Prisma | API REST |

---

## 10. COMPARATIVA: ANTES vs DESPUÉS

| Aspecto | Estado Actual | Estado Objetivo |
|---------|---------------|-----------------|
| **Agente** | No existe | 100% autónomo |
| **Ejecución** | Manual (operador) | Automático + intervención |
| **Frecuencia** | 2 veces/mes (manual) | 2 veces/mes (auto) + manual |
| **Control** | Limitado | Total: ver, detener, pausar, cancelar |
| **Multicanal** | Solo WhatsApp | Configurable |
| **Multi-tenant** | No preparado | Preparado |
| **Pagos** | Manual | Automático (imagen + texto) |
| **Reportes** | Manual | Automático + Sheets |

---

## 11. RIESGOS Y MITIGACIONES

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| El agente envía a cliente errado | Baja | Alto | **Solo lectura** + validación antes de enviar + modo prueba |
| WhatsApp se bloquea por rate limit | Media | Medio | Wait de 1.5s entre mensajes + límite diario configurable |
| El agente no detecta pago | Baja | Medio | Notificación al operador si no coincide + revisión manual |
| Cortes durante ejecución | Baja | Medio | Checkpoints en cada paso + retry automático |
| Datos inconsistentes | Baja | Alto | Transacciones atómicas + logs de auditoría |

---

## 12. MANUAL DEL OPERADOR

### 12.1 Acceso al Panel del Agente

1. Iniciar sesión en https://collecta-azure.vercel.app/
2. Navegar a "Panel del Agente" en el menú
3. Verificar estado actual

### 12.2 Acciones Disponibles

| Acción | Cómo acceder | Descripción |
|--------|---------------|-------------|
| **Ejecutar ahora** | Botón "Ejecutar ahora" | Inicia el ciclo de cobranza manualmente |
| **Detener** | Botón "Detener" | Detiene la ejecución en curso |
| **Pausar** | Botón "Pausar" | Pausa la ejecución (puede reanudar) |
| **Cancelar acciones** | Checkboxes + "Cancelar seleccionadas" | Cancela acciones específicas pendientes |
| **Ver historial** | Sección "Historial de Ejecuciones" | Ver detalle de ejecuciones pasadas |

### 12.3 Interpretación de Estados

| Estado | Color | Significado |
|--------|-------|-------------|
| **IDLE** | Gris | El agente está esperando la siguiente ejecución programada |
| **RUNNING** | Verde | El agente está ejecutando acciones |
| **PAUSED** | Amarillo | El agente fue pausado por el operador |
| **STOPPED** | Rojo | El agente fue detenido por el operador |

### 12.4 Configuración de Frecuencia

- **Días de gracia**: 1 y 15 de cada mes
- **Hora**: 9:00 AM
- **Configurable**: El operador puede modificar el cron en configuración

---

## 13. MÉTRICAS DE ÉXITO

| Métrica | Objetivo | Cómo se mide |
|---------|----------|---------------|
| **Tasa de cobro** | >80% en 48h post-recordatorio | Comparación pagos antes/después |
| **Tiempo de respuesta** | <1min para procesar pago | Timestamp de detección → confirmación |
| **Tasa de entrega WA** | >95% mensajes entregados | Logs de Evolution API |
| **Satisfacción del operador** | <5 min de intervención por ciclo | Tiempo en panel del agente |
| **Cero errores críticos** | 0 envíos a clientes suspendidos | Validación antes de cada envío |

---

## 14. APÉNDICE: VARIABLES DE ENTORNO

### Backend (.env)

```env
# Servidor
PORT=3001

# IA
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Auth
JWT_SECRET=your_jwt_secret_min_32_chars

# n8n
N8N_API_KEY=your_n8n_api_key
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook

# Evolution API
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_INSTANCE=collecta
EVOLUTION_API_KEY=your_evolution_api_key

# Google Sheets (para reportes)
GOOGLE_SHEETS_ENABLED=true
GOOGLE_SHEETS_ID=your_spreadsheet_id
GOOGLE_SERVICE_ACCOUNT_JSON=your_service_account_json
```

### n8n (.env)

```env
COLLECTA_API_URL=http://host.docker.internal:3001
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_INSTANCE=collecta
EVOLUTION_API_KEY=your_evolution_api_key
TELEGRAM_CHAT_ID=your_chat_id (optional)
```

---

## 15. REFERENCIAS

- [Documentación n8n](https://docs.n8n.io/)
- [Evolution API](https://doc.evolution-api.com/)
- [OpenAI API](https://platform.openai.com/docs)
- [Gemini API](https://ai.google.dev/docs)
- [Google Sheets API](https://developers.google.com/sheets/api)

---

**Documento creado:** 2026-04-15  
**Última actualización:** 2026-04-15  
**Estado:** Listo para implementación
