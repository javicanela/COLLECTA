import { CalendarClock, ChevronDown, ChevronUp, History, Loader2 } from 'lucide-react';
import {
  formatAgentDate,
  getAgentStatusCopy,
  type AgentExecution,
} from './AgentControlCenter';

interface AgentRunTimelineProps {
  executions: AgentExecution[];
  expandedExecutionId: string | null;
  loading: boolean;
  onLoadHistory: () => void;
  onToggleExecution: (id: string) => void;
}

export function AgentRunTimeline({
  executions,
  expandedExecutionId,
  loading,
  onLoadHistory,
  onToggleExecution,
}: AgentRunTimelineProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_16px_50px_-38px_rgba(15,23,42,0.5)]">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-slate-900">
            <History size={18} strokeWidth={1.8} aria-hidden="true" />
            <h2 className="text-base font-semibold">Linea de ejecuciones</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">Historial operativo de los ultimos ciclos del agente.</p>
        </div>
        <button
          type="button"
          onClick={onLoadHistory}
          disabled={loading}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55"
        >
          {loading ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <CalendarClock size={15} strokeWidth={1.8} aria-hidden="true" />}
          Cargar historial
        </button>
      </div>

      {loading && executions.length === 0 ? (
        <div className="space-y-3 p-4">
          <SkeletonLine />
          <SkeletonLine />
          <SkeletonLine />
        </div>
      ) : executions.length === 0 ? (
        <div className="grid place-items-center px-5 py-12 text-center">
          <CalendarClock size={36} strokeWidth={1.7} className="text-slate-400" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-slate-900">Historial sin cargar</p>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            Usa el boton de historial para consultar ejecuciones anteriores.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-200">
          {executions.map((execution) => (
            <TimelineItem
              key={execution.id}
              execution={execution}
              expanded={expandedExecutionId === execution.id}
              onToggle={() => onToggleExecution(execution.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function TimelineItem({
  execution,
  expanded,
  onToggle,
}: {
  execution: AgentExecution;
  expanded: boolean;
  onToggle: () => void;
}) {
  const copy = getAgentStatusCopy(execution.status);
  const progress = Math.max(0, Math.min(100, execution.progress));

  return (
    <article className="px-4 py-3">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="grid w-full gap-3 text-left sm:grid-cols-[auto_1fr_auto_auto] sm:items-center"
      >
        <span className={`mt-1 h-3 w-3 rounded-full sm:mt-0 ${copy.tone === 'danger' ? 'bg-red-600' : copy.tone === 'warning' ? 'bg-amber-500' : copy.tone === 'success' ? 'bg-emerald-600' : 'bg-slate-500'}`} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-slate-950">
            {formatAgentDate(execution.startedAt)} - {execution.triggeredBy}
          </span>
          <span className="mt-1 block truncate text-xs text-slate-500">{execution.phase}</span>
        </span>
        <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700">
          {copy.label}
        </span>
        <span className="text-slate-400">{expanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}</span>
      </button>

      {expanded ? (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
            <span>Progreso</span>
            <span className="font-mono text-slate-700">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-slate-800" style={{ width: `${progress}%` }} />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <TimelineStat label="Total" value={execution.totalActions ?? 0} />
            <TimelineStat label="Completadas" value={execution.completedActions ?? 0} />
            <TimelineStat label="Fallidas" value={execution.failedActions ?? 0} />
            <TimelineStat label="Canceladas" value={execution.cancelledActions ?? 0} />
          </div>

          {execution.notes ? (
            <p className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-600">
              {execution.notes}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function TimelineStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-[11px] font-semibold uppercase text-slate-500">{label}</p>
      <p className="font-mono text-base font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SkeletonLine() {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
      <div className="mt-3 h-2 w-full animate-pulse rounded bg-slate-200" />
    </div>
  );
}
