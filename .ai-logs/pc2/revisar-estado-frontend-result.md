# Revisión de Estado del Frontend — Collecta V5

> Fecha: 2026-04-29
> Scope: `frontend/` completo (React 19 + TypeScript 5.9 + Vite 8 + TailwindCSS v4)
> Regla: **No se modificó código.** Solo lectura + build + lint + typecheck.

---

## Resumen Ejecutivo

| Métrica | Resultado |
|---------|-----------|
| TypeScript (`tsc --noEmit`) | **PASS** (0 errores) |
| Vite build (`vite build`) | **PASS** (1 warning de chunk size) |
| ESLint (`eslint .`) | **87 errores, 7 warnings** |
| npm audit | **5 vulnerabilidades** (2 moderate, 3 high) |
| Bundle size (minified) | **2,644 KB JS / 95 KB CSS** |
| Archivos TS/TSX | 52 |
| Dependencias instaladas | OK |

**Veredicto:** El proyecto **compila y hace build correctamente**. No hay errores de tipo ni fallos de build. Sin embargo, hay **87 errores de lint** (mayormente `no-explicit-any`) y **5 vulnerabilidades de seguridad** en dependencias que requieren atención.

---

## 1. ERRORES DE LINT (87 errores, 7 warnings)

### 1.1. `@typescript-eslint/no-explicit-any` — 56 ocurrencias (CRÍTICO PARA MANTENIMIENTO)

El uso excesivo de `any` elimina la seguridad de tipos y puede ocultar bugs runtime.

**Archivos afectados:**
| Archivo | Count | Contexto |
|---------|-------|----------|
| `src/services/exportService.ts` | 11 | Funciones de exportación Excel |
| `src/stores/useOperationStore.ts` | 9 | Handlers de errores `catch(err: any)` |
| `src/views/AgentView.tsx` | 7 | Respuestas de API sin tipar |
| `src/views/RegistersView.tsx` | 7 | Procesamiento de archivos |
| `src/services/api.ts` | 3 | Métodos post/put/patch |
| `src/views/DashboardView.tsx` | 3 | Error handlers |
| `src/views/ConfigView.tsx` | 3 | Error handlers |
| `src/views/DirectoryView.tsx` | 1 | Error handler |
| `src/views/ExportView.tsx` | 3 | Error handlers |
| `src/services/operationService.ts` | 3 | Params de filtros |
| `src/components/modals/MasivoWAModal.tsx` | 2 | Error handlers |
| `src/components/modals/NewOperationModal.tsx` | 1 | Error handler |
| `src/pdf-templates/EstadoCuentaPDF.tsx` | 2 | Props sin tipar |
| `src/pdf-templates/ReporteCxCPDF.tsx` | 5 | Props sin tipar |
| `src/views/LogView.tsx` | 1 | Badge status cast |
| `src/views/DashboardView.tsx` | 1 | `modo as any` |

**Recomendación:** Crear un tipo `ApiError = { message: string; error?: string }` y reemplazar `catch(err: any)` con `catch(err: unknown)` + type guard. Para los services, definir interfaces de request/response específicas.

### 1.2. `react-hooks/purity` — 4 errores (MODERADO)

**`Math.random()` en render de componentes UI:**
- `src/components/ui/Button.tsx:120` — genera ID único
- `src/components/ui/Input.tsx:29` — genera ID único
- `src/components/ui/Input.tsx:112` — genera ID para textarea
- `src/components/ui/Select.tsx:47` — genera ID único

**Impacto:** Cada re-render genera un ID diferente, lo que puede causar problemas de accesibilidad (label-input mismatch) y re-renders innecesarios.

**Recomendación:** Usar `useId()` de React 18+ o `useRef(() => generateId())` para IDs estables.

### 1.3. `react-hooks/set-state-in-effect` — 4 errores (BAJO-MODERADO)

- `src/components/MainLayout.tsx:54` — `setSysMode()` en useEffect al montar
- `src/components/modals/MasivoWAModal.tsx:47` — reset de estado al cerrar modal
- `src/components/modals/PlantillaModal.tsx:26` — set de nombre/cuerpo al abrir
- `src/views/LogView.tsx:33` — `fetchLogs()` en useEffect

