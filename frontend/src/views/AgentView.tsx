import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { ActionPolicyMatrix } from '../components/agent/ActionPolicyMatrix';
import { AgentControlCenter } from '../components/agent/AgentControlCenter';
import type {
  AgentActionPolicy,
  AgentExecution,
  AgentLifecycleStatus,
  AgentStats,
  PendingAgentAction,
  RecentAgentAction,
} from '../components/agent/AgentControlCenter';
import { AgentExecutionSummary } from '../components/agent/AgentExecutionSummary';
import { AgentRunTimeline } from '../components/agent/AgentRunTimeline';
import { ApprovalQueue } from '../components/agent/ApprovalQueue';
import { api } from '../services/api';

interface AgentDashboard {
  status: AgentLifecycleStatus;
  currentExecution: AgentExecution | null;
  nextScheduledRun: string;
  stats: AgentStats;
  pendingActions: PendingAgentAction[];
  recentActions: RecentAgentAction[];
  actionPolicies: AgentActionPolicy[];
}

interface ExecutionHistoryResponse {
  executions: AgentExecution[];
}

interface ApiMessageResponse {
  message?: string;
}

type ToastState = {
  message: string;
  type: 'ok' | 'err';
};

export default function AgentView() {
  const [dashboard, setDashboard] = useState<AgentDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<AgentExecution[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedExecutionId, setExpandedExecutionId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, type: ToastState['type'] = 'ok') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      const data = await api.get<AgentDashboard>('/agent/dashboard');
      setDashboard(data);
      setError(null);
    } catch (requestError) {
      const message = getErrorMessage(requestError, 'No se pudo cargar el centro de control del agente.');
      setError(message);
      showToast(message, 'err');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadDashboard();
    const intervalId = window.setInterval(loadDashboard, 15000);

    return () => window.clearInterval(intervalId);
  }, [loadDashboard]);

  const runAgentCommand = useCallback(async (endpoint: string, label: string) => {
    setActionLoading(endpoint);

    try {
      const response = await api.post<ApiMessageResponse>(endpoint);
      showToast(response.message || label);
      await loadDashboard();
    } catch (requestError) {
      showToast(getErrorMessage(requestError, `No se pudo completar: ${label}`), 'err');
    } finally {
      setActionLoading(null);
    }
  }, [loadDashboard, showToast]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);

    try {
      const response = await api.get<ExecutionHistoryResponse>('/agent/execution/history');
      setHistory(response.executions);
      if (response.executions[0]) {
        setExpandedExecutionId(response.executions[0].id);
      }
    } catch (requestError) {
      showToast(getErrorMessage(requestError, 'No se pudo cargar el historial de ejecuciones.'), 'err');
    } finally {
      setHistoryLoading(false);
    }
  }, [showToast]);

  const approveAction = useCallback(async (id: string) => {
    setActionLoading(`approve-${id}`);

    try {
      const response = await api.post<ApiMessageResponse>(`/agent/actions/approve/${id}`);
      showToast(response.message || 'Accion aprobada para handoff controlado.');
      setSelectedIds((current) => removeFromSet(current, id));
      await loadDashboard();
    } catch (requestError) {
      showToast(getErrorMessage(requestError, 'No se pudo aprobar la accion.'), 'err');
    } finally {
      setActionLoading(null);
    }
  }, [loadDashboard, showToast]);

  const cancelAction = useCallback(async (id: string) => {
    setActionLoading(`cancel-${id}`);

    try {
      const response = await api.post<ApiMessageResponse>(`/agent/actions/cancel/${id}`);
      showToast(response.message || 'Accion cancelada.');
      setSelectedIds((current) => removeFromSet(current, id));
      await loadDashboard();
    } catch (requestError) {
      showToast(getErrorMessage(requestError, 'No se pudo cancelar la accion.'), 'err');
    } finally {
      setActionLoading(null);
    }
  }, [loadDashboard, showToast]);

  const cancelSelected = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;

    setActionLoading('cancel-selected');
    let cancelled = 0;
    let failed = 0;

    for (const id of ids) {
      try {
        await api.post<ApiMessageResponse>(`/agent/actions/cancel/${id}`);
        cancelled += 1;
      } catch {
        failed += 1;
      }
    }

    showToast(
      failed > 0
        ? `${cancelled} accion(es) canceladas, ${failed} con error.`
        : `${cancelled} accion(es) canceladas.`,
      failed > 0 ? 'err' : 'ok',
    );
    setSelectedIds(new Set());
    await loadDashboard();
    setActionLoading(null);
  }, [loadDashboard, showToast]);

  const cancelAll = useCallback(async () => {
    setActionLoading('cancel-all');

    try {
      const response = await api.post<ApiMessageResponse>('/agent/actions/cancel-all');
      showToast(response.message || 'Acciones pendientes canceladas.');
      setSelectedIds(new Set());
      await loadDashboard();
    } catch (requestError) {
      showToast(getErrorMessage(requestError, 'No se pudo cancelar la cola.'), 'err');
    } finally {
      setActionLoading(null);
    }
  }, [loadDashboard, showToast]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleExecution = useCallback((id: string) => {
    setExpandedExecutionId((current) => (current === id ? null : id));
  }, []);

  if (loading) {
    return <AgentViewSkeleton />;
  }

  if (error && !dashboard) {
    return <AgentViewError message={error} onRetry={loadDashboard} />;
  }

  if (!dashboard) {
    return <AgentViewError message="La API no devolvio datos del agente." onRetry={loadDashboard} />;
  }

  const failedActionCount = dashboard.recentActions.filter((action) => action.status === 'FAILED').length;

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-10">
      <Toast toast={toast} />

      <AgentControlCenter
        status={dashboard.status}
        currentExecution={dashboard.currentExecution}
        nextScheduledRun={dashboard.nextScheduledRun}
        pendingApprovals={dashboard.pendingActions.length}
        failedActions={failedActionCount}
        loadingCommand={actionLoading}
        onCommand={runAgentCommand}
        onRefresh={loadDashboard}
      />

      <AgentExecutionSummary
        stats={dashboard.stats}
        currentExecution={dashboard.currentExecution}
        recentActions={dashboard.recentActions}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <div className="space-y-5">
          <ApprovalQueue
            actions={dashboard.pendingActions}
            selectedIds={selectedIds}
            loadingActionId={actionLoading}
            onApprove={approveAction}
            onCancel={cancelAction}
            onCancelAll={cancelAll}
            onCancelSelected={cancelSelected}
            onToggleSelect={toggleSelect}
          />

          <AgentRunTimeline
            executions={history}
            expandedExecutionId={expandedExecutionId}
            loading={historyLoading}
            onLoadHistory={loadHistory}
            onToggleExecution={toggleExecution}
          />
        </div>

        <ActionPolicyMatrix policies={dashboard.actionPolicies ?? []} />
      </div>
    </div>
  );
}

