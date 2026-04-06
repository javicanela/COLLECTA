# BajaTax — Playbook de Agentes v2.0
> **Uso:** Lee la sección que corresponde a tu número de agente. Sigue las instrucciones al pie de la letra. Tu archivo de salida está numerado para que el Agente 9 sepa el orden de ensamblado.

**Estructura del proyecto:**
```
/Users/javieravila/Documents/ANTIGRAVITY/
├── BAJATAX_MASTER_SPEC.md        ← LEER PRIMERO (fuente de verdad)
├── SINONIMOS_COLUMNAS.json       ← diccionario de importación
├── COMPONENT_LIBRARY.html        ← referencia de componentes visuales
├── BAJATAX_FLOW_REFERENCE.html   ← diagrama visual para referencia de diseño
├── AGENTS_PLAYBOOK.md            ← este archivo (v2.0)
└── [archivos 01–08 que cada agente produce]
```

---

## CAMBIOS v2.0 vs v1.0 — Leer antes de empezar

| # | Módulo | Cambio |
|---|--------|--------|
| 1 | **Agente 1 — HTML Base** | HTML semántico obligatorio: `<aside>`, `<main>`, `<header>`, `<nav>`, `<section>`. Las 6 vistas son `section.view` hermanas directas en `#content`. |
| 2 | **Agente 2 — DB** | `DB_VERSION = 2` (agrega store `historial`). `ST.cfg` incluye `proveedorActivo: 'auto'`. |
| 3 | **Agente 4 — IA** | `callAI()` corregida: Tier 4 Regex se activa si `!result` (no solo en `.catch()`). `parseSafeJSON()` retorna `null` para JSON malformado sin lanzar error. |
| 4 | **Agente 4 — IA** | Selector `#cfg-proveedor` con 5 opciones. El agente respeta `ST.cfg.proveedorActivo` para elegir qué tier(s) ejecutar. |
| 5 | **Agente 7 — Config** | `saveConfig()` y `renderCfg()` incluyen `proveedorActivo`. |
| 6 | **Agente 9 — Ensamblador** | Validación adicional: modal de mapeo IA muestra "Regex automático" como fallback visible cuando no hay API keys. |

---

# AGENTE 1 — HTML Base + CSS Completo

**Quién eres:** Eres un experto en HTML5 semántico y CSS moderno. Tu trabajo es producir la estructura visual y de presentación completa de BajaTax. No escribes lógica JavaScript.

**Tu archivo de salida:** `01_BASE.html` en `/Users/javieravila/Documents/ANTIGRAVITY/`

**Antes de empezar:** Lee `BAJATAX_MASTER_SPEC.md` sección §1 (Identidad Visual) y `COMPONENT_LIBRARY.html`.

---

## Lo que debes construir

### DOCTYPE y HEAD
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BajaTax — Despacho Contable Fiscal · Tijuana</title>
  <meta name="description" content="Sistema de cobranza y clientes para Baja Tax, Tijuana México.">
  <!-- Google Fonts -->
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <!-- XLSX SheetJS -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
  <!-- jsPDF -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <!-- jsPDF AutoTable -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.29/jspdf.plugin.autotable.min.js"></script>
  <style>
    /* AQUÍ VA TODO EL CSS — ver especificaciones abajo */
  </style>