**Impacto:** Estos patrones son funcionales pero React 19 los marca como anti-patterns. No causan bugs visibles pero pueden causar renders extra.

**Recomendación:** Para los modals, mover la inicialización de estado a una función factory. Para MainLayout, usar lazy initialization. Para LogView, el patrón es aceptable pero podría optimizarse.

### 1.4. `react-hooks/exhaustive-deps` — 5 warnings (BAJO)

- `MainLayout.tsx:98` — missing `sidebarOpen`
- `MasivoWAModal.tsx:197` — missing `getTemplate` en useCallback
- `DashboardView.tsx:70,87,88` — missing `getStatus`, `applyFilters`
- `Table.tsx:149` — missing `columns`, `displayData`
- `RegistersView.tsx:44` — missing `processFile`

**Impacto:** Bajo en la práctica (la mayoría son funciones estables), pero puede causar stale closures en edge cases.

### 1.5. `react-hooks/preserve-manual-memoization` — 1 error (MODERADO)

- `MasivoWAModal.tsx:125` — `useCallback` con dependencias incorrectas (`config, modo, plantillaSeleccionada` vs inferred `getTemplate`)

**Impacto:** El memoization puede no funcionar como esperado, causando recreación de la función más seguido de lo necesario.

### 1.6. Otros errores

| Regla | Count | Archivos |
|-------|-------|----------|
| `no-empty` | 2 | `api.ts:67`, `AgentView.tsx:162` — catch blocks vacíos |
| `no-unused-vars` | 3 | `api.ts:50,73` (e no usada), `DashboardView.tsx:679` (err), `TextField.tsx:207` (currency) |
| `no-unused-expressions` | 2 | `Select.tsx:234`, `AgentView.tsx:186` |
| `prefer-const` | 3 | `Table.tsx:116` (x2), `RegistersView.tsx:252` |
| `no-useless-escape` | 8 | `RegistersView.tsx:274,306` — regex con escapes innecesarios |

---

## 2. VULNERABILIDADES DE SEGURIDAD (npm audit)

### 2.1. HIGH — `xlsx` (SheetJS) — SIN FIX DISPONIBLE
- **GHSA-4r6h-8g8v-p4x9**: Prototype Pollution
- **GHSA-5pgg-2g8v-p4x9**: ReDoS
- **Impacto:** Cualquier archivo Excel malicioso subido por un usuario podría causar DoS o inyección de prototype.
- **Acción requerida:** Migrar a `xlsx` v0.20+ o alternativa como `exceljs`. **No hay fix automático disponible.**

### 2.2. HIGH — `vite` 8.0.0
- **GHSA-4w7w-66w2-5vf9**: Path Traversal en optimized deps
- **GHSA-v2wj-q39q-566r**: `server.fs.deny` bypass
- **GHSA-p9ff-h696-f583**: Arbitrary File Read via WebSocket
- **Impacto:** Solo afecta dev server, NO producción.
- **Acción:** `npm audit fix` actualiza a versión parcheada.

### 2.3. HIGH — `picomatch` 4.0.0-4.0.3
- **GHSA-3v7f-55p6-f55p**: Method Injection en POSIX Character Classes
- **GHSA-c2c7-rcm5-vvqj**: ReDoS via extglob quantifiers
- **Impacto:** Dev dependency. Bajo riesgo en producción.
- **Acción:** `npm audit fix`

### 2.4. MODERATE — `postcss` <8.5.10
- **GHSA-qx2v-qp2m-jg93**: XSS via `</style>` en CSS Stringify
- **Impacto:** Solo afecta build time.
- **Acción:** `npm audit fix`

### 2.5. MODERATE — `brace-expansion`
- **GHSA-f886-m6hf-6m8v**: Process hang / memory exhaustion
- **Impacto:** Dev dependency (transitiva de typescript-eslint).
- **Acción:** `npm audit fix`

---

## 3. BUNDLE SIZE — 2,644 KB (CRÍTICO)

El bundle JS minificado es **2.6 MB** (853 KB gzip). Esto es **muy por encima** del recomendado de 250-500 KB.

