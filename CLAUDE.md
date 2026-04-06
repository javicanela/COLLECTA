# CLAUDE.md — Collecta · Fuente de verdad absoluta para el agente
> Lee este archivo completo antes de tocar una sola línea de código.
> Última actualización: 2026-03-21 (reconciliación V3→V5)

---

## 1. IDENTIDAD DEL PRODUCTO

**Collecta** — Herramienta de cobranza inteligente para despachos contables.
Modelo de negocio: SaaS independiente por suscripción mensual.
Primer cliente: **BajaTax** (despacho contable en Tijuana, México).

> ⚠️ BajaTax es un CLIENTE, NO la marca del producto.
> Toda referencia a "BajaTax" como nombre visible del sistema debe cambiarse a "Collecta".
>
> Referencias residuales pendientes de migrar:
> - `frontend/src/components/MainLayout.tsx` — header "BajaTax" / footer "Baja Tax Solutions"
> - `frontend/src/services/api.ts` — comment "BAJATAX V4"
> - `frontend/src/types/index.ts` — comment "BAJATAX V4"
> - `backend/package.json` — description "BajaTax V4 Backend API"
> - `backend/src/index.ts` — console.log `BajaTax API`

---

## 2. STACK TÉCNICO (NO cambiar sin autorización)

### Frontend
- React 19 + TypeScript 5.9
- Vite 8 (bundler)
- TailwindCSS v4 con tokens personalizados `bt-*`
- Zustand 5 (state management global)
- React Router 7
- XLSX 0.18.5 (parseo de archivos Excel/CSV en cliente)
- PapaParse 5 (CSV alternativo — instalado, disponible)
- react-dropzone 15 (upload de archivos)
- @react-pdf/renderer 4 (generación PDF en cliente — instalado, pendiente de implementar)
- framer-motion 12 (animaciones)
- lucide-react (iconos)
- Google Fonts: Outfit (UI general) + JetBrains Mono (datos monoespaciados)

### Backend
- Express 5 + TypeScript 5.9
- Prisma 6.4.1 ORM → SQLite (`backend/prisma/dev.db`)
- Axios 1 (llamadas HTTP a APIs de IA)
- Multer 2 (file uploads — instalado, sin rutas activas aún)
- Better-SQLite3 (driver SQLite directo — instalado como dep de Prisma)
- CORS, dotenv, ts-node, nodemon

### IA — Cascada 4 niveles (implementada en `backend/src/services/aiCascade.ts`)
1. Gemini 1.5 Flash → `generativelanguage.googleapis.com`
2. Groq `llama-3.1-8b-instant` → `api.groq.com/openai/v1/chat/completions`
3. OpenRouter `mistral-7b-instruct` → `openrouter.ai/api/v1/chat/completions`
4. `regexFallback()` — siempre disponible, sin API key, usa `SINONIMOS_COLUMNAS.json`

---

## 3. UI / THEMING

> ⚠️ La paleta hex hardcodeada de V3 (Sección 3 original) YA NO APLICA como sistema global.

El diseño actual usa **TailwindCSS v4** con tokens personalizados definidos en
`frontend/src/index.css` bloque `@theme`:

```css
@theme {
  --color-bt-navy:   #0c2340;
  --color-bt-green:  #3dba4e;
  --color-bt-red:    #e03535;
  --color-bt-orange: #e07820;
  --color-bt-blue:   #2e7cf0;
  /* AGREGAR antes de usar: */
  /* --color-bt-purple: #8b5cf6; */
  /* --color-bt-gold:   #e0a020; */
}
```

⚠️ `bt-purple` y `bt-gold` se usan en componentes pero NO están definidos en `@theme`.
Causarán color `undefined` en Tailwind. Agregar a `@theme` antes de usar.

- **Tema actual**: Light only (`bg-slate-50 / text-slate-900`). Dark mode NO implementado.
- **Fuentes**: Outfit (sans general) + JetBrains Mono (RFC, montos, fechas en tablas — clase `font-mono` o `.mono`).
- **Clases btn**: `.btn`, `.btn-green`, `.btn-red`, etc. definidas en `index.css` (migradas del legacy HTML).
- **Stitch template**: mencionado en roadmap pero NO integrado. UI actual es Tailwind v4 propio.

---

## 4. ARQUITECTURA DE DATOS (Prisma / SQLite)

DB: `backend/prisma/dev.db` (SQLite local) | ORM: Prisma 6.4.1
Schema definitivo: `backend/prisma/schema.prisma`

