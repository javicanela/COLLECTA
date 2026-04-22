# Plan de extracción y análisis — Anthropic Academy (18 cursos)

> Documento maestro. Escrito desde Windows el 2026-04-20 para poder retomar en Mac.
> Rama: `main`. Repo: `COLLECTA`.

---

## 1. Objetivo

Mapear los 18 cursos de Anthropic Academy (plataforma skilljar) del usuario y armar un **plan priorizado** aplicado a:
- **Collecta** (SaaS de cobranza para despachos contables — ver `CLAUDE.md` raíz)
- Desarrollo profesional del usuario

Entregable final: plan con **orden, prerequisitos, solapamientos, aplicabilidad a Collecta, y tiempo estimado** por curso.

---

## 2. Alcance de la extracción (nivel C — exhaustivo)

Por cada uno de los 18 cursos se extrae **todo** lo siguiente y se guarda en un archivo markdown propio:

| Item | Detalle |
|------|---------|
| Título del curso | H1 del archivo |
| URL | Link de skilljar |
| Módulos / secciones | Jerarquía completa |
| Lecciones | Nombre + duración |
| Texto de cada lección | Copia completa del texto visible |
| Transcripciones de video | Tab "Transcript" de skilljar (si existe) |
| Fragmentos de código | Blocks de código dentro de las lecciones |
| Recursos descargables | **Sólo el link/nombre** — NO descargar archivos |

Ruta destino: `docs/cursos-anthropic/<slug-curso>.md`
Índice: `docs/cursos-anthropic/README.md` (tabla resumen, se actualiza tras cada curso)

---

## 3. Stack / herramientas requeridas

### 3.1 Cliente principal
- **Claude Code** (cualquier versión reciente)
- Modelo: **Opus 4.7** (este plan se diseñó con él)

### 3.2 Navegador
- **Google Chrome de escritorio** (no Edge, no Brave — cuenta Google sincroniza extensiones)
- Perfil con sesión activa en `anthropic.skilljar.com` (cookie de auth válida)

### 3.3 Extensión Chrome
- **Playwright MCP Bridge** — instalar desde Chrome Web Store
  - Si Chrome ya tiene sync, aparece sola en la Mac al iniciar sesión con la misma cuenta Google
  - Si no, buscar "Playwright MCP Bridge" en [chromewebstore.google.com](https://chromewebstore.google.com)
- Token: `h3pLMyPu-WjADk6933q6k0CxXdJTHm_li8-00ZPpxRQ` (ya configurado en `.mcp.json`)

### 3.4 MCP server
- `@playwright/mcp@0.0.70` (se descarga vía `npx -y`)
- Flag requerido: `--extension`
- Token en env var: `PLAYWRIGHT_MCP_EXTENSION_TOKEN`

### 3.5 Configuración MCP en Claude Code

Path del archivo `.mcp.json`:
- **Windows:** `C:\Users\<user>\.claude\plugins\marketplaces\ecc\.mcp.json`
- **Mac:** `~/.claude/plugins/marketplaces/ecc/.mcp.json`

Contenido del bloque `playwright` (idéntico en ambas plataformas):

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@0.0.70", "--extension"],
      "env": {
        "PLAYWRIGHT_MCP_EXTENSION_TOKEN": "h3pLMyPu-WjADk6933q6k0CxXdJTHm_li8-00ZPpxRQ"
      }
    }
  }
}
```

### 3.6 Node / npx
- Node 20+ instalado globalmente (para que `npx` funcione). En Mac: `brew install node`.

---

## 4. Setup en Mac (paso a paso)

1. **Clonar repo y poner en la rama correcta**
   ```bash
   cd ~/Desktop   # o la carpeta que uses
   git clone <url-repo> COLLECTA
   cd COLLECTA
   git checkout main
   git pull
   ```

2. **Verificar `.mcp.json`** en `~/.claude/plugins/marketplaces/ecc/.mcp.json`
   - Si no existe: copiar el bloque de la sección 3.5
   - Si ya existe pero no tiene `playwright`, agregarlo

3. **Abrir Chrome** con tu perfil personal (el que tiene sesión en Anthropic Academy)
   - Confirmar que la extensión "Playwright MCP Bridge" aparece en la barra de extensiones
   - Si no aparece: instalarla desde Chrome Web Store

4. **Abrir las 18 tabs de cursos en UNA sola ventana de Chrome**
   - Todas en la misma ventana (la extensión sólo expone tabs de una ventana por bridge)
   - Tab #1 en este momento: https://anthropic.skilljar.com/claude-101/383389

5. **Activar la extensión en una tab**
   - Click en el icono de la extensión desde una tab del curso
   - Botón "Connect" en el popup
   - El popup debe mostrar "Connected" o el server muestra la tab al llamar `browser_tabs list`

6. **Abrir Claude Code en el repo** y retomar con el prompt "retomar plan de cursos Anthropic Academy"
   - Claude leerá `docs/cursos-anthropic/PLAN.md` (este archivo)
   - Y `docs/cursos-anthropic/README.md` si ya existe con progreso

---

## 5. Workflow de extracción (lo que hace Claude)

Por cada curso:

1. `browser_tabs list` → verificar que las 18 tabs siguen visibles
2. `browser_tabs select <index>` → seleccionar la tab del curso N
3. `browser_snapshot` → capturar estructura de la página principal del curso (árbol de lecciones)
4. Por cada lección:
   - Click en la lección (`browser_click` con la ref del snapshot)
   - `browser_snapshot` del contenido de la lección
   - Si hay tab/botón "Transcript": click y snapshot
   - Capturar texto, transcript, código, y nombres de recursos
5. Escribir todo el contenido del curso a `docs/cursos-anthropic/<slug-curso>.md`
6. Actualizar `docs/cursos-anthropic/README.md` con fila del curso N marcada como completo
7. Pasar al siguiente curso

### Reglas de calidad
- **NO** descargar archivos; sólo registrar links
- **NO** extraer imágenes; mencionarlas con su alt text si es informativo
- **NO** inventar contenido — si una sección está vacía, marcarla como `(sin contenido visible)`
- **Preservar bloques de código** con su lenguaje (python, typescript, etc.)

---

## 6. Estructura de archivos destino

```
docs/cursos-anthropic/
├── PLAN.md                          ← este archivo (no se modifica)
├── README.md                        ← índice maestro (se actualiza tras cada curso)
├── 01-claude-101.md                 ← curso #1
├── 02-<slug>.md                     ← curso #2
├── ...
├── 18-<slug>.md                     ← curso #18
└── ANALISIS-FINAL.md                ← plan priorizado (último entregable)
```

### Template por archivo de curso

```markdown
# <Título del curso>