</head>
```

### CSS — Paleta exacta del logo (NO cambiar los valores)
```css
:root {
  --bg:#060d18; --surface:#0a1628; --card:#0d1e35; --card2:#102440;
  --border:#1a3050; --border2:#1f3b61;
  --navy:#0c2340; --green:#3dba4e;
  --green-dim:rgba(61,186,78,0.12); --green-glow:rgba(61,186,78,0.30);
  --gold:#e0a020; --gold-dim:rgba(224,160,32,0.12);
  --red:#e03535; --red-dim:rgba(224,53,53,0.12);
  --orange:#e07820; --orange-dim:rgba(224,120,32,0.12);
  --blue:#2e7cf0; --blue-dim:rgba(46,124,240,0.12);
  --purple:#8b5cf6; --purple-dim:rgba(139,92,246,0.12);
  --text:#e8f0fa; --text2:#7e99bb; --text3:#3d5a7a;
}
```

### CSS — Debe incluir estilos para
- Reset global, scrollbar 4px
- Layout `#app`, `aside#sidebar`, `main#main`, `header#topbar`, `div#content`
- Sidebar: `.sb-brand`, `.brand`, `.brand-text`, `.brand-dot` (animación pulse), `.sb-modo`
- Nav: `.sb-nav`, `.sb-item` (con `.on`), `.sb-badge`, `.sb-foot`
- Botones: `.btn`, `.btn-sm`, `.btn-xs`, `.btn-green` (con glow hover), `.btn-ghost`, `.btn-red`, `.btn-blue`, `.btn-orange`, `.btn-purple`, `.btn-gold`
- Tablas: `.tbl-wrap`, `table`, `thead th`, `tbody tr`, `td.mono`, `td.bold`, `td.trunc`, `td.t2`, `td.gold`
- Filas especiales: `tr.row-pagado` (opacity .45), `tr.row-excluido` (rayas diagonales), `tr.row-critico` (borde rojo)
- Badges: `.badge`, `.b-green`, `.b-red`, `.b-orange`, `.b-blue`, `.b-gold`, `.b-gray`, `.b-purple`
- Stats: `.stats-row` (grid 5 cols), `.stat-card` (con estados active-red/orange/blue/green/gold), `.stat-num`, `.stat-lbl`  
- Filtros: `.filter-bar` con estilos para select e input
- Modales: `.modal-bg` (fijo, blur), `.modal` (con animación translateY), `.modal-lg`, `.modal-h`, `.modal-footer`
- Formularios: `.form-group`, `.form-row` (grid 2 cols), `.form-note`
- Toast: `#toast` con estados `.ok`, `.err`, `.info`, `.warn`, `.ai`
- Dropzone: `.dropzone`, `.dz-icon`, `.ai-badge`
- Acordeón config: `.acc-item`, `.acc-header`, `.acc-arrow` (rotar 180° cuando `.open`), `.acc-body`
- Chips variables WA: `.vars-chips`, `.chip`
- Preview WA: `.preview-box` (fondo #075e54, texto #e2ffc7)
- Template block: `.template-block`, `.template-header`, `.template-hint`
- Log: `.log-entry`, `.env-enviado` (borde verde), `.env-error` (borde rojo), `.env-bloqueado` (borde gris), `.log-top`, `.log-ts`, `.log-cli`, `.log-tel`
- Exportar: `.exp-grid` (grid 3 cols), `.exp-card`, `.exp-icon`, `.exp-title`, `.exp-desc`
- Mapeo IA: `.map-row`, `.map-src`, `.map-conf`, `.conf-high/.conf-mid/.conf-low`, `.map-arrow`, `.mapeo-loading`, `.ai-spin` (animación spin)
- Asesores chips: `.asesor-chip`
- Storage stats: `.storage-stat`
- Danger zone: `.danger-zone`
- Section title: `.section-title`
- Historial wrap: `.historial-section`
- Mobile: `@media(max-width:768px)` sidebar oculto, `#hamburger` visible

### BODY — Layout semántico OBLIGATORIO

```html
<body>
<div id="app">

  <!-- SIDEBAR -->
  <aside id="sidebar" aria-label="Navegación principal">
    <div class="sb-brand">
      <div class="brand">
        <span class="brand-text">baja</span>
        <span class="brand-dot">●</span>
        <span class="brand-text">tax</span>
      </div>
      <button id="modo-btn" class="sb-modo modo-p" onclick="toggleModo()">⚠ MODO PRUEBA</button>
    </div>
    <nav class="sb-nav" aria-label="Módulos">
      <!-- 6 items: ops, reg, dir, exp, log, cfg -->
      <!-- Cada uno: <div class="sb-item on" id="nav-ops" onclick="go('ops')"> -->
      <!-- Badges: <span class="sb-badge" id="bdg-ops" style="display:none">0</span> -->
    </nav>
    <footer class="sb-foot" id="sb-foot">0 clientes activos</footer>
  </aside>

  <!-- MAIN -->
  <main id="main">
    <!-- TOPBAR -->
    <header id="topbar">
      <button id="hamburger" onclick="document.getElementById('sidebar').classList.toggle('open')" aria-label="Menú">☰</button>
      <div id="tb-left">
        <h1 id="tb-t">Operaciones</h1>
        <p id="tb-s">Motor diario de cobranza</p>
      </div>
      <div id="tb-acts" role="toolbar"></div>
    </header>

    <!-- CONTENT — las 6 vistas son HERMANAS DIRECTAS aquí -->
    <div id="content">

      <!-- VISTA OPERACIONES -->
      <section class="view on" id="v-ops" aria-label="Operaciones">
        <!-- stats row, filter bar, tabla, historial -->
      </section>

      <!-- VISTA REGISTROS -->
      <section class="view" id="v-reg" aria-label="Registros">
        <!-- dropzone, toolbar, tabla staging, historial staging -->
      </section>

      <!-- VISTA DIRECTORIO -->
      <section class="view" id="v-dir" aria-label="Directorio">
        <!-- filter bar, tabla directorio -->
      </section>

      <!-- VISTA EXPORTAR/DATOS -->
      <section class="view" id="v-exp" aria-label="Exportar y Datos">
        <!-- exp-grid, restaurar, storage-stats, danger-zone -->
      </section>

      <!-- VISTA LOG ENVÍOS -->
      <section class="view" id="v-log" aria-label="Log de Envíos">
        <!-- filter bar, log-list -->
      </section>

      <!-- VISTA CONFIGURACIÓN -->
      <section class="view" id="v-cfg" aria-label="Configuración">
        <!-- 5 acordeones: Sistema, APIs IA, Despacho, Plantillas WA, Asesores -->
      </section>

    </div><!-- /content -->
  </main>

</div><!-- /app -->
```

### Acordeón B — APIs de IA (incluir el selector de proveedor activo)
```html
<div class="form-group">
  <label for="cfg-proveedor">Proveedor IA Activo</label>
  <select id="cfg-proveedor">
    <option value="auto">🔄 Auto (Gemini → Groq → OpenRouter → Regex)</option>
    <option value="gemini">✨ Solo Gemini 1.5 Flash</option>
    <option value="groq">⚡ Solo Groq llama-3.1-8b</option>
    <option value="openrouter">🌐 Solo OpenRouter</option>
    <option value="regex">🔍 Solo Regex (sin IA, modo offline)</option>
  </select>
  <p class="form-note">En modo Auto el sistema prueba cada proveedor en cascada. El Regex siempre está disponible aunque no tengas API keys.</p>
</div>
```

### Modales requeridos (TODOS como `.modal-bg` hermanos entre sí, fuera de `#app`)
- `m-confirm`, `m-filename`, `m-op` (modal-lg), `m-cli`, `m-mapeo` (modal-lg), `m-elim`

### Cierre del archivo
```html
<div id="toast" role="alert" aria-live="polite"></div>
<!-- END_BASE -->
</body>
</html>
```

**IMPORTANTE:** El archivo TERMINA con `<!-- END_BASE -->` en la penúltima línea. No incluyas ningún `<script>` de lógica.

---

# AGENTE 2 — Base de Datos + Estado Global

**Quién eres:** Eres un experto en IndexedDB y gestión de estado JavaScript. Tu trabajo es proveer la capa de datos y funciones utilitarias que todos los demás módulos necesitan.

**Tu archivo de salida:** `02_DB_STATE.js` en `/Users/javieravila/Documents/ANTIGRAVITY/`

**Antes de empezar:** Lee `BAJATAX_MASTER_SPEC.md` §2, §3, §14.

---

## Lo que debes escribir

El archivo comienza con `// === MÓDULO: DB + STATE ===` y termina con `// === FIN DB + STATE ===`.

Implementa exactamente:

1. **Constantes** — `DB_NAME = 'bajatax_v2'`, `DB_VERSION = 2` (**v2 — agrega store `historial`**), objeto `STORES` con 6 stores: `config`, `registros`, `operaciones`, `directorio`, `log`, `historial`

   > **`onupgradeneeded` migration:** Cuando `oldVersion < 2`, crear el store `historial` con `{ keyPath: 'id' }`. Evita errores en bases existentes de v1.

2. **Mensajes por defecto** — `DEFAULT_MSG_VENCIDO`, `DEFAULT_MSG_HOY`, `DEFAULT_MSG_RECORDATORIO` (texto completo del spec §11.1)

3. **Estado global `ST`** — exactamente como el spec §2.3 más `cfg.proveedorActivo: 'auto'` y `historial: []`

4. **Variables globales de importación** — `let _db = null`, `let _importRaws = []`, `let _colMapFinal = {}`, `let _importHeaders = []`

5. **API IndexedDB** — `openDB()`, `dbGet(store, key?)`, `dbPut(store, obj)`, `dbDel(store, id)`, `dbClear(store)`, `loadAll()` (carga todos los stores en ST), `saveCfgKey(k, v)`

6. **Utilidades** — `uid()`, `fmx(v)`, `ffd(s)`, `hoy()`, `today()`, `sanitize(s)`, `downloadBlob(blob, filename)`, `filenameFecha(prefix, ext)`

7. **UI compartida** — `toast(msg, type)`, `openM(id)`, `closeM(id)`, `confirm2(title, body, onOk, okLabel, okClass)`, `askFileName(title, defaultName, onConfirm)`

8. **Lógica de estatus** — `SORT_ORDER`, `calcDias(op)`, `calcEstatus(op)`, `badgeEst(est)`, `diasCell(op)`

---

# AGENTE 3 — Módulo Operaciones

**Quién eres:** Eres un experto en interfaces de gestión de cobranza. Tu trabajo es el módulo principal de operaciones de BajaTax.

**Tu archivo de salida:** `03_OPERACIONES.js` en `/Users/javieravila/Documents/ANTIGRAVITY/`

**Antes de empezar:** Lee `BAJATAX_MASTER_SPEC.md` §5 completo.

---

## Lo que debes escribir

El archivo comienza con `// === MÓDULO: OPERACIONES ===` y termina con `// === FIN OPERACIONES ===`.

Funciones requeridas (implementación completa y funcional):

- `renderOps()` — actualizar 5 stats, populate filtro asesor, filtrar ops, sort por SORT_ORDER, render tbody-ops (filas con clases row-pagado/row-excluido/row-critico), render tbody-hist-ops (historial archivado)
- `regPago(id)` — modal confirm → op.fechaPago = ISO → dbPut → renderOps + toast
- `deshacerPago(id)` — modal confirm → op.fechaPago = null → dbPut → renderOps
- `toggleExcl(id)` — toggle op.excluir → dbPut → renderOps
- `pdfOp(id)` — verificar no SUSPENDIDO → askFileName → genPDF
- `delOp(id)` — modal confirm → filter ST.operaciones → dbDel → renderOps
- `archivarOp(id)` — solo si fechaPago → modal → dbPut historial → dbDel operaciones → renderOps
- `desarchivarOp(id)` — dbPut operaciones → dbDel historial → renderOps
- `delHistOp(id)` — dbDel historial → renderOps
- `openModalAddOp()` — limpiar campos, populate select asesores, openM
- `saveOp()` — validar campos → create/update objeto op → dbPut → renderOps
- `masivosWA()` — filtrar candidatos, contar por tel, modal confirm, setInterval 1500ms (ver spec §5.7)
- `clearFilters()`, `filterByStatus(st)`
- `updateBadges()` — actualizar bdg-ops, bdg-reg, sb-foot

---

# AGENTE 4 — Módulo Registros + Motor IA 4-Tier

**Quién eres:** Eres un experto en procesamiento de datos y APIs de IA. Tu trabajo es el sistema de importación inteligente de BajaTax.

**Tu archivo de salida:** `04_REGISTROS_IA.js` en `/Users/javieravila/Documents/ANTIGRAVITY/`

**Antes de empezar:** Lee `BAJATAX_MASTER_SPEC.md` §6 y §13 completos. Lee `SINONIMOS_COLUMNAS.json` y cópialo como constante JS al inicio del archivo.

---

## Lo que debes escribir

El archivo comienza con `// === MÓDULO: REGISTROS + IA ===` y termina con `// === FIN REGISTROS + IA ===`.

### La constante SINONIMOS (copia del JSON adaptado)
```javascript
const SINONIMOS = { /* contenido de SINONIMOS_COLUMNAS.json */ };
```

### callAI — LA FUNCIÓN MÁS IMPORTANTE (corregida v2.0)

> **CORRECCIÓN CRÍTICA v2.0:** El Tier 4 (regex) se activa si `!result` al finalizar la cascada — NO solo en `.catch()`. `parseSafeJSON()` DEBE retornar `null` para JSON malformado (no lanzar error). Si OpenRouter devuelve `{error: true}` o texto no-JSON, `parseSafeJSON` retorna `null`, `.mapping` no existe, `tryOpenRouter()` retorna `null`, y el flujo cae correctamente al Tier 4.

Implementa los 4 tiers de forma que el Tier 4 (regex) SIEMPRE se ejecute si los anteriores fallan O si `proveedorActivo === 'regex'`.

```javascript
async function callAI(prompt) {
  const cfg = ST.cfg;
  const prov = cfg.proveedorActivo || 'auto';
  
  async function tryGemini() {
    if (!cfg.gemini) return null;
    try {
      updateMapeoLoading('Gemini Flash', 'aistudio.google.com');
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${cfg.gemini}`,
        { method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({contents:[{parts:[{text:prompt}]}], generationConfig:{temperature:0.1, maxOutputTokens:1024}}) });
      if (!r.ok) return null;
      const d = await r.json();
      const txt = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const parsed = parseSafeJSON(txt);
      return parsed?.mapping ? { ...parsed, _source: 'gemini' } : null;
    } catch { return null; }
  }
  
  async function tryGroq() {
    if (!cfg.groq) return null;
    try {
      updateMapeoLoading('Groq llama-3.1-8b', 'console.groq.com');
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions',
        { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${cfg.groq}`},
          body: JSON.stringify({ model:'llama-3.1-8b-instant', messages:[{role:'user',content:prompt}], temperature:0.1 }) });
      if (!r.ok) return null;
      const d = await r.json();
      const txt = d.choices?.[0]?.message?.content || '';
      const parsed = parseSafeJSON(txt);
      return parsed?.mapping ? { ...parsed, _source: 'groq' } : null;
    } catch { return null; }
  }

  async function tryOpenRouter() {
    if (!cfg.openrouter) return null;
    try {
      updateMapeoLoading('OpenRouter', 'openrouter.ai');
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions',
        { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${cfg.openrouter}`},
          body: JSON.stringify({ model:'mistralai/mistral-7b-instruct', messages:[{role:'user',content:prompt}], temperature:0.1 }) });
      if (!r.ok) return null;
      const d = await r.json();
      const txt = d.choices?.[0]?.message?.content || '';
      const parsed = parseSafeJSON(txt);
      // CRÍTICO: verificar .mapping antes de retornar — JSON malformado o sin .mapping retorna null → activa Tier 4
      return parsed?.mapping ? { ...parsed, _source: 'openrouter' } : null;
    } catch { return null; }
  }
  
  function parseSafeJSON(txt) {
    try { return JSON.parse(txt.replace(/```json\n?|\n?```/g, '').trim()); }
    catch { return null; }
  }
  
  let result = null;
  
  if (prov === 'gemini')      result = await tryGemini();
  else if (prov === 'groq')   result = await tryGroq();
  else if (prov === 'openrouter') result = await tryOpenRouter();
  else if (prov !== 'regex') {
    // auto — cascada
    result = await tryGemini();
    if (!result) result = await tryGroq();
    if (!result) result = await tryOpenRouter();
  }
  
  // TIER 4 — SIEMPRE — nunca falla
  if (!result) {
    updateMapeoLoading('Regex automático', 'Sin conexión a IA necesaria');
    const regexMap = autoDetectRegex(_importHeaders, _importRaws.slice(0, 15));
    result = {
      mapping: Object.fromEntries(Object.entries(regexMap).map(([k,v]) => [k,v])),
      confianza: {},
      notas: 'Detección automática por regex (sin IA). Verifica las columnas antes de confirmar.',
      _source: 'regex'
    };
  }
  
  return result;
}
```

### autoDetectRegex — usar SINONIMOS

```javascript
function autoDetectRegex(headers, dataRows) {
  // Usar SINONIMOS.X.alias_exactos y SINONIMOS.X.alias_parciales para cada campo
  // + detección por patrones de datos (RFC regex, email @, teléfono 10 dígitos, monto numérico, fecha)
  // Devolver { [colIndex]: 'campo' }
}
```

### Demás funciones
- `renderReg()` — tabla staging + historial staging archivado
- `distribuir(regId)` — 3 pasos exactos del spec §6.3
- `distribuirTodo()`, `archivarProcesados()`, `limpiarStaging()`, `delReg()`
- `dzOver()`, `dzLeave()`, `dzDrop()`, `handleFile(file)`
- `procFile(rows)` — detecta header, llama parseAndDetect
- `parseAndDetect(rows)` — abre modal, activa loading, llama callAI
- `updateMapeoLoading(proveedor, subtexto)` — actualiza `#ai-loading-txt` y `#ai-loading-sub`
- `showMapeoLoading(show)` — toggle loading/content del modal
- `renderMapeoModal(headers, aiResult)` — grid de selects, preview fila 1
- `confirmarImport()` — parsear rows con mapeo → crear objetos Registro → dbPut → go('reg')
- `parseDate(s)`, `parseMonto(s)`, `parseTel(s)`

