import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, DollarSign, FileText, Users } from 'lucide-react';
import {
  formatAgentDate,
  formatAgentMoney,
  getActionLabel,
  getAgentStatusCopy,
  type AgentExecution,
  type AgentStats,
  type RecentAgentAction,
} from './AgentControlCenter';

interface AgentExecutionSummaryProps {
  stats: AgentStats;
  currentExecution: AgentExecution | null;
  recentActions: RecentAgentAction[];
}

export function AgentExecutionSummary({ stats, currentExecution, recentActions }: AgentExecutionSummaryProps) {
  const failedActions = recentActions.filter((action) => action.status === 'FAILED');
  const completedActions = currentExecution?.completedActions ?? 0;
  const cancelledActions = currentExecution?.cancelledActions ?? 0;
  const failedInExecution = currentExecution?.failedActions ?? failedActions.length;
  const totalActions = currentExecution?.totalActions ?? recentActions.length;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_16px_50px_-38px_rgba(15,23,42,0.5)]">
      <div className="border-b border-slate-200 px-4 py-4">
        <div className="flex items-center gap-2 text-slate-900">
          <FileText size={18} strokeWidth={1.8} aria-hidden="true" />
          <h2 className="text-base font-semibold">Resumen ejecutivo</h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">Cartera, progreso y excepciones recientes del agente.</p>
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Pendiente de cobro" value={formatAgentMoney(stats.pendingAmount)} icon={<DollarSign size={16} strokeWidth={1.8} />} wide />
          <Metric label="Clientes activos" value={`${stats.totalClients}`} icon={<Users size={16} strokeWidth={1.8} />} />
          <Metric label="Operaciones" value={`${stats.totalOperations}`} icon={<FileText size={16} strokeWidth={1.8} />} />
          <Metric label="Pagadas hoy" value={`${stats.pagadasHoy}`} icon={<CheckCircle2 size={16} strokeWidth={1.8} />} tone="success" />
          <Metric label="Vencidas" value={`${stats.vencidas}`} icon={<AlertTriangle size={16} strokeWidth={1.8} />} tone="danger" />
          <Metric label="Vence hoy" value={`${stats.hoyVence}`} icon={<Clock3 size={16} strokeWidth={1.8} />} tone="warning" />
          <Metric label="Por vencer" value={`${stats.porVencer}`} icon={<Clock3 size={16} strokeWidth={1.8} />} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Ultima ejecucion</p>
          {currentExecution ? (
            <div className="mt-3">
              <p className="text-sm font-semibold text-slate-950">{getAgentStatusCopy(currentExecution.status).label}</p>
              <p className="mt-1 text-sm text-slate-600">
                {currentExecution.phase} desde {formatAgentDate(currentExecution.startedAt)}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <ExecutionCounter label="Total" value={totalActions} />
                <ExecutionCounter label="Completadas" value={completedActions} />
                <ExecutionCounter label="Fallidas" value={failedInExecution} danger={failedInExecution > 0} />
                <ExecutionCounter label="Canceladas" value={cancelledActions} />
              </div>
              {currentExecution.notes ? (
                <p className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-600">
                  {currentExecution.notes}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slate-500">Sin ejecucion registrada todavia.</p>
          )}
        </div>
      </div>

      <div className="border-t border-slate-200 px-4 py-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900">Fallos recientes</h3>
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${failedActions.length > 0 ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
            {failedActions.length}
          </span>
        </div>

        {failedActions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-500">
            Sin fallos registrados en acciones recientes.
          </p>
        ) : (
          <div className="grid gap-2">
            {failedActions.map((action) => (
              <div key={action.id} className="grid gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-900 sm:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{action.clientName}</p>
                  <p className="mt-1 text-red-700">{action.error || 'Sin detalle del proveedor'}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-red-700 sm:justify-end">
                  <span>{getActionLabel(action.action)}</span>
                  <span>{formatAgentDate(action.sentAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  icon,
  tone = 'neutral',
  wide = false,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
  wide?: boolean;
}) {
  const toneClass = {
    neutral: 'border-slate-200 bg-slate-50 text-slate-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    danger: 'border-red-200 bg-red-50 text-red-800',
  }[tone];

  return (
    <div className={`rounded-xl border px-3 py-3 ${toneClass} ${wide ? 'col-span-2' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="opacity-70">{icon}</span>
        <span className="font-mono text-lg font-semibold">{value}</span>
      </div>
      <p className="mt-2 text-[11px] font-semibold uppercase text-current opacity-70">{label}</p>
    </div>
  );
}

function ExecutionCounter({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${danger ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-700'}`}>
      <p className="text-[11px] font-semibold uppercase opacity-70">{label}</p>
      <p className="font-mono text-lg font-semibold">{value}</p>
    </div>
  );
}