> ⚠️ Prisma schema es la ÚNICA fuente de verdad del modelo de datos.
> Cualquier cambio de modelo requiere editar schema.prisma + `npx prisma db push` (dev).

### Modelo Client (Directorio)
```
id        String   @id @default(cuid())
rfc       String   @unique     ← siempre UPPERCASE, validar formato SAT
nombre    String
telefono  String?
email     String?
regimen   String?
categoria String?              ← clasificación (VIP, DEUDOR CRÓNICO, PAGADOR PUNTUAL, etc.)
asesor    String?              ← era "responsable" en V3
estado    String   @default("ACTIVO")   ← "ACTIVO" | "SUSPENDIDO"
notas     String?
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
```

### Modelo Operation (Operaciones)
```
id          String   @id @default(cuid())
clientId    String   ← FK → Client (cascade delete)
tipo        String   ← ej. "FISCAL", "DECLARACIÓN ANUAL", "NÓMINA"
descripcion String?  ← era "concepto" en V3
monto       Float    @default(0)
fechaVence  DateTime ← era "vencimiento" en V3
fechaPago   DateTime?
estatus     String   @default("PENDIENTE")  ← se recalcula dinámicamente en GET
asesor      String?  ← era "responsable" en V3 (desnormalizado para reportes)
excluir     Boolean  @default(false)
archived    Boolean  @default(false)
createdAt   DateTime @default(now())
updatedAt   DateTime @updatedAt
```

El backend enriquece las operaciones con `calculatedStatus` y `diasRestantes` en cada GET.

### Modelo LogEntry (Log de envíos WA)
```
id        String   @id @default(cuid())
clientId  String?  ← FK → Client (nullable, SetNull on delete)
tipo      String
variante  String?  ← "VENCIDO" | "HOY VENCE" | "RECORDATORIO" | "MASIVO"
resultado String   ← "ENVIADO" | "BLOQUEADO" | "ERROR"
mensaje   String?
telefono  String?
modo      String   @default("PRUEBA")  ← "PRUEBA" | "PRODUCCIÓN"
createdAt DateTime @default(now())
```

### Modelo Config (clave-valor del despacho)
```
key   String @id
value String
```
Claves relevantes: `nombre_despacho`, `depto`, `tel`, `email`, `banco`, `clabe`,
`beneficiario`, `modo`, `telPrueba`, `plantilla_vencido`, `plantilla_hoy`, `plantilla_recordatorio`

### Modelo User (auth pendiente)
```
id        String   @id @default(cuid())
name      String
email     String?  @unique
role      String   @default("asesor")
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
```

### Mapeo de nombres V3 → V5
| Campo V3         | Campo V5             | Notas                          |
|------------------|----------------------|--------------------------------|
| `responsable`    | `asesor`             | En Operation y Client          |
| `concepto`       | `descripcion`        | En Operation                   |
| `vencimiento`    | `fechaVence`         | En Operation                   |
| `fechaCobranza`  | *(no existe)*        | Pendiente agregar si se necesita |
| `cliente`        | `client.nombre`      | Vía FK en Operation            |
| `rfc`            | `client.rfc`         | Vía FK en Operation            |
| `correo`         | `email`              | En Client                      |
| `clasificacion`  | `categoria`          | En Client (texto libre)        |
| `fechaAlta`      | `createdAt`          | En Client                      |
| `intentos`       | *(no existe)*        | Pendiente                      |
| `ultimoEnvio`    | *(no existe)*        | Pendiente                      |
| `factura`        | *(no existe)*        | Pendiente                      |
| `regimen`        | `regimen`            | En Client (no en Operation)    |

---

## 5. MÓDULOS / VISTAS

### Frontend (React Router 7)
| Path          | Componente       | Estado          | Descripción                           |
|---------------|------------------|-----------------|---------------------------------------|
| `/`           | DashboardView    | Funcional       | Motor de cobranza — Operaciones       |
| `/directorio` | DirectoryView    | Funcional       | Base maestra de clientes              |
| `/registros`  | RegistersView    | Parcial         | Importación IA de Excel/CSV           |
| `/exportar`   | ExportView       | Parcial         | Backup, exportaciones, estadísticas   |
| `/config`     | ConfigView       | Parcial         | Configuración del despacho            |
| `/logs`       | *(placeholder)*  | Pendiente       | Log de envíos WhatsApp (div vacío)    |
| `/ui-preview` | UIPreview        | Dev only        | Preview de componentes UI             |

