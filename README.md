# Collecta — Cobranza Inteligente

Sistema de cobranza automatizada para despachos contables. Envía recordatorios por WhatsApp, detecta pagos con IA, y genera reportes ordenados.

## Stack

| Componente | Tecnología | Deploy |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite | Vercel |
| Backend | Express 5 + Prisma + SQLite | Docker/VPS |
| Agente | n8n (workflows visuales) | Docker/VPS |
| WhatsApp | Evolution API | Docker/VPS |

## Desarrollo Local

```bash
# Backend
cd backend
npm install
cp .env.example .env    # y llenar valores
npx prisma generate
npx prisma db push
npm run dev             # → http://localhost:3001

# Frontend
cd frontend
npm install
npm run dev             # → http://localhost:5173
```

## Estructura

```
collecta/
├── frontend/          React + Vite
├── backend/           Express + Prisma + SQLite
├── data/              Diccionarios y archivos ejemplo
├── docs/              Documentación técnica
│   ├── n8n/           Workflows de n8n (JSON)
│   ├── specs/         Especificaciones técnicas
│   └── playbook/      Guías de agentes
├── .claude/           Config de Claude Code
├── docker-compose.yml Orquestación de servicios
└── CLAUDE.md          Fuente de verdad del proyecto
```

## Licencia

Privado — Todos los derechos reservados.