- **URL:** <link>
- **Duración total estimada:** <N horas / mins>
- **Nivel:** <principiante | intermedio | avanzado>
- **Extraído:** <YYYY-MM-DD>

## Overview
<Descripción o intro del curso si existe>

## Módulos

### Módulo 1 — <nombre>

#### Lección 1.1 — <nombre> (<duración>)
**Texto:**
<texto visible de la lección>

**Transcripción:**
<transcripción del video si existe>

**Código:**
```<lang>
<fragmento>
```

**Recursos:**
- [Nombre del recurso](URL)

#### Lección 1.2 — ...
```

### Template del README.md (índice)

```markdown
# Índice — Cursos Anthropic Academy

Estado de extracción de los 18 cursos. Cada curso tiene su propio archivo en esta carpeta.

| # | Curso | Archivo | Estado | Lecciones | Duración |
|---|-------|---------|--------|-----------|----------|
| 1 | Claude 101 | [01-claude-101.md](01-claude-101.md) | ⏳ | — | — |
| 2 | ... | ... | ⏳ | — | — |

**Leyenda:** ✅ completo · 🟡 parcial · ⏳ pendiente
```

---

## 7. Entregable final — `ANALISIS-FINAL.md`

Se escribe cuando los 18 cursos están extraídos. Contiene:

1. **Tabla resumen** de los 18 cursos con columnas:
   - #, Título, Nivel, Horas, Tema principal, Aplicabilidad Collecta (Alta/Media/Baja), Prerequisitos

2. **Ruta recomendada** (orden de estudio):
   - Track A: fundamentos → intermedios → avanzados
   - Justificación del orden

3. **Solapamientos** (cursos que repiten contenido):
   - Qué curso cubre qué tema
   - Cuál elegir si hay que saltarse redundancias

4. **Aplicabilidad directa a Collecta**:
   - Por curso, qué features del roadmap (Phase 2-7 del `CLAUDE.md` raíz) se benefician
   - Ej: "Curso X → Phase 3 (detección de pagos con Vision)"

5. **Tiempo total y por track**

6. **Gaps detectados** (temas relevantes para Collecta que los cursos NO cubren)

---

## 8. Cómo retomar la sesión

En Mac o donde sea, mandar a Claude Code:

```
retomar plan de cursos Anthropic Academy. contexto en
docs/cursos-anthropic/PLAN.md y docs/cursos-anthropic/README.md
```

Claude debe:
1. Leer este PLAN.md primero
2. Leer README.md para ver qué cursos ya están extraídos
3. Correr `browser_tabs list` para ver estado de tabs
4. Seguir desde el primer curso pendiente

---

## 9. Estado actual (al escribir este plan)

- **Plataforma origen:** Windows 11 / Desktop / COLLECTA
- **MCP playwright:** conectado y funcional (token OK, extensión OK)
- **Tab visible:** 1 de 18 (faltan 17 — usuario debe abrirlas en misma ventana Chrome)
- **Cursos extraídos:** 0 / 18
- **Próximo paso al reanudar:** confirmar 18 tabs visibles con `browser_tabs list`, luego iniciar extracción del curso 1

---

## 10. Referencias cruzadas

- Spec del producto destino (Collecta): `../../CLAUDE.md`
- Memoria persistente del proyecto: `~/.claude/projects/C--Users-LENOVO-Desktop-COLLECTA/memory/` (Windows) o equivalente en Mac
- Entrada de memoria relevante: `project_course_planning_inprogress.md`