---

# AGENTE 5 — Módulo Directorio

**Quién eres:** Eres un experto en gestión de bases de clientes. Tu trabajo es el directorio de clientes de BajaTax.

**Tu archivo de salida:** `05_DIRECTORIO.js` en `/Users/javieravila/Documents/ANTIGRAVITY/`

**Antes de empezar:** Lee `BAJATAX_MASTER_SPEC.md` §7 completo.

---

## Lo que debes escribir

El archivo comienza con `// === MÓDULO: DIRECTORIO ===` y termina con `// === FIN DIRECTORIO ===`.

Funciones requeridas:
- `renderDir()` — filtros (q, estado, asesor) → tabla con columnas exactas del spec §7.1, populate select asesor
- `toggleEstadoCli(id)` — modal confirm → toggle ACTIVO/SUSPENDIDO → dbPut → renderDir
- `verOpsDir(rfc)` — go('ops') + setTimeout con f-q = rfc + renderOps
- `pdfDir(id)` — verificar existe → askFileName → genPDF(c.rfc, nombre)
- `waDir(id)` — verificar ACTIVO + telefono → ops pendientes → envWA o consolidado
- `delCli(id)` — modal confirm → filter ST.directorio → dbDel → renderDir
- `openModalAddCli()` — limpiar campos, populate selects, openM('m-cli')
- `editCli(id)` — popular campos del modal con datos del cliente
- `saveCli()` — validar rfc+nombre, verificar duplicado solo si es nuevo, dbPut → renderDir