### Backend (Express 5 — puerto 3001 default)
Ver Sección 7 para tabla completa de endpoints.

---

## 6. ESTRUCTURA DE CARPETAS

```
bajatax-v5/                    ← repo (renombrar a collecta-v5 eventualmente)
├── frontend/                  React + TypeScript + Vite
│   ├── src/
│   │   ├── App.tsx            Entry point — definición de rutas
│   │   ├── index.css          Tailwind v4 + tokens bt-* + .btn utilities
│   │   ├── main.tsx           ReactDOM.createRoot
│   │   ├── components/
│   │   │   ├── MainLayout.tsx    Header nav + Outlet + footer
│   │   │   ├── Sidebar.tsx       Sidebar alternativo (no activo en rutas)
│   │   │   ├── Topbar.tsx        Barra de acciones contextual por vista
│   │   │   ├── modals/
│   │   │   │   └── NewClientModal.tsx
│   │   │   └── ui/
│   │   │       ├── Badge.tsx | Button.tsx | Card.tsx
│   │   │       ├── Input.tsx | Modal.tsx | index.ts
│   │   ├── views/
│   │   │   ├── DashboardView.tsx    Operaciones (motor de cobranza)
│   │   │   ├── DirectoryView.tsx    Directorio de clientes
│   │   │   ├── RegistersView.tsx    Importación IA
│   │   │   ├── ExportView.tsx       Exportar / Datos
│   │   │   ├── ConfigView.tsx       Configuración despacho
│   │   │   └── UIPreview.tsx        Preview UI (dev)
│   │   ├── services/
│   │   │   ├── api.ts               Fetch wrapper (base: localhost:3001/api)
│   │   │   ├── operationService.ts  CRUD operaciones + extract + pago
│   │   │   ├── clientService.ts     CRUD clientes
│   │   │   └── exportService.ts     Exportaciones Excel/JSON
│   │   ├── stores/
│   │   │   ├── useOperationStore.ts  Zustand — operaciones
│   │   │   ├── useClientStore.ts     Zustand — clientes
│   │   │   └── useAuthStore.ts       Zustand — auth (pendiente de implementar)
│   │   └── types/
│   │       └── index.ts              Interfaces TS (sincronizar con Prisma schema)
│   ├── package.json
│   └── vite.config.ts
├── backend/                   Express + TypeScript + Prisma
│   ├── src/
│   │   ├── index.ts           Entry point — middleware + rutas registradas
│   │   ├── routes/
│   │   │   ├── clients.ts     /api/clients — CRUD + toggle-status
│   │   │   ├── operations.ts  /api/operations — CRUD + pay + archive + stats
│   │   │   ├── config.ts      /api/config — upsert + backup + restore + purge
│   │   │   ├── extract.ts     /api/extract — AI cascade mapping
│   │   │   └── logs.ts        /api/logs — GET only (POST pendiente)
│   │   ├── services/
│   │   │   ├── aiCascade.ts   Cascada IA (Gemini→Groq→OpenRouter→Regex)
│   │   │   └── database.ts    (existe — funcionalidad pendiente de verificar)
│   │   └── lib/
│   │       └── prisma.ts      Singleton PrismaClient
│   ├── prisma/
│   │   ├── schema.prisma      Definición de modelos (FUENTE DE VERDAD)
│   │   └── dev.db             SQLite database (gitignore)
│   ├── .env                   Variables de entorno (NO commitear — en gitignore)
│   ├── .env.example           Plantilla de variables (SÍ commitear)
│   └── package.json
├── data/
│   ├── SINONIMOS_COLUMNAS.json   Diccionario de alias — motor de importación IA
│   └── archivo_ejemplo/          Archivos Excel/CSV de muestra para pruebas
├── legacy/
│   ├── BAJATAX_APP_legacy.html   HTML monolítico V3 (referencia histórica — no tocar)
│   └── modules/
├── docs/                          Documentación y specs legacy (referencia)
├── specs/                         Specs activos del proyecto
└── CLAUDE.md                      Este archivo — fuente de verdad
```

---

## 7. ENDPOINTS DEL BACKEND

Base URL: `http://localhost:3001/api`

