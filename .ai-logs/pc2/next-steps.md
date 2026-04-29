# COLLECTA — Próximos Pasos Técnicos (Preparación de Desarrollo Seguro)

**Fecha**: 2026-04-29
**Análisis**: README.md, frontend/package.json, backend/package.json, .env.example, prisma/schema.prisma

---

## Resumen del Estado Actual

### Cómo se corre cada componente

| Componente | Comando dev | Comando build | Tests |
|---|---|---|---|
| **Backend** | `cd backend && npm run dev` → `:3001` | `npm run build` (tsc) | `npm run test` (vitest) |
| **Frontend** | `cd frontend && npm run dev` → `:5173` | `npm run build` (tsc + vite) | **NO CONFIGURADO** |
| **Prisma** | `npx prisma generate` + `npx prisma db push` | — | — |

### Dependencias instaladas

- **Frontend**: React 19, TypeScript 5.9, Vite 8, TailwindCSS v4, Zustand 5, React Router 7, @react-pdf/renderer, framer-motion, XLSX, PapaParse
- **Backend**: Express 5, Prisma 6.4.1, Zod 4, pino, helmet, express-rate-limit, jsonwebtoken, pdfkit, multer, axios, @supabase/supabase-js, better-sqlite3, vitest 4.1.2, supertest

### Tests existentes

| Archivo | Cobertura |
|---|---|
| `backend/src/__tests__/auth.test.ts` | Auth JWT |
| `backend/src/__tests__/clients.test.ts` | CRUD clientes |
| `backend/src/__tests__/operations.test.ts` | CRUD operaciones |
| Frontend | **Cero tests** — no hay framework ni archivos *.test.* |

### Hallazgos relevantes

1. **No existen archivos `.env`** — solo `.env.example` en ambos paquetes. El backend NO arranca sin `DATABASE_URL` + `DIRECT_URL` + `JWT_SECRET`.
2. **Discrepancia en README** — dice "SQLite" pero `schema.prisma` usa `provider = "postgresql"`. El README está desactualizado.
3. **Modelos nuevos no documentados** — `AgentExecution`, `AgentAction`, `AgentConfig` existen en el schema pero no aparecen en CLAUDE.md sección 4.
4. **Frontend sin tests** — no hay vitest/jest, no hay archivos de prueba, no hay script de test en package.json.
5. **Sin CI/CD** — no existe `.github/workflows/` ni `frontend/vercel.json`.
6. **@supabase/supabase-js instalado pero no referenciado** en el código visible del schema (que usa Prisma + PostgreSQL/Neon).

---

## Próximos 5 Pasos Técnicos (Orden de Prioridad)

### Paso 1: Configurar `.env` locales para desarrollo

**Por qué**: Sin `.env`, el backend no puede conectarse a la DB ni generar JWTs. Es el bloqueador #1.

```powershell
# Backend
Copy-Item backend\.env.example backend\.env
# Editar .env con valores reales:
# - DATABASE_URL (Neon pooler)
# - DIRECT_URL (Neon directa)
# - JWT_SECRET (generar con: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
# - ADMIN_USER + ADMIN_PASS
# - API_KEY (mínimo 32 chars)

# Frontend
Copy-Item frontend\.env.example frontend\.env.local
# VITE_API_URL=http://localhost:3001/api (ya viene configurado)
```

### Paso 2: Sincronizar base de datos con Prisma

**Por qué**: El schema tiene 9 modelos incluyendo 3 nuevos de agente autónomo. Sin `db push`, el backend crashea al iniciar.

```powershell
cd backend
npx prisma generate
npx prisma db push
# Verificar: npx prisma db pull  (debería no mostrar cambios)
```

### Paso 3: Correr tests del backend y verificar estado

**Por qué**: Existen 3 suites de test (auth, clients, operations). Hay que confirmar que pasan antes de tocar código.

```powershell
cd backend
npm run test
# Si falla por falta de DB, revisar que DATABASE_URL apunte a una DB de prueba
# El setup.ts hace deleteMany en beforeEach, así que necesita DB limpia
```

### Paso 4: Instalar framework de tests en frontend

**Por qué**: El frontend tiene 0 cobertura de tests. Antes de desarrollar más features, se necesita infraestructura de pruebas.

```powershell
cd frontend
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
# Agregar script en package.json: "test": "vitest run"
# Crear frontend/vitest.config.ts con environment: 'jsdom'
# Crear frontend/src/__tests__/setup.ts con @testing-library/jest-dom
```

### Paso 5: Corregir documentación y resolver discrepancias

**Por qué**: El README dice "SQLite" pero usa PostgreSQL. `@supabase/supabase-js` está instalado sin uso visible. Modelos de agente no documentados en CLAUDE.md. Esto causa confusión para cualquier desarrollador.

Acciones concretas:
1. README.md línea 10: cambiar `SQLite` → `PostgreSQL (Neon)`
2. Investigar si `@supabase/supabase-js` se usa o se puede remover
3. Actualizar CLAUDE.md sección 4 para incluir `AgentExecution`, `AgentAction`, `AgentConfig`
4. Agregar sección de "Tests" al README con comandos de frontend y backend

---

## Comandos de Verificación Rápida

```powershell
# Verificar que ambos paquetes instalen sin errores
cd backend; npm install; cd ..
cd frontend; npm install; cd ..

# Verificar TypeScript compila
cd backend; npx tsc --noEmit; cd ..
cd frontend; npx tsc --noEmit; cd ..

# Verificar linter
cd frontend; npm run lint; cd ..
```

## Estructura de Tests Sugerida (Post-Paso 4)

```
frontend/
├── vitest.config.ts
├── src/
│   ├── __tests__/
│   │   ├── setup.ts                    # @testing-library setup
│   │   ├── DashboardView.test.tsx      # Prueba del motor principal
│   │   ├── DirectoryView.test.tsx      # Prueba del directorio
│   │   ├── stores/
│   │   │   ├── useAuthStore.test.ts    # Auth flow
│   │   │   └── useOperationStore.test.ts
│   │   └── utils/
│   │       └── whatsapp.test.ts        # Helpers WA
```

---

## Notas Adicionales

- **No se modificó código de producción** — este reporte solo analiza y propone.
- **Todos los comandos son PowerShell-compatible** (sin sintaxis bash como `mkdir -p`).
- **El schema de Prisma es la fuente de verdad** — los 9 modelos deben estar sincronizados antes de cualquier desarrollo.
- **Frontend `.env.local`** debe ignorarse por git (ya está en `.gitignore` la línea `.env.local`).