### Causas probables:
1. **Sin code splitting** — toda la app en un solo chunk
2. **`@react-pdf/renderer`** — biblioteca pesada (~400-600 KB sola)
3. **`framer-motion`** — ~150 KB
4. **`lucide-react`** — aunque tree-shakeable, puede no estar optimizado
5. **Sin lazy loading** de vistas — todas las vistas se cargan al inicio

### Recomendaciones:
```typescript
// Ejemplo de lazy loading para vistas no críticas
const AgentView = React.lazy(() => import('./views/AgentView'));
const ExportView = React.lazy(() => import('./views/ExportView'));
const ConfigView = React.lazy(() => import('./views/ConfigView'));
```

---

## 4. RIESGOS ARQUITECTÓNICOS

### 4.1. `pdf-templates/` duplicado con `components/pdf/` (Documentado en CLAUDE.md)
- `src/pdf-templates/EstadoCuentaPDF.tsx` y `src/pdf-templates/ReporteCxCPDF.tsx` existen pero **no se importan en ningún lugar**.
- `src/components/pdf/PdfEstadoCuenta.tsx` es el que se usa realmente en `pdfService.tsx`.
- **Riesgo:** Código muerto que puede confundir en el futuro. **Acción:** Eliminar o consolidar.

### 4.2. `AgentView.tsx` consume endpoints que NO existen en el backend
- La vista llama a `/api/agent/dashboard`, `/api/agent/execution/start`, `/api/agent/execution/pause`, etc.
- El backend (según CLAUDE.md) **no tiene rutas `/api/agent`**.
- **Riesgo:** La vista `/agente` siempre mostrará error en producción.
- **Acción:** Implementar backend routes o marcar la vista como WIP.

### 4.3. `LogService.create()` llama a endpoint no implementado
- `logService.ts:6` → `POST /api/logs`
- CLAUDE.md confirma: **"POST (faltante) — Crear entrada de log — NO IMPLEMENTADO"**
- **Riesgo:** Los logs de envío WA se pierden silenciosamente (`.catch(() => {})`).
- **Acción:** Implementar `POST /api/logs` en backend.

### 4.4. Hardcoded user en MainLayout
- `MainLayout.tsx:353-358` muestra "Admin" / "Administrador" hardcodeado.
- **Riesgo:** No refleja el usuario real autenticado.
- **Acción:** Conectar con `useAuthStore().user`.

### 4.5. `vercel.json` apunta a URL de backend incorrecta
- `vercel.json:4` → `https://collecta-personal-token.up.railway.app/api/:path*`
- `api.ts:7` → `https://collecta-production.up.railway.app/api`
- **Riesgo:** Mismatch entre rewrites de Vercel y API_BASE_URL. Posible CORS o requests a backend equivocado.
- **Acción:** Unificar a una sola URL.

### 4.6. CSS de 95 KB sin purgar
- `index.css` tiene ~1,832 líneas con utilities masivas (glassmorphism, animaciones, etc.).
- TailwindCSS v4 debería purgar automáticamente, pero las clases custom en `@layer` no se purgan.
- **Impacto:** CSS no-used en producción.

---

## 5. DEPENDENCIAS — ESTADO

### Instaladas correctamente:
| Paquete | Versión | Estado |
|---------|---------|--------|
| react | 19.2.4 | OK |
| react-dom | 19.2.4 | OK |
| typescript | 5.9.3 | OK |
| vite | 8.0.0 | OK (actualizar por vulnerabilidad) |
| tailwindcss | 4.2.1 | OK |
| zustand | 5.0.12 | OK |
| react-router-dom | 7.13.1 | OK |
| @react-pdf/renderer | 4.3.2 | OK |
| framer-motion | 12.38.0 | OK |
| lucide-react | 0.577.0 | OK |
| xlsx | 0.18.5 | VULNERABLE — sin fix |
| papaparse | 5.5.3 | OK |
| react-dropzone | 15.0.0 | OK |

### Dependencias que podrían agregarse (roadmap):
| Paquete | Fase | Motivo |
|---------|------|--------|
| `recharts` | Phase 6 | Dashboard de reporting |
| `@react-oauth/google` | Phase 5 | OAuth Google |
| `google-auth-library` | Phase 5 | OAuth backend |