### Clientes `/api/clients`
| Método | Endpoint                        | Descripción                          |
|--------|---------------------------------|--------------------------------------|
| GET    | /api/clients                    | Listar todos (con operations[])      |
| GET    | /api/clients/:id                | Cliente por ID (con ops + logs)      |
| POST   | /api/clients                    | Crear cliente (rfc + nombre requeridos) |
| PUT    | /api/clients/:id                | Actualizar cliente                   |
| DELETE | /api/clients/:id                | Eliminar cliente                     |
| PATCH  | /api/clients/:id/toggle-status  | Alternar ACTIVO ↔ SUSPENDIDO         |

### Operaciones `/api/operations`
| Método | Endpoint                              | Descripción                               |
|--------|---------------------------------------|-------------------------------------------|
| GET    | /api/operations                       | Listar (query: archived, status, asesor) + calculatedStatus |
| POST   | /api/operations                       | Crear (clientId + tipo + fechaVence requeridos) |
| PUT    | /api/operations/:id                   | Actualizar operación                      |
| PATCH  | /api/operations/:id/pay               | Registrar pago (fechaPago = now, estatus = PAGADO) |
| PATCH  | /api/operations/:id/archive           | Archivar (archived = true)                |
| PATCH  | /api/operations/:id/toggle-exclude    | Toggle campo excluir                      |
| DELETE | /api/operations/:id                   | Eliminar                                  |
| GET    | /api/operations/stats/summary         | Stats: vencidos, hoyVence, porVencer, alCorriente, pagados, montoTotal |

### Configuración `/api/config`
| Método | Endpoint             | Descripción                                   |
|--------|----------------------|-----------------------------------------------|
| GET    | /api/config          | Obtener toda la config como objeto key→value  |
| PUT    | /api/config/:key     | Upsert una clave                              |
| POST   | /api/config/bulk     | Guardar múltiples claves [{key, value}]       |
| GET    | /api/config/stats    | Conteos: clients, operations, logs            |
| GET    | /api/config/backup   | Backup JSON completo de toda la base          |
| POST   | /api/config/restore  | Restaurar desde backup JSON (transacción)     |
| POST   | /api/config/purge    | Purgar datos (body: {type: "all"|"logs"|"staging"}) |

### Extracción IA `/api/extract`
| Método | Endpoint           | Descripción                                        |
|--------|--------------------|----------------------------------------------------|
| POST   | /api/extract       | Mapeo IA: {headers, rows, provider?} → {mapping, confianza, _source} |
| POST   | /api/extract/test  | Test de conexión IA con datos de muestra           |

### Logs `/api/logs`
| Método | Endpoint    | Descripción                                          |
|--------|-------------|------------------------------------------------------|
| GET    | /api/logs   | Listar todos (desc por fecha, con client.nombre+rfc) |
| POST   | *(faltante)*| Crear entrada de log — **NO IMPLEMENTADO**           |

---

## 8. VARIABLES DE ENTORNO

Archivo: `backend/.env` (NO commitear — en gitignore)
Plantilla: `backend/.env.example` (SÍ commitear, ya existe)

```env
# Puerto del servidor Express
PORT=3001

# APIs de Inteligencia Artificial
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Auth del despacho (pendiente de implementar)
ADMIN_USER=admin
ADMIN_PASS=cambia_esta_contraseña_segura
JWT_SECRET=genera_un_secreto_largo_y_aleatorio_aqui_minimo_32_chars
```

> Frontend: sin `.env` actualmente. `API_BASE_URL` hardcodeado en `services/api.ts` a
> `http://localhost:3001/api`. Crear `.env.local` con `VITE_API_URL` para flexibilidad.

---

## 9. BUILD & RUN

```bash
# ── Backend ──────────────────────────────────
cd backend
npm install
cp .env.example .env        # y llenar los valores reales
npx prisma generate         # generar Prisma client (necesario después de schema change)
npx prisma db push          # crear/sincronizar SQLite schema
npm run dev                 # nodemon + ts-node — http://localhost:3001

# ── Frontend ─────────────────────────────────
cd frontend
npm install
npm run dev                 # Vite dev server — http://localhost:5173
npm run build               # tsc -b && vite build
npm run lint                # ESLint
```

---

## 10. REGLAS ABSOLUTAS AL EDITAR