function removeFromSet(values: Set<string>, value: string): Set<string> {
  const next = new Set(values);
  next.delete(value);
  return next;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

function AgentViewSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-10" aria-label="Cargando centro de control del agente">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="h-5 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-4 h-24 animate-pulse rounded-xl bg-slate-100" />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="h-96 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
        <div className="h-96 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
      </div>
    </div>
  );
}

function AgentViewError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 px-5 py-6 text-red-900">
      <div className="flex gap-3">
        <AlertCircle size={22} strokeWidth={1.8} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div>
          <h1 className="text-lg font-semibold">No se pudo abrir el centro de control</h1>
          <p className="mt-2 text-sm leading-6 text-red-800">{message}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-red-300 bg-white px-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 active:translate-y-px"
          >
            <RefreshCw size={15} strokeWidth={1.8} aria-hidden="true" />
            Reintentar
          </button>
        </div>
      </div>
    </div>
  );
}

function Toast({ toast }: { toast: ToastState | null }) {
  if (!toast) return null;

  const success = toast.type === 'ok';

  return (
    <div
      role={success ? 'status' : 'alert'}
      className={`fixed right-5 top-5 z-50 flex max-w-md items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${success ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}
    >
      {success ? <CheckCircle2 size={18} strokeWidth={1.8} aria-hidden="true" /> : <AlertCircle size={18} strokeWidth={1.8} aria-hidden="true" />}
      <span>{toast.message}</span>
    </div>
  );
}