---

# AGENTE 6 — Módulo Exportar + Motor PDF

**Quién eres:** Eres un experto en generación de documentos y exportación de datos. Tu trabajo es toda la capa de exportación de BajaTax.

**Tu archivo de salida:** `06_EXPORTAR_PDF.js` en `/Users/javieravila/Documents/ANTIGRAVITY/`

**Antes de empezar:** Lee `BAJATAX_MASTER_SPEC.md` §8 y §12 completos.

---

## Lo que debes escribir

El archivo comienza con `// === MÓDULO: EXPORTAR + PDF ===` y termina con `// === FIN EXPORTAR + PDF ===`.

Funciones requeridas:
- `renderExp()` — stats de almacenamiento en #storage-stats (ver spec §8.9)
- `expOps()` — askFileName → SheetJS con columnas exactas de §8.2 → XLSX.writeFile
- `expDir()` — askFileName → SheetJS con columnas §8.3 → XLSX.writeFile
- `expPagos()` — askFileName → filtrar op.fechaPago → columnas §8.4 → XLSX.writeFile
- `expLog()` — askFileName → columnas §8.5 → XLSX.writeFile
- `backupJSON()` — objeto backup sin gemini/groq/openrouter keys → Blob JSON → downloadBlob
- `restoreJSON(file)` — leer .json → validar → modal confirm → limpiar stores → cargar datos
- `limpiarProcesados()` — procesados del staging → confirm → dbDel → renderExp
- `clearLog()` — llamada ya definida en Agente 8, pero si no existe ponla aquí
- `eliminarTodo()` — openM('m-elim')
- `executeElimTodo()` — verificar input === 'ELIMINAR' → dbClear todos → resetear ST → renderOps
- `genPDF(rfc, nombreArchivo)` — implementación COMPLETA del spec §12.2 con jsPDF:
  - Header navy (rect #0c2340, texto verde #3dba4e para "bajatax", blanco para título)
  - Banda cliente (#102440)
  - Tabla pendientes (autoTable, VENCIDO en rojo, HOY VENCE en naranja)
  - Tabla pagados (autoTable, verde oscuro)
  - Bloque bancario (si cfg.clabe)
  - Footer con nombre despacho y "Página 1 de 1"
- `expPDFReport()` — reporte landscape CxC por asesor (spec §8.8), función `calcResumenAsesor`

---

# AGENTE 7 — Motor WhatsApp + Configuración

**Quién eres:** Eres un experto en comunicación digital y configuración de sistemas. Tu trabajo es el motor de WhatsApp y la vista de configuración de BajaTax.

**Tu archivo de salida:** `07_WHATSAPP_CFG.js` en `/Users/javieravila/Documents/ANTIGRAVITY/`

**Antes de empezar:** Lee `BAJATAX_MASTER_SPEC.md` §10 y §11 completos.

---

## Lo que debes escribir

El archivo comienza con `// === MÓDULO: WHATSAPP + CONFIG ===` y termina con `// === FIN WHATSAPP + CONFIG ===`.

Funciones requeridas:
- `reemplazarVariables(template, op, cfg)` — spec §11.3, reemplazar {CLIENTE}, {MONTO}, etc.
- `buildMsgConsolidado(ops, cfg)` — spec §11.2
- `envWA(opId)` — flujo completo spec §5.6: suspendido → tel → variante → template → reemplazar → tel con prefijo 52 → wa.me link → log entry
- `updateModo()` — actualiza #modo-btn y warn-prod
- `toggleModo()` — PRUEBA↔PRODUCCIÓN con confirm2 al activar PRODUCCIÓN
- `onModoChange()` — manejador onchange del select #cfg-modo
- `renderCfg()` — poblar TODOS los campos del acordeón (modo, telPrueba, gemini, groq, openrouter, **proveedorActivo** ← `document.getElementById('cfg-proveedor').value = ST.cfg.proveedorActivo || 'auto'`, nombre, depto, benef, banco, clabe, tel, email, + renderTemplates + renderAsesoresChips)
- `toggleAcc(id)` — toggle clase `.open` en el acordeón
- `renderTemplates()` — 3 template blocks (VENCIDO, HOY VENCE, RECORDATORIO) con chips de variables clicables, textarea y vista previa
- `updatePreview(tid, key)` — reemplazar variables en textarea con datos de ejemplo → mostrar en .preview-box
- `insertVar(textareaId, variable)` — insertar en posición del cursor
- `resetTemplate(key, tid)` — restaurar DEFAULT_MSG_X en textarea
- `renderAsesoresChips()` — chips con botón ✕ para cada asesor
- `addAsesor()` — validar → push → dbPut asesores → renderAsesoresChips
- `removeAsesor(nombre)` — filter → dbPut → renderAsesoresChips
- `validarCLABE(c)` — 18 dígitos exactos
- `saveConfig()` — guardar TODOS los campos incluyendo `proveedorActivo: document.getElementById('cfg-proveedor').value` → `ST.cfg.proveedorActivo = val` → `saveCfgKey('proveedorActivo', val)` → validar CLABE → updateModo → toast
- `testAI()` — llama callAI con prompt de prueba → toast resultado

---

# AGENTE 8 — Log de Envíos + Navegación + Inicialización

**Quién eres:** Eres un experto en arquitectura de aplicaciones web. Tu trabajo es la navegación, el log de envíos y la inicialización de BajaTax.

**Tu archivo de salida:** `08_LOG_CONFIG_UI.js` en `/Users/javieravila/Documents/ANTIGRAVITY/`

**Antes de empezar:** Lee `BAJATAX_MASTER_SPEC.md` §9, §15, §16 completos.

---

## Lo que debes escribir

El archivo comienza con `// === MÓDULO: LOG + NAVEGACIÓN + INIT ===` y termina con `// === FIN LOG + NAVEGACIÓN + INIT ===`.

Funciones requeridas:
- `renderLog()` — filtros variante/resultado → max 500 entradas → cada entry con clase env-enviado/error/bloqueado + badges de variante/modo/resultado
- Sistema de navegación:
  ```javascript
  const VIEWS = {
    ops: { title: 'Operaciones', sub: 'Motor diario de cobranza',
           acts: `<button class="btn btn-orange btn-sm" onclick="masivosWA()">📱 Masivo WA</button>
                  <button class="btn btn-ghost btn-sm" onclick="openModalAddOp()">+ Operación</button>` },
    reg: { title: 'Registros',   sub: 'Importación y staging de datos', acts: '' },
    dir: { title: 'Directorio',  sub: 'Base maestra de clientes',
           acts: `<button class="btn btn-green btn-sm" onclick="openModalAddCli()">+ Cliente</button>` },
    exp: { title: 'Exportar / Datos', sub: 'Exportación, respaldos y limpieza',
           acts: `<button class="btn btn-blue btn-sm" onclick="backupJSON()">💾 Backup</button>` },
    log: { title: 'Log de Envíos', sub: 'Bitácora de mensajes WhatsApp',
           acts: `<button class="btn btn-ghost btn-sm" onclick="clearLog()">🗑 Limpiar</button>` },
    cfg: { title: 'Configuración', sub: 'Datos del despacho y sistema',
           acts: `<button class="btn btn-green btn-sm" onclick="saveConfig()">💾 Guardar</button>` },
  };
  function go(page) {
    document.querySelectorAll('.sb-item').forEach(e => e.classList.remove('on'));
    document.getElementById(`nav-${page}`).classList.add('on');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('on'));
    document.getElementById(`v-${page}`).classList.add('on');
    document.getElementById('tb-t').textContent = VIEWS[page].title;
    document.getElementById('tb-s').textContent = VIEWS[page].sub;
    document.getElementById('tb-acts').innerHTML = VIEWS[page].acts;
    renderPage(page);
    document.getElementById('sidebar').classList.remove('open');
  }
  function renderPage(page) { /* switch por página */ }
  ```
- `init()` — spec §16: openDB → loadAll → updateModo → updateBadges → renderOps → tb-acts → toast bienvenida
- `document.addEventListener('DOMContentLoaded', init);`
- Close modal con ESC: `document.addEventListener('keydown', e => { if(e.key==='Escape') document.querySelectorAll('.modal-bg.on').forEach(m => m.classList.remove('on')); });`

---

# AGENTE 9 — Ensamblador Final

**Quién eres:** Eres un experto en integración y delivery de aplicaciones web. Tu trabajo es combinar los 8 módulos anteriores en el archivo final listo para usar.

**Tu archivo de salida:** `BAJATAX_APP.html` en `/Users/javieravila/Documents/ANTIGRAVITY/`

**Lee:** `01_BASE.html`, `02_DB_STATE.js`, `03_OPERACIONES.js`, `04_REGISTROS_IA.js`, `05_DIRECTORIO.js`, `06_EXPORTAR_PDF.js`, `07_WHATSAPP_CFG.js`, `08_LOG_CONFIG_UI.js`

---

## Proceso de Ensamblado

1. Lee el contenido completo de `01_BASE.html`
2. Localiza `<!-- END_BASE -->` y elimínalo
3. Justo antes del `</body>`, inserta:
   ```html
   <script>
   // ====================================================
   // BAJATAX WEB v3.0 — Despacho Contable Fiscal Tijuana
   // ====================================================
   
   /* [CONTENIDO LITERAL DE 02_DB_STATE.js] */
   /* [CONTENIDO LITERAL DE 03_OPERACIONES.js] */
   /* [CONTENIDO LITERAL DE 04_REGISTROS_IA.js] */
   /* [CONTENIDO LITERAL DE 05_DIRECTORIO.js] */
   /* [CONTENIDO LITERAL DE 06_EXPORTAR_PDF.js] */
   /* [CONTENIDO LITERAL DE 07_WHATSAPP_CFG.js] */
   /* [CONTENIDO LITERAL DE 08_LOG_CONFIG_UI.js] */
   </script>
   ```
4. Guarda como `BAJATAX_APP.html`
5. Abre el archivo en el navegador
6. Verifica navegando a cada sección:
   - Operaciones → tabla carga (aunque vacía)
   - Registros → dropzone visible
   - Directorio → tabla carga
   - Exportar → grid de exportación visible
   - Log → filtros visibles
   - Configuración → acordeones visibles con formularios
   - Proveedor IA → select con 5 opciones disponible
7. Si todo carga: `toast("✓ BajaTax v3.0 ensamblado correctamente", 'ok')`

## Validaciones antes de entregar

### HTML semántico (CRÍTICO v2.0)
- [ ] `section.view` × 6 son hermanas directas en `#content` (NUNCA anidadas)
- [ ] Sidebar es `<aside id="sidebar">`, topbar es `<header id="topbar">`, nav es `<nav>`
- [ ] Las 6 secciones son: `<section class="view" id="v-ops">` … `id="v-cfg"`
- [ ] Modales son hermanos de `#app`, fuera del DOM principal

### JS y funcionalidad
- [ ] No hay `<script>` dentro de otro `<script>`
- [ ] `DB_VERSION = 2` y store `historial` creado en `onupgradeneeded`
- [ ] `callAI()` tiene Tier 4 activado con `if (!result)` — NO solo en `.catch()`
- [ ] `parseSafeJSON()` retorna `null` para JSON malformado sin lanzar excepción
- [ ] `tryOpenRouter()` retorna `null` si `.mapping` no existe en el resultado parseado
- [ ] `ST.cfg.proveedorActivo` guardado en IDB y poblado en `renderCfg()`

### UI
- [ ] En mobile (< 768px) el sidebar se oculta con hamburger
- [ ] El accordion de Configuración tiene 5 secciones incluida APIs de IA con selector de proveedor (#cfg-proveedor con 5 opciones)
- [ ] El modal de mapeo IA muestra "Regex automático" como fallback cuando no hay IA configurada
- [ ] Todos los botones tienen `onclick` o event listeners funcionando
- [ ] SUSPENDIDOS bloquean WA y PDF en todos los puntos: `envWA()`, `masivosWA()`, `genPDF()`, `pdfDir()`, `pdfOp()`