1. **Monorepo**: frontend/ y backend/ son paquetes independientes con su propio node_modules. Nunca mezclar dependencias entre paquetes.
2. **Prisma schema es la fuente de verdad** del modelo de datos. Cambiar un modelo = editar schema.prisma + `npx prisma db push` + actualizar tipos TS en frontend/src/types/index.ts.
3. **No IndexedDB** — la persistencia es SQLite vía Prisma en el backend. El frontend no persiste datos de negocio localmente.
4. **Tokens bt-*** — los colores del sistema son `bt-navy`, `bt-green`, `bt-red`, `bt-orange`, `bt-blue`, `bt-purple`, `bt-gold`. Solo usar estos. Definir en `@theme` en index.css ANTES de usar en componentes.
5. **JetBrains Mono** para: RFC, CLABE, teléfonos, API keys, montos MXN, fechas en tablas (clase `font-mono` o `.mono`).
6. **RFC siempre UPPERCASE** — validar formato `^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{2,3}$` al crear/actualizar cliente.
7. **Clientes SUSPENDIDOS** bloquean envío WA y generación PDF en todos los puntos de envío.
8. **Anti-duplicado en importación**: verificar RFC + tipo + |monto| < 0.01 antes de crear Operation. Reportar cuántos se omitieron.
9. **Modal nombre de archivo** antes de CADA descarga PDF y Excel.
10. **Feedback visual siempre**: toast de ok/err/warn o estado de loading. Nunca dejar al usuario sin respuesta visual.
11. **Marca Collecta**: nunca hardcodear "BajaTax" o "Baja Tax" como nombre del producto en strings visibles al usuario. Usar el valor de `config.nombre_despacho`.
12. **API_BASE_URL**: en producción debe venir de variable de entorno (`VITE_API_URL`). No hardcodear localhost en código final.
13. **SINONIMOS_COLUMNAS.json** en `data/` es la fuente de verdad para alias de columnas en importación. Consultar antes de llamar IA.
14. **Validar CLABE**: exactamente 18 dígitos numéricos al guardar en config.

---

## 11. FEATURES PENDIENTES Y BUGS CONOCIDOS

> ⚠️ **AUDITORÍA 2026-04-06**: La mayoría de los errores listados abajo YA ESTÁN RESUELTOS.
> Verificar con código real antes de marcar como pendientes.

### ✅ Resueltos (verificado código 2026-04-06)
- [x] MainLayout.tsx — "BajaTax" → "Collecta" (lines 192-193)
- [x] POST /api/logs en `backend/src/routes/logs.ts` (lines 46-68)
- [x] bt-purple y bt-gold en `@theme` (index.css lines 185-191)
- [x] Modal "+ Operación" funcional (DashboardView.tsx:250)
- [x] Checkbox selección masiva + batch pay (DashboardView.tsx:578-588, 452-463)
- [x] Masivo WA con setInterval 1500ms + progress (MasivoWAModal.tsx:175-187)
- [x] LogService.create integration después de window.open (MasivoWAModal.tsx:131-141)

### 🔴 Crítico — Pendientes reales
- [ ] Badge de vencidas dinámico en nav (verificar store calculation)
- [ ] Verificar que todos los endpoints de logs funcionen correctamente

### 🟠 Alta prioridad — Pendientes reales
- [ ] Toggle ACTIVO/SUSPENDIDO en UI directorio (falta UI, endpoint existe)
- [ ] Ver operaciones desde directorio (navegar a / + filtro por RFC)
- [ ] Plantillas WA con preview tipo WhatsApp y chips de variables clicables
- [ ] Botón "Probar conexión IA" → POST /api/extract/test

### 🟡 Media — Pendientes reales
- [ ] Excel con formato (header navy, colores por estatus, freeze row 1, autofit)
- [ ] VITE_API_URL env var en frontend (actualmente hardcoded)
- [ ] PDF Estado de Cuenta: header dinámico desde config (verificar no hardcodeado)

---

## 12. genPDF() — IMPLEMENTAR CON @react-pdf/renderer

> El header del PDF usa el nombre del despacho-cliente dinámicamente desde Config.
> NUNCA hardcodear "bajatax", "Baja Tax" ni ningún nombre fijo de cliente.

### 12A. Imagen de plantilla personalizada (FEATURE PRIORITARIO)

Cada despacho-cliente puede subir **una imagen de plantilla** que define el formato visual
de su estado de cuenta. Esto les da control total sobre el diseño sin depender de código.

