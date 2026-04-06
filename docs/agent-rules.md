# Agent Rules & Standards (agent.md / cursorrules)

Este archivo define las reglas de comportamiento, arquitectura y estilo que cualquier Inteligencia Artificial (Tú, Cursor, Windsurf, Copilot) debe seguir estrictamente al generar, refactorizar o modificar código en el proyecto **BajaTax V4**.

---

## 1. Reglas de Arquitectura Base
* **Frontend:** Usar SIEMPRE React con TypeScript (`.tsx`). Prohibido usar clases de React o `document.querySelector`. Todo elemento visual debe ser un Functional Component.
* **Backend:** Usar Node.js con Express y TypeScript.
* **Base de Datos:** Estrictamente a través de Prisma ORM. Prohibido escribir queries SQL en crudo o usar `IndexedDB` para persistencia permanente.
* **Estado:** Usar Zustand para estado global. Prohibido usar variables globales `window.x` o el antiguo objeto `ST`.

## 2. Reglas de Estilo y UI
* **CSS/Estilos:** ÚNICAMENTE usar Tailwind CSS. Prohibido escribir archivos `.css` convencionales (excepto `index.css` de inicialización) o usar *inline styles* (`style={{...}}`).
* **Colores Corporativos:** Deben consumirse obligatoriamente de la configuración de Tailwind (`bg-primary`, `text-secondary`), basados en el diseño *Sting*. Prohibido usar *hex codes* directos en el JSX.

## 3. Manejo de Errores y Validaciones
* **Tipado:** TypeScript estricto. Prohibido el uso de `any` a menos que sea explícitamente temporal y documentado con `// TODO: Fix type`.
* **Notificaciones:** Todo error o éxito (Network, DB, UI) debe comunicarse al usuario usando el sistema de Toasts (`useToast()`). Prohibido usar `console.error` de manera silenciosa sin dar feedback en UI.

## 4. Modos Específicos de Integración
* **WhatsApp:** Nunca intentar enviar archivos adjuntos directamente por la URL `wa.me`. Usar siempre el flujo "Copiar a Portapapeles -> Abrir Link".
* **Lectura de Documentos (OCR/Scraping):** Siempre seguir el orden de cascada (motor principal -> fallback -> regex local) definido en el módulo de registros.

## 5. Metodología de Trabajo (OpenSpec)
* Nunca escribir código sin antes haber revisado o actualizado el archivo `tasks.md` o el *Spec* correspondiente de la carpeta `specs/`.
* Si una tarea cambia la estructura de base de datos, el primer paso SIEMPRE es actualizar `schema.prisma`.
