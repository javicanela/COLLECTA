# Repo Cleanup Report

## 1. Resumen ejecutivo

Esta limpieza separa del proyecto principal los artefactos PC1/PC2, runners,
heartbeats y configuraciones locales de agentes. Tambien establece `AGENTS.md`
como fuente operativa principal para Codex y deja Smart Import documentado como
diferenciador central para una PR posterior.

## 2. Backup externo

- Ruta: `C:\Users\LENOVO\Documents\COLLECTA_EXTERNAL_ARCHIVE\20260504-144957`
- Manifiesto: `C:\Users\LENOVO\Documents\COLLECTA_EXTERNAL_ARCHIVE\20260504-144957\MANIFEST.md`
- Archivos verificados en backup: 71

## 3. Archivos/carpetas respaldadas fuera del repo

- `.ai-control/`
- `.ai-tasks/`
- `.ai-logs/`
- `.ai-status/`
- `.ai-approvals/`
- `.claude/`

Motivo: archivos ajenos al producto Collecta; conservados fuera del proyecto
principal.

## 4. Archivos removidos del proyecto principal

- Sistema local PC1/PC2.
- Dashboard local de control de agentes.
- Tareas y logs de runners.
- Estado heartbeat de PC2.
- Configuracion `.claude/` versionada.

## 5. Archivos creados

- `AGENTS.md`
- `docs/PLAN_DEFINITIVO_COLLECTA.md`
- `docs/specs/agent-runtime.md`
- `docs/specs/whatsapp-evolution-api.md`
- `docs/specs/smart-import-super-identifier.md`
- `docs/reports/REPO_CLEANUP_REPORT.md`

## 6. Archivos modificados

- `.gitignore`
- `README.md`
- `CLAUDE.md`
- `docs/specs/pdf-generation.md`
- `frontend/src/views/LoginView.tsx` (import minimo de iconos faltantes para que compile)
- `n8n/README.md`

## 7. Specs archivadas

- `docs/archive/specs/agent-legacy-bajatax-v4.md`
- `docs/archive/specs/whatsapp-flow-legacy-wa-me.md`
- `docs/archive/legacy-docs/cursos-anthropic/`
- `docs/archive/legacy-docs/playbook/`

## 8. Riesgos pendientes

- Los workflows n8n JSON pueden requerir edicion posterior para agregar headers
  `Authorization: Bearer <API_KEY>`.
- Evolution API debe validarse como self-host sin costo de servicio antes de
  declararse operativo.
- Smart Import avanzado esta especificado, no implementado.
- Los providers Gemini/Groq/OpenRouter siguen existiendo en codigo actual como
  opciones, pero ya no son stack obligatorio.

## 9. Recomendacion siguiente PR

Crear una PR dedicada a Smart Import:

- feature web-first en frontend;
- parser local SheetJS/PapaParse;
- superidentificador determinista;
- challenge obligatorio;
- escalamiento al mejor motor disponible;
- adapter hacia `processImportBatch()`;
- tests con fixtures caoticos.

## 10. Validacion ejecutada

- `git status --short --branch` antes de limpieza.
- Backup externo creado y verificado antes de remover.
- Conteo de backup: 71 archivos.
- No quedan carpetas `.ai-*` ni `.claude/` en la raiz del repo.
- Busqueda documental activa sin contradicciones de SQLite/Docker/VPS/docs n8n/auth n8n.
- `cd backend && npm install && npx prisma generate && npm run build`: exit 0.
- `cd frontend && npm install && npm run build`: fallo inicialmente por imports faltantes
  `UserIcon` y `LockIcon`; se corrigio con import desde `lucide-react`.
- `cd frontend && npm run build`: exit 0 despues del ajuste minimo.
- `npm install` reporto vulnerabilidades existentes: backend 7, frontend 5. No se ejecuto
  `npm audit fix` porque alteraria dependencias fuera del alcance de esta limpieza.
- Vite reporto warning de chunk grande en frontend; no bloquea build.