**Flujo completo:**
1. En ConfigView → sección "Estado de Cuenta" → botón "Subir plantilla de formato"
2. El usuario sube una imagen (PNG/JPG, tamaño carta ~2550×3300px o equivalente)
3. La imagen se convierte a base64 y se guarda en Config (`key: "pdf_template_image"`)
4. Al generar el PDF, la imagen se usa como fondo/cabecera de cada página
5. Los datos del cliente (tabla de saldos, pagos, bloque bancario) se renderizan **encima** de la imagen

**Almacenamiento:**
- Config key: `pdf_template_image` (base64 data URL: `data:image/png;base64,...`)
- Config key: `pdf_template_mode`: `"imagen"` | `"default"` (si no hay imagen, usar layout default)
- Tamaño máximo recomendado: 500 KB (comprimir antes de guardar)
- Endpoint: usar `PUT /api/config/pdf_template_image` (ya existe el endpoint genérico)

**Render en PDF con @react-pdf/renderer:**
```tsx
// Si hay imagen de plantilla, usarla como fondo
if (cfg['pdf_template_image'] && cfg['pdf_template_mode'] === 'imagen') {
  // La imagen ocupa toda la página; los datos se superponen con posición absoluta
  return (
    <Page size="LETTER" style={{ position: 'relative' }}>
      <Image src={cfg['pdf_template_image']} style={{ position: 'absolute', width: '100%', height: '100%' }} />
      {/* Datos del cliente superpuestos — coordenadas configurables */}
      <PdfDataOverlay op={op} cfg={cfg} />
    </Page>
  );
} else {
  // Layout default si no hay imagen
  return <PdfDefaultLayout op={op} cfg={cfg} />;
}
```

**UX en ConfigView:**
- Preview en tiempo real de la imagen subida (thumbnail)
- Botón "Eliminar plantilla" → borra `pdf_template_image` y revierte a `pdf_template_mode: "default"`
- Indicador: "Usando plantilla personalizada ✓" | "Usando formato estándar"
- Advertencia si la imagen pesa más de 500 KB

### 12B. Layout default (sin imagen personalizada)

```tsx
// El nombre viene de Config tabla (key: "nombre_despacho")
const nombreDespacho = cfg['nombre_despacho'] || 'Collecta';

// Estructura del documento (adaptar lógica V3 a @react-pdf/renderer):
// 1. Header navy (#0c2340) — nombreDespacho, depto, tel, email + "ESTADO DE CUENTA" alineado a la derecha
// 2. Banda cliente (#102440) — nombre, RFC, régimen, responsable/asesor
// 3. Tabla "Saldos Pendientes" — columnas: Tipo, Descripción, Monto, Fecha Vence, Días, Estatus
//    Colores: VENCIDO=rojo claro, HOY VENCE=naranja claro, alternadas=gris claro
// 4. Total Pendiente (rojo, alineado derecha)
// 5. Tabla "Historial de Pagos" — columnas: Tipo, Descripción, Monto, Fecha Pago
// 6. Total Liquidado (verde, alineado derecha)
// 7. Bloque bancario navy — Beneficiario, Banco, CLABE (si cfg.clabe existe)
// 8. Footer — datos del despacho + "Página 1 de 1"
```

---

## 13. COLUMNAS EXACTAS DE EXPORTACIÓN EXCEL

### Operaciones
`ASESOR | CLIENTE | RFC | CORREO | TELÉFONO | FECHA VENCE | TIPO | DESCRIPCIÓN | MONTO | ESTATUS | DÍAS | FECHA PAGO | EXCLUIR | ARCHIVADO`

### Directorio
`RFC | NOMBRE | CORREO | TELÉFONO | RÉGIMEN | CATEGORÍA | ASESOR | ESTADO | NOTAS | FECHA ALTA`

### Pagos (solo ops con fechaPago)
`ASESOR | CLIENTE | RFC | TIPO | DESCRIPCIÓN | MONTO | FECHA VENCE | FECHA PAGO`
+ fila pie: `TOTAL COBRADO`

### Log WA
`FECHA/HORA | CLIENTE | RFC | TELÉFONO | TIPO | VARIANTE | MODO | RESULTADO | MENSAJE`

---

## 14. ALGORITMOS CRÍTICOS (V5)

