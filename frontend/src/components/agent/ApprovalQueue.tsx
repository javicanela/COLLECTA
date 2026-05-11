/* eslint-disable react-refresh/only-export-components -- Confirmation helper is tested here within this worker's component ownership. */
import { Ban, CheckCircle2, ChevronDown, ClipboardList, Eye, RefreshCw, Send, XCircle } from 'lucide-react';
import {
  formatAgentDate,
  getActionLabel,
  getRiskCopy,
  type PendingAgentAction,
} from './AgentControlCenter';

type CancelScope = 'single' | 'selected' | 'all';

export function buildCancelConfirmationMessage(scope: CancelScope, count: number): string {
  if (scope === 'single') {
    return 'Vas a cancelar esta accion pendiente. Esta operacion no se enviara al cliente. Continuar?';
  }

  if (scope === 'selected') {
    return `Vas a cancelar ${count} acciones seleccionadas. Esta operacion no se puede deshacer desde la cola. Continuar?`;
  }

  return `Vas a cancelar las ${count} acciones pendientes. Esta operacion detiene todo el trabajo en cola. Continuar?`;
}

interface ApprovalQueueProps {
  actions: PendingAgentAction[];
  selectedIds: Set<string>;
  loadingActionId: string | null;
  onApprove: (id: string) => void;
  onCancel: (id: string) => void;
  onCancelAll: () => void;
  onCancelSelected: (ids: string[]) => void;
  onToggleSelect: (id: string) => void;
}

export function ApprovalQueue({
  actions,
  selectedIds,
  loadingActionId,
  onApprove,
  onCancel,
  onCancelAll,
  onCancelSelected,
  onToggleSelect,
}: ApprovalQueueProps) {
  const selectedCount = selectedIds.size;

  const confirmAction = (scope: CancelScope, count: number) => {
    if (typeof window === 'undefined') return true;
    return window.confirm(buildCancelConfirmationMessage(scope, count));
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_16px_50px_-38px_rgba(15,23,42,0.5)]">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-slate-900">
            <ClipboardList size={18} strokeWidth={1.8} aria-hidden="true" />
            <h2 className="text-base font-semibold">Cola de aprobaciones</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Revisa riesgo, razon de aprobacion y preview antes del handoff.
          </p>
        </div>

        {actions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedCount > 0 ? (
              <button
                type="button"
                onClick={() => {
                  if (confirmAction('selected', selectedCount)) {
                    onCancelSelected(Array.from(selectedIds));
                  }
                }}
                disabled={loadingActionId !== null}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55"
              >
                {loadingActionId === 'cancel-selected' ? <RefreshCw size={15} className="animate-spin" aria-hidden="true" /> : <Ban size={15} strokeWidth={1.8} aria-hidden="true" />}
                Cancelar ({selectedCount})
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                if (confirmAction('all', actions.length)) {
                  onCancelAll();
                }
              }}
              disabled={loadingActionId !== null}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55"
            >
              {loadingActionId === 'cancel-all' ? <RefreshCw size={15} className="animate-spin" aria-hidden="true" /> : <XCircle size={15} strokeWidth={1.8} aria-hidden="true" />}
              Cancelar todo
            </button>
          </div>
        ) : null}
      </div>

      {actions.length === 0 ? (
        <div className="grid place-items-center px-5 py-12 text-center">
          <CheckCircle2 size={36} strokeWidth={1.7} className="text-emerald-600" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-slate-900">No hay aprobaciones pendientes</p>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            Cuando el agente detecte una accion sensible, aparecera aqui para revision humana.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-200">
          {actions.map((action) => (
            <ApprovalQueueItem
              key={action.id}
              action={action}
              selected={selectedIds.has(action.id)}
              loadingActionId={loadingActionId}
              onApprove={onApprove}
              onCancel={(id) => {
                if (confirmAction('single', 1)) {
                  onCancel(id);
                }
              }}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ApprovalQueueItem({
  action,
  selected,
  loadingActionId,
  onApprove,
  onCancel,
  onToggleSelect,
}: {
  action: PendingAgentAction;
  selected: boolean;
  loadingActionId: string | null;
  onApprove: (id: string) => void;
  onCancel: (id: string) => void;
  onToggleSelect: (id: string) => void;
}) {
  const risk = getRiskCopy(action.risk);
  const approveLoading = loadingActionId === `approve-${action.id}`;
  const cancelLoading = loadingActionId === `cancel-${action.id}`;

  return (
    <article className={`px-4 py-4 transition ${selected ? 'bg-slate-50' : 'bg-white'}`}>
      <div className="flex gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(action.id)}
          aria-label={`Seleccionar accion para ${action.clientName}`}
          className="mt-1 h-4 w-4 rounded border-slate-300 accent-slate-900"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-slate-950">{action.clientName}</h3>
            <Badge>{getActionLabel(action.action)}</Badge>
            <Badge className={risk.className}>{risk.label}</Badge>
            <Badge className="border-slate-200 bg-slate-50 text-slate-600">{action.status}</Badge>
          </div>

          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
            {action.messagePreview || 'Sin preview disponible para esta accion.'}
          </p>

          <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-700">
              <span className="inline-flex items-center gap-2">
                <Eye size={15} strokeWidth={1.8} aria-hidden="true" />
                Ver detalle
              </span>
              <ChevronDown size={15} strokeWidth={1.8} aria-hidden="true" />
            </summary>
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <Detail label="Razon de aprobacion" value={action.policyReason || 'Politica requiere revision manual.'} />
              <Detail label="Programada" value={formatAgentDate(action.scheduledAt)} />
              <Detail label="Ejecucion" value={action.executionId} mono />
              <Detail label="Riesgo" value={risk.label} />
              <div className="sm:col-span-2">
                <p className="text-[11px] font-semibold uppercase text-slate-500">Preview completo</p>
                <p className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-700">
                  {action.messagePreview || 'Sin contenido disponible.'}
                </p>
              </div>
            </div>
          </details>
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          <button
            type="button"
            onClick={() => onApprove(action.id)}
            disabled={loadingActionId !== null}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55"
            title="Aprobar accion"
          >
            {approveLoading ? <RefreshCw size={15} className="animate-spin" aria-hidden="true" /> : <Send size={15} strokeWidth={1.8} aria-hidden="true" />}
            <span className="sr-only">Aprobar</span>
            <span className="hidden sm:ml-2 sm:inline">Aprobar</span>
          </button>
          <button
            type="button"
            onClick={() => onCancel(action.id)}
            disabled={loadingActionId !== null}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 bg-white px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55"
            title="Cancelar accion"
          >
            {cancelLoading ? <RefreshCw size={15} className="animate-spin" aria-hidden="true" /> : <XCircle size={15} strokeWidth={1.8} aria-hidden="true" />}
            <span className="sr-only">Cancelar</span>
            <span className="hidden sm:ml-2 sm:inline">Cancelar</span>
          </button>
        </div>
      </div>
    </article>
  );
}

function Badge({ children, className = 'border-slate-200 bg-white text-slate-700' }: { children: string; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${className}`}>
      {children}
    </span>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase text-slate-500">{label}</p>
      <p className={`mt-1 break-words text-sm text-slate-800 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
