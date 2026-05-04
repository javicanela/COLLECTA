# Collecta - Cobranza inteligente para despachos contables

Collecta es un SaaS para gestionar cobranza, clientes, operaciones pendientes,
recordatorios, WhatsApp, reportes, automatizaciones e importacion inteligente de
archivos contables.

## Stack

| Area | Tecnologia | Target |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite + TailwindCSS | Vercel |
| Backend | Express 5 + TypeScript + Prisma | Railway |
| Base de datos | PostgreSQL / Neon | Neon |
| Automatizacion | n8n | self-host o cloud |
| WhatsApp | Evolution API self-host si no implica costo de servicio; wa.me como fallback manual | opcional |
| Smart Import | SheetJS + PapaParse + motor determinista; WebLLM/Transformers.js/Ollama/BYOK como escalamiento obligatorio si estan disponibles | provider-agnostic |

Gemini, Groq y OpenRouter no son dependencias obligatorias del producto. Pueden
usarse como proveedores BYOK o experimentales dentro de una arquitectura
reemplazable.

## Estructura principal

```text
frontend/   Aplicacion React
backend/    API Express, Prisma y servicios
n8n/        Workflows y guia de automatizacion
data/       Diccionarios y archivos ejemplo
docs/       Plan maestro, specs y reportes
AGENTS.md   Reglas operativas principales para Codex
CLAUDE.md   Puente minimo para Claude Code
README.md   Entrada del proyecto
```

## Desarrollo local

Backend:

```bash
cd backend
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

No subas `.env`, secretos ni credenciales al repositorio.

## Variables importantes

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `API_KEY`
- `ALLOWED_ORIGINS`
- `EVOLUTION_API_URL`
- `EVOLUTION_INSTANCE`
- `EVOLUTION_API_KEY`
- `EVOLUTION_WEBHOOK_SECRET`
- `GEMINI_API_KEY`
- `GROQ_API_KEY`
- `OPENROUTER_API_KEY`

Las llaves de IA son opcionales. El camino oficial de Smart Import debe funcionar
con motor local determinista y escalar al mejor motor disponible sin convertir un
proveedor externo en requisito.

## Documentacion principal

- `AGENTS.md`: reglas operativas para Codex.
- `CLAUDE.md`: puente para Claude Code hacia `AGENTS.md`.
- `docs/PLAN_DEFINITIVO_COLLECTA.md`: plan maestro.
- `docs/specs/`: especificaciones vigentes.
- `docs/specs/smart-import-super-identifier.md`: especificacion del importador avanzado.
- `n8n/README.md`: configuracion de workflows y autenticacion.

## Estado de esta rama

Esta rama limpia artefactos ajenos a Collecta y deja documentada la direccion
tecnica. No implementa nuevas features productivas.