```typescript
// ESTATUS dinámico — el backend ya enriquece cada op con calculatedStatus
// Para uso en frontend si se necesita recalcular:
function calcEstatus(fechaVence: string, fechaPago: string | null, excluir: boolean): string {
  if (fechaPago)   return 'PAGADO';
  if (excluir)     return 'EXCLUIDO';
  const diff = Math.ceil((new Date(fechaVence).getTime() - Date.now()) / 86400000);
  if (diff < 0)    return 'VENCIDO';
  if (diff === 0)  return 'HOY VENCE';
  if (diff <= 5)   return 'POR VENCER';
  return 'AL CORRIENTE';
}

// ORDENAMIENTO de operaciones
const SORT_ORDER: Record<string, number> = {
  'VENCIDO': 0, 'HOY VENCE': 1, 'POR VENCER': 2,
  'AL CORRIENTE': 3, 'PENDIENTE': 4, 'PAGADO': 5, 'EXCLUIDO': 6
};
ops.sort((a, b) => {
  const d = (SORT_ORDER[a.calculatedStatus] ?? 9) - (SORT_ORDER[b.calculatedStatus] ?? 9);
  return d !== 0 ? d : (a.diasRestantes ?? 0) - (b.diasRestantes ?? 0);
});

// ANTI-DUPLICADO en importación
function isDuplicate(
  newOp: { clientId: string; tipo: string; monto: number },
  existing: { clientId: string; tipo: string; monto: number }[]
): boolean {
  return existing.some(op =>
    op.clientId === newOp.clientId &&
    op.tipo === newOp.tipo &&
    Math.abs(op.monto - newOp.monto) < 0.01
  );
}

// TELÉFONO WA CON CÓDIGO PAÍS
function buildWaUrl(phone: string, msg: string): string {
  let tel = phone.replace(/\D/g, '');
  if (!tel.startsWith('52')) tel = '52' + tel;
  return `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
}

// REEMPLAZAR VARIABLES WA
function reemplazarVariables(
  template: string,
  op: { client?: {nombre?: string}, descripcion?: string, monto: number, fechaVence: string },
  cfg: Record<string, string>
): string {
  const dias = Math.abs(Math.ceil((new Date(op.fechaVence).getTime() - Date.now()) / 86400000));
  const fmx = (n: number) => new Intl.NumberFormat('es-MX', {style:'currency',currency:'MXN'}).format(n||0);
  const ffd = (iso: string) => {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'});
  };
  return template
    .replace(/{NOMBRE_DESPACHO}/g, cfg['nombre_despacho'] || 'Collecta')
    .replace(/{CLIENTE}/g,          op.client?.nombre || '')
    .replace(/{MONTO}/g,            fmx(op.monto))
    .replace(/{CONCEPTO}/g,         op.descripcion || '')
    .replace(/{FECHA}/g,            ffd(op.fechaVence))
    .replace(/{DIAS}/g,             String(dias))
    .replace(/{BENEFICIARIO}/g,     cfg['beneficiario'] || '')
    .replace(/{BANCO}/g,            cfg['banco'] || '')
    .replace(/{CLABE}/g,            cfg['clabe'] || '')
    .replace(/{DEPTO}/g,            cfg['depto'] || '')
    .replace(/{TEL_DESPACHO}/g,     cfg['tel'] || '')
    .replace(/{EMAIL_DESPACHO}/g,   cfg['email'] || '');
}

// VALIDAR CLABE
function validarCLABE(c: string): boolean {
  const s = c.replace(/\s/g, '');
  return s.length === 18 && /^\d{18}$/.test(s);
}

// FORMATOS
const fmx = (n: number) => new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(n||0);
const ffd = (iso: string|null|undefined) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'});
};
```

---

## 15. PLANTILLAS WA POR DEFECTO

Variables disponibles:
`{NOMBRE_DESPACHO}` `{CLIENTE}` `{MONTO}` `{CONCEPTO}` `{FECHA}` `{DIAS}`
`{BENEFICIARIO}` `{BANCO}` `{CLABE}` `{DEPTO}` `{TEL_DESPACHO}` `{EMAIL_DESPACHO}`

```
DEFAULT_MSG_VENCIDO:
"*{NOMBRE_DESPACHO}* - Recordatorio de Pago Vencido
Estimado *{CLIENTE}*, Su cuenta presenta un saldo vencido de *{MONTO}* correspondiente a: {CONCEPTO}
Fecha de vencimiento: {FECHA} (*{DIAS} dias de retraso*)
Datos para Transferencia: Beneficiario: {BENEFICIARIO} | Banco: {BANCO} | CLABE: {CLABE}
{DEPTO} | {TEL_DESPACHO} | {EMAIL_DESPACHO}"

