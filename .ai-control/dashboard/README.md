# Collecta PC1 Dashboard

Dashboard visual local para operar el sistema de orquestación AI PC1-PC2.

## Qué hace

- **PC2 Status**: Muestra el estado en tiempo real de PC2 leyendo `.ai-status/pc2/heartbeat.json`
- **Task Queue**: Visualiza tareas en Inbox, Working y Done desde `.ai-tasks/`
- **Log Viewer**: Explora logs y reportes de ejecución desde `.ai-logs/pc2/`
- **New Task**: Formulario para crear nuevas tareas en `.ai-tasks/inbox/`
- **Quick Commands**: Botones para copiar comandos PowerShell comunes

## Estructura

```
.ai-control/dashboard/
├── package.json          # Dependencies (React, Express, Vite)
├── vite.config.ts        # Vite config con proxy al API
├── tsconfig.json         # TypeScript config
├── index.html            # Entry point HTML
├── server/
│   └── api.cjs           # Express API server (puerto 3002)
├── src/
│   ├── main.tsx          # React entry point
│   ├── App.tsx           # Componente principal
│   ├── index.css         # Estilos globales
│   ├── types.ts          # TypeScript interfaces
│   ├── api.ts            # API client (fetch wrapper)
│   └── components/
│       ├── StatusPanel.tsx    # Estado de PC2
│       ├── TaskQueue.tsx      # Cola de tareas con tabs
│       ├── LogViewer.tsx      # Visor de logs
│       ├── NewTaskForm.tsx    # Formulario nueva tarea
│       └── CommandBar.tsx     # Comandos rápidos copiables
└── README.md             # Este archivo
```

## Instalar

```powershell
cd .ai-control/dashboard
npm install
```

## Correr

### Opción 1: Dashboard + API juntos (recomendado)
```powershell
npm start
```
Abre http://localhost:5174

### Opción 2: Separado
```powershell
# Terminal 1 - API server
npm run server

# Terminal 2 - Vite dev server
npm run dev
```

## Cómo funciona

1. **API Server** (Express, puerto 3002): Lee archivos locales del repo y expone endpoints REST
2. **Vite Dev Server** (puerto 5174): Sirve la app React y hace proxy de `/api/*` al Express
3. **Auto-refresh**: El dashboard lee archivos del sistema local — no modifica producción

### Endpoints del API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /api/heartbeat | Estado de PC2 (heartbeat.json) |
| GET | /api/status-live | Estado live de PC2 |
| GET | /api/tasks/inbox | Tareas pendientes |
| GET | /api/tasks/working | Tareas en progreso |
| GET | /api/tasks/done | Tareas completadas |
| GET | /api/tasks/:status/:name | Contenido de tarea |
| POST | /api/tasks | Crear nueva tarea |
| GET | /api/logs | Lista de logs |
| GET | /api/logs/:name | Contenido de log |
| POST | /api/refresh | Git pull |

## Notas

- No usa `.env` ni secretos
- No modifica el frontend/backend de producción
- Solo lee archivos locales del repo
- Compatible con PowerShell
- Los datos se refrescan desde disco cada vez que pulsas "Refresh"
