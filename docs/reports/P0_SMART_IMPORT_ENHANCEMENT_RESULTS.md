# P0 - Smart Import Enhancement Results

Fecha: 2026-05-13
Branch: `codex/plan07-auth-platform-persistence`

## Gaps Cerrados

### Gap 1 - Frontend-to-backend commit wiring
- RegistersView ya tenia `handleCommit` funcional con `ClientService` + `OperationService`
- Se agrego soporte para commit via `/api/import/commit` endpoint como alternativa bulk

### Gap 2 - Backend file upload endpoint
- **Nuevo:** `POST /api/import/upload` via multer (multipart file)
- Soporta XLSX/XLS y CSV via `xlsx` npm en servidor
- Retorna analisis completo via `analyzeSmartImportSamples`
- Limite 10MB, reject other formats con instrucciones para usar frontend
- **Nuevo:** `backend/src/services/smartImport/extract-server.ts`

### Gap 3 - Real BYOK cloud provider call
- **Nuevo:** `POST /api/import/provider-analyze` endpoint
- **Nuevo:** `backend/src/services/smartImport/provider-proxy.ts`
  - Soporta OpenRouter, Gemini, Groq
  - Prompt estructurado con system + user context
  - Response en JSON con mappings + confidence
  - Error handling con fallback gracioso
- Frontend `provider-registry.ts` actualizado:
  - `runSmartImportEscalation` ahora llama a backend cuando BYOK esta configurado con API key
  - Provider mappings se mergean con deterministic (solo si superan confianza)
  - Fallback gracioso si el provider falla

### Gap 4 - Backend domain enhancement
- Backend `analyze.ts` reescrito con:
  - `detectTableRegions` (multi-level headers, group headers)
  - `profileColumns` (8 detectores: RFC, email, phone, money, date, SAT, boolean, longText)
  - `scoreMappings` (header alias scoring + value detector scoring)
  - `runChallenge` (region competition, cambio automatico si alternativa es mejor)
  - `collapseMultilevelHeaders` ported from frontend
- **Nuevo:** `backend/src/services/smartImport/regex-detectors.ts`
- **Nuevo:** `backend/src/services/smartImport/normalize.ts`
- **Nuevo:** `backend/src/services/smartImport/header-collapse.ts`
- Backend `types.ts` actualizado con `headerRows` y `assumptions`/`alternatives`

## Archivos Nuevos

| Archivo | Proposito |
|---------|-----------|
| `backend/src/services/smartImport/regex-detectors.ts` | RFC, email, phone, money, date, boolean, SAT detectors |
| `backend/src/services/smartImport/normalize.ts` | stringifyCell, isBlankCell, normalizeText, normalizeHeaderKey, tokenizeHeader |
| `backend/src/services/smartImport/header-collapse.ts` | Multi-level header merging |
| `backend/src/services/smartImport/provider-proxy.ts` | OpenRouter/Gemini/Groq API caller |
| `backend/src/services/smartImport/extract-server.ts` | Server-side XLSX/CSV extraction |

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `backend/src/services/smartImport/analyze.ts` | Full rewrite: semantic profiles, challenge, multi-level headers |
| `backend/src/services/smartImport/types.ts` | Added headerRows, assumptions, alternatives |
| `backend/src/routes/import.ts` | Added /provider-analyze and /upload endpoints |
| `backend/package.json` | Added xlsx dependency |
| `frontend/src/features/smart-import/domain/provider-registry.ts` | Real BYOK call, merge logic |
| `frontend/src/features/smart-import/domain/provider-types.ts` | Added apiKey, model to byok config |

## Verificacion

```powershell
# Backend
npm run build             # PASS
npm run test:full         # 28 files / 136 tests PASS

# Frontend
npm run build             # PASS
npm test                  # 47 files / 148 PASS / 2 skip (3 E2E fail sin browser)
```

## Riesgos Residuales

- Provider proxy usa `fetch` (Node 18+) - Railway usa Node 18+, compatible
- Ollama no implementado localmente (solo placeholder)
- Transformers.js y WebLLM siguen como placeholders (requieren WebGPU/WebAssembly en browser)
- Upload endpoint solo soporta XLSX/CSV en servidor; PDF, DOCX, JSON, XML, imagenes requieren frontend
- API keys de BYOK viajan en request body - usar HTTPS obligatorio en produccion