DEFAULT_MSG_HOY:
"*{NOMBRE_DESPACHO}* - Vencimiento Hoy
Estimado *{CLIENTE}*, Hoy *{FECHA}* es la fecha limite para realizar su pago.
Saldo pendiente: *{MONTO}* | Concepto: {CONCEPTO}
Datos: Beneficiario: {BENEFICIARIO} | Banco: {BANCO} | CLABE: {CLABE}
{DEPTO} | {TEL_DESPACHO}"

DEFAULT_MSG_RECORDATORIO:
"*{NOMBRE_DESPACHO}* - Proximo Vencimiento
Estimado *{CLIENTE}*, Le recordamos que el proximo *{FECHA}* vence su pago.
Saldo pendiente: *{MONTO}* | Concepto: {CONCEPTO} ({DIAS} dias restantes)
Datos: Beneficiario: {BENEFICIARIO} | Banco: {BANCO} | CLABE: {CLABE}
{DEPTO} | {TEL_DESPACHO}"
```

> Preview en ConfigView: fondo `#075e54`, texto `#e2ffc7` (estilo WhatsApp burbuja saliente).
> Datos de ejemplo: cliente='Colegio de Anestesiólogos', monto=2100, concepto='Declaración Anual 2024',
> fecha='15/ene/2025', dias=12.

---

## 16. ROADMAP PRIORIZADO

### Fase 1 — Identidad + Infraestructura base (COMPLETADO)
1. ✅ Reemplazar "BajaTax" → "Collecta" en MainLayout.tsx (header + footer)
2. ✅ Agregar `bt-purple` y `bt-gold` a `@theme` en index.css
3. ✅ Implementar `POST /api/logs` (crear LogEntry)
4. ✅ Implementar LogView en `/logs` con renderizado de entradas
5. ✅ Registro de LogEntry en cada envío WA (después de `window.open()`)

### Fase 2 — Importación completa (COMPLETADO)
6. ✅ Selects editables de mapeo de columnas con % confianza visual (verde/naranja/rojo)
7. ✅ Anti-duplicado (RFC + tipo + |monto| < 0.01) con contador de omisiones
8. ✅ Advertencia visible cuando filas no tienen cliente en directorio

### Fase 3 — Features core de cobranza (COMPLETADO)
9. ✅ Modal "+ Operación" funcional (clientId via búsqueda, tipo, descripción, monto, fechaVence)
10. ✅ Checkbox selección masiva + "Marcar N como pagado" en DashboardView
11. ✅ Modal Masivo WA (setInterval 1500ms, progress, log entries)
12. ✅ Badge de vencidas dinámico en navegación (del store)

### Fase 4 — Directorio + Config (EN PROGRESO)
13. [ ] Toggle estado cliente (badge clickeable con confirm)
14. [ ] Ver operaciones desde directorio (navegar a / + filtrar por RFC)
15. [ ] Plantillas WA con preview y chips de variables
16. [ ] Botón "Probar conexión IA"

### Fase 5 — PDF + Exportaciones (COMPLETADO)
17. ✅ genPDF() con @react-pdf/renderer (nombre dinámico del despacho)
18. [ ] Excel con formato (header navy, colores por estatus, freeze row 1, autofit)
19. [ ] Reporte CxC PDF por asesor

### Fase 6 — Auth + SaaS (EN PROGRESO)
20. ✅ Login simple JWT (POST /api/auth/login, middleware protect, useAuthStore)
21. [ ] Modelo multi-tenant para soportar múltiples despachos-clientes
22. [ ] Variables de entorno frontend (VITE_API_URL)

### Fase 7 — Pulido
23. [ ] Dark mode (Tailwind `dark:` classes)
24. [ ] Stitch template (evaluar integración o mantener Tailwind puro)
25. [ ] Sidebar con badges dinámicos
26. [ ] Responsive móvil

---

## 17. DATOS DE EJEMPLO (para pruebas en dev)

- RFC genérico SAT: `XAXX010101000` (persona moral) / `XEXX010101000` (extranjero)
- Cliente prueba: "Colegio de Anestesiólogos", monto: $2,100, concepto: "Declaración Anual 2024"
- Archivos de muestra: `data/archivo_ejemplo/`
- Diccionario de alias: `data/SINONIMOS_COLUMNAS.json`

---

Version: 5.0 | Collecta — Herramienta de Cobranza Inteligente
Primer cliente: BajaTax (Tijuana, México) | Spec: CLAUDE.md
