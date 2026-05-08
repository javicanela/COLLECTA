# UI First Cobranza UX Audit

## Current Routes

Routes defined in `frontend/src/App.tsx`:

| Route | Current view | Current job |
|---|---|---|
| `/` | `DashboardView` | Operations and cobranza dashboard. |
| `/directorio` | `DirectoryView` | Client directory. |
| `/registros` | `RegistersView` | Smart Import and import/review flow. |
| `/exportar` | `ExportView` | Export data. |
| `/agente` | `AgentView` | Agent status, executions, and approvals. |
| `/pagos/revision` | `PaymentReviewView` | Ambiguous payment review. |
| `/sistema/diagnostico` | `SystemReadinessView` | Protected readiness checks. |
| `/config` | `ConfigView` | System, channels, templates, providers, and office config. |
| `/logs` | `LogView` | Event/log history. |
| `/ui-preview` | `UIPreview` | Dev-only preview route. |

Auth gating is global. Unauthenticated users see `LoginView`.

## Primary User Jobs

1. Ver cartera priorizada.
2. Importar datos y revisar mapeo.
3. Revisar clientes y operaciones.
4. Ejecutar o aprobar cobranza automatizada.
5. Enviar estado de cuenta.
6. Revisar pagos detectados.
7. Confirmar pagos ambiguos.
8. Diagnosticar conectividad.
9. Auditar eventos.

## Current Friction

- Navigation is flat: daily work, exceptions, diagnostics, setup, and audit appear at the same level.
- `DashboardView` carries too many jobs: priority review, table management, WhatsApp, PDF, statements, payment toggles, archive/delete/exclude.
- `RegistersView` combines new Smart Import and legacy import UI, creating two competing mental models.
- `AgentView` uses a visual language that feels separate from the rest of the app.
- `ConfigView` is too broad for one operational page: system mode, firm data, providers, WhatsApp templates, PDF design, and advisors all coexist.
- Global readiness/status is visible but not close enough to the actions that depend on it.
- Several flows rely on browser `confirm()` or silent `.catch(() => {})`, which hides failure/retry decisions from operators.

## Missing States

- Dashboard store errors are not consistently rendered.
- Directory store errors are not consistently rendered.
- Log fetch failures are swallowed.
- Dashboard row actions need clearer pending/retry feedback for mark paid, archive, exclude, delete, and statement sending.
- Payment review needs filters and recovery paths when no candidate matches.
- Config needs more consistent field-level validation and save failure recovery.
- System diagnostics has strong loading/error/empty states, but remediation actions should link into the relevant app areas.

## Navigation Issues

- Desktop can show duplicate breadcrumb/header concepts between `MainLayout` and `Topbar`.
- Mobile body scroll lock in `MainLayout` depends on `sidebarOpen` but the effect currently has an empty dependency list.
- Sidebar labels are not job-oriented enough:
  - `Pagos` should read like a review queue.
  - `Logs` should read like audit.
  - `Config` should read like setup.
- Exception work is mixed with primary daily work.
- Diagnostics belongs under system/support, not alongside the main cartera job.

## Data Visibility Issues

- Operation workbench lacks a consistent inspector with client/contact/due/payment/action context.
- Per-operation timeline is not available from a single endpoint yet.
- Logs expose event history, but the UI does not normalize log categories enough for non-technical audit.
- Payment review payloads depend on parsed `mensaje` metadata and do not expose explicit confidence or duplicate fields.
- Agent dashboard does not centralize limits/config in the same view as approval decisions.

## Action Placement Issues

- Many operation actions are icon-heavy and table-row dense.
- Statement send, WhatsApp send, mark paid, archive, exclude, and delete need clearer grouping by intent and risk.
- Approvals should place "why approval is needed" next to approve/cancel actions.
- Diagnostics checks should include direct next-step actions.
- Audit entries should open a detail drawer/panel rather than forcing raw table scanning.

## Proposed Information Architecture

Primary grouping:

### Cobranza

- `Cartera`: current `/`, redesigned as priority workbench.
- `Clientes`: current `/directorio`.
- `Estados de cuenta`: surfaced from cartera/client detail, not necessarily a separate route.

### Trabajo Pendiente

- `Aprobaciones del agente`: current `/agente`, queue-first.
- `Pagos por confirmar`: current `/pagos/revision`.
- `Excepciones y fallos`: filtered agent failures plus failed logs, possibly deferred.

### Datos

- `Importar datos`: current `/registros`.
- `Exportar`: current `/exportar`.

### Sistema

- `Diagnostico`: current `/sistema/diagnostico`.
- `Auditoria`: current `/logs`.
- `Configuracion`: current `/config`.

## Screens To Redesign

1. `MainLayout`
   - Group navigation by job.
   - Remove duplicate header/breadcrumb feel.
   - Add compact status rail/header for mode and channel readiness.
   - Fix mobile scroll lock.

2. `DashboardView`
   - Convert to a cobranza workbench.
   - Priority queue + operation inspector.
   - Clear action bar near selected operation.
   - Better loading/error/empty states.

3. `RegistersView` and Smart Import components
   - Consolidate around review flow.
   - Make file extraction, warnings, mapping confidence, and preview editable state explicit.

4. `AgentView`
   - Align with shared layout.
   - Queue-first approval UX.
   - Show execution state, policy reasons, and action risks.

5. `PaymentReviewView`
   - Triage queue + evidence panel + candidate list.
   - Explicit manual recovery when no safe candidate exists.

6. `SystemReadinessView`
   - Keep the current readiness foundation.
   - Add operational language, grouped integrations, and direct next actions.

7. `LogView`
   - Replace raw log scanning with audit timeline, filters, and event detail drawer.

8. `ConfigView`
   - Split or segment into System, Channels, Templates, PDF, AI, and Team.

## Non-Goals

- No landing page.
- No rebrand.
- No business-rule changes.
- No provider setup or real external sends.
- No schema changes for the first Plan 05 UI pass.
- No Smart Import parser/OCR changes.
- No heavy new dependencies unless visual QA or implementation proves they are necessary.