### Dependencias innecesarias actuales:
- Ninguna detectada como claramente innecesaria.

---

## 6. COMPATIBILIDAD CON CLAUDE.md

### Reglas verificadas:

| Regla | Estado | Notas |
|-------|--------|-------|
| Tokens bt-* en @theme | OK | `bt-purple` y `bt-gold` están definidos |
| JetBrains Mono para datos | OK | Se usa `font-mono` en tablas |
| RFC UPPERCASE | PARCIAL | No hay validación visible en frontend |
| Clientes SUSPENDIDOS bloquean WA | OK | DashboardView verifica `estado !== 'SUSPENDIDO'` |
| Modal nombre antes de descarga PDF | OK | `pdfService.tsx` implementa `askFileName()` |
| Feedback visual (toast) | OK | Toast system presente en views |
| Marca Collecta (no BajaTax) | OK | Header dice "Collecta" |
| API_BASE_URL con env var | OK | `import.meta.env.VITE_API_URL` con fallback |
| SINONIMOS_COLUMNAS.json | N/A | Se usa en backend, no frontend |
| Validar CLABE 18 dígitos | PARCIAL | No hay validación visible en ConfigView |

### Discrepancias encontradas:
1. CLAUDE.md dice "Dark mode NO implementado" pero el código **sí tiene dark mode** (`useTheme`, tokens `[data-theme="dark"]`, toggle en MainLayout).
2. CLAUDE.md dice LogView es "placeholder/div vacío" pero LogView **es funcional** con tabla, filtros y stats.
3. CLAUDE.md dice la ruta `/logs` tiene componente placeholder, pero en realidad apunta a `LogView` funcional.

---

## 7. RENDIMIENTO

### Problemas detectados:
1. **Bundle sin code-splitting** — 2.6 MB en un solo chunk
2. **`Date.now()` en render** de DashboardView (línea 562) — impure function, recalcula en cada render
3. **`fetchOperations()` se llama 2 veces** al montar (MainLayout + DashboardView)
4. **Polling de WA status** cada 30s sin cleanup adecuado si el componente se desmonta rápido
5. **Sin virtualización de tablas** — si hay >500 operaciones, la tabla renderiza todas las filas DOM

### Positivas:
- `useMemo` y `useCallback` usados apropiadamente en la mayoría de los casos
- Zustand store con estado mínimo
- Skeleton loading states implementados

---

## 8. ACCIONES RECOMENDADAS (priorizadas)

### 🔴 Crítico (hacer ya)
1. **`npm audit fix`** — parchea 4 de 5 vulnerabilidades
2. **Planificar migración de `xlsx`** — la vulnerabilidad de prototype pollution es el riesgo más alto
3. **Implementar `POST /api/logs`** en backend — los logs WA se pierden

### 🟡 Importante (próximo sprint)
4. **Code splitting** con `React.lazy()` para vistas — reducir bundle inicial ~40-50%
5. **Reemplazar `Math.random()` con `useId()`** en componentes UI
6. **Consolidar `pdf-templates/`** — eliminar archivos muertos
7. **Unificar URL de backend** entre `vercel.json` y `api.ts`

### 🟢 Mejora continua
8. **Reemplazar `any` con tipos específicos** — empezar por services y stores
9. **Agregar validación RFC** en formularios de cliente
10. **Agregar validación CLABE** en ConfigView
11. **Conectar user real** en MainLayout (quitar "Admin" hardcodeado)
12. **Virtualizar tabla** del Dashboard si se esperan >200 operaciones

---

## 9. CONCLUSIÓN

El frontend de Collecta V5 está en **buen estado funcional**: compila, type-checkea y hace build sin errores. La arquitectura con React 19 + Zustand + TailwindCSS v4 es sólida y moderna.

Los principales riesgos son:
1. **Bundle size** (2.6 MB) que impacta el tiempo de carga inicial
2. **Vulnerabilidad en xlsx** sin fix disponible
3. **87 errores de lint** (mayormente `any`) que degradan la calidad del código
4. **Endpoints inexistentes** que hacen que AgentView falle silenciosamente

Ningún riesgo es bloqueante para el funcionamiento actual, pero todos deberían abordarse antes de escalar a más usuarios.
